const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database');
const User = require('./User');
const Account = require('./Account');

class ScheduledTask extends Model {}

ScheduledTask.init({
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
        type: DataTypes.ENUM('active', 'paused', 'error', 'completed', 'draft'),
        defaultValue: 'draft'
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
    filterSettings: {
        type: DataTypes.JSON // Настройки фильтра (даты, категории)
    },
    scheduleSettings: {
        type: DataTypes.JSON // Настройки периодичности
    },
    publicationOrder: {
        type: DataTypes.ENUM('oldest_first', 'newest_first', 'random'),
        defaultValue: 'newest_first'
    },
    progress: {
        type: DataTypes.JSON, // { current: 0, total: 100 }
        defaultValue: { current: 0, total: 0 }
    },
    nextRun: {
        type: DataTypes.DATE,
        allowNull: true
    },
}, {
  sequelize,
  modelName: 'scheduled_task'
});

User.hasMany(ScheduledTask, { foreignKey: 'userId' });
ScheduledTask.belongsTo(User, { foreignKey: 'userId' });

module.exports = ScheduledTask; 