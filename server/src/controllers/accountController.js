const Account = require('../db/models/Account');
const { verifyWordpress, verifyTelegram, verifyVk } = require('../services/connectionVerifier');

// Получить все аккаунты пользователя
exports.getAccounts = async (req, res) => {
    try {
        const accounts = await Account.findAll({ where: { userId: req.user.id } });
        // Важно: при отправке на клиент дешифрованные данные не должны включать секреты
        const sanitizedAccounts = accounts.map(acc => {
            const plain = acc.get({ plain: true });
            delete plain.credentials; // Удаляем расшифрованные данные перед отправкой
            return plain;
        });
        res.json(sanitizedAccounts);
    } catch (error) {
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

// Создать новый аккаунт
exports.createAccount = async (req, res) => {
    const { name, type, credentials } = req.body;
    
    if (!name || !type || !credentials) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        let verificationResult = { success: false, error: 'Unknown verification error' };
        
        switch (type) {
            case 'wordpress': 
                verificationResult = await verifyWordpress(credentials); 
                break;
            case 'telegram': 
                verificationResult = await verifyTelegram(credentials);
                break;
            case 'vk': 
                verificationResult = await verifyVk(credentials);
                break;
            default: 
                return res.status(400).json({ message: 'Invalid account type' });
        }
        
        if (!verificationResult.success) {
            return res.status(400).json({ message: verificationResult.error || 'Connection failed. Please check your credentials.' });
        }

        const account = await Account.create({
            userId: req.user.id,
            name,
            type,
            credentials, // сеттер в модели автоматически зашифрует их
            status: true,
        });

        const plainAccount = account.get({ plain: true });
        delete plainAccount.credentials;

        res.status(201).json(plainAccount);
    } catch (error) {
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

// Обновить аккаунт
exports.updateAccount = async (req, res) => {
    const { name, credentials } = req.body;
    
    try {
        const account = await Account.findOne({ 
            where: { id: req.params.id, userId: req.user.id } 
        });
        
        if (!account) {
            return res.status(404).json({ message: 'Account not found' });
        }

        // Валидация обязательных полей
        if (!name) {
            return res.status(400).json({ message: 'Название аккаунта обязательно' });
        }

        // Если переданы новые credentials, проверяем их
        if (credentials) {
            let verificationResult = { success: false, error: 'Unknown verification error' };
            
            switch (account.type) {
                case 'wordpress': 
                    verificationResult = await verifyWordpress(credentials); 
                    break;
                case 'telegram': 
                    verificationResult = await verifyTelegram(credentials);
                    break;
                case 'vk': 
                    verificationResult = await verifyVk(credentials);
                    break;
                default: 
                    return res.status(400).json({ message: 'Invalid account type' });
            }
            
            if (!verificationResult.success) {
                return res.status(400).json({ 
                    message: verificationResult.error || 'Connection failed. Please check your credentials.' 
                });
            }
            
            // Обновляем credentials если проверка прошла успешно
            account.credentials = credentials;
        }

        // Обновляем название
        account.name = name;
        await account.save();

        // Возвращаем обновленный аккаунт без credentials
        const plainAccount = account.get({ plain: true });
        delete plainAccount.credentials;

        console.log(`Successfully updated account: ${account.id} (${account.name})`);
        res.json(plainAccount);
    } catch (error) {
        console.error('Error updating account:', error);
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

// Удалить аккаунт
exports.deleteAccount = async (req, res) => {
    try {
        const account = await Account.findOne({ where: { id: req.params.id, userId: req.user.id } });
        if (!account) {
            return res.status(404).json({ message: 'Account not found' });
        }
        await account.destroy();
        res.json({ message: 'Account removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

// Переключить статус аккаунта
exports.toggleAccountStatus = async (req, res) => {
    try {
        const account = await Account.findOne({ where: { id: req.params.id, userId: req.user.id } });
        if (!account) {
            return res.status(404).json({ message: 'Account not found' });
        }
        account.status = !account.status;
        await account.save();
        
        const plainAccount = account.get({ plain: true });
        delete plainAccount.credentials;

        res.json(plainAccount);
    } catch (error) {
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
}; 