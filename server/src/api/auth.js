const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

// Настройки пользователя
router.get('/settings', protect, (req, res) => {
    // Заглушка для настроек
    res.json({
        emailOnError: true,
        emailOnTaskComplete: true,
        weeklyReport: false
    });
});

router.put('/settings', protect, (req, res) => {
    // Заглушка для обновления настроек
    res.json(req.body);
});

router.put('/profile', protect, (req, res) => {
    // Заглушка для обновления профиля
    const { name, email } = req.body;
    res.json({ 
        id: req.user.id, 
        name: name || req.user.name || 'Пользователь',
        email: email || req.user.email 
    });
});

router.put('/password', protect, (req, res) => {
    // Заглушка для смены пароля
    res.json({ message: 'Пароль успешно изменен' });
});

module.exports = router; 