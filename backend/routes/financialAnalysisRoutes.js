const express = require('express');

const router = express.Router();

const {
getFinancialAnalysis,
} = require('../controllers/financialAnalysisController');

const { protect } = require('../middleware/authMiddleware');

// GET /api/financial-analysis
router.get('/', protect, getFinancialAnalysis);

module.exports = router;

