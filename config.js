require('dotenv').config();

module.exports = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development'
  },

  // Static Password for Upload
  uploadPassword: process.env.UPLOAD_PASSWORD || 'adrigdeva',

  // Qdrant Configuration
  qdrant: {
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    collectionName: process.env.QDRANT_COLLECTION || 'rag_documents',
    timeout: parseInt(process.env.QDRANT_TIMEOUT) || 30000
  },

  // Embedding Configuration
  embedding: {
    method: process.env.EMBEDDING_METHOD || 'XENOVA', // 'XENOVA' or 'OPENAI'
    
    // Xenova (Local) Settings
    xenova: {
      model: process.env.XENOVA_MODEL || 'Xenova/all-MiniLM-L6-v2',
      dimensions: parseInt(process.env.XENOVA_DIMENSIONS) || 384,
      quantized: process.env.XENOVA_QUANTIZED !== 'false'
    },
    
    // OpenAI Embeddings Settings
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      dimensions: parseInt(process.env.OPENAI_EMBEDDING_DIMENSIONS) || 1536,
      timeout: parseInt(process.env.OPENAI_TIMEOUT) || 30000,
      maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES) || 3
    }
  },

  // Vector Size (must match embedding dimensions)
  get vectorSize() {
    return this.embedding.method === 'OPENAI' 
      ? this.embedding.openai.dimensions 
      : this.embedding.xenova.dimensions;
  },

  // LLM Configuration (for chat completions)
  llm: {
    provider: process.env.LLM_PROVIDER || 'OPENAI', // 'OPENAI'
    
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7,
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 2000,
      timeout: parseInt(process.env.OPENAI_TIMEOUT) || 60000
    }
  },

  // RAG Configuration
  rag: {
    topK: parseInt(process.env.RAG_TOP_K) || 5,
    minScore: parseFloat(process.env.RAG_MIN_SCORE) || 0.5,
    contextWindow: parseInt(process.env.RAG_CONTEXT_WINDOW) || 10 // Number of previous messages to include
  },

  // Document Processing
  document: {
    chunkSize: parseInt(process.env.CHUNK_SIZE) || 500,
    chunkOverlap: parseInt(process.env.CHUNK_OVERLAP) || 50,
    // Allow large files up to 250MB by default (adjustable via env MAX_FILE_SIZE)
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 250 * 1024 * 1024, // 250MB
    allowedExtensions: ['.pdf', '.txt']
  },

  // Cache Configuration
  cache: {
    maxSize: parseInt(process.env.CACHE_MAX_SIZE) || 10000,
    ttl: parseInt(process.env.CACHE_TTL) || 3600000 // 1 hour in ms
  },

  // Chat History Configuration
  chatHistory: {
    maxHistoryLength: parseInt(process.env.MAX_HISTORY_LENGTH) || 50,
    pageSize: parseInt(process.env.HISTORY_PAGE_SIZE) || 20
  }
};
