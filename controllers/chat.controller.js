const embeddingService = require('../services/embedding.service');
const qdrantService = require('../services/qdrant.service');
const llmService = require('../services/llm.service');
const chatHistoryService = require('../services/chatHistory.service');
const { validateRequired, sanitizeInput } = require('../utils/validation');
const config = require('../config');

/**
 * POST /api/chat
 * Main chatbot endpoint with streaming support
 */
async function chat(req, res) {
  try {
    const { userId, query } = req.body;
    
    // Validate input
    validateRequired(req.body, ['userId', 'query']);
    
    const sanitizedUserId = sanitizeInput(userId);
    const sanitizedQuery = sanitizeInput(query);
    
    console.log(`🤖 Chat request from user: ${sanitizedUserId}`);
    console.log(`📝 Query: ${sanitizedQuery}`);
    
    // Generate embedding for the query
    console.log('🔄 Generating query embedding...');
    const queryEmbedding = await embeddingService.generateEmbedding(sanitizedQuery);
    
    // Search for relevant context in Qdrant
    console.log('🔍 Searching for relevant context...');
    const searchResults = await qdrantService.search(
      queryEmbedding,
      config.rag.topK,
      null,
      config.rag.minScore
    );
    
    console.log(`✅ Found ${searchResults.length} relevant chunks`);
    
    // Get recent chat history for context
    const recentHistory = chatHistoryService.getRecentContext(sanitizedUserId);
    
    // Prepare contexts
    const contexts = searchResults.map(result => ({
      text: result.payload?.text || '',
      source: result.payload?.source || '',
      score: result.score
    }));

    // If no useful context was found, short-circuit and return the exact fallback message
    // const hasUsefulContext = contexts.some(c => c.text && c.text.trim().length > 0);
    // if (!hasUsefulContext) {
    //   const fallback = 'Sorry, no relevant information is available in the provided context.';

    //   // Save to chat history with empty search results
    //   chatHistoryService.addMessage(sanitizedUserId, sanitizedQuery, fallback, searchResults);

    //   // Return as SSE stream message for compatibility with frontend streaming
    //   res.setHeader('Content-Type', 'text/event-stream');
    //   res.setHeader('Cache-Control', 'no-cache');
    //   res.setHeader('Connection', 'keep-alive');
    //   res.write(`data: ${JSON.stringify({ chunk: fallback, done: true, contexts: [] })}\n\n`);
    //   res.end();
    //   console.log('ℹ️ No context found — returned fallback message');
    //   return;
    // }
    
    // Build RAG prompt
    const messages = llmService.buildRAGPrompt(sanitizedQuery, contexts, recentHistory);
    
    // Set headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    let fullResponse = '';
    
    // Stream response
    console.log('💬 Generating response...');
    for await (const chunk of llmService.generateResponse(messages, true)) {
      fullResponse += chunk;
      res.write(`data: ${JSON.stringify({ chunk, done: false })}\n\n`);
    }
    
    // Save to chat history
    chatHistoryService.addMessage(sanitizedUserId, sanitizedQuery, fullResponse, searchResults);
    
    // Send done signal
    res.write(`data: ${JSON.stringify({ chunk: '', done: true, contexts })}\n\n`);
    res.end();
    
    console.log('✅ Response completed and saved to history');
    
  } catch (error) {
    console.error('❌ Chat error:', error.message);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message, done: true })}\n\n`);
      res.end();
    }
  }
}

/**
 * GET /api/chat/history/:userId
 * Get chat history for a user with pagination
 */
async function getChatHistory(req, res) {
  try {
    const { userId } = req.params;
    const { page = 1, pageSize = 20 } = req.query;
    
    const sanitizedUserId = sanitizeInput(userId);
    
    const history = chatHistoryService.getChatHistory(
      sanitizedUserId,
      parseInt(page),
      parseInt(pageSize)
    );
    
    res.json({
      success: true,
      data: history
    });
    
  } catch (error) {
    console.error('❌ Get history error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * DELETE /api/chat/history/:userId
 * Clear chat history for a user
 */
async function clearChatHistory(req, res) {
  try {
    const { userId } = req.params;
    const sanitizedUserId = sanitizeInput(userId);
    
    const result = chatHistoryService.clearHistory(sanitizedUserId);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('❌ Clear history error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/chat/stats
 * Get chat statistics
 */
async function getChatStats(req, res) {
  try {
    const stats = chatHistoryService.getStats();
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('❌ Get stats error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  chat,
  getChatHistory,
  clearChatHistory,
  getChatStats
};
