const cron = require('node-cron');
const { processScheduledTasks, hasActiveScheduledTasks } = require('./taskRunner');
const { processLiveTasks, hasActiveLiveTasks } = require('./liveRunner');

// Запускать проверку запланированных задач каждую минуту
cron.schedule('* * * * *', async () => {
    console.log('Running scheduled tasks check...');
    
    // Быстрая проверка - есть ли задачи готовые к выполнению
    const hasTasksToRun = await hasActiveScheduledTasks();
    if (hasTasksToRun) {
        processScheduledTasks();
    } else {
        console.log('No scheduled tasks ready to run');
    }
});

// Запускать проверку Live-репостов каждые 20 минут
cron.schedule('*/20 * * * *', async () => {
    console.log('Running live tasks check...');
    
    // Быстрая проверка - есть ли активные live задачи
    const hasLiveTasks = await hasActiveLiveTasks();
    if (hasLiveTasks) {
        processLiveTasks();
    } else {
        console.log('No active live tasks found');
    }
});

// Синхронизация кеша теперь происходит автоматически при каждом запуске Live задач

console.log('Cron jobs scheduled.'); 