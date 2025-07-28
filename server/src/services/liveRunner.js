const LiveTask = require('../db/models/LiveTask');
const Account = require('../db/models/Account');
const Template = require('../db/models/Template');
const Log = require('../db/models/Log');
const { Op } = require('sequelize');
const { getLatestPosts } = require('./wordpressService');
const { postToTelegram } = require('./telegramService');
const { postToVk } = require('./vkService');
const { processTemplate, processTemplateForVk, processTemplateForTelegram } = require('./templateProcessor');
const { sendEmail } = require('./emailService');
const { syncNewPosts, getTodaysPosts, cleanLiveCache } = require('./postCacheService');
const User = require('../db/models/User');

// Быстрая проверка - есть ли активные live задачи
exports.hasActiveLiveTasks = async () => {
    const count = await LiveTask.count({ where: { status: 'active' } });
    return count > 0;
};

// Синхронизация кэша для всех активных Live задач
exports.syncLiveTasksCaches = async () => {
    try {
        const liveTasks = await LiveTask.findAll({ where: { status: 'active' } });
        
        console.log(`[LiveTasksSync] Found ${liveTasks.length} active live tasks for cache sync`);
        
        for (const task of liveTasks) {
            try {
                console.log(`[LiveTasksSync] Syncing cache for task: ${task.name} (account ${task.sourceAccountId})`);
                await syncNewPosts(task.sourceAccountId);
            } catch (error) {
                console.error(`[LiveTasksSync] Error syncing cache for task ${task.name}:`, error.message);
            }
        }
        
        console.log(`[LiveTasksSync] Cache sync completed for ${liveTasks.length} live tasks`);
    } catch (error) {
        console.error('[LiveTasksSync] Error in live tasks cache sync:', error.message);
    }
};

exports.processLiveTasks = async () => {
    const liveTasks = await LiveTask.findAll({ where: { status: 'active' } });

    for (const task of liveTasks) {
        try {
            console.log(`Processing live task: ${task.name}`);
            const sourceAccount = await Account.findByPk(task.sourceAccountId);

            // 1. Обновляем кеш новыми постами с сайта
            console.log(`[LiveTask] Syncing cache for account: ${task.sourceAccountId}`);
            await syncNewPosts(task.sourceAccountId);

            // 2. Очищаем старые посты (оставляем только за последние сутки)
            await cleanLiveCache(task.sourceAccountId);

            // 3. Получаем все посты за сегодняшний день
            console.log(`[LiveTask] Getting today's posts for task: ${task.name}`);
            const todaysPosts = await getTodaysPosts(task.sourceAccountId);

            if (todaysPosts.length === 0) {
                console.log(`[LiveTask] No posts found for today for task: ${task.name}`);
                continue;
            }

            // 4. Получаем уже опубликованные посты за сегодня из логов
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            
            const publishedLogs = await Log.findAll({
                where: { 
                    userId: task.userId, 
                    message: { [Op.like]: `LiveTask ${task.id}:%` }, 
                    level: 'success',
                    createdAt: { [Op.gte]: todayStart }
                },
                attributes: ['message']
            });

            // Извлекаем ID опубликованных постов
            const publishedPostIds = publishedLogs.map(log => {
                const match = log.message.match(/post ID: (\d+)/);
                return match ? parseInt(match[1]) : null;
            }).filter(id => id !== null);

            console.log(`[LiveTask] Today's posts: ${todaysPosts.length}, already published: ${publishedPostIds.length}`);

            // 5. Находим первый неопубликованный пост за сегодня
            const unpublishedPost = todaysPosts.find(post => !publishedPostIds.includes(post.id));

            if (!unpublishedPost) {
                console.log(`[LiveTask] All today's posts already published for task: ${task.name}`);
                continue;
            }

            console.log(`[LiveTask] Found unpublished post: "${unpublishedPost.title.rendered}" (ID: ${unpublishedPost.id})`);

            // 6. Публикуем только один пост (первый неопубликованный)
            const post = unpublishedPost;
            const templateContent = task.templateId ? (await Template.findByPk(task.templateId)).content : '{post_title}\n{post_url}';
            
            // Получаем URL изображения из обработанного поста
            let imageUrl = '';
            if (post.jetpack_featured_media_url) {
                imageUrl = post.jetpack_featured_media_url;
            } else if (post._embedded && post._embedded['wp:featuredmedia'] && post._embedded['wp:featuredmedia'][0]) {
                const featuredMedia = post._embedded['wp:featuredmedia'][0];
                imageUrl = featuredMedia.source_url || featuredMedia.media_details?.sizes?.full?.source_url || '';
            }

            const destinationAccounts = await Account.findAll({ where: { id: { [Op.in]: task.destinationAccountIds } } });
            for (const dest of destinationAccounts) {
                let success = false;
                if (dest.type === 'telegram') {
                    // Обрабатываем шаблон для Telegram (убираем {post_image} из текста)
                    const processedContent = processTemplateForTelegram(templateContent, post);
                    
                    // ИСПРАВЛЕНО: изображение добавляется ТОЛЬКО если есть {post_image} в шаблоне
                    const hasImageInTemplate = templateContent.includes('{post_image}');
                    const finalImageUrl = hasImageInTemplate ? imageUrl : null;
                    
                    console.log(`Telegram Live: Template has {post_image}: ${hasImageInTemplate}, will add image: ${!!finalImageUrl}`);
                    
                    success = await postToTelegram(dest.credentials.token, dest.credentials.channelId, processedContent, finalImageUrl);
                } else if (dest.type === 'vk') {
                    // Обрабатываем шаблон для VK (с HTML форматированием)
                    const processedContent = processTemplateForVk(templateContent, post);
                    
                    const channelId = dest.credentials.channelId;
                    if (!channelId) {
                        console.error('VK channelId is missing for destination:', dest.name);
                        success = false;
                    } else {
                        const ownerId = channelId.startsWith('-') ? channelId : `-${channelId}`;
                        
                        // ИСПРАВЛЕНО: для VK ссылка добавляется как attachment ТОЛЬКО если есть {post_url} в шаблоне
                        const hasUrlInTemplate = templateContent.includes('{post_url}');
                        const postUrl = hasUrlInTemplate ? post.link : null; // Ссылка для превью если есть переменная
                        
                        console.log(`VK Live: Template has {post_url}: ${hasUrlInTemplate}, will add as attachment: ${hasUrlInTemplate}`);
                        
                        success = await postToVk(dest.credentials.apiKey, ownerId, processedContent, postUrl, null);
                    }
                }

                await Log.create({
                    userId: task.userId,
                    level: success ? 'success' : 'error',
                    message: `LiveTask ${task.id}: Published post ID: ${post.id} to ${dest.name}.`
                });
            }

        } catch (error) {
            console.error(`Error processing live task ${task.id}:`, error.message);
            await Log.create({ userId: task.userId, level: 'error', message: `LiveTask ${task.id}: ${error.message}`});
            
            // Отправляем email об ошибке
            const user = await User.findByPk(task.userId);
            if (user) {
                 await sendEmail({
                    to: user.email,
                    subject: `Ошибка в Live-задаче "${task.name}"`,
                    text: `Произошла ошибка при выполнении Live-задачи "${task.name}": ${error.message}`,
                    html: `<p>Произошла ошибка при выполнении Live-задачи <b>"${task.name}"</b>:</p><p>${error.message}</p>`
                });
            }
        }
    }
}; 