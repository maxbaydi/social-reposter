#!/usr/bin/env node

/**
 * Тестовый скрипт для проверки VK форматирования
 * Запуск: node test-vk-formatter.js
 */

const { runAllVkTests } = require('./src/services/vkFormatter');

console.log('🧪 VK Formatter Test Suite');
console.log('==========================\n');

try {
    const results = runAllVkTests();
    
    if (results.totalPassed === results.totalTests) {
        console.log('🎉 All tests passed! VK formatter is working correctly.');
        process.exit(0);
    } else {
        console.log('⚠️  Some tests failed. Please check the output above.');
        process.exit(1);
    }
} catch (error) {
    console.error('❌ Test suite failed with error:', error.message);
    process.exit(1);
} 