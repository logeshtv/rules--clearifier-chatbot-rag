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
    // Basic validation and logging to help debug Bad Request errors from Qdrant
    if (!Array.isArray(points) || points.length === 0) {
      throw new Error('Upsert called with empty or non-array points');
    }

    const expectedDim = config.vectorSize;
    // Find first point that violates shape constraints
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (!p || (p.id === undefined || p.id === null)) {
        throw new Error(`Point at index ${i} missing id`);
      }
      if (!Array.isArray(p.vector)) {
        throw new Error(`Point id=${p.id} vector is not an array (index ${i})`);
      }
      if (p.vector.length !== expectedDim) {
        throw new Error(`Point id=${p.id} has vector length ${p.vector.length} but expected ${expectedDim}`);
      }
      // Check values are finite numbers
      for (let j = 0; j < p.vector.length; j++) {
        const v = p.vector[j];
        if (typeof v !== 'number' || !isFinite(v)) {
          throw new Error(`Point id=${p.id} vector contains non-finite value at position ${j}`);
        }
      }
    }

    // Truncated sample for logs (don't print entire vectors to avoid huge logs)
    const sample = points[0];
    const samplePreview = {
      id: sample.id,
      vectorDim: Array.isArray(sample.vector) ? sample.vector.length : null,
      vectorHead: Array.isArray(sample.vector) ? sample.vector.slice(0, 6) : null,
      payloadKeys: sample.payload ? Object.keys(sample.payload).slice(0, 10) : []
    };

    console.log(`Qdrant upsert: sending ${points.length} points (collection=${this.collectionName}, dim=${expectedDim}). sample:`, samplePreview);

    try {
      return await this.client.upsert(this.collectionName, {
        wait,
        points
      });
    } catch (error) {
      // Log detailed error information
      console.error('Qdrant upsert failed with detailed error:');
      console.error('Error message:', error.message);
      console.error('Error status:', error.status);
      console.error('Error data:', JSON.stringify(error.data || error.response?.data || {}, null, 2));
      
      // Log first point's full payload for debugging
      if (points.length > 0) {
        console.error('First point full structure:', JSON.stringify({
          id: points[0].id,
          vectorLength: points[0].vector?.length,
          payload: points[0].payload
        }, null, 2));
      }
      
      throw error;
    }
  }

  /**
   * Search for similar vectors
   */
  async search(vector, limit = 8, filter = null, scoreThreshold = null) {
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
