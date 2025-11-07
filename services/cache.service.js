const config = require('../config');

class CacheService {
  constructor() {
    this.embeddingCache = new Map();
    this.maxSize = config.cache.maxSize;
    this.ttl = config.cache.ttl;
  }

  /**
   * Get embedding from cache
   */
  getEmbedding(text) {
    const cached = this.embeddingCache.get(text);
    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > this.ttl) {
      this.embeddingCache.delete(text);
      return null;
    }

    return cached.embedding;
  }

  /**
   * Set embedding in cache
   */
  setEmbedding(text, embedding) {
    // Implement LRU eviction if cache is full
    if (this.embeddingCache.size >= this.maxSize) {
      const firstKey = this.embeddingCache.keys().next().value;
      this.embeddingCache.delete(firstKey);
    }

    this.embeddingCache.set(text, {
      embedding,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache
   */
  clear() {
    this.embeddingCache.clear();
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      size: this.embeddingCache.size,
      maxSize: this.maxSize
    };
  }
}

module.exports = new CacheService();
