const Log = require('../db/models/Log');
const { Op } = require('sequelize');

// Получить логи для конкретной задачи
exports.getTaskLogs = async (req, res) => {
    const { taskId } = req.params;
    try {
        const logs = await Log.findAll({
            where: { userId: req.user.id, taskId: taskId },
            order: [['createdAt', 'DESC']],
            limit: 50
        });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

// Получить все логи с фильтрацией
exports.getAllLogs = async (req, res) => {
    const { level, dateFrom, dateTo } = req.query;
    const whereClause = { userId: req.user.id };

    if (level) {
        whereClause.level = level;
    }
    if (dateFrom) {
        whereClause.createdAt = { [Op.gte]: new Date(dateFrom) };
    }
    if (dateTo) {
        whereClause.createdAt = { ...whereClause.createdAt, [Op.lte]: new Date(dateTo) };
    }

    try {
        const logs = await Log.findAll({
            where: whereClause,
            order: [['createdAt', 'DESC']],
            limit: 200
        });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
}; 