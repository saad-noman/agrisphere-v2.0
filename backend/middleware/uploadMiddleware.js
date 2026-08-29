const multer = require('multer');
const path = require('path');
const fs = require('fs');

const generalUploadDir = path.join(__dirname, '../uploads');
const diseaseCaseUploadDir = path.join(__dirname, '../uploads/disease-cases');
const stockCropsUploadDir = path.join(__dirname, '../uploads/stock-crops');
const cropAnalysisUploadDir = path.join(__dirname, '../uploads/crop-analysis');
const communityUploadDir = path.join(__dirname, '../uploads/community');

fs.mkdirSync(generalUploadDir, { recursive: true });
fs.mkdirSync(diseaseCaseUploadDir, { recursive: true });
fs.mkdirSync(stockCropsUploadDir, { recursive: true });
fs.mkdirSync(cropAnalysisUploadDir, { recursive: true });
fs.mkdirSync(communityUploadDir, { recursive: true });

const generalStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, generalUploadDir),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    cb(null, filename);
  },
});

const diseaseCaseStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, diseaseCaseUploadDir),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

// Used for disease case attachments
const upload = multer({
  storage: diseaseCaseStorage,
  fileFilter,
  limits: {
    files: 5,
    fileSize: 5 * 1024 * 1024,
  },
});

const generalUpload = multer({
  storage: generalStorage,
});

const cropAnalysisStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, cropAnalysisUploadDir),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    cb(null, filename);
  },
});

// Used for AI crop identification & disease detection (single image)
const cropAnalysisUpload = multer({
  storage: cropAnalysisStorage,
  fileFilter,
  limits: {
    files: 1,
    fileSize: 5 * 1024 * 1024,
  },
});

const communityStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, communityUploadDir),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    cb(null, filename);
  },
});

// Community post attachments (up to 5 images)
const communityUpload = multer({
  storage: communityStorage,
  fileFilter,
  limits: {
    files: 5,
    fileSize: 5 * 1024 * 1024,
  },
});

// Single image attached to a community comment
const communityCommentUpload = multer({
  storage: communityStorage,
  fileFilter,
  limits: {
    files: 1,
    fileSize: 5 * 1024 * 1024,
  },
});

// Checks real file bytes against known image signatures, since Content-Type is spoofable

const IMAGE_SIGNATURES = [
  { bytes: [0xff, 0xd8, 0xff] }, // JPEG
  { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }, // PNG
  { bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF87a / GIF89a
  { bytes: [0x42, 0x4d] }, // BMP
  { bytes: [0x52, 0x49, 0x46, 0x46], offset2: [0x57, 0x45, 0x42, 0x50], offset2At: 8 }, // WEBP
];

const PDF_SIGNATURE = { bytes: [0x25, 0x50, 0x44, 0x46] }; // %PDF
const IMAGE_OR_PDF_SIGNATURES = [...IMAGE_SIGNATURES, PDF_SIGNATURE];

const matchesSignature = (buf, sig) => {
  for (let i = 0; i < sig.bytes.length; i++) {
    if (buf[i] !== sig.bytes[i]) return false;
  }
  if (sig.offset2) {
    for (let i = 0; i < sig.offset2.length; i++) {
      if (buf[sig.offset2At + i] !== sig.offset2[i]) return false;
    }
  }
  return true;
};

const matchesAnySignature = (filePath, signatures) => {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(16);
    fs.readSync(fd, buf, 0, 16, 0);
    return signatures.some((sig) => matchesSignature(buf, sig));
  } finally {
    fs.closeSync(fd);
  }
};

// Builds middleware that rejects uploads whose bytes don't match the given signatures
const makeContentVerifier = (signatures, rejectMessage) => (req, res, next) => {
  const files = req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : req.file ? [req.file] : [];

  if (files.length === 0) return next();

  for (const file of files) {
    if (!matchesAnySignature(file.path, signatures)) {
      files.forEach((f) => fs.unlink(f.path, () => {}));
      return res.status(400).json({ message: rejectMessage });
    }
  }

  next();
};

const verifyImageContent = makeContentVerifier(IMAGE_SIGNATURES, 'Uploaded file is not a valid image');
const verifyImageOrPdfContent = makeContentVerifier(IMAGE_OR_PDF_SIGNATURES, 'Uploaded file must be a valid image or PDF');

upload.upload = upload;
upload.diseaseUpload = upload;
upload.cropAnalysisUpload = cropAnalysisUpload;

module.exports = upload;
module.exports.upload = upload;
module.exports.diseaseUpload = upload;
module.exports.cropAnalysisUpload = cropAnalysisUpload;
// Saves directly under /uploads, matching the paths the profile controller stores
module.exports.generalUpload = generalUpload;
module.exports.communityUpload = communityUpload;
module.exports.communityCommentUpload = communityCommentUpload;
module.exports.verifyImageContent = verifyImageContent;
module.exports.verifyImageOrPdfContent = verifyImageOrPdfContent;
