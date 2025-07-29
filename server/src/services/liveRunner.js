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

// Кэш для Live задач (обновляется раз в 30 минут)
const liveTaskCache = new Map();
const LIVE_CACHE_DURATION = 30 * 60 * 1000; // 30 минут

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
            
            // Проверяем кэш для этой задачи
            const cacheKey = `live_task_${task.id}`;
            const now = Date.now();
            const cached = liveTaskCache.get(cacheKey);
            
            if (cached && (now - cached.timestamp) < LIVE_CACHE_DURATION) {
                console.log(`[LiveTask] Using cached data for task: ${task.name}`);
                continue; // Пропускаем обработку, если кэш еще актуален
            }
            
            const sourceAccount = await Account.findByPk(task.sourceAccountId);

            // 1. Обновляем кеш новыми постами с сайта (только если кэш устарел)
            console.log(`[LiveTask] Syncing cache for account: ${task.sourceAccountId}`);
            await syncNewPosts(task.sourceAccountId);

            // 2. Очищаем старые посты (оставляем только за последние сутки)
            await cleanLiveCache(task.sourceAccountId);

            // 3. Получаем все посты за сегодняшний день
            console.log(`[LiveTask] Getting today's posts for task: ${task.name}`);
            const todaysPosts = await getTodaysPosts(task.sourceAccountId);

            if (todaysPosts.length === 0) {
                console.log(`[LiveTask] No posts found for today for task: ${task.name}`);
                // Сохраняем в кэш информацию об отсутствии постов
                liveTaskCache.set(cacheKey, { timestamp: now, hasPosts: false });
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
                // Сохраняем в кэш информацию о том, что все посты опубликованы
                liveTaskCache.set(cacheKey, { timestamp: now, hasPosts: true, allPublished: true });
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
                } else {
                    console.error(`Unsupported platform type: ${dest.type}`);
                }

                if (success) {
                    console.log(`Successfully published to ${dest.name}`);
                    
                    // Логируем успешную публикацию
                    await Log.create({
                        userId: task.userId,
                        taskId: task.id,
                        level: 'success',
                        message: `LiveTask ${task.id}: Successfully published post ID: ${post.id} to ${dest.name}`,
                        details: {
                            postId: post.id,
                            postTitle: post.title.rendered,
                            destination: dest.name,
                            platform: dest.type
                        }
                    });
                } else {
                    console.error(`Failed to publish to ${dest.name}`);
                    
                    // Логируем ошибку
                    await Log.create({
                        userId: task.userId,
                        taskId: task.id,
                        level: 'error',
                        message: `LiveTask ${task.id}: Failed to publish post ID: ${post.id} to ${dest.name}`,
                        details: {
                            postId: post.id,
                            postTitle: post.title.rendered,
                            destination: dest.name,
                            platform: dest.type
                        }
                    });
                }
            }
            
            // Сохраняем в кэш информацию об успешной обработке
            liveTaskCache.set(cacheKey, { timestamp: now, hasPosts: true, allPublished: false });
            
        } catch (error) {
            console.error(`Error processing live task ${task.name}:`, error.message);
            
            // Логируем ошибку
            await Log.create({
                userId: task.userId,
                taskId: task.id,
                level: 'error',
                message: `LiveTask ${task.id}: Error processing task: ${error.message}`,
                details: { error: error.message }
            });
        }
    }
}; 

// Функция для очистки кэша Live задач
exports.clearLiveTaskCache = (taskId = null) => {
    if (taskId) {
        // Очищаем кэш для конкретной задачи
        const cacheKey = `live_task_${taskId}`;
        liveTaskCache.delete(cacheKey);
        console.log(`[LiveTask] Cleared cache for task ${taskId}`);
    } else {
        // Очищаем весь кэш
        liveTaskCache.clear();
        console.log(`[LiveTask] Cleared all live task cache`);
    }
};

// Функция для получения информации о кэше
exports.getLiveTaskCacheInfo = () => {
    return {
        size: liveTaskCache.size,
        entries: Array.from(liveTaskCache.entries()).map(([key, value]) => ({
            key,
            timestamp: value.timestamp,
            age: Date.now() - value.timestamp,
            hasPosts: value.hasPosts,
            allPublished: value.allPublished
        }))
    };
}; 