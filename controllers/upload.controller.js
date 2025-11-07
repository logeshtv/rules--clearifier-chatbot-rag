const embeddingService = require('../services/embedding.service');
const qdrantService = require('../services/qdrant.service');
const { processDocument } = require('../utils/documentParser');
const { 
  chunkText, 
  generateChunkId, 
  validateFileSize, 
  validateFileExtension 
} = require('../utils/textProcessing');
const { validatePassword, sanitizeInput } = require('../utils/validation');
const config = require('../config');

/**
 * POST /api/upload/document
 * Upload and process PDF or text file
 */
async function uploadDocument(req, res) {
  // For disk-based uploads we will read the file into a buffer, process and then remove the temp file.
  const fs = require('fs').promises;
  let tempFilePath = null;

  try {
    const { password } = req.body;

    // Validate password
    validatePassword(password, config.uploadPassword);

    // Check if file exists
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const file = req.file;
    tempFilePath = file.path; // multer diskStorage path
    console.log(`📄 Processing file: ${file.originalname} (${(file.size / 1024).toFixed(2)} KB) -> ${tempFilePath}`);

    // Validate file
    validateFileSize(file.size);
    validateFileExtension(file.originalname);

    // Read the file from disk into a buffer
    const buffer = await fs.readFile(tempFilePath);

    // Process document
    const document = await processDocument(buffer, file.originalname);
    console.log(`✅ Extracted ${document.text.length} characters from document`);
    
    // Chunk the text
    const chunks = chunkText(document.text);
    console.log(`✅ Created ${chunks.length} chunks`);
    
    if (chunks.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No text content found in document'
      });
    }
    
    // Generate embeddings for all chunks
    console.log('🔄 Generating embeddings...');
    const embeddings = await embeddingService.generateEmbeddings(chunks);
    console.log('✅ Embeddings generated');
    
    // Prepare points for Qdrant
    const points = chunks.map((chunk, index) => ({
      id: generateChunkId(file.originalname, index),
      vector: embeddings[index],
      payload: {
        text: chunk,
        source: file.originalname,
        chunkIndex: index,
        totalChunks: chunks.length,
        uploadedAt: new Date().toISOString(),
        metadata: document.metadata || {}
      }
    }));
    
    // Insert into Qdrant
    console.log('💾 Storing in vector database...');
    await qdrantService.upsert(points, true);
    console.log('✅ Successfully stored in Qdrant');

    res.json({
      success: true,
      data: {
        filename: file.originalname,
        size: file.size,
        chunks: chunks.length,
        characters: document.text.length,
        message: `Successfully processed and stored ${chunks.length} chunks`
      }
    });

  } catch (error) {
    console.error('❌ Upload error:', error.message);
    res.status(error.message.includes('password') ? 401 : 500).json({
      success: false,
      error: error.message
    });
  } finally {
    // Clean up temporary file if it exists
    try {
      if (tempFilePath) {
        await require('fs').promises.unlink(tempFilePath);
        console.log(`🧹 Deleted temp file: ${tempFilePath}`);
      }
    } catch (err) {
      // Log and continue
      console.warn('⚠️ Failed to delete temp file:', tempFilePath, err?.message || err);
    }
  }
}

/**
 * POST /api/upload/text
 * Upload and process raw text
 */
async function uploadText(req, res) {
  try {
    const { password, text, source } = req.body;
    
    // Validate password
    validatePassword(password, config.uploadPassword);
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Text content is required'
      });
    }
    
    const sanitizedText = sanitizeInput(text);
    const sanitizedSource = sanitizeInput(source || 'manual-input');
    
    console.log(`📝 Processing text input from: ${sanitizedSource}`);
    console.log(`📏 Text length: ${sanitizedText.length} characters`);
    
    // Chunk the text
    const chunks = chunkText(sanitizedText);
    console.log(`✅ Created ${chunks.length} chunks`);
    
    if (chunks.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Text is too short to process'
      });
    }
    
    // Generate embeddings
    console.log('🔄 Generating embeddings...');
    const embeddings = await embeddingService.generateEmbeddings(chunks);
    console.log('✅ Embeddings generated');
    
    // Prepare points for Qdrant
    const points = chunks.map((chunk, index) => ({
      id: generateChunkId(sanitizedSource, index),
      vector: embeddings[index],
      payload: {
        text: chunk,
        source: sanitizedSource,
        chunkIndex: index,
        totalChunks: chunks.length,
        uploadedAt: new Date().toISOString()
      }
    }));
    
    // Insert into Qdrant
    console.log('💾 Storing in vector database...');
    await qdrantService.upsert(points, true);
    console.log('✅ Successfully stored in Qdrant');
    
    res.json({
      success: true,
      data: {
        source: sanitizedSource,
        chunks: chunks.length,
        characters: sanitizedText.length,
        message: `Successfully processed and stored ${chunks.length} chunks`
      }
    });
    
  } catch (error) {
    console.error('❌ Text upload error:', error.message);
    res.status(error.message.includes('password') ? 401 : 500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/upload/stats
 * Get upload statistics
 */
async function getUploadStats(req, res) {
  try {
    const count = await qdrantService.count();
    const collectionInfo = await qdrantService.getCollectionInfo();
    
    res.json({
      success: true,
      data: {
        totalChunks: count,
        collectionInfo: collectionInfo ? {
          vectorSize: collectionInfo.config?.params?.vectors?.size,
          distance: collectionInfo.config?.params?.vectors?.distance
        } : null
      }
    });
    
  } catch (error) {
    console.error('❌ Stats error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  uploadDocument,
  uploadText,
  getUploadStats
};
