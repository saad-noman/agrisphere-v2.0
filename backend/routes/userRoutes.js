const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { generalUpload, verifyImageContent } = require('../middleware/uploadMiddleware');
const {
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  deleteProfilePhoto,
  deleteProfile,
  changePassword,
  getAdminStats,
} = require('../controllers/userController');

router.get('/me', protect, getProfile);
router.put('/me', protect, updateProfile);
router.delete('/me', protect, deleteProfile);
router.patch('/change-password', protect, changePassword);
router.get('/admin/stats', protect, authorize('admin'), getAdminStats);
router.post('/me/photo', protect, generalUpload.single('photo'), verifyImageContent, uploadProfilePhoto);
router.delete('/me/photo', protect, deleteProfilePhoto);

module.exports = router;
