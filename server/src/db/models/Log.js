const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database');
const User = require('./User');
const ScheduledTask = require('./ScheduledTask');

class Log extends Model {}

Log.init({
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
    taskId: {
        type: DataTypes.INTEGER,
        references: { model: ScheduledTask, key: 'id' },
        allowNull: true // Может быть null для Live задач или системных логов
    },
    level: {
        type: DataTypes.ENUM('info', 'error', 'success'),
        allowNull: false
    },
    message: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
  sequelize,
  modelName: 'log'
});

User.hasMany(Log, { foreignKey: 'userId' });
Log.belongsTo(User, { foreignKey: 'userId' });

ScheduledTask.hasMany(Log, { foreignKey: 'taskId' });
Log.belongsTo(ScheduledTask, { foreignKey: 'taskId' });

module.exports = Log; 