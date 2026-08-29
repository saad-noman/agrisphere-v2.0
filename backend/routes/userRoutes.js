const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { generalUpload, verifyImageContent } = require('../middleware/uploadMiddleware');
const {
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  deleteProfilePhoto,
  deleteProfile,
} = require('../controllers/userController');

router.get('/me', protect, getProfile);
router.put('/me', protect, updateProfile);
router.delete('/me', protect, deleteProfile);
router.post('/me/photo', protect, generalUpload.single('photo'), verifyImageContent, uploadProfilePhoto);
router.delete('/me/photo', protect, deleteProfilePhoto);

module.exports = router;
