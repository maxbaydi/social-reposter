const LiveTask = require('../db/models/LiveTask');
const { clearLiveTaskCache } = require('../services/liveRunner');

exports.getLiveTasks = async (req, res) => {
    try {
        const tasks = await LiveTask.findAll({ where: { userId: req.user.id } });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

exports.createLiveTask = async (req, res) => {
    const { name, sourceAccountId, destinationAccounts, templateId } = req.body;
    
    console.log('Creating live task with data:', req.body);
    
    // Валидация обязательных полей
    if (!name || !sourceAccountId || !destinationAccounts || destinationAccounts.length === 0) {
        return res.status(400).json({ 
            message: 'Название, источник и хотя бы один аккаунт назначения обязательны' 
        });
    }
    
    try {
        const task = await LiveTask.create({
            userId: req.user.id,
            name,
            sourceAccountId: parseInt(sourceAccountId),
            destinationAccountIds: destinationAccounts, // Используем правильное имя поля
            templateId: templateId ? parseInt(templateId) : null,
            status: 'active'
        });
        
        console.log('Successfully created live task:', task.id);
        res.status(201).json(task);
    } catch (error) {
        console.error('Error creating live task:', error);
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

exports.updateLiveTask = async (req, res) => {
    const { name, sourceAccountId, destinationAccounts, templateId } = req.body;
    
    console.log('Updating live task:', req.params.id, 'with data:', req.body);
    
    try {
        const task = await LiveTask.findOne({ 
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

        // Обновляем задачу
        task.name = name;
        task.sourceAccountId = parseInt(sourceAccountId);
        task.destinationAccountIds = destinationAccounts;
        task.templateId = templateId ? parseInt(templateId) : null;
        
        await task.save();
        
        console.log('Successfully updated live task:', task.id);
        res.json(task);
    } catch (error) {
        console.error('Error updating live task:', error);
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

exports.deleteLiveTask = async (req, res) => {
    try {
        const task = await LiveTask.findOne({ where: { id: req.params.id, userId: req.user.id } });
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        await task.destroy();
        res.json({ message: 'Task removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

exports.toggleLiveTaskStatus = async (req, res) => {
    try {
        const task = await LiveTask.findOne({ where: { id: req.params.id, userId: req.user.id } });
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        task.status = task.status === 'active' ? 'paused' : 'active';
        await task.save();
        
        // Очищаем кэш для этой задачи при изменении статуса
        clearLiveTaskCache(task.id);
        
        res.json(task);
    } catch (error) {
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
}; 