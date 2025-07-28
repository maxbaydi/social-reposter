const axios = require('axios');

// Проверка WordPress. Делаем запрос к эндпоинту users/me, который требует аутентификации.
exports.verifyWordpress = async (credentials) => {
    const { url, username, applicationPassword } = credentials;
    
    // Валидация входных данных
    if (!url) {
        console.error("WordPress verification failed: Missing URL");
        return { success: false, error: "URL сайта обязателен" };
    }
    
    if (!username) {
        console.error("WordPress verification failed: Missing username");
        return { success: false, error: "Имя пользователя WordPress обязательно" };
    }
    
    if (!applicationPassword) {
        console.error("WordPress verification failed: Missing application password");
        return { success: false, error: "Application Password обязателен" };
    }

    try {
        const cleanUrl = url.replace(/\/$/, "");
        const requestUrl = `${cleanUrl}/wp-json/wp/v2/users/me`;
        
        console.log(`Attempting WordPress connection to: ${requestUrl} with username: ${username}`);
        
        // Очищаем Application Password от пробелов (WordPress иногда форматирует с пробелами)
        const cleanPassword = applicationPassword.replace(/\s+/g, '');
        
        const response = await axios.get(requestUrl, {
            headers: {
                'Authorization': `Basic ${Buffer.from(`${username}:${cleanPassword}`).toString('base64')}`
            },
            timeout: 10000 // 10 секунд таймаут
        });
        
        console.log(`WordPress connection successful to ${cleanUrl} for user: ${username}`);
        return { success: true };
    } catch (error) {
        let errorMessage = "Неизвестная ошибка подключения";
        
        if (error.code === 'ENOTFOUND') {
            errorMessage = "Сайт не найден. Проверьте URL сайта";
        } else if (error.code === 'ECONNREFUSED') {
            errorMessage = "Соединение отклонено. Сайт недоступен";
        } else if (error.code === 'ETIMEDOUT') {
            errorMessage = "Время ожидания истекло. Сайт слишком медленно отвечает";
        } else if (error.response) {
            const status = error.response.status;
            if (status === 401) {
                errorMessage = "Неверные учетные данные. Проверьте имя пользователя и Application Password";
            } else if (status === 403) {
                errorMessage = "Доступ запрещен. Проверьте права пользователя";
            } else if (status === 404) {
                errorMessage = "WordPress REST API не найдено. Проверьте URL сайта и убедитесь, что REST API включен";
            } else {
                errorMessage = `HTTP ошибка ${status}: ${error.response.statusText}`;
            }
        }
        
        console.error(`WordPress connection error: ${errorMessage}`, {
            url: url,
            username: username,
            status: error.response?.status,
            statusText: error.response?.statusText,
            code: error.code,
            message: error.message
        });
        
        return { success: false, error: errorMessage };
    }
};

// Проверка Telegram. Делаем запрос getMe к Bot API.
exports.verifyTelegram = async (credentials) => {
    const { token } = credentials;
    
    if (!token) {
        console.error("Telegram verification failed: Missing token");
        return { success: false, error: "Токен Telegram бота обязателен" };
    }
    
    try {
        console.log("Attempting Telegram bot verification");
        const response = await axios.get(`https://api.telegram.org/bot${token}/getMe`, {
            timeout: 10000
        });
        
        if (response.data.ok === true) {
            console.log(`Telegram bot verification successful: @${response.data.result.username}`);
            return { success: true };
        } else {
            console.error("Telegram verification failed: Invalid response");
            return { success: false, error: "Неверный ответ от Telegram API" };
        }
    } catch (error) {
        let errorMessage = "Ошибка подключения к Telegram";
        
        if (error.code === 'ETIMEDOUT') {
            errorMessage = "Время ожидания истекло при подключении к Telegram";
        } else if (error.response) {
            const status = error.response.status;
            if (status === 401) {
                errorMessage = "Неверный токен Telegram бота";
            } else if (status === 404) {
                errorMessage = "Telegram API недоступно";
            } else {
                errorMessage = `Telegram API ошибка ${status}`;
            }
        }
        
        console.error(`Telegram connection error: ${errorMessage}`, {
            status: error.response?.status,
            code: error.code,
            message: error.message
        });
        
        return { success: false, error: errorMessage };
    }
};

// Проверка VK. Делаем простой запрос к API.
exports.verifyVk = async (credentials) => {
    const { apiKey, channelId } = credentials;
    
    if (!apiKey) {
        console.error("VK verification failed: Missing API key");
        return { success: false, error: "API ключ VK обязателен" };
    }
    
    if (!channelId) {
        console.error("VK verification failed: Missing channel ID");
        return { success: false, error: "ID сообщества VK обязателен (например: 123456 или -123456)" };
    }
    
    try {
        console.log("Attempting VK API verification");
        
        // Убираем знак "-" если он есть, чтобы получить чистый ID
        const groupId = channelId.toString().replace('-', '');
        
        // Проверяем, что API ключ валиден и имеет права на публикацию в указанной группе
        const response = await axios.get('https://api.vk.com/method/groups.getById', {
            params: {
                group_id: groupId,
                access_token: apiKey,
                v: '5.199'
            },
            timeout: 10000
        });
        
        if (response.data && !response.data.error) {
            console.log("VK API raw response:", JSON.stringify(response.data, null, 2));
            
            const groupInfo = response.data.response && response.data.response[0];
            console.log("VK API verification successful for group:", groupInfo?.name || groupId);
            
            // Для токенов сообществ проверяем что получили успешный ответ от API
            // Если нет ошибок в response.data, значит токен валидный
            if (response.data.response) {
                console.log("VK group token verification successful");
                return { success: true };
            } else {
                console.error("VK API response structure unexpected:", response.data);
                return { success: false, error: "Неожиданная структура ответа VK API" };
            }
            
        } else {
            const vkError = response.data.error;
            let errorMessage = "Ошибка VK API";
            
            if (vkError) {
                switch (vkError.error_code) {
                    case 5:
                        errorMessage = "Неверный токен доступа VK";
                        break;
                    case 7:
                        errorMessage = "Нет прав для выполнения операции в VK";
                        break;
                    case 100:
                        errorMessage = "Неверный ID сообщества VK";
                        break;
                    default:
                        errorMessage = `VK API ошибка ${vkError.error_code}: ${vkError.error_msg}`;
                }
            }
            
            console.error("VK verification failed:", vkError);
            return { success: false, error: errorMessage };
        }
    } catch (error) {
        let errorMessage = "Ошибка подключения к VK API";
        
        if (error.code === 'ETIMEDOUT') {
            errorMessage = "Время ожидания истекло при подключении к VK";
        } else if (error.response) {
            errorMessage = `VK API недоступно (HTTP ${error.response.status})`;
        }
        
        console.error(`VK connection error: ${errorMessage}`, {
            status: error.response?.status,
            code: error.code,
            message: error.message
        });
        
        return { success: false, error: errorMessage };
    }
}; 