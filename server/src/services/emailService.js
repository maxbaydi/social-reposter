const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

// Настройки для отправки почты. 
// В реальном приложении лучше использовать сервисы типа SendGrid, Mailgun и т.д.
// Для примера используем ethereal.email
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    auth: {
        user: process.env.EMAIL_USER, // 'your.user@ethereal.email'
        pass: process.env.EMAIL_PASS, // 'yourpassword'
    },
});

/**
 * Отправляет email.
 * @param {string} to - Адрес получателя.
 * @param {string} subject - Тема письма.
 * @param {string} text - Текстовое содержимое.
 * @param {string} html - HTML-содержимое.
 */
exports.sendEmail = async ({ to, subject, text, html }) => {
    // Проверяем, настроены ли email credentials
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('Email credentials not configured, skipping email send:', { to, subject });
        return true; // Возвращаем true чтобы не блокировать основной функционал
    }

    try {
        const info = await transporter.sendMail({
            from: '"Social Reposter" <noreply@socialreposter.com>',
            to,
            subject,
            text,
            html,
        });

        console.log('Message sent: %s', info.messageId);
        // Ссылку для предпросмотра на Ethereal можно найти в консоли
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
}; 