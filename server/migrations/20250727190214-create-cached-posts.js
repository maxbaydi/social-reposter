'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('cached_posts', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      wordpressId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'ID поста в WordPress'
      },
      accountId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'accounts',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID аккаунта WordPress'
      },
      title: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Заголовок поста'
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Полное содержимое поста'
      },
      excerpt: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Краткое описание поста'
      },
      link: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'URL поста'
      },
      featuredImage: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'URL основного изображения'
      },
      publishedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Дата публикации в WordPress'
      },
      modifiedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Дата последнего изменения в WordPress'
      },
      categories: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Категории поста (JSON)'
      },
      tags: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Теги поста (JSON)'
      },
      rawData: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Полные данные поста из WordPress API (JSON)'
      },
      syncedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'Время последней синхронизации с WordPress'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Создаем индексы для оптимизации запросов
    await queryInterface.addIndex('cached_posts', ['wordpressId', 'accountId'], {
      unique: true,
      name: 'cached_posts_wordpress_account_unique'
    });
    await queryInterface.addIndex('cached_posts', ['accountId']);
    await queryInterface.addIndex('cached_posts', ['publishedAt']);
    await queryInterface.addIndex('cached_posts', ['modifiedAt']);
    await queryInterface.addIndex('cached_posts', ['syncedAt']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('cached_posts');
  }
};
