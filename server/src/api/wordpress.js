const express = require('express');
const router = express.Router();
const { getWpTerms, getTemplatePreview } = require('../controllers/wordpressController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/:accountId/terms', getWpTerms);
router.post('/preview', getTemplatePreview);

module.exports = router; 