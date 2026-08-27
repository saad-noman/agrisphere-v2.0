const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const {
  createRequest,
  getRequests,
  getStockImages,
  getRequestById,
  provideExpertise,
} = require('../controllers/farmingExpertiseController');

const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { verifyImageOrPdfContent } = require('../middleware/uploadMiddleware');

// Setup multer for expert file uploads (PNG, JPG, PDF)
const uploadDir = path.join(__dirname, '../uploads/expertise-attachments');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, WebP images and PDF documents are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

router.post('/', protect, createRequest);
router.get('/', protect, getRequests);
router.get('/stock-images', protect, requireRole('expert'), getStockImages);
router.get('/:id', protect, getRequestById);
router.post('/:id/respond', protect, requireRole('expert'), upload.single('attachment'), verifyImageOrPdfContent, provideExpertise);

module.exports = router;
