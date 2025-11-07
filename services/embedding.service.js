process.env.TRANSFORMERS_CACHE = "/app/.cache";
process.env.HF_HOME = "/app/.cache";

const OpenAI = require('openai');
const config = require('../config');
const cacheService = require('./cache.service');

class EmbeddingService {
  constructor() {
    this.embeddingMethod = config.embedding.method;
    
    // Initialize OpenAI client if using OpenAI
    if (this.embeddingMethod === 'OPENAI') {
      this.openaiClient = new OpenAI({ 
        apiKey: config.embedding.openai.apiKey,
        timeout: config.embedding.openai.timeout,
        maxRetries: config.embedding.openai.maxRetries
      });
    }
    
    // Xenova pipeline (lazy loaded)
    this.xenovaPipeline = null;
  }

  /**
   * Initialize Xenova model (lazy loading)
   */
  async _initializeXenova() {
    if (!this.xenovaPipeline) {
      try {
        console.log(`📥 Loading Xenova model: ${config.embedding.xenova.model}...`);
        const { pipeline } = await import('@xenova/transformers');
        this.xenovaPipeline = await pipeline(
          'feature-extraction',
          config.embedding.xenova.model,
          { quantized: config.embedding.xenova.quantized }
        );
        console.log('✅ Xenova model loaded successfully');
      } catch (error) {
        console.error('❌ Failed to initialize Xenova model:', error.message);
        throw new Error(`Xenova initialization failed: ${error.message}`);
      }
    }
    return this.xenovaPipeline;
  }

  /**
   * Generate embeddings using OpenAI
   */
  async _generateOpenAIEmbeddings(texts) {
    try {
      const response = await this.openaiClient.embeddings.create({
        model: config.embedding.openai.model,
        input: texts,
        dimensions: config.embedding.openai.dimensions
      });
      
      return response.data.map(item => item.embedding);
    } catch (error) {
      console.error('❌ OpenAI embedding error:', error.message);
      throw new Error('Failed to generate OpenAI embeddings');
    }
  }

  /**
   * Generate embeddings using Xenova (local)
   */
  async _generateXenovaEmbeddings(texts) {
    try {
      const embedder = await this._initializeXenova();
      const response = await embedder(texts, { 
        pooling: 'mean', 
        normalize: true 
      });
      
      // Extract embeddings from response
      const embeddings = [];
      
      if (Array.isArray(texts)) {
        for (let i = 0; i < texts.length; i++) {
          const embedding = Array.from(response[i].data);
          embeddings.push(embedding);
        }
      } else {
        embeddings.push(Array.from(response.data));
      }
      
      return embeddings;
    } catch (error) {
      console.error('❌ Xenova embedding error:', error.message);
      throw new Error(`Failed to generate Xenova embeddings: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for multiple texts (auto-selects method)
   */
  async generateEmbeddings(texts) {
    const textsArray = Array.isArray(texts) ? texts : [texts];
    const uncachedTexts = [];
    const uncachedIndices = [];
    const results = new Array(textsArray.length);
    
    // Check cache first
    textsArray.forEach((text, index) => {
      const cached = cacheService.getEmbedding(text);
      if (cached) {
        results[index] = cached;
      } else {
        uncachedTexts.push(text);
        uncachedIndices.push(index);
      }
    });
    
    // Generate embeddings for uncached texts
    if (uncachedTexts.length > 0) {
      let embeddings;
      
      if (this.embeddingMethod === 'OPENAI') {
        embeddings = await this._generateOpenAIEmbeddings(uncachedTexts);
      } else {
        embeddings = await this._generateXenovaEmbeddings(uncachedTexts);
      }
      
      // Store in results and cache
      embeddings.forEach((embedding, i) => {
        const originalIndex = uncachedIndices[i];
        const text = uncachedTexts[i];
        
        results[originalIndex] = embedding;
        cacheService.setEmbedding(text, embedding);
      });
    }
    
    return results;
  }

  /**
   * Generate single embedding
   */
  async generateEmbedding(text) {
    const embeddings = await this.generateEmbeddings([text]);
    return embeddings[0];
  }

  /**
   * Get current embedding method info
   */
  getInfo() {
    if (this.embeddingMethod === 'OPENAI') {
      return {
        method: 'OPENAI',
        model: config.embedding.openai.model,
        dimensions: config.embedding.openai.dimensions
      };
    } else {
      return {
        method: 'XENOVA',
        model: config.embedding.xenova.model,
        dimensions: config.embedding.xenova.dimensions
      };
    }
  }
}

module.exports = new EmbeddingService();
