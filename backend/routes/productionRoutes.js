const express = require('express');

const router = express.Router();

const {
  getProductionRecord,
  updateProductionRecord,
  deleteProductionRecord,
} = require('../controllers/productionController');

const { protect } = require('../middleware/authMiddleware');

router.get('/:id', protect, getProductionRecord);

router.put('/:id', protect, updateProductionRecord);

router.delete('/:id', protect, deleteProductionRecord);

module.exports = router;
