const cron = require('node-cron');
const { processScheduledTasks, getNextScheduledTask } = require('./taskRunner');
const { processLiveTasks, hasActiveLiveTasks } = require('./liveRunner');
const ScheduledTask = require('../db/models/ScheduledTask');

// Хранилище таймеров для каждой задачи
const taskTimers = new Map();

// Функция для запуска задачи в точное время
const scheduleTaskExecution = (task) => {
    const taskId = task.id;
    
    // Очищаем существующий таймер для этой задачи
    if (taskTimers.has(taskId)) {
        clearTimeout(taskTimers.get(taskId));
    }
    
    const now = new Date();
    const nextRun = new Date(task.nextRun);
    const delayMs = nextRun.getTime() - now.getTime();
    
    // Если время уже прошло, запускаем немедленно
    if (delayMs <= 0) {
        console.log(`[Scheduler] Task ${task.name} (ID: ${taskId}) is overdue, executing immediately`);
        executeTask(task);
        return;
    }
    
    console.log(`[Scheduler] Scheduling task ${task.name} (ID: ${taskId}) for ${nextRun.toLocaleString()}, delay: ${Math.round(delayMs / 1000)}s`);
    
    // Устанавливаем таймер
    const timer = setTimeout(() => {
        executeTask(task);
    }, delayMs);
    
    taskTimers.set(taskId, timer);
};

// Функция выполнения задачи
const executeTask = async (task) => {
    try {
        console.log(`[Scheduler] Executing task: ${task.name} (ID: ${task.id})`);
        await processScheduledTasks([task]); // Передаем только одну задачу
        
        // После выполнения задачи, получаем обновленную задачу и планируем следующий запуск
        const updatedTask = await getNextScheduledTask(task.id);
        if (updatedTask && updatedTask.status === 'active') {
            scheduleTaskExecution(updatedTask);
        }
    } catch (error) {
        console.error(`[Scheduler] Error executing task ${task.id}:`, error.message);
    }
};

// Функция инициализации планировщика
const initializeScheduler = async () => {
    try {
        console.log('[Scheduler] Initializing precise task scheduler...');
        
        // Получаем все активные задачи
        const activeTasks = await ScheduledTask.findAll({
            where: { status: 'active' }
        });
        
        console.log(`[Scheduler] Found ${activeTasks.length} active tasks`);
        
        // Планируем каждую задачу
        for (const task of activeTasks) {
            scheduleTaskExecution(task);
        }
        
        console.log('[Scheduler] All active tasks scheduled');
    } catch (error) {
        console.error('[Scheduler] Error initializing scheduler:', error.message);
    }
};

// Функция для добавления новой задачи в планировщик
exports.scheduleNewTask = (task) => {
    if (task.status === 'active') {
        scheduleTaskExecution(task);
    }
};

// Функция для удаления задачи из планировщика
exports.unscheduleTask = (taskId) => {
    if (taskTimers.has(taskId)) {
        clearTimeout(taskTimers.get(taskId));
        taskTimers.delete(taskId);
        console.log(`[Scheduler] Unscheduled task ID: ${taskId}`);
    }
};

// Функция для обновления задачи в планировщике
exports.updateScheduledTask = (task) => {
    exports.unscheduleTask(task.id);
    if (task.status === 'active') {
        scheduleTaskExecution(task);
    }
};

// Запускаем проверку Live-репостов каждый час (увеличиваем с 20 минут)
cron.schedule('0 * * * *', async () => {
    console.log('Running live tasks check...');
    
    const hasLiveTasks = await hasActiveLiveTasks();
    if (hasLiveTasks) {
        console.log('Found active live tasks, processing...');
        processLiveTasks();
    } else {
        console.log('No active live tasks found, skipping check');
    }
});

// Инициализируем планировщик при запуске
initializeScheduler();

console.log('Precise task scheduler initialized.'); 