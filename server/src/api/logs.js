const express = require('express');
const router = express.Router();
const { getTaskLogs, getAllLogs } = require('../controllers/logController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getAllLogs);
router.get('/task/:taskId', getTaskLogs);

module.exports = router; 