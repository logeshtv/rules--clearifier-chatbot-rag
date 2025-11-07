const qdrantService = require('../services/qdrant.service');
const embeddingService = require('../services/embedding.service');
const llmService = require('../services/llm.service');
const cacheService = require('../services/cache.service');
const config = require('../config');

/**
 * GET /api/health
 * Health check endpoint
 */
async function healthCheck(req, res) {
  try {
    const qdrantHealth = await qdrantService.healthCheck();
    const embeddingInfo = embeddingService.getInfo();
    const llmInfo = llmService.getInfo();
    const cacheStats = cacheService.getStats();
    
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        qdrant: qdrantHealth,
        embedding: embeddingInfo,
        llm: llmInfo,
        cache: cacheStats
      },
      config: {
        environment: config.server.env,
        ragTopK: config.rag.topK,
        ragMinScore: config.rag.minScore,
        chunkSize: config.document.chunkSize
      }
    });
    
  } catch (error) {
    console.error('❌ Health check error:', error.message);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
}

/**
 * GET /api/info
 * Get system information
 */
async function getInfo(req, res) {
  try {
    const embeddingInfo = embeddingService.getInfo();
    const llmInfo = llmService.getInfo();
    const collectionInfo = await qdrantService.getCollectionInfo();
    
    res.json({
      success: true,
      data: {
        embedding: embeddingInfo,
        llm: llmInfo,
        vectorDB: {
          collectionName: config.qdrant.collectionName,
          vectorSize: config.vectorSize,
          pointCount: collectionInfo?.points_count || 0
        },
        rag: {
          topK: config.rag.topK,
          minScore: config.rag.minScore,
          contextWindow: config.rag.contextWindow
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Info error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  healthCheck,
  getInfo
};
