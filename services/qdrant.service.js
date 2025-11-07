process.env.TRANSFORMERS_CACHE = "/app/.cache";
process.env.HF_HOME = "/app/.cache";

const { QdrantClient } = require('@qdrant/js-client-rest');
const config = require('../config');

class QdrantService {
  constructor() {
    this.client = new QdrantClient({ 
      url: config.qdrant.url,
      timeout: config.qdrant.timeout
    });
    this.collectionName = config.qdrant.collectionName;
    this.initialized = false;
  }

  /**
   * Initialize and ensure collection exists
   */
  async initialize() {
    if (this.initialized) return;

    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(col => col.name === this.collectionName);
      
      if (!exists) {
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: config.vectorSize,
            distance: 'Cosine'
          }
        });
        console.log(`✅ Collection '${this.collectionName}' created (${config.vectorSize}D)`);
      } else {
        console.log(`✅ Collection '${this.collectionName}' already exists`);
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('❌ Error initializing Qdrant:', error.message);
      throw error;
    }
  }

  /**
   * Upsert points to collection
   */
  async upsert(points, wait = true) {
    await this.initialize();
    
    return await this.client.upsert(this.collectionName, {
      wait,
      points
    });
  }

  /**
   * Search for similar vectors
   */
  async search(vector, limit = 5, filter = null, scoreThreshold = null) {
    await this.initialize();
    
    const searchParams = {
      vector,
      limit,
      with_payload: true
    };

    if (filter) {
      searchParams.filter = filter;
    }

    if (scoreThreshold) {
      searchParams.score_threshold = scoreThreshold;
    }
    
    return await this.client.search(this.collectionName, searchParams);
  }

  /**
   * Count points matching filter
   */
  async count(filter = null) {
    await this.initialize();
    
    const params = {};
    if (filter) {
      params.filter = filter;
    }
    
    const result = await this.client.count(this.collectionName, params);
    return result.count || 0;
  }

  /**
   * Scroll through points matching filter
   */
  async scroll(filter = null, limit = 100) {
    await this.initialize();
    
    const params = {
      limit,
      with_payload: true,
      with_vector: false
    };

    if (filter) {
      params.filter = filter;
    }
    
    return await this.client.scroll(this.collectionName, params);
  }

  /**
   * Delete points matching filter
   */
  async delete(filter) {
    await this.initialize();
    
    return await this.client.delete(this.collectionName, {
      filter
    });
  }

  /**
   * Get collection info
   */
  async getCollectionInfo() {
    try {
      return await this.client.getCollection(this.collectionName);
    } catch (error) {
      return null;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const collections = await this.client.getCollections();
      return {
        status: 'connected',
        collections: collections.collections.map(c => c.name)
      };
    } catch (error) {
      throw new Error('Qdrant connection failed');
    }
  }
}

module.exports = new QdrantService();
