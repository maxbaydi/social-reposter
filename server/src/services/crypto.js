const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config();

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = process.env.CRYPTO_SECRET;
const IV = process.env.CRYPTO_IV;

if (!SECRET_KEY || !IV || SECRET_KEY.length !== 32 || IV.length !== 16) {
    throw new Error('CRYPTO_SECRET (32 chars) and CRYPTO_IV (16 chars) must be set in .env file');
}

const key = Buffer.from(SECRET_KEY, 'utf8');
const iv = Buffer.from(IV, 'utf8');

exports.encrypt = (text) => {
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(JSON.stringify(text), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
};

exports.decrypt = (encryptedText) => {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
}; 