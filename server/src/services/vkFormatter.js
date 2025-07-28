/**
 * Сервис для преобразования HTML в форматирование VK MarkdownV2
 * VK поддерживает следующие форматы (MarkdownV2):
 * - **жирный текст**
 * - *курсив*
 * - ==подчеркивание==
 * - ~~зачеркнутый~~
 * - [ссылка](URL)
 * - ```блок кода```
 * - `инлайн код`
 * - > цитаты
 * - @username упоминания
 * - #хэштеги
 * 
 * ВАЖНО: Все спецсимволы должны быть экранированы: \_, \*, \[, \], \(, \), \~, \`, \#, \@, \|, \{, \}, \+, \=, \., \!
 */

/**
 * Экранирует спецсимволы для MarkdownV2
 * @param {string} text - Текст для экранирования
 * @returns {string} - Экранированный текст
 */
const escapeMarkdownV2 = (text) => {
    if (!text) return '';
    // Исключаем символ > из экранирования, если он в начале строки (цитата)
    return text.replace(/([_*\[\]()~`#@|{}+=.!\\<&'-])/g, '\\$1');
};

/**
 * Преобразует HTML теги в VK MarkdownV2 форматирование
 * @param {string} htmlText - HTML текст
 * @returns {string} - Текст с VK MarkdownV2 форматированием
 */
exports.convertHtmlToVkFormat = (htmlText) => {
    if (!htmlText) return '';
    
    let vkText = htmlText;
    
    console.log(`[VK Formatter] Input HTML: "${htmlText.substring(0, 200)}..."`);
    
    // 1. Сначала сохраняем содержимое тегов форматирования, чтобы потом не экранировать символы внутри них
    const formatBlocks = [];
    
    // Сохраняем блоки кода (обрабатываем ПЕРВЫМИ!)
    vkText = vkText.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (match, content) => {
        const cleaned = content.replace(/<[^>]*>/g, ''); // Убираем HTML теги внутри
        formatBlocks.push({ type: 'codeblock', content: cleaned });
        return `__FORMAT_BLOCK_${formatBlocks.length - 1}__`;
    });
    
    vkText = vkText.replace(/<code[^>]*>(.*?)<\/code>/gi, (match, content) => {
        const cleaned = content.replace(/<[^>]*>/g, ''); // Убираем HTML теги внутри
        formatBlocks.push({ type: 'code', content: cleaned });
        return `__FORMAT_BLOCK_${formatBlocks.length - 1}__`;
    });
    
    // Сохраняем ссылки
    vkText = vkText.replace(/<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, (match, url, text) => {
        const cleanText = text.replace(/<[^>]*>/g, '');
        const cleanUrl = url.replace(/[\\]/g, ''); // Убираем экранирование из URL
        formatBlocks.push({ type: 'link', content: `[${cleanText}](${cleanUrl})` });
        return `__FORMAT_BLOCK_${formatBlocks.length - 1}__`;
    });
    
    // Сохраняем жирный текст
    vkText = vkText.replace(/<(b|strong)[^>]*>(.*?)<\/(b|strong)>/gi, (match, tag1, content, tag2) => {
        const cleaned = content.replace(/<[^>]*>/g, '');
        formatBlocks.push({ type: 'bold', content: `**${cleaned}**` });
        return `__FORMAT_BLOCK_${formatBlocks.length - 1}__`;
    });
    
    // Сохраняем курсив
    vkText = vkText.replace(/<(i|em)[^>]*>(.*?)<\/(i|em)>/gi, (match, tag1, content, tag2) => {
        const cleaned = content.replace(/<[^>]*>/g, '');
        formatBlocks.push({ type: 'italic', content: `*${cleaned}*` });
        return `__FORMAT_BLOCK_${formatBlocks.length - 1}__`;
    });
    
    // Сохраняем подчеркивание (MarkdownV2: ==текст==)
    vkText = vkText.replace(/<u[^>]*>(.*?)<\/u>/gi, (match, content) => {
        const cleaned = content.replace(/<[^>]*>/g, '');
        formatBlocks.push({ type: 'underline', content: `==${cleaned}==` });
        return `__FORMAT_BLOCK_${formatBlocks.length - 1}__`;
    });
    
    // Сохраняем зачеркнутый
    vkText = vkText.replace(/<(s|strike|del)[^>]*>(.*?)<\/(s|strike|del)>/gi, (match, tag1, content, tag2) => {
        const cleaned = content.replace(/<[^>]*>/g, '');
        formatBlocks.push({ type: 'strikethrough', content: `~~${cleaned}~~` });
        return `__FORMAT_BLOCK_${formatBlocks.length - 1}__`;
    });
    
    // 2. Преобразуем списки
    vkText = vkText.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
        let counter = 1;
        return content.replace(/<li[^>]*>(.*?)<\/li>/gi, (match, itemContent) => {
            const cleaned = itemContent.replace(/<[^>]*>/g, '');
            return `${counter++}. ${cleaned}\n`;
        });
    });
    
    vkText = vkText.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
        return content.replace(/<li[^>]*>(.*?)<\/li>/gi, (match, itemContent) => {
            const cleaned = itemContent.replace(/<[^>]*>/g, '');
            return `• ${cleaned}\n`;
        });
    });
    
    // 3. Преобразуем заголовки в жирный текст
    vkText = vkText.replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, (match, content) => {
        const cleaned = content.replace(/<[^>]*>/g, '');
        formatBlocks.push({ type: 'header', content: `**${cleaned}**` });
        return `\n\n__FORMAT_BLOCK_${formatBlocks.length - 1}__\n\n`;
    });
    
    // 4. Преобразуем цитаты
    vkText = vkText.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, (match, content) => {
        const cleaned = content.replace(/<[^>]*>/g, '').trim();
        formatBlocks.push({ type: 'quote', content: cleaned.split('\n').map(line => `> ${line.trim()}`).join('\n') });
        return `__FORMAT_BLOCK_${formatBlocks.length - 1}__`;
    });
    
    // 5. Преобразуем абзацы и переносы строк
    vkText = vkText.replace(/<p[^>]*>/gi, '');
    vkText = vkText.replace(/<\/p>/gi, '\n\n');
    vkText = vkText.replace(/<br\s*\/?>/gi, '\n');
    
    // 6. Убираем оставшиеся HTML теги
    vkText = vkText.replace(/<[^>]*>/g, '');
    
    // 7. Декодируем HTML entities
    vkText = vkText.replace(/&nbsp;/g, ' ');
    vkText = vkText.replace(/&amp;/g, '&');
    vkText = vkText.replace(/&lt;/g, '<');
    vkText = vkText.replace(/&gt;/g, '>');
    vkText = vkText.replace(/&quot;/g, '"');
    vkText = vkText.replace(/&#039;/g, "'");
    vkText = vkText.replace(/&#171;/g, '«');
    vkText = vkText.replace(/&#187;/g, '»');
    vkText = vkText.replace(/&[^;]+;/g, '');
    
    // 8. Экранируем спецсимволы MarkdownV2 ТОЛЬКО в обычном тексте
    // Разделяем текст на части по плейсхолдерам блоков
    const parts = vkText.split(/(__FORMAT_BLOCK_\d+__)/);
    vkText = parts.map(part => {
        // Если это плейсхолдер блока - не экранируем
        if (part.match(/^__FORMAT_BLOCK_\d+__$/)) {
            return part;
        }
        // Если это обычный текст - экранируем
        return escapeMarkdownV2(part);
    }).join('');
    
    // 9. Восстанавливаем блоки форматирования (они уже правильно отформатированы)
    vkText = vkText.replace(/__FORMAT_BLOCK_(\d+)__/g, (match, index) => {
        const block = formatBlocks[parseInt(index)];
        if (!block) return '';
        
        switch (block.type) {
            case 'codeblock':
                return `\n\n\`\`\`\n${block.content}\n\`\`\`\n\n`;
            case 'code':
                return `\`${block.content}\``;
            case 'link':
            case 'bold':
            case 'italic':
            case 'underline':
            case 'strikethrough':
            case 'header':
            case 'quote':
                return block.content;
            default:
                return block.content;
        }
    });
    
    // 10. Нормализуем пробелы и переносы строк
    vkText = vkText.replace(/[ \t]+/g, ' '); // Множественные пробелы → один пробел
    vkText = vkText.replace(/\n\s+/g, '\n'); // Убираем пробелы в начале строк
    vkText = vkText.replace(/\s+\n/g, '\n'); // Убираем пробелы в конце строк
    vkText = vkText.replace(/\n{3,}/g, '\n\n'); // Множественные переносы → двойной перенос
    vkText = vkText.trim();
    
    console.log(`[VK Formatter] Output VK MarkdownV2: "${vkText.substring(0, 200)}..."`);
    
    return vkText;
};

/**
 * Очищает текст от рекламных блоков для VK (MarkdownV2)
 * @param {string} text - Текст для очистки
 * @returns {string} - Очищенный текст
 */
exports.cleanTextForVk = (text) => {
    let cleaned = text;
    
    console.log(`[VK Cleaner] Input: "${text.substring(0, 200)}..."`);
    
    // 1. Убираем JavaScript код (AdSense и другие)
    cleaned = cleaned.replace(/\(adsbygoogle\s*=\s*window\.adsbygoogle\s*\|\|\s*\[\]\)\.push\(\{[^}]*\}\)\s*;?\s*/gi, '');
    cleaned = cleaned.replace(/window\.adsbygoogle[^;]*;?/gi, '');
    cleaned = cleaned.replace(/adsbygoogle[^;]*;?/gi, '');
    cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    cleaned = cleaned.replace(/onclick[^>]*/gi, '');
    cleaned = cleaned.replace(/onload[^>]*/gi, '');
    
    // 2. Убираем WordPress административные ссылки (УЛУЧШЕНО)
    // Убираем полные ссылки на wp-admin
    cleaned = cleaned.replace(/https?:\/\/[^\/\s]+\/wp-admin\/[^\s\)\]]+/gi, '');
    
    // Убираем ссылки в markdown формате с wp-admin
    cleaned = cleaned.replace(/\[([^\]]*)\]\([^)]*wp-admin[^)]*\)/gi, '$1'); // Сохраняем текст ссылки
    cleaned = cleaned.replace(/\[\]\([^)]*wp-admin[^)]*\)/gi, ''); // Пустые ссылки
    
    // Убираем ссылки в скобках
    cleaned = cleaned.replace(/\([^)]*wp-admin[^)]*\)/gi, '');
    
    // Убираем ссылки в начале строк (частая проблема)
    cleaned = cleaned.replace(/^\s*\([^)]*wp-admin[^)]*\)\s*/gm, ''); // Убираем одинокие скобки в начале строк
    cleaned = cleaned.replace(/^\s*https?:\/\/[^\/\s]+\/wp-admin\/[^\s]+\s*/gm, '');
    
    // Убираем административные элементы WordPress
    cleaned = cleaned.replace(/wp-admin[^\s]*/gi, '');
    cleaned = cleaned.replace(/&action=edit[^\s]*/gi, '');
    
    // 3. Убираем рекламные блоки Hello и другие (РАСШИРЕНО)
    cleaned = cleaned.replace(/<div[^>]*class=["'][^"']*hello[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '');
    cleaned = cleaned.replace(/<div[^>]*class=["'][^"']*ad[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '');
    cleaned = cleaned.replace(/<div[^>]*class=["'][^"']*advads[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '');
    
    // 4. Убираем WordPress шорткоды
    cleaned = cleaned.replace(/\[[^\]]*\]/g, '');
    
    // 5. Убираем рекламные фразы и блоки (более точные регулярные выражения)
    cleaned = cleaned.replace(/\s+(реклама|advertisement|sponsored|спонсор)\s+/gi, ' ');
    cleaned = cleaned.replace(/^(реклама|advertisement|sponsored|спонсор)\s+/gi, '');
    cleaned = cleaned.replace(/\s+(реклама|advertisement|sponsored|спонсор)$/gi, '');
    cleaned = cleaned.replace(/\(реклама\)|\[реклама\]|\{реклама\}/gi, '');
    cleaned = cleaned.replace(/\s+(рекламный\s+блок|ad\s+block)\s+/gi, ' ');
    
    // Дополнительная очистка рекламных слов
    cleaned = cleaned.replace(/\b(реклама|advertisement|sponsored|спонсор)\b/gi, '');
    
    // 6. Убираем социальные кнопки и виджеты
    cleaned = cleaned.replace(/\s+(поделиться|share|like|лайк)\s+/gi, ' ');
    cleaned = cleaned.replace(/^(поделиться|share|like|лайк)\s+/gi, '');
    cleaned = cleaned.replace(/\s+(поделиться|share|like|лайк)$/gi, '');
    cleaned = cleaned.replace(/\s+(social\s+buttons|follow\s+us)\s+/gi, ' ');
    
    // 7. Убираем навигационные элементы
    cleaned = cleaned.replace(/\s+(читать\s+далее|read\s+more)\s+/gi, ' ');
    cleaned = cleaned.replace(/\s+(предыдущая\s+запись|следующая\s+запись|previous\s+post|next\s+post)\s+/gi, ' ');
    
    // 8. Убираем множественные пробелы и переносы
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
    // 9. ФИНАЛЬНАЯ ОЧИСТКА: убираем остаточные символы после удаления ссылок
    cleaned = cleaned.replace(/^\s*\(\s+/gm, ''); // Убираем одинокие скобки в начале строк
    cleaned = cleaned.replace(/^\s*\)\s+/gm, ''); // Убираем закрывающие скобки в начале строк  
    cleaned = cleaned.replace(/\(\s*\)/g, ''); // Убираем пустые скобки
    cleaned = cleaned.trim();
    
    console.log(`[VK Cleaner] Output: "${cleaned.substring(0, 200)}..."`);
    
    return cleaned;
};

/**
 * Добавляет хэштеги к тексту для VK
 * @param {string} text - Исходный текст
 * @param {string} tags - Теги через запятую
 * @returns {string} - Текст с хэштегами
 */
exports.addHashtagsToVk = (text, tags) => {
    if (!tags || tags.trim() === '') return text;
    
    const tagList = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    if (tagList.length === 0) return text;
    
    const hashtags = tagList.map(tag => `#${tag.replace(/\s+/g, '')}`).join(' ');
    
    return `${text}\n\n${hashtags}`;
};

/**
 * Проверяет длину текста для VK (лимит 4096 символов)
 * @param {string} text - Текст для проверки
 * @returns {object} - {isValid: boolean, length: number, maxLength: number}
 */
exports.validateVkTextLength = (text) => {
    const maxLength = 4096;
    const currentLength = text.length;
    
    return {
        isValid: currentLength <= maxLength,
        length: currentLength,
        maxLength: maxLength,
        remaining: maxLength - currentLength
    };
};

/**
 * Обрезает текст до допустимой длины для VK
 * @param {string} text - Исходный текст
 * @param {number} maxLength - Максимальная длина (по умолчанию 4096)
 * @returns {string} - Обрезанный текст
 */
exports.truncateVkText = (text, maxLength = 4096) => {
    if (text.length <= maxLength) return text;
    
    // Обрезаем до maxLength - 3 символа (для "...")
    const truncated = text.substring(0, maxLength - 3);
    
    // Ищем последний пробел, чтобы не обрезать слово посередине
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    if (lastSpaceIndex > maxLength * 0.8) { // Если пробел находится в последних 20% текста
        return truncated.substring(0, lastSpaceIndex) + '...';
    }
    
    return truncated + '...';
};

/**
 * Полная обработка текста для VK: HTML → VK MarkdownV2 форматирование → очистка → валидация
 * @param {string} htmlText - HTML текст
 * @param {string} tags - Теги для хэштегов (опционально)
 * @returns {string} - Готовый текст для VK в MarkdownV2 формате
 */
exports.processTextForVk = (htmlText, tags = '') => {
    if (!htmlText) return '';
    
    console.log(`[VK Processor] Starting processing for VK MarkdownV2`);
    
    // 1. Преобразуем HTML в VK MarkdownV2 форматирование
    let vkText = this.convertHtmlToVkFormat(htmlText);
    
    // 2. Очищаем от рекламы и мусора
    vkText = this.cleanTextForVk(vkText);
    
    // 3. Добавляем хэштеги если есть
    if (tags) {
        vkText = this.addHashtagsToVk(vkText, tags);
    }
    
    // 4. Проверяем длину и обрезаем если нужно
    const validation = this.validateVkTextLength(vkText);
    if (!validation.isValid) {
        console.log(`[VK Processor] Text too long (${validation.length}/${validation.maxLength}), truncating...`);
        vkText = this.truncateVkText(vkText);
    }
    
    console.log(`[VK Processor] Final result: "${vkText.substring(0, 200)}..."`);
    console.log(`[VK Processor] Text length: ${vkText.length} characters`);
    
    return vkText;
}; 

/**
 * Тестовые функции для проверки VK форматирования
 */

/**
 * Запускает все тесты VK MarkdownV2 форматирования
 * @returns {object} - Результаты тестов
 */
exports.runVkFormatterTests = () => {
    console.log('\n=== VK MarkdownV2 Formatter Tests ===\n');
    
    const tests = [
        {
            name: 'Basic HTML formatting',
            input: '<p>Это <strong>жирный</strong> и <em>курсивный</em> текст с <u>подчеркиванием</u> и <s>зачеркиванием</s>.</p>',
            expected: 'Это **жирный** и *курсивный* текст с ==подчеркиванием== и ~~зачеркиванием~~\\.'
        },
        {
            name: 'Links formatting',
            input: '<p>Посетите <a href="https://example.com">наш сайт</a> для получения дополнительной информации.</p>',
            expected: 'Посетите [наш сайт](https://example.com) для получения дополнительной информации\\.'
        },
        {
            name: 'Code formatting',
            input: '<p>Используйте <code>console.log()</code> для отладки:</p><pre>function test() {\n  return "Hello";\n}</pre>',
            expected: 'Используйте `console.log()` для отладки:\n\n```\nfunction test() {\nreturn "Hello";\n}\n```'
        },
        {
            name: 'Lists formatting',
            input: '<ul><li>Первый пункт</li><li>Второй пункт</li></ul><ol><li>Нумерованный 1</li><li>Нумерованный 2</li></ol>',
            expected: '• Первый пункт\n• Второй пункт\n1\\. Нумерованный 1\n2\\. Нумерованный 2'
        },
        {
            name: 'Headings formatting',
            input: '<h1>Главный заголовок</h1><h2>Подзаголовок</h2><p>Обычный текст</p>',
            expected: '**Главный заголовок**\n**Подзаголовок**\nОбычный текст'
        },
        {
            name: 'Quotes formatting',
            input: '<blockquote>Это важная цитата, которую нужно выделить.</blockquote>',
            expected: '> Это важная цитата, которую нужно выделить.'
        },
        {
            name: 'HTML entities and escaping',
            input: '<p>Текст с &amp; &lt; &gt; &quot; &#039; &nbsp; символами</p>',
            expected: 'Текст с \\& \\< > " \\\' символами'
        },
        {
            name: 'Special characters escaping',
            input: '<p>Специальные символы: _test_ *test* [test] (test) {test} +test+ =test= .test. !test!</p>',
            expected: 'Специальные символы: \\_test\\_ \\*test\\* \\[test\\] \\(test\\) \\{test\\} \\+test\\+ \\=test\\= \\.test\\. \\!test\\!'
        }
    ];
    
    const results = {
        passed: 0,
        failed: 0,
        details: []
    };
    
    tests.forEach(test => {
        try {
            const result = this.convertHtmlToVkFormat(test.input);
            const passed = result.trim() === test.expected.trim();
            
            if (passed) {
                results.passed++;
                console.log(`✅ ${test.name}: PASSED`);
            } else {
                results.failed++;
                console.log(`❌ ${test.name}: FAILED`);
                console.log(`   Expected: "${test.expected}"`);
                console.log(`   Got:      "${result}"`);
            }
            
            results.details.push({
                name: test.name,
                passed,
                input: test.input,
                expected: test.expected,
                result: result
            });
        } catch (error) {
            results.failed++;
            console.log(`❌ ${test.name}: ERROR - ${error.message}`);
            results.details.push({
                name: test.name,
                passed: false,
                error: error.message
            });
        }
    });
    
    console.log(`\n=== Test Results: ${results.passed}/${results.passed + results.failed} passed ===\n`);
    
    return results;
};

/**
 * Тестирует функции очистки текста
 * @returns {object} - Результаты тестов
 */
exports.runVkCleanerTests = () => {
    console.log('\n=== VK Cleaner Tests ===\n');
    
    const tests = [
        {
            name: 'AdSense removal',
            input: 'Текст с рекламой (adsbygoogle = window.adsbygoogle || []).push({}); и продолжение',
            expected: 'Текст с рекламой и продолжение'
        },
        {
            name: 'WordPress shortcodes',
            input: 'Текст с [gallery] и [video] шорткодами',
            expected: 'Текст с и шорткодами'
        },
        {
            name: 'Advertising phrases',
            input: 'Текст с рекламой и спонсор контентом',
            expected: 'Текст с и контентом'
        },
        {
            name: 'Social buttons',
            input: 'Текст с кнопками поделиться и лайк',
            expected: 'Текст с кнопками и'
        }
    ];
    
    const results = {
        passed: 0,
        failed: 0,
        details: []
    };
    
    tests.forEach(test => {
        try {
            const result = this.cleanTextForVk(test.input);
            const passed = result.trim() === test.expected.trim();
            
            if (passed) {
                results.passed++;
                console.log(`✅ ${test.name}: PASSED`);
            } else {
                results.failed++;
                console.log(`❌ ${test.name}: FAILED`);
                console.log(`   Expected: "${test.expected}"`);
                console.log(`   Got:      "${result}"`);
            }
            
            results.details.push({
                name: test.name,
                passed,
                input: test.input,
                expected: test.expected,
                result: result
            });
        } catch (error) {
            results.failed++;
            console.log(`❌ ${test.name}: ERROR - ${error.message}`);
            results.details.push({
                name: test.name,
                passed: false,
                error: error.message
            });
        }
    });
    
    console.log(`\n=== Cleaner Test Results: ${results.passed}/${results.passed + results.failed} passed ===\n`);
    
    return results;
};

/**
 * Тестирует функции валидации длины текста
 * @returns {object} - Результаты тестов
 */
exports.runVkValidationTests = () => {
    console.log('\n=== VK Validation Tests ===\n');
    
    const shortText = 'Короткий текст';
    const longText = 'Очень длинный текст '.repeat(300); // ~6000 символов
    
    const tests = [
        {
            name: 'Short text validation',
            text: shortText,
            expectedValid: true
        },
        {
            name: 'Long text validation',
            text: longText,
            expectedValid: false
        },
        {
            name: 'Exact length validation',
            text: 'A'.repeat(4096),
            expectedValid: true
        },
        {
            name: 'Over limit validation',
            text: 'A'.repeat(4097),
            expectedValid: false
        }
    ];
    
    const results = {
        passed: 0,
        failed: 0,
        details: []
    };
    
    tests.forEach(test => {
        try {
            const validation = this.validateVkTextLength(test.text);
            const passed = validation.isValid === test.expectedValid;
            
            if (passed) {
                results.passed++;
                console.log(`✅ ${test.name}: PASSED (length: ${validation.length})`);
            } else {
                results.failed++;
                console.log(`❌ ${test.name}: FAILED`);
                console.log(`   Expected valid: ${test.expectedValid}, got: ${validation.isValid}`);
                console.log(`   Length: ${validation.length}/${validation.maxLength}`);
            }
            
            results.details.push({
                name: test.name,
                passed,
                text: test.text.substring(0, 50) + '...',
                expectedValid: test.expectedValid,
                validation: validation
            });
        } catch (error) {
            results.failed++;
            console.log(`❌ ${test.name}: ERROR - ${error.message}`);
            results.details.push({
                name: test.name,
                passed: false,
                error: error.message
            });
        }
    });
    
    console.log(`\n=== Validation Test Results: ${results.passed}/${results.passed + results.failed} passed ===\n`);
    
    return results;
};

/**
 * Запускает все тесты VK MarkdownV2 форматирования
 * @returns {object} - Общие результаты всех тестов
 */
exports.runAllVkTests = () => {
    console.log('🚀 Starting VK MarkdownV2 Formatter Test Suite...\n');
    
    const formatterResults = this.runVkFormatterTests();
    const cleanerResults = this.runVkCleanerTests();
    const validationResults = this.runVkValidationTests();
    
    const totalPassed = formatterResults.passed + cleanerResults.passed + validationResults.passed;
    const totalTests = (formatterResults.passed + formatterResults.failed) + 
                      (cleanerResults.passed + cleanerResults.failed) + 
                      (validationResults.passed + validationResults.failed);
    
    console.log('🎯 FINAL RESULTS:');
    console.log(`   Total: ${totalPassed}/${totalTests} tests passed`);
    console.log(`   MarkdownV2 Formatter: ${formatterResults.passed}/${formatterResults.passed + formatterResults.failed}`);
    console.log(`   Cleaner: ${cleanerResults.passed}/${cleanerResults.passed + cleanerResults.failed}`);
    console.log(`   Validation: ${validationResults.passed}/${validationResults.passed + validationResults.failed}`);
    
    return {
        totalPassed,
        totalTests,
        formatterResults,
        cleanerResults,
        validationResults
    };
}; 