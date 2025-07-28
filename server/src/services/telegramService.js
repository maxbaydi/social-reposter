const axios = require('axios');

const getClient = (token) => {
    return axios.create({
        baseURL: `https://api.telegram.org/bot${token}/`,
    });
};

/**
 * Отправляет пост в Telegram.
 * @param {string} token - Токен бота.
 * @param {string} channelId - ID канала.
 * @param {string} content - Отформатированный текст сообщения.
 * @param {string} imageUrl - URL изображения (опционально).
 * @returns {Promise<boolean>} - Успешность отправки.
 */
exports.postToTelegram = async (token, channelId, content, imageUrl) => {
    try {
        // Проверяем обязательные параметры
        if (!token) {
            throw new Error('Telegram bot token is missing');
        }
        if (!channelId) {
            throw new Error('Telegram channelId is missing');
        }
        if (!content || content.trim() === '') {
            throw new Error('Telegram post content is empty');
        }

        console.log(`Posting to Telegram channel ${channelId} with content length: ${content.length}, has image: ${!!imageUrl}`);

        const client = getClient(token);
        let response;

        if (imageUrl) {
            response = await client.post('sendPhoto', {
                chat_id: channelId,
                photo: imageUrl,
                caption: content,
                parse_mode: 'HTML' // Предполагаем, что шаблон может генерировать HTML
            });
        } else {
            response = await client.post('sendMessage', {
                chat_id: channelId,
                text: content,
                parse_mode: 'HTML'
            });
        }

        console.log('Successfully posted to Telegram, message ID:', response.data.result?.message_id);
        return true;
    } catch (error) {
        console.error('Failed to post to Telegram:', {
            error: error.message,
            apiResponse: error.response?.data,
            channelId,
            contentLength: content?.length || 0,
            hasImage: !!imageUrl
        });
        return false;
    }
}; 