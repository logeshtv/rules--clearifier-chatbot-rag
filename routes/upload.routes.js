const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const os = require('os');
const path = require('path');
const config = require('../config');
const uploadController = require('../controllers/upload.controller');

// Use disk storage for large uploads to avoid using too much memory.
const uploadDir = path.join(os.tmpdir(), 'rag_uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: config.document.maxFileSize
  }
});

// Upload endpoints
router.post('/upload/document', upload.single('file'), uploadController.uploadDocument);
// Job status for background processing
router.get('/upload/status/:jobId', uploadController.getUploadStatus);
router.post('/upload/text', uploadController.uploadText);
router.get('/upload/stats', uploadController.getUploadStats);

module.exports = router;
