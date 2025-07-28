const axios = require('axios');

// Простое кэширование постов для preview
const postsCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

// Функция для получения кэш-ключа
const getCacheKey = (credentials, filterSettings) => {
    return `${credentials.url}-${JSON.stringify(filterSettings)}`;
};

// Функция для проверки актуальности кэша
const isCacheValid = (cacheEntry) => {
    return cacheEntry && (Date.now() - cacheEntry.timestamp) < CACHE_DURATION;
};

// Функция повторных попыток для запросов
const retryRequest = async (requestFn, maxRetries = 3, delay = 1000) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await requestFn();
        } catch (error) {
            if (attempt === maxRetries) {
                throw error;
            }
            
            console.warn(`Request attempt ${attempt} failed: ${error.message}, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 1.5; // Увеличиваем задержку для следующей попытки
        }
    }
};

const getClient = (credentials) => {
    const { url, username, applicationPassword } = credentials;
    // Очищаем Application Password от пробелов
    const cleanPassword = applicationPassword.replace(/\s+/g, '');
    const authHeader = `Basic ${Buffer.from(`${username}:${cleanPassword}`).toString('base64')}`;
    const client = axios.create({
        baseURL: `${url.replace(/\/$/, "")}/wp-json/wp/v2/`,
        headers: { 'Authorization': authHeader }
    });
    return client;
};


/**
 * Получение постов из БД кэша для preview (если есть accountId)
 * @param {number} accountId - ID аккаунта
 * @param {object} filterSettings - Настройки фильтрации
 * @returns {Promise<Array>} - Массив постов
 */
exports.getPostsFromCache = async (accountId, filterSettings = {}) => {
    try {
        console.log(`[WordPress] Getting posts from cache for account ${accountId}`);
        // Динамический импорт для избежания циклических зависимостей
        const { getCachedPosts } = require('./postCacheService');
        const posts = await getCachedPosts(accountId, filterSettings);
        console.log(`[WordPress] Retrieved ${posts.length} posts from database cache`);
        return posts;
    } catch (error) {
        console.error(`[WordPress] Error getting posts from cache for account ${accountId}:`, error.message);
        throw error;
    }
};

/**
 * Получение постов с фильтрами для запланированных задач.
 * @param {object} credentials - Учетные данные WP.
 * @param {object} filterSettings - Настройки фильтрации { startDate, endDate, categories, tags }.
 * @returns {Promise<Array>} - Массив постов.
 */
exports.getPosts = async (credentials, filterSettings = {}) => {
    // Проверяем кэш для preview запросов (только без фильтров или с пустыми фильтрами)
    const isPreviewRequest = Object.keys(filterSettings).length === 0 || 
                            (!filterSettings.dateFrom && !filterSettings.dateTo && 
                             !filterSettings.startDate && !filterSettings.endDate && 
                             (!filterSettings.categories || filterSettings.categories.length === 0) && 
                             (!filterSettings.tags || filterSettings.tags.length === 0));
    
    if (isPreviewRequest) {
        const cacheKey = getCacheKey(credentials, filterSettings);
        const cached = postsCache.get(cacheKey);
        
        if (isCacheValid(cached)) {
            console.log(`Using cached posts for preview (${cached.data.length} posts)`);
            return cached.data;
        }
    }
    
    const client = getClient(credentials);
    const { dateFrom, dateTo, startDate, endDate, categories, tags } = filterSettings;
    
    // Поддерживаем как новые (dateFrom/dateTo), так и старые (startDate/endDate) имена параметров
    const finalStartDate = dateFrom || startDate;
    const finalEndDate = dateTo || endDate;

    const baseParams = {
        per_page: 100, // WordPress максимум 100 постов за запрос
        status: 'publish',
        _embed: 'wp:term,wp:featuredmedia', // Получаем теги, категории и изображения
        after: finalStartDate ? new Date(finalStartDate).toISOString() : undefined,
        before: finalEndDate ? new Date(finalEndDate).toISOString() : undefined,
        categories: categories && categories.length > 0 ? categories.join(',') : undefined,
        tags: tags && tags.length > 0 ? tags.join(',') : undefined,
    };
    
    // Удаляем пустые параметры
    Object.keys(baseParams).forEach(key => (baseParams[key] === undefined || baseParams[key] === '') && delete baseParams[key]);

    try {
        console.log('Fetching WordPress posts with params:', baseParams);
        if (finalStartDate || finalEndDate) {
            console.log(`Date filter applied: from ${finalStartDate} to ${finalEndDate}`);
        }
        
        let allPosts = [];
        let currentPage = 1;
        let hasMorePages = true;

        // Получаем все посты через пагинацию с задержками
        while (hasMorePages) {
            const params = { ...baseParams, page: currentPage };
            
            try {
                const response = await retryRequest(() => client.get('posts', { params }));
                
                allPosts.push(...response.data);
                
                // Проверяем есть ли еще страницы
                const totalPages = parseInt(response.headers['x-wp-totalpages'] || '1');
                hasMorePages = currentPage < totalPages && response.data.length === 100;
                currentPage++;
                
                console.log(`Fetched page ${currentPage - 1}: ${response.data.length} posts (total so far: ${allPosts.length})`);
                
                // Добавляем задержку между запросами чтобы не перегружать сервер
                if (hasMorePages) {
                    await new Promise(resolve => setTimeout(resolve, 500)); // 500ms задержка
                }
            } catch (pageError) {
                console.warn(`Failed to fetch page ${currentPage} after retries, stopping pagination:`, pageError.message);
                break; // Прерываем цикл если страница не загрузилась даже после повторов
            }
        }
        
        console.log(`Successfully fetched ${allPosts.length} posts from WordPress (${currentPage - 1} pages)`);
        
        // Сохраняем в кэш для preview запросов
        if (isPreviewRequest) {
            const cacheKey = getCacheKey(credentials, filterSettings);
            postsCache.set(cacheKey, {
                data: allPosts,
                timestamp: Date.now()
            });
            console.log(`Cached ${allPosts.length} posts for preview requests`);
        }
        
        return allPosts;
    } catch (error) {
        console.error('Failed to get posts from WordPress', error.message);
        console.error('Error details:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data
        });
        throw new Error('Could not fetch posts from WordPress.');
    }
};

/**
 * Получение последних постов для Live-репостинга.
 * @param {object} credentials - Учетные данные WP.
 * @param {string} afterDateISO - Дата в формате ISO, после которой искать посты.
 * @returns {Promise<Array>} - Массив постов.
 */
exports.getLatestPosts = async (credentials, afterDateISO) => {
    const client = getClient(credentials);
    try {
        const baseParams = { 
            per_page: 100,
            after: afterDateISO,
            status: 'publish',
            orderby: 'date',
            order: 'asc',
            _embed: 'wp:term,wp:featuredmedia' // Получаем теги, категории и изображения
        };
        
        console.log('Fetching latest WordPress posts with params:', baseParams);
        
        let allPosts = [];
        let currentPage = 1;
        let hasMorePages = true;

        // Получаем все новые посты через пагинацию с задержками
        while (hasMorePages) {
            const params = { ...baseParams, page: currentPage };
            
            try {
                const response = await retryRequest(() => client.get('posts', { params }));
                
                allPosts.push(...response.data);
                
                // Проверяем есть ли еще страницы
                const totalPages = parseInt(response.headers['x-wp-totalpages'] || '1');
                hasMorePages = currentPage < totalPages && response.data.length === 100;
                currentPage++;
                
                console.log(`Fetched latest page ${currentPage - 1}: ${response.data.length} posts (total so far: ${allPosts.length})`);
                
                // Добавляем задержку между запросами
                if (hasMorePages) {
                    await new Promise(resolve => setTimeout(resolve, 500)); // 500ms задержка
                }
            } catch (pageError) {
                console.warn(`Failed to fetch latest page ${currentPage} after retries, stopping pagination:`, pageError.message);
                break; // Прерываем цикл если страница не загрузилась даже после повторов
            }
        }
        
        console.log(`Successfully fetched ${allPosts.length} latest posts from WordPress`);
        return allPosts;
    } catch (error) {
        console.error('Failed to get latest posts from WordPress', error.message);
        console.error('Error details:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data
        });
        throw new Error('Could not fetch latest posts from WordPress.');
    }
}; 