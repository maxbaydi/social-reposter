const { processTextForVk, addHashtagsToVk, validateVkTextLength, truncateVkText } = require('./vkFormatter');

/**
 * Очищает контент от нежелательных элементов (реклама, скрипты, шорткоды)
 * @param {string} content - Исходный контент
 * @returns {string} - Очищенный контент
 */
const cleanContent = (content) => {
    let cleaned = content;
    
    console.log(`[cleanContent] Input: "${content.substring(0, 200)}..."`);
    
    // 1. Убираем JavaScript код (AdSense и другие) - улучшенный регекс
    cleaned = cleaned.replace(/\(adsbygoogle\s*=\s*window\.adsbygoogle\s*\|\|\s*\[\]\)\.push\(\{[^}]*\}\)\s*;?\s*/gi, '');
    cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    cleaned = cleaned.replace(/window\.[^;]+;/gi, '');
    cleaned = cleaned.replace(/adsbygoogle[^;]*;?/gi, '');
    
    // 2. Убираем WordPress шорткоды
    cleaned = cleaned.replace(/\[[^\]]*\]/g, '');
    
    // 3. Убираем рекламные блоки и элементы
    cleaned = cleaned.replace(/\.ads?\s*{[^}]*}/gi, '');
    cleaned = cleaned.replace(/google_ad[^;]*;/gi, '');
    
    // 4. Убираем лишние пробелы и переносы строк, но сохраняем структуру предложений
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // 5. Убираем начальные и конечные пробелы вокруг знаков препинания
    cleaned = cleaned.replace(/\s*([.!?;,])\s*/g, '$1 ').trim();
    
    console.log(`[cleanContent] Output: "${cleaned.substring(0, 200)}..."`);
    
    return cleaned;
};

/**
 * Заменяет шорткоды в шаблоне на реальные данные поста.
 * @param {string} templateContent - Содержимое шаблона.
 * @param {object} post - Объект поста из WordPress API.
 * @returns {string} - Обработанный текст для публикации.
 */
exports.processTemplate = (templateContent, post) => {
    let content = templateContent;
    // Получаем excerpt - берем только первый абзац
    let excerptRaw = post.excerpt.rendered.trim();
    
    console.log(`[templateProcessor] Raw excerpt: "${excerptRaw.substring(0, 200)}..."`);
    
    // СНАЧАЛА разбиваем на абзацы по HTML тегам (до удаления HTML!)
    const paragraphs = excerptRaw.split(/<\/p>\s*<p[^>]*>|<br\s*\/?>\s*<br\s*\/?>|\n\s*\n|\r\n\s*\r\n/);
    
    let excerpt = '';
    if (paragraphs.length > 0) {
        // Берем первый абзац
        excerpt = paragraphs[0].trim();
        
        // ТЕПЕРЬ убираем HTML теги из первого абзаца
        excerpt = excerpt.replace(/<[^>]*>/g, '').trim();
        
        // Очищаем от мусора (реклама, скрипты, шорткоды)
        excerpt = cleanContent(excerpt);
        
        // Убираем HTML entities
        excerpt = excerpt.replace(/&[^;]+;/g, ' ').trim();
        
        // Нормализуем пробелы
        excerpt = excerpt.replace(/\s+/g, ' ').trim();
        
        console.log(`[templateProcessor] Extracted first paragraph: "${excerpt}" (length: ${excerpt.length})`);
    }
    
    // Проверяем, не обрезается ли excerpt посередине предложения
    // Если excerpt заканчивается не на знак препинания, пытаемся взять больше контента
    const isExcerptIncomplete = excerpt && !excerpt.match(/[.!?;]\s*$/);
    
    if (!excerpt || excerpt.length < 30 || isExcerptIncomplete) {
        if (isExcerptIncomplete) {
            console.log('[templateProcessor] Excerpt seems incomplete (no sentence ending), trying content field');
        } else {
            console.log('[templateProcessor] Excerpt too short, trying content field');
        }
        
        // Пробуем взять из content поста полный первый абзац
        if (post.content && post.content.rendered) {
            let contentRaw = post.content.rendered.trim();
            
            // СНАЧАЛА разбиваем по HTML, ПОТОМ удаляем теги
            const contentParagraphs = contentRaw.split(/<\/p>\s*<p[^>]*>|<br\s*\/?>\s*<br\s*\/?>|\n\s*\n|\r\n\s*\r\n/);
            if (contentParagraphs.length > 0) {
                let contentParagraph = contentParagraphs[0].trim();
                
                // Убираем HTML теги
                contentParagraph = contentParagraph.replace(/<[^>]*>/g, '').trim();
                
                // Очищаем от мусора (реклама, скрипты, шорткоды)
                contentParagraph = cleanContent(contentParagraph);
                
                // Убираем HTML entities и нормализуем пробелы
                contentParagraph = contentParagraph.replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
                
                // Используем контент если он длиннее или завершает предложение
                if (contentParagraph.length > excerpt.length || contentParagraph.match(/[.!?;]\s*$/)) {
                    excerpt = contentParagraph;
                    console.log(`[templateProcessor] Used content first paragraph: "${excerpt}" (length: ${excerpt.length})`);
                }
            }
        }
    }
    const tags = post._embedded?.['wp:term']?.[1]?.map(t => t.name).join(', ') || '';

    // Получаем URL изображения из разных возможных источников
    let imageUrl = '';
    if (post.jetpack_featured_media_url) {
        // Jetpack featured media
        imageUrl = post.jetpack_featured_media_url;
    } else if (post._embedded && post._embedded['wp:featuredmedia'] && post._embedded['wp:featuredmedia'][0]) {
        // Стандартное WordPress featured media из embedded данных
        const featuredMedia = post._embedded['wp:featuredmedia'][0];
        imageUrl = featuredMedia.source_url || featuredMedia.media_details?.sizes?.full?.source_url || '';
    }

    const replacements = {
        '{post_title}': post.title.rendered,
        '{post_url}': post.link,
        '{post_excerpt}': excerpt,
        '{post_image}': content.includes('{post_image}') ? imageUrl : '', // Условно добавляем изображение
        '{post_tags}': tags,
    };

    for (const key in replacements) {
        content = content.replace(new RegExp(key, 'g'), replacements[key]);
    }

    console.log('Processed template:', {
        original: templateContent,
        processed: content,
        replacements: replacements
    });

    return content;
};

/**
 * Обрабатывает шаблон специально для VK с форматированием HTML
 * @param {string} templateContent - Содержимое шаблона.
 * @param {object} post - Объект поста из WordPress API.
 * @returns {string} - Обработанный текст для VK с форматированием.
 */
exports.processTemplateForVk = (templateContent, post) => {
    console.log(`[templateProcessor] Processing template for VK with HTML formatting`);
    
    let content = templateContent;
    
    // ВАЖНО: Преобразуем буквальные \n в реальные переносы строк
    content = content.replace(/\\n/g, '\n');
    console.log(`[templateProcessor] After converting \\n to real line breaks: "${content.substring(0, 100)}..."`);
    
    // Получаем excerpt - берем только первый абзац, НО СОХРАНЯЕМ HTML для VK форматирования
    let excerptRaw = post.excerpt.rendered.trim();
    
    console.log(`[templateProcessor] Raw excerpt for VK: "${excerptRaw.substring(0, 200)}..."`);
    
    // СНАЧАЛА разбиваем на абзацы по HTML тегам (сохраняем HTML!)
    const paragraphs = excerptRaw.split(/<\/p>\s*<p[^>]*>|<br\s*\/?>\s*<br\s*\/?>|\n\s*\n|\r\n\s*\r\n/);
    
    let excerpt = '';
    if (paragraphs.length > 0) {
        // Берем первый абзац с HTML тегами
        excerpt = paragraphs[0].trim();
        
        console.log(`[templateProcessor] VK first paragraph with HTML: "${excerpt}" (length: ${excerpt.length})`);
    }
    
    // Проверяем, не обрезается ли excerpt посередине предложения
    // Убираем HTML для проверки, но временно
    const excerptTextOnly = excerpt.replace(/<[^>]*>/g, '').trim();
    const isExcerptIncomplete = excerptTextOnly && !excerptTextOnly.match(/[.!?;]\s*$/);
    
    if (!excerptTextOnly || excerptTextOnly.length < 30 || isExcerptIncomplete) {
        if (isExcerptIncomplete) {
            console.log('[templateProcessor] VK excerpt seems incomplete (no sentence ending), trying content field');
        } else {
            console.log('[templateProcessor] VK excerpt too short, trying content field');
        }
        
        // Пробуем взять из content поста полный первый абзац С HTML
        if (post.content && post.content.rendered) {
            let contentRaw = post.content.rendered.trim();
            
            // СНАЧАЛА разбиваем по HTML, сохраняем HTML теги
            const contentParagraphs = contentRaw.split(/<\/p>\s*<p[^>]*>|<br\s*\/?>\s*<br\s*\/?>|\n\s*\n|\r\n\s*\r\n/);
            if (contentParagraphs.length > 0) {
                let contentParagraph = contentParagraphs[0].trim();
                
                // Проверяем длину без HTML
                const contentTextOnly = contentParagraph.replace(/<[^>]*>/g, '').trim();
                
                // Используем контент если он длиннее или завершает предложение
                if (contentTextOnly.length > excerptTextOnly.length || contentTextOnly.match(/[.!?;]\s*$/)) {
                    excerpt = contentParagraph;
                    console.log(`[templateProcessor] VK used content first paragraph with HTML: "${excerpt.substring(0, 200)}..." (length: ${excerpt.length})`);
                }
            }
        }
    }
    
    // ТЕПЕРЬ обрабатываем HTML для VK с поддержкой хэштегов
    const tags = post._embedded?.['wp:term']?.[1]?.map(t => t.name).join(', ') || '';
    
    // ИСПРАВЛЕНО: хэштеги добавляются ТОЛЬКО если в шаблоне есть {post_tags}
    const shouldAddHashtags = content.includes('{post_tags}');
    const vkFormattedExcerpt = processTextForVk(excerpt, shouldAddHashtags ? tags : '');

    // Получаем URL изображения из разных возможных источников
    let imageUrl = '';
    if (post.jetpack_featured_media_url) {
        // Jetpack featured media
        imageUrl = post.jetpack_featured_media_url;
    } else if (post._embedded && post._embedded['wp:featuredmedia'] && post._embedded['wp:featuredmedia'][0]) {
        // Стандартное WordPress featured media из embedded данных
        const featuredMedia = post._embedded['wp:featuredmedia'][0];
        imageUrl = featuredMedia.source_url || featuredMedia.media_details?.sizes?.full?.source_url || '';
    }

    const replacements = {
        '{post_title}': post.title.rendered,
        '{post_url}': '', // Для VK ссылка НЕ добавляется в текст, только как attachment
        '{post_excerpt}': vkFormattedExcerpt, // Используем VK-форматированный excerpt с условными хэштегами
        '{post_image}': content.includes('{post_image}') ? imageUrl : '', // Условно добавляем изображение
        '{post_tags}': tags,
    };

    for (const key in replacements) {
        content = content.replace(new RegExp(key, 'g'), replacements[key]);
    }

    // Проверяем финальную длину текста для VK
    const validation = validateVkTextLength(content);
    if (!validation.isValid) {
        console.log(`[templateProcessor] VK final text too long (${validation.length}/${validation.maxLength}), truncating...`);
        content = truncateVkText(content);
    }

    console.log('VK Processed template:', {
        original: templateContent,
        processed: content.substring(0, 300) + '...',
        vkFormattedExcerpt: vkFormattedExcerpt.substring(0, 200) + '...',
        finalLength: content.length,
        maxLength: validation.maxLength
    });

    return content;
};

/**
 * Обрабатывает шаблон специально для Telegram - убирает ссылки на изображения из текста
 * @param {string} templateContent - Содержимое шаблона.
 * @param {object} post - Объект поста из WordPress API.
 * @returns {string} - Обработанный текст для Telegram без ссылок на изображения.
 */
exports.processTemplateForTelegram = (templateContent, post) => {
    console.log(`[templateProcessor] Processing template for Telegram`);
    
    let content = templateContent;
    // Получаем excerpt - берем только первый абзац
    let excerptRaw = post.excerpt.rendered.trim();
    
    console.log(`[templateProcessor] Raw excerpt: "${excerptRaw.substring(0, 200)}..."`);
    
    // СНАЧАЛА разбиваем на абзацы по HTML тегам (до удаления HTML!)
    const paragraphs = excerptRaw.split(/<\/p>\s*<p[^>]*>|<br\s*\/?>\s*<br\s*\/?>|\n\s*\n|\r\n\s*\r\n/);
    
    let excerpt = '';
    if (paragraphs.length > 0) {
        // Берем первый абзац
        excerpt = paragraphs[0].trim();
        
        // ТЕПЕРЬ убираем HTML теги из первого абзаца
        excerpt = excerpt.replace(/<[^>]*>/g, '').trim();
        
        // Очищаем от мусора (реклама, скрипты, шорткоды)
        excerpt = cleanContent(excerpt);
        
        // Убираем HTML entities
        excerpt = excerpt.replace(/&[^;]+;/g, ' ').trim();
        
        // Нормализуем пробелы
        excerpt = excerpt.replace(/\s+/g, ' ').trim();
        
        console.log(`[templateProcessor] Telegram extracted first paragraph: "${excerpt}" (length: ${excerpt.length})`);
    }
    
    // Проверяем, не обрезается ли excerpt посередине предложения
    // Если excerpt заканчивается не на знак препинания, пытаемся взять больше контента
    const isExcerptIncomplete = excerpt && !excerpt.match(/[.!?;]\s*$/);
    
    if (!excerpt || excerpt.length < 30 || isExcerptIncomplete) {
        if (isExcerptIncomplete) {
            console.log('[templateProcessor] Telegram excerpt seems incomplete (no sentence ending), trying content field');
        } else {
            console.log('[templateProcessor] Telegram excerpt too short, trying content field');
        }
        
        // Пробуем взять из content поста полный первый абзац
        if (post.content && post.content.rendered) {
            let contentRaw = post.content.rendered.trim();
            
            // СНАЧАЛА разбиваем по HTML, ПОТОМ удаляем теги
            const contentParagraphs = contentRaw.split(/<\/p>\s*<p[^>]*>|<br\s*\/?>\s*<br\s*\/?>|\n\s*\n|\r\n\s*\r\n/);
            if (contentParagraphs.length > 0) {
                let contentParagraph = contentParagraphs[0].trim();
                
                // Убираем HTML теги
                contentParagraph = contentParagraph.replace(/<[^>]*>/g, '').trim();
                
                // Очищаем от мусора (реклама, скрипты, шорткоды)
                contentParagraph = cleanContent(contentParagraph);
                
                // Убираем HTML entities и нормализуем пробелы
                contentParagraph = contentParagraph.replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
                
                // Используем контент если он длиннее или завершает предложение
                if (contentParagraph.length > excerpt.length || contentParagraph.match(/[.!?;]\s*$/)) {
                    excerpt = contentParagraph;
                    console.log(`[templateProcessor] Telegram used content first paragraph: "${excerpt}" (length: ${excerpt.length})`);
                }
            }
        }
    }
    const tags = post._embedded?.['wp:term']?.[1]?.map(t => t.name).join(', ') || '';

    const replacements = {
        '{post_title}': post.title.rendered,
        '{post_url}': post.link,
        '{post_excerpt}': excerpt,
        '{post_image}': '', // Для Telegram убираем ссылку на изображение из текста
        '{post_tags}': tags,
    };

    for (const key in replacements) {
        content = content.replace(new RegExp(key, 'g'), replacements[key]);
    }

    console.log('Telegram Processed template:', {
        original: templateContent,
        processed: content,
        replacements: replacements
    });

    return content;
}; 