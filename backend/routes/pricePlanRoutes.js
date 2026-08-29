const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  lookupPrices,
  getCatalog,
  calculatePlan,
  createPlan,
  listPlans,
  getPlan,
  updatePlan,
  refreshPlanPrices,
  deletePlan,
} = require('../controllers/pricePlanController');

// Every route requires a session; ownership is enforced per-plan in the
// controller so one farmer can never read or modify another's plans.
router.get('/prices', protect, lookupPrices);
router.get('/catalog', protect, getCatalog);
router.post('/calculate', protect, calculatePlan);

router.get('/', protect, listPlans);
router.post('/', protect, createPlan);
router.get('/:id', protect, getPlan);
router.put('/:id', protect, updatePlan);
router.post('/:id/refresh', protect, refreshPlanPrices);
router.delete('/:id', protect, deletePlan);

module.exports = router;
