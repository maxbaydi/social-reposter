const CachedPost = require('../db/models/CachedPost');
const Account = require('../db/models/Account');
const { getPosts } = require('./wordpressService');
const { Op } = require('sequelize');

/**
 * Преобразует пост из WordPress API в формат для базы данных
 */
const transformWordPressPost = (post, accountId) => {
    // Извлекаем featured image
    let featuredImage = '';
    if (post.jetpack_featured_media_url) {
        featuredImage = post.jetpack_featured_media_url;
    } else if (post._embedded && post._embedded['wp:featuredmedia'] && post._embedded['wp:featuredmedia'][0]) {
        const featuredMedia = post._embedded['wp:featuredmedia'][0];
        featuredImage = featuredMedia.source_url || featuredMedia.media_details?.sizes?.full?.source_url || '';
    }

    // Извлекаем категории и теги
    const categories = post._embedded?.['wp:term']?.[0]?.map(cat => ({ id: cat.id, name: cat.name })) || [];
    const tags = post._embedded?.['wp:term']?.[1]?.map(tag => ({ id: tag.id, name: tag.name })) || [];

    return {
        wordpressId: post.id,
        accountId: accountId,
        title: post.title.rendered,
        content: post.content?.rendered || '',
        excerpt: post.excerpt?.rendered || '',
        link: post.link,
        featuredImage: featuredImage,
        publishedAt: new Date(post.date),
        modifiedAt: new Date(post.modified),
        categories: JSON.stringify(categories),
        tags: JSON.stringify(tags),
        rawData: JSON.stringify(post),
        syncedAt: new Date()
    };
};

/**
 * Полная синхронизация постов для аккаунта
 */
exports.syncAccountPosts = async (accountId, filterSettings = {}) => {
    try {
        console.log(`[PostCache] Starting full sync for account ${accountId}`);
        
        const account = await Account.findByPk(accountId);
        if (!account) {
            throw new Error(`Account ${accountId} not found`);
        }

        // Получаем все посты из WordPress
        const wordpressPosts = await getPosts(account.credentials, filterSettings);
        console.log(`[PostCache] Fetched ${wordpressPosts.length} posts from WordPress`);

        let synced = 0;
        let updated = 0;
        let created = 0;

        for (const wpPost of wordpressPosts) {
            const postData = transformWordPressPost(wpPost, accountId);
            
            const [cachedPost, wasCreated] = await CachedPost.upsert(postData, {
                where: { wordpressId: wpPost.id, accountId: accountId }
            });

            if (wasCreated) {
                created++;
            } else {
                updated++;
            }
            synced++;
        }

        console.log(`[PostCache] Sync completed for account ${accountId}: ${created} created, ${updated} updated, ${synced} total`);
        
        return { synced, created, updated };
    } catch (error) {
        console.error(`[PostCache] Error syncing account ${accountId}:`, error.message);
        throw error;
    }
};

/**
 * Инкрементальная синхронизация - только новые и измененные посты
 */
exports.syncNewPosts = async (accountId, filterSettings = {}) => {
    try {
        console.log(`[PostCache] Starting incremental sync for account ${accountId}`);
        
        const account = await Account.findByPk(accountId);
        if (!account) {
            throw new Error(`Account ${accountId} not found`);
        }

        // Находим время последней синхронизации
        const lastSync = await CachedPost.findOne({
            where: { accountId: accountId },
            order: [['syncedAt', 'DESC']],
            attributes: ['syncedAt']
        });

        const lastSyncDate = lastSync ? lastSync.syncedAt : new Date(0);
        console.log(`[PostCache] Last sync: ${lastSyncDate.toISOString()}`);

        // Получаем посты, измененные после последней синхронизации
        const modifiedFilterSettings = {
            ...filterSettings,
            startDate: lastSyncDate.toISOString()
        };

        const wordpressPosts = await getPosts(account.credentials, modifiedFilterSettings);
        console.log(`[PostCache] Found ${wordpressPosts.length} modified posts since last sync`);

        let synced = 0;
        let updated = 0;
        let created = 0;

        for (const wpPost of wordpressPosts) {
            const postData = transformWordPressPost(wpPost, accountId);
            
            const [cachedPost, wasCreated] = await CachedPost.upsert(postData, {
                where: { wordpressId: wpPost.id, accountId: accountId }
            });

            if (wasCreated) {
                created++;
            } else {
                updated++;
            }
            synced++;
        }

        console.log(`[PostCache] Incremental sync completed for account ${accountId}: ${created} created, ${updated} updated`);
        
        return { synced, created, updated };
    } catch (error) {
        console.error(`[PostCache] Error in incremental sync for account ${accountId}:`, error.message);
        throw error;
    }
};

/**
 * Получение постов из кэша с фильтрацией
 */
exports.getCachedPosts = async (accountId, filterSettings = {}) => {
    try {
        const whereClause = { accountId: accountId };
        
        // Фильтрация по датам
        if (filterSettings.dateFrom || filterSettings.startDate) {
            whereClause.publishedAt = whereClause.publishedAt || {};
            whereClause.publishedAt[Op.gte] = new Date(filterSettings.dateFrom || filterSettings.startDate);
        }
        
        if (filterSettings.dateTo || filterSettings.endDate) {
            whereClause.publishedAt = whereClause.publishedAt || {};
            whereClause.publishedAt[Op.lte] = new Date(filterSettings.dateTo || filterSettings.endDate);
        }

        // Фильтрация по категориям (базовая - можно улучшить)
        if (filterSettings.categories && filterSettings.categories.length > 0) {
            whereClause.categories = {
                [Op.like]: `%${filterSettings.categories[0]}%` // Упрощенная фильтрация
            };
        }

        const posts = await CachedPost.findAll({
            where: whereClause,
            order: [['publishedAt', 'DESC']],
            limit: 1000 // Ограничение для безопасности
        });

        // Преобразуем обратно в формат WordPress API
        return posts.map(post => {
            const rawData = JSON.parse(post.rawData || '{}');
            return {
                ...rawData,
                // Обновляем основные поля на случай если они изменились
                id: post.wordpressId,
                title: { rendered: post.title },
                content: { rendered: post.content },
                excerpt: { rendered: post.excerpt },
                link: post.link,
                date: post.publishedAt.toISOString(),
                modified: post.modifiedAt.toISOString(),
                jetpack_featured_media_url: post.featuredImage
            };
        });
    } catch (error) {
        console.error(`[PostCache] Error getting cached posts for account ${accountId}:`, error.message);
        throw error;
    }
};

/**
 * Проверяет есть ли новые посты в кэше для Live задач
 */
exports.getNewPostsSinceDate = async (accountId, sinceDate) => {
    try {
        const posts = await CachedPost.findAll({
            where: {
                accountId: accountId,
                publishedAt: {
                    [Op.gt]: new Date(sinceDate)
                }
            },
            order: [['publishedAt', 'ASC']]
        });

        return posts.map(post => {
            const rawData = JSON.parse(post.rawData || '{}');
            return {
                ...rawData,
                id: post.wordpressId,
                title: { rendered: post.title },
                content: { rendered: post.content },
                excerpt: { rendered: post.excerpt },
                link: post.link,
                date: post.publishedAt.toISOString(),
                modified: post.modifiedAt.toISOString(),
                jetpack_featured_media_url: post.featuredImage
            };
        });
    } catch (error) {
        console.error(`[PostCache] Error getting new posts since ${sinceDate}:`, error.message);
        throw error;
    }
};

/**
 * Получение постов за сегодняшний день (последние 24 часа) для Live задач
 */
exports.getTodaysPosts = async (accountId) => {
    try {
        // Получаем начало сегодняшнего дня
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // Получаем конец сегодняшнего дня
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        console.log(`[PostCache] Getting today's posts for account ${accountId} from ${todayStart.toISOString()} to ${todayEnd.toISOString()}`);

        const posts = await CachedPost.findAll({
            where: {
                accountId: accountId,
                publishedAt: {
                    [Op.gte]: todayStart,
                    [Op.lte]: todayEnd
                }
            },
            order: [['publishedAt', 'ASC']] // Сортируем по времени публикации (старые первыми)
        });

        console.log(`[PostCache] Found ${posts.length} posts for today`);

        return posts.map(post => {
            const rawData = JSON.parse(post.rawData || '{}');
            return {
                ...rawData,
                id: post.wordpressId,
                title: { rendered: post.title },
                content: { rendered: post.content },
                excerpt: { rendered: post.excerpt },
                link: post.link,
                date: post.publishedAt.toISOString(),
                modified: post.modifiedAt.toISOString(),
                jetpack_featured_media_url: post.featuredImage
            };
        });
    } catch (error) {
        console.error(`[PostCache] Error getting today's posts for account ${accountId}:`, error.message);
        throw error;
    }
};

/**
 * Очистка старого кэша (старше определенного времени)
 */
exports.cleanOldCache = async (maxAgeInDays = 30) => {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - maxAgeInDays);

        const deletedCount = await CachedPost.destroy({
            where: {
                syncedAt: {
                    [Op.lt]: cutoffDate
                }
            }
        });

        console.log(`[PostCache] Cleaned ${deletedCount} old cached posts (older than ${maxAgeInDays} days)`);
        return deletedCount;
    } catch (error) {
        console.error('[PostCache] Error cleaning old cache:', error.message);
        throw error;
    }
};

/**
 * Очистка кеша для Live задач - оставляет только посты за последние сутки
 */
exports.cleanLiveCache = async (accountId) => {
    try {
        // Получаем дату 24 часа назад
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        const deletedCount = await CachedPost.destroy({
            where: {
                accountId: accountId,
                publishedAt: {
                    [Op.lt]: oneDayAgo
                }
            }
        });

        console.log(`[PostCache] Cleaned Live cache for account ${accountId}: removed ${deletedCount} posts older than 24 hours`);
        return deletedCount;
    } catch (error) {
        console.error(`[PostCache] Error cleaning Live cache for account ${accountId}:`, error.message);
        throw error;
    }
};

/**
 * Получение статистики кэша
 */
exports.getCacheStats = async () => {
    try {
        const stats = await CachedPost.findAll({
            attributes: [
                'accountId',
                [CachedPost.sequelize.fn('COUNT', '*'), 'count'],
                [CachedPost.sequelize.fn('MAX', CachedPost.sequelize.col('syncedAt')), 'lastSync']
            ],
            group: ['accountId'],
            include: [{
                model: Account,
                attributes: ['id', 'name']
            }]
        });

        return stats.map(stat => ({
            accountId: stat.accountId,
            accountName: stat.Account?.name || 'Unknown',
            cachedPosts: parseInt(stat.get('count')),
            lastSync: stat.get('lastSync')
        }));
    } catch (error) {
        console.error('[PostCache] Error getting cache stats:', error.message);
        throw error;
    }
}; 