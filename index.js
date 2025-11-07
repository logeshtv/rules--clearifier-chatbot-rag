const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const routes = require('./routes');
const { 
  errorHandler, 
  notFoundHandler, 
  requestLogger, 
  corsHandler 
} = require('./middlewares');

// Create Express app
const app = express();

// Middleware
app.use(corsHandler);
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(requestLogger);

// Serve static files (for UI)
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Start server
const PORT = config.server.port;

app.listen(PORT, () => {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║                                                   ║');
  console.log('║       🤖 RAG Chatbot API Server Started 🚀       ║');
  console.log('║                                                   ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📍 Server running on: http://localhost:${PORT}`);
  console.log(`📊 Environment: ${config.server.env}`);
  console.log(`🔧 Embedding Method: ${config.embedding.method}`);
  console.log(`🗃️  Vector DB: ${config.qdrant.url}`);
  console.log(`📦 Collection: ${config.qdrant.collectionName}`);
  console.log('');
  console.log('📚 Available Endpoints:');
  console.log(`   - UI:              http://localhost:${PORT}/`);
  console.log(`   - Health Check:    http://localhost:${PORT}/api/health`);
  console.log(`   - System Info:     http://localhost:${PORT}/api/info`);
  console.log(`   - Chat:            POST http://localhost:${PORT}/api/chat`);
  console.log(`   - Upload Document: POST http://localhost:${PORT}/api/upload/document`);
  console.log(`   - Upload Text:     POST http://localhost:${PORT}/api/upload/text`);
  console.log(`   - Chat History:    GET http://localhost:${PORT}/api/chat/history/:userId`);
  console.log('');
  console.log('✨ Ready to receive requests!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('⚠️  SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
