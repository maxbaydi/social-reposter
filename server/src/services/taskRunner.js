const ScheduledTask = require('../db/models/ScheduledTask');
const Account = require('../db/models/Account');
const Template = require('../db/models/Template');
const Log = require('../db/models/Log');
const { Op } = require('sequelize');
const { getPosts } = require('./wordpressService');
const { postToTelegram } = require('./telegramService');
const { postToVk } = require('./vkService');
const { processTemplate, processTemplateForVk, processTemplateForTelegram } = require('./templateProcessor');
const { sendEmail } = require('./emailService');
const { syncAccountPosts, getCachedPosts } = require('./postCacheService');
const User = require('../db/models/User');

// Функция для вычисления следующего времени выполнения
const calculateNextRun = (scheduleSettings) => {
    const now = new Date();
    const { type, value, unit, minValue, maxValue, minUnit, maxUnit } = scheduleSettings;
    
    let intervalMs;
    
    if (type === 'random') {
        // Для случайного интервала берем случайное значение между min и max
        const minMs = convertToMs(minValue || 2, minUnit || 'hours');
        const maxMs = convertToMs(maxValue || 6, maxUnit || 'hours'); 
        intervalMs = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    } else {
        // Для фиксированного интервала
        intervalMs = convertToMs(value || 4, unit || 'hours');
    }
    
    return new Date(now.getTime() + intervalMs);
};

const convertToMs = (value, unit) => {
    const multipliers = {
        minutes: 60 * 1000,
        hours: 60 * 60 * 1000,
        days: 24 * 60 * 60 * 1000
    };
    return value * (multipliers[unit] || multipliers.hours);
};

// Функция для получения обновленной задачи после выполнения
exports.getNextScheduledTask = async (taskId) => {
    try {
        const task = await ScheduledTask.findByPk(taskId);
        return task;
    } catch (error) {
        console.error(`Error getting task ${taskId}:`, error.message);
        return null;
    }
};

// Обновляем функцию processScheduledTasks для работы с массивом задач
exports.processScheduledTasks = async (specificTasks = null) => {
    let tasksToRun;
    
    if (specificTasks) {
        // Если переданы конкретные задачи, используем их
        tasksToRun = specificTasks;
    } else {
        // Иначе получаем все задачи, готовые к выполнению
        tasksToRun = await ScheduledTask.findAll({
            where: { status: 'active', nextRun: { [Op.lte]: new Date() } }
        });
    }

    for (const task of tasksToRun) {
        try {
            console.log(`Processing task: ${task.name}`);
            const sourceAccount = await Account.findByPk(task.sourceAccountId);
            
            // 1. Обновляем кэш постов перед выполнением задачи
            console.log(`[TaskRunner] Updating post cache for account ${task.sourceAccountId}`);
            await syncAccountPosts(task.sourceAccountId, task.filterSettings);
            
            // 2. Получаем посты из кэша
            const allPosts = await getCachedPosts(task.sourceAccountId, task.filterSettings);
            console.log(`[TaskRunner] Retrieved ${allPosts.length} posts from cache`);
            
            // 3. Отфильтровываем уже опубликованные (по логам)
            const publishedLogs = await Log.findAll({ where: { taskId: task.id, level: 'success' }, attributes: ['message'] });
            const publishedPostIds = publishedLogs.map(log => parseInt(log.message.split('ID: ')[1]));
            let newPosts = allPosts.filter(p => !publishedPostIds.includes(p.id));

            if (newPosts.length === 0) {
                console.log(`No new posts for task ${task.name}`);
                task.status = 'completed';
                await task.save();
                if (task.status === 'completed') {
                    const user = await User.findByPk(task.userId);
                    if (user) {
                        await sendEmail({
                            to: user.email,
                            subject: `Задача "${task.name}" завершена`,
                            text: `Ваша запланированная задача "${task.name}" была успешно завершена.`,
                            html: `<p>Ваша запланированная задача <b>"${task.name}"</b> была успешно завершена.</p>`
                        });
                    }
                }
                continue;
            }

            // 4. Сортируем посты согласно настройкам порядка публикации
            const publicationOrder = task.publicationOrder || 'newest_first';
            if (publicationOrder === 'oldest_first') {
                // Сортируем по дате публикации: от старых к новым
                newPosts.sort((a, b) => new Date(a.date) - new Date(b.date));
            } else if (publicationOrder === 'newest_first') {
                // Сортируем по дате публикации: от новых к старым
                newPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
            } else if (publicationOrder === 'random') {
                // Случайная перетасовка
                newPosts = newPosts.sort(() => Math.random() - 0.5);
            }

            // 5. Берем следующий пост для публикации
            const postToPublish = newPosts[0];

            // 6. Получаем шаблон (будем обрабатывать для каждой платформы отдельно)
            const templateContent = task.templateId ? (await Template.findByPk(task.templateId)).content : '{post_title}\n{post_url}';
            
            // Получаем URL изображения из обработанного поста
            let imageUrl = '';
            if (postToPublish.jetpack_featured_media_url) {
                imageUrl = postToPublish.jetpack_featured_media_url;
            } else if (postToPublish._embedded && postToPublish._embedded['wp:featuredmedia'] && postToPublish._embedded['wp:featuredmedia'][0]) {
                const featuredMedia = postToPublish._embedded['wp:featuredmedia'][0];
                imageUrl = featuredMedia.source_url || featuredMedia.media_details?.sizes?.full?.source_url || '';
            }

            // 7. Публикуем в соцсети
            const destinationAccounts = await Account.findAll({ where: { id: { [Op.in]: task.destinationAccountIds } } });
            for (const dest of destinationAccounts) {
                console.log(`Publishing to ${dest.name} (${dest.type})...`);
                
                let success = false;
                let errorMessage = '';
                
                try {
                    if (dest.type === 'telegram') {
                        // Обрабатываем шаблон для Telegram (убираем {post_image} из текста)
                        const processedContent = processTemplateForTelegram(templateContent, postToPublish);
                        
                        // ИСПРАВЛЕНО: изображение добавляется ТОЛЬКО если есть {post_image} в шаблоне
                        const hasImageInTemplate = templateContent.includes('{post_image}');
                        const finalImageUrl = hasImageInTemplate ? imageUrl : null;
                        
                        console.log(`Telegram: Template has {post_image}: ${hasImageInTemplate}, will add image: ${!!finalImageUrl}`);
                        
                        success = await postToTelegram(dest.credentials.token, dest.credentials.channelId, processedContent, finalImageUrl);
                    } else if (dest.type === 'vk') {
                        // Обрабатываем шаблон для VK (с HTML форматированием)
                        const processedContent = processTemplateForVk(templateContent, postToPublish);
                        
                        // Для VK owner_id должен быть отрицательным
                        const channelId = dest.credentials.channelId;
                        if (!channelId) {
                            errorMessage = 'VK channelId is missing';
                            console.error('VK channelId is missing for destination:', dest.name);
                            success = false;
                        } else {
                            const ownerId = channelId.startsWith('-') ? channelId : `-${channelId}`;
                            
                            // ИСПРАВЛЕНО: для VK ссылка добавляется как attachment ТОЛЬКО если есть {post_url} в шаблоне
                            const hasUrlInTemplate = templateContent.includes('{post_url}');
                            const postUrl = hasUrlInTemplate ? postToPublish.link : null; // Ссылка для превью если есть переменная
                            
                            console.log(`VK: Template has {post_url}: ${hasUrlInTemplate}, will add as attachment: ${hasUrlInTemplate}`);
                            
                            success = await postToVk(dest.credentials.apiKey, ownerId, processedContent, postUrl, null);
                        }
                    } else {
                        errorMessage = `Unsupported platform type: ${dest.type}`;
                        console.error(errorMessage);
                    }
                } catch (publishError) {
                    console.error(`Error publishing to ${dest.name}:`, publishError.message);
                    errorMessage = publishError.message;
                    success = false;
                }
                
                const logMessage = success 
                    ? `Published post ID: ${postToPublish.id} to ${dest.name}.`
                    : `Failed to publish post ID: ${postToPublish.id} to ${dest.name}. ${errorMessage}`;
                
                await Log.create({
                    userId: task.userId,
                    taskId: task.id,
                    level: success ? 'success' : 'error',
                    message: logMessage
                });
                
                console.log(`${dest.name}: ${success ? 'SUCCESS' : 'FAILED'}`);
            }

            // 6. Обновляем задачу
            task.progress.current = (task.progress.current || 0) + 1;
            task.progress.total = allPosts.length;
            
            // Вычисляем следующее время выполнения
            task.nextRun = calculateNextRun(task.scheduleSettings);
            
            await task.save();
            
            console.log(`Task ${task.name} completed. Next run: ${task.nextRun}`);

        } catch (error) {
            console.error(`Error processing task ${task.id}:`, error.message);
            task.status = 'error';
            await task.save();
            await Log.create({ userId: task.userId, taskId: task.id, level: 'error', message: error.message });
            const user = await User.findByPk(task.userId);
            if (user) {
                await sendEmail({
                    to: user.email,
                    subject: `Ошибка в задаче "${task.name}"`,
                    text: `Произошла ошибка при выполнении задачи "${task.name}": ${error.message}`,
                    html: `<p>Произошла ошибка при выполнении задачи <b>"${task.name}"</b>:</p><p>${error.message}</p>`
                });
            }
        }
    }
};

// Оставляем старую функцию для обратной совместимости
exports.hasActiveScheduledTasks = async () => {
    const count = await ScheduledTask.count({
        where: { status: 'active', nextRun: { [Op.lte]: new Date() } }
    });
    return count > 0;
};