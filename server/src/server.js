const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const sequelize = require('./db/database');
require('./services/scheduler'); // Добавляем эту строку

// Загрузка переменных окружения
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Роуты
app.use('/api/auth', require('./api/auth'));
app.use('/api/accounts', require('./api/accounts'));
app.use('/api/tasks', require('./api/tasks'));
app.use('/api/logs', require('./api/logs'));
app.use('/api/wordpress', require('./api/wordpress'));

// Эндпоинт для статистики
const { getStats } = require('./controllers/statsController');
app.get('/api/stats', require('./middleware/authMiddleware').protect, getStats);

const PORT = process.env.PORT || 5000;

sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}); 