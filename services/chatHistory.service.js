const config = require('../config');

class ChatHistoryService {
  constructor() {
    // In-memory storage (for production, use a database like MongoDB, PostgreSQL, etc.)
    this.chatHistories = new Map(); // userId -> array of messages
    this.maxHistoryLength = config.chatHistory.maxHistoryLength;
  }

  /**
   * Add a message to chat history
   */
  addMessage(userId, query, response, contexts = []) {
    if (!this.chatHistories.has(userId)) {
      this.chatHistories.set(userId, []);
    }

    const history = this.chatHistories.get(userId);
    
    const message = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      query,
      response,
      contexts: contexts.map(ctx => ({
        text: ctx.payload?.text || '',
        source: ctx.payload?.source || '',
        score: ctx.score
      })),
      timestamp: new Date().toISOString()
    };

    history.push(message);

    // Keep only recent messages
    if (history.length > this.maxHistoryLength) {
      history.shift();
    }

    return message;
  }

  /**
   * Get chat history for a user with pagination
   */
  getChatHistory(userId, page = 1, pageSize = null) {
    const size = pageSize || config.chatHistory.pageSize;
    
    if (!this.chatHistories.has(userId)) {
      return {
        userId,
        messages: [],
        page,
        pageSize: size,
        total: 0,
        totalPages: 0
      };
    }

    const allMessages = this.chatHistories.get(userId);
    const total = allMessages.length;
    const totalPages = Math.ceil(total / size);
    
    // Get messages in reverse order (newest first)
    const reversedMessages = [...allMessages].reverse();
    const startIndex = (page - 1) * size;
    const endIndex = startIndex + size;
    const messages = reversedMessages.slice(startIndex, endIndex);

    return {
      userId,
      messages,
      page,
      pageSize: size,
      total,
      totalPages
    };
  }

  /**
   * Get recent context for RAG (for maintaining conversation context)
   */
  getRecentContext(userId, limit = null) {
    const contextLimit = limit || config.rag.contextWindow;
    
    if (!this.chatHistories.has(userId)) {
      return [];
    }

    const history = this.chatHistories.get(userId);
    return history.slice(-contextLimit);
  }

  /**
   * Clear chat history for a user
   */
  clearHistory(userId) {
    this.chatHistories.delete(userId);
    return { success: true, message: 'Chat history cleared' };
  }

  /**
   * Get all user IDs
   */
  getAllUsers() {
    return Array.from(this.chatHistories.keys());
  }

  /**
   * Get statistics
   */
  getStats() {
    const stats = {
      totalUsers: this.chatHistories.size,
      totalMessages: 0,
      users: []
    };

    this.chatHistories.forEach((history, userId) => {
      stats.totalMessages += history.length;
      stats.users.push({
        userId,
        messageCount: history.length,
        lastActivity: history.length > 0 ? history[history.length - 1].timestamp : null
      });
    });

    return stats;
  }
}

module.exports = new ChatHistoryService();
