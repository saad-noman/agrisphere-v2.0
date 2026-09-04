const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createOrder,
  listOrders,
  getOrder,
  advanceOrder,
  getReceipt,
} = require('../controllers/orderController');

router.get('/', protect, listOrders);
router.post('/', protect, createOrder);
router.get('/:id', protect, getOrder);
router.get('/:id/receipt', protect, getReceipt);
// confirm | ready | start | deliver | receive
router.patch('/:id/:action', protect, advanceOrder);

module.exports = router;
