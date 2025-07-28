const Account = require('../db/models/Account');
const ScheduledTask = require('../db/models/ScheduledTask');
const LiveTask = require('../db/models/LiveTask');
const Log = require('../db/models/Log');
const { Op } = require('sequelize');

exports.getStats = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Получаем количество сайтов
        const sitesCount = await Account.count({ where: { userId } });
        
        // Получаем количество активных задач (запланированных + live)
        const activeScheduledTasks = await ScheduledTask.count({ 
            where: { userId, status: 'active' } 
        });
        const activeLiveTasks = await LiveTask.count({ 
            where: { userId, status: 'active' } 
        });
        const activeTasksCount = activeScheduledTasks + activeLiveTasks;
        
        // Получаем количество репостов за сегодня
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        
        const todayReposts = await Log.count({
            where: {
                userId,
                level: 'success',
                createdAt: {
                    [Op.gte]: today,
                    [Op.lt]: tomorrow
                }
            }
        });
        
        // Получаем количество ошибок за сегодня
        const errorsCount = await Log.count({
            where: {
                userId,
                level: 'error',
                createdAt: {
                    [Op.gte]: today,
                    [Op.lt]: tomorrow
                }
            }
        });
        
        // Получаем данные за последние 4 недели
        const weeklyData = [];
        for (let i = 3; i >= 0; i--) {
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
            weekStart.setHours(0, 0, 0, 0);
            
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 7);
            
            const weekReposts = await Log.count({
                where: {
                    userId,
                    level: 'success',
                    createdAt: {
                        [Op.gte]: weekStart,
                        [Op.lt]: weekEnd
                    }
                }
            });
            
            const label = i === 0 ? 'Эта неделя' : `Неделя ${4 - i}`;
            weeklyData.push({ label, value: weekReposts });
        }
        
        // Получаем изменения за неделю (сравниваем с прошлой неделей)
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        weekAgo.setHours(0, 0, 0, 0);
        
        const lastWeekReposts = await Log.count({
            where: {
                userId,
                level: 'success',
                createdAt: {
                    [Op.gte]: weekAgo,
                    [Op.lt]: today
                }
            }
        });
        
        const repostsChange = todayReposts - lastWeekReposts;
        
        res.json({
            sitesCount,
            activeTasksCount,
            todayReposts,
            errorsCount,
            sitesChangeWeek: 0, // Пока не отслеживаем изменения сайтов
            tasksChangeWeek: 0, // Пока не отслеживаем изменения задач
            repostsChange,
            weeklyData,
            vkApiStatus: true // Предполагаем, что VK API работает
        });
        
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
}; 