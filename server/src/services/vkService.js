const axios = require('axios');
// Убрано: const FormData = require('form-data'); - больше не нужно для VK

// Убрана функция uploadImageToVk - больше не используется для VK постов

/**
 * Отправляет пост на стену сообщества VK.
 * @param {string} apiKey - API ключ сообщества.
 * @param {string} ownerId - ID владельца стены (сообщества со знаком "-").
 * @param {string} content - Текст поста.
 * @param {string} linkUrl - URL ссылки для превью (опционально).
 * @param {string} imageUrl - URL изображения (ИГНОРИРУЕТСЯ).
 * @returns {Promise<boolean>} - Успешность отправки.
 */
exports.postToVk = async (apiKey, ownerId, content, linkUrl, imageUrl) => {
    try {
        // Проверяем обязательные параметры
        if (!apiKey) {
            throw new Error('VK API key is missing');
        }
        if (!ownerId) {
            throw new Error('VK ownerId is missing');
        }
        if (!content || content.trim() === '') {
            throw new Error('VK post content is empty');
        }

        console.log(`Posting to VK group ${ownerId} with content length: ${content.length}`);
        console.log(`VK API parameters: owner_id=${ownerId}, from_group=1, v=5.199`);

        let attachments = [];
        let finalMessage = content;

        // Изображения для VK отключены полностью
        if (imageUrl) {
            console.log(`VK: Image upload disabled for VK posts (ignored): ${imageUrl}`);
        }

        // Обрабатываем ссылку для превью - только в attachments
        if (linkUrl) {
            console.log(`VK: Adding link for preview: ${linkUrl}`);
            attachments.push(linkUrl);
            console.log(`VK: Added link to attachments for preview: ${linkUrl}`);
        }

        // Публикуем пост на стене
        const postParams = {
            access_token: apiKey,
            owner_id: ownerId,
            from_group: 1,
            message: finalMessage,
            parse_mode: 'MarkdownV2',
            v: '5.199'
        };

        // Добавляем attachments только если есть
        if (attachments.length > 0) {
            postParams.attachments = attachments.join(',');
            console.log(`VK: Posting with attachments: ${postParams.attachments}`);
        } else {
            console.log('VK: Posting without attachments');
        }

        console.log(`VK: Final message content: "${finalMessage.substring(0, 300)}..."`);

        const response = await axios.get('https://api.vk.com/method/wall.post', {
            params: postParams
        });

        // Проверяем ответ VK API
        if (response.data.error) {
            const vkError = response.data.error;
            let errorMessage = `VK API Error: ${vkError.error_msg} (${vkError.error_code})`;
            
            // Добавляем более понятные сообщения для распространенных ошибок
            switch (vkError.error_code) {
                case 5:
                    errorMessage = "Неверный или истекший токен доступа VK";
                    break;
                case 7:
                    errorMessage = "Нет прав для публикации в этом сообществе VK";
                    break;
                case 15:
                    errorMessage = "Нет доступа к сообществу VK (проверьте ID сообщества)";
                    break;
                case 214:
                    errorMessage = "Доступ к сообществу VK запрещен (возможно, сообщество заблокировано)";
                    break;
                default:
                    errorMessage = `VK API ошибка ${vkError.error_code}: ${vkError.error_msg}`;
            }
            
            throw new Error(errorMessage);
        }

        console.log('Successfully posted to VK, post ID:', response.data.response?.post_id);
        return true;
    } catch (error) {
        console.error('Failed to post to VK:', {
            error: error.message,
            apiResponse: error.response?.data,
            ownerId,
            contentLength: content?.length || 0
        });
        return false;
    }
}; 