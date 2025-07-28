const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database');
const User = require('./User');

class Template extends Model {}

Template.init({
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
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    platforms: {
        type: DataTypes.JSON, // ['telegram', 'vk']
        allowNull: false
    },
    utm: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
  sequelize,
  modelName: 'template'
});

User.hasMany(Template, { foreignKey: 'userId' });
Template.belongsTo(User, { foreignKey: 'userId' });

module.exports = Template; 