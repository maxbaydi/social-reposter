'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('scheduled_tasks', 'publicationOrder', {
      type: Sequelize.ENUM('oldest_first', 'newest_first', 'random'),
      defaultValue: 'newest_first',
      allowNull: false
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('scheduled_tasks', 'publicationOrder');
  }
};
