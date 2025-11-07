const express = require('express');
const chatRoutes = require('./chat.routes');
const uploadRoutes = require('./upload.routes');
const systemRoutes = require('./system.routes');

const router = express.Router();

// Mount route modules
router.use('/', chatRoutes);
router.use('/', uploadRoutes);
router.use('/', systemRoutes);

module.exports = router;
