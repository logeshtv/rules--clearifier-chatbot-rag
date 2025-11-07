const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadController = require('../controllers/upload.controller');

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

// Upload endpoints
router.post('/upload/document', upload.single('file'), uploadController.uploadDocument);
router.post('/upload/text', uploadController.uploadText);
router.get('/upload/stats', uploadController.getUploadStats);

module.exports = router;
