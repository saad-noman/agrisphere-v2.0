const express = require('express');

const router = express.Router();

const {
  createExpense,
  getMyExpenses,
  getExpense,
  updateExpense,
  deleteExpense,
  getCropFinancialAnalysis,
} = require('../controllers/expenseController');

const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createExpense);
router.get('/', protect, getMyExpenses);

// Must come before /:id, or "analysis" would be treated as an expense id
router.get(
  '/analysis/:cropId',
  protect,
  getCropFinancialAnalysis
);

router.get('/:id', protect, getExpense);
router.put('/:id', protect, updateExpense);
router.delete('/:id', protect, deleteExpense);

module.exports = router;
