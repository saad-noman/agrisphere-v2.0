const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { listTransactions, getSummary, topUp } = require('../controllers/transactionController');

router.get('/', protect, listTransactions);
router.get('/summary', protect, getSummary);
router.post('/top-up', protect, topUp);

module.exports = router;
