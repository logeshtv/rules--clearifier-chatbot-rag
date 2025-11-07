const express = require('express');
const router = express.Router();
const systemController = require('../controllers/system.controller');

// System endpoints
router.get('/health', systemController.healthCheck);
router.get('/info', systemController.getInfo);

module.exports = router;
