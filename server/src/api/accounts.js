const express = require('express');
const router = express.Router();
const {
    getAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    toggleAccountStatus
} = require('../controllers/accountController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Все роуты ниже защищены

router.route('/')
    .get(getAccounts)
    .post(createAccount);

router.route('/:id')
    .put(updateAccount)
    .delete(deleteAccount);
    
router.route('/:id/toggle')
    .patch(toggleAccountStatus);

module.exports = router; 