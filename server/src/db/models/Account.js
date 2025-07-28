const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database');
const User = require('./User');
const crypto = require('../../services/crypto');

class Account extends Model {}

Account.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('wordpress', 'telegram', 'vk'),
    allowNull: false
  },
  status: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  credentials: {
    type: DataTypes.TEXT,
    allowNull: false,
    get() {
      const rawValue = this.getDataValue('credentials');
      return rawValue ? crypto.decrypt(rawValue) : null;
    },
    set(value) {
      this.setDataValue('credentials', crypto.encrypt(value));
    }
  }
}, {
  sequelize,
  modelName: 'account'
});

User.hasMany(Account, { foreignKey: 'userId' });
Account.belongsTo(User, { foreignKey: 'userId' });

module.exports = Account; 