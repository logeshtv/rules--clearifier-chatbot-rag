const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');

// Chat endpoints
router.post('/chat', chatController.chat);
router.get('/chat/history/:userId', chatController.getChatHistory);
router.delete('/chat/history/:userId', chatController.clearChatHistory);
router.get('/chat/stats', chatController.getChatStats);

module.exports = router;
