const { DataTypes, Model } = require('sequelize');
const sequelize = require('../database');
const Account = require('./Account');

class CachedPost extends Model {}

CachedPost.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    wordpressId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'ID поста в WordPress'
    },
    accountId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: Account, key: 'id' },
        comment: 'ID аккаунта WordPress'
    },
    title: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Заголовок поста'
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Полное содержимое поста'
    },
    excerpt: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Краткое описание поста'
    },
    link: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'URL поста'
    },
    featuredImage: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL основного изображения'
    },
    publishedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Дата публикации в WordPress'
    },
    modifiedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Дата последнего изменения в WordPress'
    },
    categories: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Категории поста (JSON)'
    },
    tags: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Теги поста (JSON)'
    },
    rawData: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Полные данные поста из WordPress API (JSON)'
    },
    syncedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Время последней синхронизации с WordPress'
    }
}, {
    sequelize,
    modelName: 'cached_post',
    tableName: 'cached_posts',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['wordpressId', 'accountId']
        },
        {
            fields: ['accountId']
        },
        {
            fields: ['publishedAt']
        },
        {
            fields: ['modifiedAt']
        },
        {
            fields: ['syncedAt']
        }
    ]
});

// Связи
Account.hasMany(CachedPost, { foreignKey: 'accountId' });
CachedPost.belongsTo(Account, { foreignKey: 'accountId' });

module.exports = CachedPost; 