/**
 * Подсчитывает количество символов только в тексте поста, исключая ссылки и изображения
 * @param {string} content - Полный контент поста
 * @returns {number} - Количество символов в тексте
 */
const countTelegramTextLength = (content) => {
    // Убираем ссылки на изображения
    let textOnly = content.replace(/\{post_image\}/g, '');
    
    // Убираем URL поста (оставляем только текст)
    textOnly = textOnly.replace(/\{post_url\}/g, '');
    
    // Убираем лишние пробелы и переносы строк
    textOnly = textOnly.replace(/\s+/g, ' ').trim();
    
    return textOnly.length;
};

/**
 * Обрезает текст поста до указанной длины, сохраняя целостность предложений
 * @param {string} content - Исходный контент
 * @param {number} maxLength - Максимальная длина (по умолчанию 900)
 * @returns {string} - Обрезанный контент
 */
const truncateTelegramText = (content, maxLength = 600) => {
    // Убираем ссылки на изображения и URL для подсчета
    let textOnly = content.replace(/\{post_image\}/g, '');
    textOnly = textOnly.replace(/\{post_url\}/g, '');
    
    if (textOnly.length <= maxLength) {
        return content; // Не нужно обрезать
    }
    
    // Находим позицию для обрезки, стараясь не разрывать предложения
    const punctuationMarks = ['.', '!', '?', ';', ','];
    let bestCutPosition = maxLength;
    
    // Ищем ближайший знак препинания перед maxLength
    for (let i = maxLength; i >= Math.max(0, maxLength - 100); i--) {
        if (punctuationMarks.includes(textOnly[i])) {
            bestCutPosition = i + 1;
            break;
        }
    }
    
    // Если не нашли знак препинания, ищем пробел
    if (bestCutPosition === maxLength) {
        for (let i = maxLength; i >= Math.max(0, maxLength - 50); i--) {
            if (textOnly[i] === ' ') {
                bestCutPosition = i;
                break;
            }
        }
    }
    
    // Обрезаем только текстовую часть
    const truncatedText = textOnly.substring(0, bestCutPosition).trim();
    
    // Восстанавливаем плейсхолдеры в правильных позициях
    let result = truncatedText;
    
    // Добавляем плейсхолдеры обратно, если они были в оригинальном контенте
    if (content.includes('{post_image}')) {
        result += ' {post_image}';
    }
    if (content.includes('{post_url}')) {
        result += ' {post_url}';
    }
    
    return result.trim();
};

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
    
    // Берем первый абзац
    let excerpt = paragraphs[0].trim();
    
    // Убираем HTML теги
    excerpt = excerpt.replace(/<[^>]*>/g, '').trim();
    
    // Очищаем от мусора
    excerpt = cleanContent(excerpt);
    
    // Убираем HTML entities
    excerpt = excerpt.replace(/&[^;]+;/g, ' ').trim();
    
    console.log(`[templateProcessor] Telegram extracted first paragraph: "${excerpt}" (length: ${excerpt.length})`);
    
    // Если excerpt кажется неполным (нет окончания предложения), пробуем content
    if (!excerpt.match(/[.!?;]\s*$/)) {
        console.log(`[templateProcessor] Telegram excerpt seems incomplete (no sentence ending), trying content field`);
        
        let contentRaw = post.content.rendered.trim();
        const contentParagraphs = contentRaw.split(/<\/p>\s*<p[^>]*>|<br\s*\/?>\s*<br\s*\/?>|\n\s*\n|\r\n\s*\r\n/);
        
        if (contentParagraphs[0]) {
            let contentExcerpt = contentParagraphs[0].trim();
            contentExcerpt = contentExcerpt.replace(/<[^>]*>/g, '').trim();
            contentExcerpt = cleanContent(contentExcerpt);
            contentExcerpt = contentExcerpt.replace(/&[^;]+;/g, ' ').trim();
            
            console.log(`[templateProcessor] Telegram used content first paragraph: "${contentExcerpt}" (length: ${contentExcerpt.length})`);
            
            if (contentExcerpt.length > excerpt.length) {
                excerpt = contentExcerpt;
            }
        }
    }
    
    // ПРОВЕРЯЕМ ДЛИНУ ТОЛЬКО ТЕКСТА EXCERPT ПЕРЕД ЗАМЕНОЙ
    const maxExcerptLength = 400; // Максимальная длина для excerpt
    if (excerpt.length > maxExcerptLength) {
        console.log(`[templateProcessor] Telegram excerpt too long (${excerpt.length} chars), truncating to ${maxExcerptLength}`);
        excerpt = truncateTelegramText(excerpt, maxExcerptLength);
        console.log(`[templateProcessor] Telegram excerpt truncated to ${excerpt.length} characters`);
    }
    
    // Заменяем плейсхолдеры
    const replacements = {
        '{post_title}': post.title.rendered,
        '{post_url}': post.link,
        '{post_excerpt}': excerpt, // Уже обрезанный excerpt
        '{post_image}': '',
        '{post_tags}': ''
    };
    
    for (const key in replacements) {
        content = content.replace(new RegExp(key, 'g'), replacements[key]);
    }
    
    // Проверяем общую длину текста после замены
    const textLength = countTelegramTextLength(content);
    const maxTelegramLength = 900;
    
    console.log(`[templateProcessor] Telegram final text length check: ${textLength}/${maxTelegramLength} characters`);
    
    if (textLength > maxTelegramLength) {
        console.log(`[templateProcessor] WARNING: Final text still too long (${textLength} chars), but excerpt already truncated`);
    }
    
    console.log('Telegram Processed template:', {
        original: templateContent,
        processed: content,
        replacements: replacements,
        finalTextLength: textLength
    });
    
    return content;
}; 

/**
 * Обрабатывает шаблон для VK - упрощенная версия без специального форматирования
 * @param {string} templateContent - Содержимое шаблона.
 * @param {object} post - Объект поста из WordPress API.
 * @returns {string} - Обработанный текст для VK.
 */
exports.processTemplateForVk = (templateContent, post) => {
    console.log(`[templateProcessor] Processing template for VK (with HTML formatting)`);
    
    let content = templateContent;
    
    // Получаем excerpt - берем только первый абзац
    let excerptRaw = post.excerpt.rendered.trim();
    
    console.log(`[templateProcessor] Raw excerpt for VK: "${excerptRaw.substring(0, 200)}..."`);
    
    // СНАЧАЛА разбиваем на абзацы по HTML тегам (до удаления HTML!)
    const paragraphs = excerptRaw.split(/<\/p>\s*<p[^>]*>|<br\s*\/?>\s*<br\s*\/?>|\n\s*\n|\r\n\s*\r\n/);
    
    let excerpt = '';
    if (paragraphs.length > 0) {
        // Берем первый абзац
        excerpt = paragraphs[0].trim();
        
        console.log(`[templateProcessor] VK first paragraph: "${excerpt}" (length: ${excerpt.length})`);
    }
    
    // Убираем HTML теги
    excerpt = excerpt.replace(/<[^>]*>/g, '').trim();
    
    // Очищаем от мусора (реклама, скрипты, шорткоды)
    excerpt = cleanContent(excerpt);
    
    // Убираем HTML entities и нормализуем пробелы
    excerpt = excerpt.replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Проверяем, не обрезается ли excerpt посередине предложения
    const isExcerptIncomplete = excerpt && !excerpt.match(/[.!?;]\s*$/);
    
    if (!excerpt || excerpt.length < 30 || isExcerptIncomplete) {
        if (isExcerptIncomplete) {
            console.log('[templateProcessor] VK excerpt seems incomplete (no sentence ending), trying content field');
        } else {
            console.log('[templateProcessor] VK excerpt too short, trying content field');
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
                    console.log(`[templateProcessor] VK used content first paragraph: "${excerpt}" (length: ${excerpt.length})`);
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

    // ИСПРАВЛЕНО: для VK убираем {post_url} из текста, так как он будет добавлен как attachment
    const hasUrlInTemplate = content.includes('{post_url}');
    const replacements = {
        '{post_title}': post.title.rendered,
        '{post_url}': hasUrlInTemplate ? '' : post.link, // Убираем URL из текста если он будет как attachment
        '{post_excerpt}': excerpt,
        '{post_image}': content.includes('{post_image}') ? imageUrl : '', // Условно добавляем изображение
        '{post_tags}': tags,
    };

    for (const key in replacements) {
        content = content.replace(new RegExp(key, 'g'), replacements[key]);
    }

    // Убираем лишние переносы строк, которые могли появиться после удаления {post_url}
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n').trim();

    console.log('VK Processed template:', {
        original: templateContent,
        processed: content,
        replacements: replacements,
        hasUrlInTemplate: hasUrlInTemplate
    });

    return content;
}; 