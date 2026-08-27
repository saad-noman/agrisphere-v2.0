const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { upload, verifyImageContent } = require('../middleware/uploadMiddleware');
const {
  createRequest,
  getMyRequests,
  getPendingRequests,
  approveRequest,
  rejectRequest,
  rescheduleRequest,
  acceptReschedule,
  getMyAppointments,
  completeAppointment,
} = require('../controllers/consultationController');

router.post('/requests', protect, authorize('farmer'), upload.single('attachment'), verifyImageContent, createRequest);
router.get('/requests/mine', protect, authorize('farmer'), getMyRequests);
router.get('/requests/pending', protect, authorize('expert'), getPendingRequests);
router.put('/requests/:id/approve', protect, authorize('expert'), approveRequest);
router.put('/requests/:id/reject', protect, authorize('expert'), rejectRequest);
router.put('/requests/:id/reschedule', protect, authorize('expert'), rescheduleRequest);
router.put('/requests/:id/accept-reschedule', protect, authorize('farmer'), acceptReschedule);

router.get('/appointments/mine', protect, getMyAppointments);
router.put('/appointments/:id/complete', protect, authorize('expert'), completeAppointment);

module.exports = router;
