const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getScheduledTasks,
    createScheduledTask,
    updateScheduledTask,
    deleteScheduledTask,
    toggleScheduledTaskStatus,
    clearTaskHistory
} = require('../controllers/scheduledTaskController');
const { 
    getLiveTasks, 
    createLiveTask, 
    updateLiveTask,
    deleteLiveTask, 
    toggleLiveTaskStatus 
} = require('../controllers/liveTaskController');
const { 
    getTemplates, 
    createTemplate, 
    updateTemplate,
    deleteTemplate 
} = require('../controllers/templateController');

// Применяем middleware авторизации ко всем маршрутам
router.use(protect);

// Роуты для запланированных задач
router.route('/scheduled')
    .get(getScheduledTasks)
    .post(createScheduledTask);

router.route('/scheduled/:id')
    .put(updateScheduledTask)
    .delete(deleteScheduledTask);

router.route('/scheduled/:id/toggle')
    .patch(toggleScheduledTaskStatus);

router.route('/scheduled/:id/clear-history')
    .delete(clearTaskHistory);

// Роуты для Live репостов
router.route('/live')
    .get(getLiveTasks)
    .post(createLiveTask);

router.route('/live/:id')
    .put(updateLiveTask)
    .delete(deleteLiveTask);

router.route('/live/:id/toggle')
    .patch(toggleLiveTaskStatus);
    
// Роуты для шаблонов
router.route('/templates')
    .get(getTemplates)
    .post(createTemplate);

router.route('/templates/:id')
    .put(updateTemplate)
    .delete(deleteTemplate);
    
module.exports = router; 