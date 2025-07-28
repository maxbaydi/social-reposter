const axios = require('axios');
const Account = require('../db/models/Account');
const { getPosts, getPostsFromCache } = require('../services/wordpressService');
const { processTemplate, processTemplateForVk, processTemplateForTelegram } = require('../services/templateProcessor');
const Template = require('../db/models/Template');
const User = require('../db/models/User');

// Получить категории и теги с сайта WordPress
exports.getWpTerms = async (req, res) => {
    const { accountId } = req.params;
    
    console.log(`[getWpTerms] Request for account ID: ${accountId}`);
    
    try {
        const account = await Account.findOne({ where: { id: accountId, userId: req.user.id, type: 'wordpress' } });
        if (!account) {
            console.log(`[getWpTerms] WordPress account not found for ID: ${accountId}`);
            return res.status(404).json({ message: 'WordPress account not found' });
        }

        console.log(`[getWpTerms] Found account: ${account.name}`);
        console.log(`[getWpTerms] Account credentials keys:`, Object.keys(account.credentials || {}));

        const { url, username, applicationPassword } = account.credentials;
        
        if (!url || !username || !applicationPassword) {
            console.error('[getWpTerms] Missing WordPress credentials:', { 
                url: !!url, 
                username: !!username, 
                applicationPassword: !!applicationPassword,
                fullCredentials: account.credentials
            });
            return res.status(400).json({ message: 'Invalid WordPress credentials format. Please re-add your WordPress account.' });
        }

        // Очищаем Application Password от пробелов
        const cleanPassword = applicationPassword.replace(/\s+/g, '');
        const authHeader = `Basic ${Buffer.from(`${username}:${cleanPassword}`).toString('base64')}`;
        const baseUrl = url.replace(/\/$/, "");

        console.log(`[getWpTerms] Fetching WP terms for account ${accountId} from ${baseUrl}`);

        const [categoriesRes, tagsRes] = await Promise.all([
            axios.get(`${baseUrl}/wp-json/wp/v2/categories?per_page=100`, { 
                headers: { 'Authorization': authHeader },
                timeout: 10000
            }),
            axios.get(`${baseUrl}/wp-json/wp/v2/tags?per_page=100`, { 
                headers: { 'Authorization': authHeader },
                timeout: 10000
            })
        ]);

        console.log(`[getWpTerms] Successfully fetched ${categoriesRes.data.length} categories and ${tagsRes.data.length} tags`);

        res.json({
            categories: categoriesRes.data.map(c => ({ id: c.id, name: c.name })),
            tags: tagsRes.data.map(t => ({ id: t.id, name: t.name })),
        });

    } catch (error) {
        console.error("[getWpTerms] Error fetching WP terms:", error.message);
        console.error("[getWpTerms] Error details:", {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            stack: error.stack
        });
        res.status(500).json({ message: 'Failed to fetch categories and tags from WordPress: ' + error.message });
    }
};

// Получить отрендеренный предпросмотр шаблона
exports.getTemplatePreview = async (req, res) => {
    const { accountId, templateId, content, platform = 'telegram' } = req.body;
    
    try {
        const account = await Account.findOne({ where: { id: accountId, userId: req.user.id } });
        if (!account) {
            return res.status(404).json({ message: 'Account not found' });
        }
        
        let templateContent;
        
        // Если передан content, используем его для предпросмотра
        if (content) {
            templateContent = content;
            console.log(`Generating template preview for account ${accountId} with custom content for ${platform}`);
        } else if (templateId) {
            // Иначе используем сохраненный шаблон
            const template = await Template.findByPk(templateId);
            if (!template) {
                return res.status(404).json({ message: 'Template not found' });
            }
            templateContent = template.content;
            console.log(`Generating template preview for account ${accountId}, template ${templateId} for ${platform}`);
        } else {
            return res.status(400).json({ message: 'Either templateId or content must be provided' });
        }

        // Получаем посты из кэша для примера (быстрее чем прямой запрос к WordPress)
        let posts;
        try {
            posts = await getPostsFromCache(accountId, {});
        } catch (cacheError) {
            console.log(`Cache not available for account ${accountId}, falling back to direct WordPress request`);
            posts = await getPosts(account.credentials, {});
        }
        
        if (posts.length === 0) {
            console.log(`No posts found for account ${accountId}`);
            return res.status(404).json({ message: 'No posts found on the source site to generate a preview.' });
        }
        
        console.log(`Found ${posts.length} posts, using first post for preview: "${posts[0].title.rendered}"`);
        
        // Используем правильную обработку в зависимости от платформы
        let previewContent;
        if (platform === 'vk') {
            previewContent = processTemplateForVk(templateContent, posts[0]);
        } else if (platform === 'telegram') {
            previewContent = processTemplateForTelegram(templateContent, posts[0]);
        } else {
            previewContent = processTemplate(templateContent, posts[0]);
        }
        
        // Получаем URL изображения из обработанного поста
        let previewImage = '';
        
        // ИСПРАВЛЕНО: изображение показывается ТОЛЬКО если в шаблоне есть {post_image}
        const shouldShowImage = templateContent.includes('{post_image}');
        
        if (shouldShowImage) {
            if (posts[0].jetpack_featured_media_url) {
                previewImage = posts[0].jetpack_featured_media_url;
            } else if (posts[0]._embedded && posts[0]._embedded['wp:featuredmedia'] && posts[0]._embedded['wp:featuredmedia'][0]) {
                const featuredMedia = posts[0]._embedded['wp:featuredmedia'][0];
                previewImage = featuredMedia.source_url || featuredMedia.media_details?.sizes?.full?.source_url || '';
            }
        }

        res.json({
            content: previewContent,
            image: previewImage,
            postTitle: posts[0].title.rendered.replace(/&[^;]+;/g, (entity) => {
                // Декодируем основные HTML entities для заголовка
                const entityMap = {
                    '&amp;': '&',
                    '&lt;': '<',
                    '&gt;': '>',
                    '&quot;': '"',
                    '&#039;': "'",
                    '&#171;': '«',
                    '&#187;': '»',
                    '&nbsp;': ' '
                };
                return entityMap[entity] || entity;
            }),
            platform: platform
        });

    } catch (error) {
        console.error('Error generating template preview:', error.message, error.stack);
        res.status(500).json({ message: 'Failed to generate preview: ' + error.message });
    }
}; 