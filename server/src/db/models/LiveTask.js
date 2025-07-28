const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database');
const User = require('./User');
const Account = require('./Account');

class LiveTask extends Model {}

LiveTask.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
    },
    userId: {
        type: DataTypes.INTEGER,
        references: { model: User, key: 'id' }
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('active', 'paused'),
        defaultValue: 'active'
    },
    sourceAccountId: {
        type: DataTypes.INTEGER,
        references: { model: Account, key: 'id' }
    },
    destinationAccountIds: {
        type: DataTypes.JSON, // Массив ID аккаунтов
        allowNull: false,
        defaultValue: [] // Добавляем значение по умолчанию
    },
    templateId: {
        type: DataTypes.INTEGER, // Ссылка на модель Template
        allowNull: true
    },
}, {
  sequelize,
  modelName: 'live_task'
});

User.hasMany(LiveTask, { foreignKey: 'userId' });
LiveTask.belongsTo(User, { foreignKey: 'userId' });

module.exports = LiveTask; 