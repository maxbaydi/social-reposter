const ScheduledTask = require('../db/models/ScheduledTask');
const Log = require('../db/models/Log');
const Account = require('../db/models/Account');
const { getPosts } = require('../services/wordpressService');

// Кеш для прогресса задач (обновляется раз в 10 минут)
const progressCache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10 минут

const calculateTaskProgress = async (task) => {
    const cacheKey = `task_${task.id}_${task.sourceAccountId}`;
    const now = Date.now();
    
    // Проверяем кеш
    if (progressCache.has(cacheKey)) {
        const cached = progressCache.get(cacheKey);
        if (now - cached.timestamp < CACHE_DURATION) {
            return cached.progress;
        }
    }
    
    try {
        // Получаем источник аккаунта
        const sourceAccount = await Account.findByPk(task.sourceAccountId);
        if (!sourceAccount) {
            return { current: 0, total: 0 };
        }
        
        // Получаем все посты по фильтрам (с обработкой ошибок)
        let allPosts = [];
        try {
            allPosts = await getPosts(sourceAccount.credentials, task.filterSettings);
        } catch (postsError) {
            console.warn(`Failed to fetch posts for progress calculation, task ${task.id}:`, postsError.message);
            // Возвращаем последний кешированный результат если есть
            if (progressCache.has(cacheKey)) {
                return progressCache.get(cacheKey).progress;
            }
            return { current: 0, total: 0 };
        }
        
        // Получаем количество уже опубликованных постов
        const publishedLogs = await Log.findAll({ 
            where: { taskId: task.id, level: 'success' }, 
            attributes: ['message'] 
        });
        const publishedCount = publishedLogs.length;
        
        const progress = {
            current: publishedCount,
            total: allPosts.length
        };
        
        // Сохраняем в кеш
        progressCache.set(cacheKey, {
            progress,
            timestamp: now
        });
        
        return progress;
        
    } catch (error) {
        console.error(`Error calculating progress for task ${task.id}:`, error.message);
        return { current: 0, total: 0 };
    }
};

// Получить все запланированные задачи
exports.getScheduledTasks = async (req, res) => {
    try {
        const tasks = await ScheduledTask.findAll({ where: { userId: req.user.id } });
        
        // Добавляем информацию о прогрессе для каждой задачи
        const tasksWithProgress = await Promise.all(tasks.map(async (task) => {
            const taskData = task.toJSON();
            
            // Используем кешированный расчет прогресса
            taskData.progress = await calculateTaskProgress(task);
            
            // Форматируем nextRun для отображения
            if (taskData.nextRun) {
                taskData.nextRun = new Date(taskData.nextRun).toLocaleString('ru-RU');
            }
            
            return taskData;
        }));
        
        res.json(tasksWithProgress);
    } catch (error) {
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

// Функция для вычисления следующего времени выполнения
const calculateNextRun = (scheduleSettings) => {
    const now = new Date();
    const { type, value, unit, minValue, maxValue, minUnit, maxUnit } = scheduleSettings;
    
    let intervalMs;
    
    if (type === 'random') {
        // Для случайного интервала берем среднее между min и max
        const minMs = convertToMs(minValue || 2, minUnit || 'hours');
        const maxMs = convertToMs(maxValue || 6, maxUnit || 'hours'); 
        intervalMs = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    } else {
        // Для фиксированного интервала
        intervalMs = convertToMs(value || 4, unit || 'hours');
    }
    
    return new Date(now.getTime() + intervalMs);
};

const convertToMs = (value, unit) => {
    const multipliers = {
        minutes: 60 * 1000,
        hours: 60 * 60 * 1000,
        days: 24 * 60 * 60 * 1000
    };
    return value * (multipliers[unit] || multipliers.hours);
};

// Импортируем функции планировщика
const { scheduleNewTask, unscheduleTask, updateScheduledTask } = require('../services/scheduler');

// Создать новую задачу
exports.createScheduledTask = async (req, res) => {
    const { 
        name, 
        sourceAccountId, 
        destinationAccounts, // фронтенд отправляет destinationAccounts
        templateId, 
        status,
        dateFrom,
        dateTo,
        categories,
        tags,
        intervalConfig,
        publicationOrder
    } = req.body;
    
    console.log('Creating scheduled task with data:', req.body);
    
    // Валидация обязательных полей
    if (!name || !sourceAccountId || !destinationAccounts || destinationAccounts.length === 0) {
        return res.status(400).json({ 
            message: 'Название, источник и хотя бы один аккаунт назначения обязательны' 
        });
    }
    
    try {
        // Подготавливаем данные для модели
        const filterSettings = {
            dateFrom,
            dateTo,
            categories: categories || [],
            tags: tags || []
        };
        
        const scheduleSettings = intervalConfig || {
            type: 'fixed',
            value: 4,
            unit: 'hours'
        };

        const task = await ScheduledTask.create({
            userId: req.user.id,
            name,
            sourceAccountId: parseInt(sourceAccountId),
            destinationAccountIds: destinationAccounts, // Используем правильное имя поля
            templateId: templateId ? parseInt(templateId) : null,
            filterSettings,
            scheduleSettings,
            publicationOrder: publicationOrder || 'newest_first',
            status: status || 'draft',
            nextRun: status === 'active' ? calculateNextRun(scheduleSettings) : null, // Вычисляем nextRun только для активных задач
        });
        
        // Планируем задачу если она активна
        if (task.status === 'active') {
            scheduleNewTask(task);
        }
        
        console.log('Successfully created scheduled task:', task.id);
        res.status(201).json(task);
    } catch (error) {
        console.error('Error creating scheduled task:', error);
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

// Обновить задачу
exports.updateScheduledTask = async (req, res) => {
    const { 
        name, 
        sourceAccountId, 
        destinationAccounts, 
        templateId, 
        status,
        dateFrom,
        dateTo,
        categories,
        tags,
        intervalConfig,
        publicationOrder
    } = req.body;
    
    console.log('Updating scheduled task:', req.params.id, 'with data:', req.body);
    
    try {
        const task = await ScheduledTask.findOne({ 
            where: { id: req.params.id, userId: req.user.id } 
        });
        
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Валидация обязательных полей
        if (!name || !sourceAccountId || !destinationAccounts || destinationAccounts.length === 0) {
            return res.status(400).json({ 
                message: 'Название, источник и хотя бы один аккаунт назначения обязательны' 
            });
        }

        // Подготавливаем данные для обновления
        const filterSettings = {
            dateFrom,
            dateTo,
            categories: categories || [],
            tags: tags || []
        };
        
        const scheduleSettings = intervalConfig || {
            type: 'fixed',
            value: 4,
            unit: 'hours'
        };

        // Обновляем задачу
        task.name = name;
        task.sourceAccountId = parseInt(sourceAccountId);
        task.destinationAccountIds = destinationAccounts;
        task.templateId = templateId ? parseInt(templateId) : null;
        task.filterSettings = filterSettings;
        task.scheduleSettings = scheduleSettings;
        task.publicationOrder = publicationOrder || task.publicationOrder;
        task.status = status || task.status;
        
        // Обновляем nextRun если задача активна
        if (task.status === 'active') {
            task.nextRun = calculateNextRun(scheduleSettings);
        } else {
            task.nextRun = null;
        }
        
        await task.save();
        
        // Обновляем планирование задачи
        updateScheduledTask(task);
        
        console.log('Successfully updated scheduled task:', task.id);
        res.json(task);
    } catch (error) {
        console.error('Error updating scheduled task:', error);
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

// Удалить задачу
exports.deleteScheduledTask = async (req, res) => {
    try {
        const task = await ScheduledTask.findOne({ where: { id: req.params.id, userId: req.user.id } });
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        await task.destroy();
        res.json({ message: 'Task removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

// Переключить статус задачи
exports.toggleScheduledTaskStatus = async (req, res) => {
    try {
        const task = await ScheduledTask.findOne({ where: { id: req.params.id, userId: req.user.id } });
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        
        const oldStatus = task.status;
        task.status = task.status === 'active' ? 'paused' : 'active';
        
        // Если задача становится активной, вычисляем nextRun
        if (task.status === 'active' && oldStatus !== 'active') {
            task.nextRun = calculateNextRun(task.scheduleSettings);
        }
        
        await task.save();
        
        // Очищаем кэш прогресса для этой задачи
        clearProgressCache(task.id);
        
        res.json(task);
    } catch (error) {
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

// Очистить историю публикаций для задачи
exports.clearTaskHistory = async (req, res) => {
    try {
        const task = await ScheduledTask.findOne({ 
            where: { id: req.params.id, userId: req.user.id } 
        });
        
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Удаляем все логи успешных публикаций для этой задачи
        await Log.destroy({ 
            where: { taskId: task.id, level: 'success' } 
        });

        console.log(`Cleared publication history for task ${task.id}: ${task.name}`);
        res.json({ message: 'История публикаций очищена' });
    } catch (error) {
        console.error('Error clearing task history:', error);
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
}; 

// Функция для очистки кэша прогресса задач
const clearProgressCache = (taskId = null) => {
    if (taskId) {
        // Очищаем кэш для конкретной задачи
        const keysToDelete = Array.from(progressCache.keys()).filter(key => key.includes(`task_${taskId}_`));
        keysToDelete.forEach(key => progressCache.delete(key));
        console.log(`[ProgressCache] Cleared cache for task ${taskId}`);
    } else {
        // Очищаем весь кэш
        progressCache.clear();
        console.log(`[ProgressCache] Cleared all progress cache`);
    }
};

// Экспортируем функцию для использования в других модулях
exports.clearProgressCache = clearProgressCache; 