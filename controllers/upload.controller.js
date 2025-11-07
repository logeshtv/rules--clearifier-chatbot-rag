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
const jobService = require('../services/job.service');

/**
 * POST /api/upload/document
 * Upload and process PDF or text file
 */
async function uploadDocument(req, res) {
  // Create a background job and return jobId immediately.
  try {
    const { password } = req.body;

    // Validate password
    validatePassword(password, config.uploadPassword);

    // Check if file exists
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const file = req.file;

    // Validate file metadata immediately
    validateFileSize(file.size);
    validateFileExtension(file.originalname);

    const job = jobService.createJob({ filename: file.originalname, size: file.size });

    // Start background processing (don't await)
    (async () => {
      const fsPromises = require('fs').promises;
      let tempFilePath = file.path;
      try {
        jobService.update(job.id, { status: 'processing', progress: 5, message: 'Reading uploaded file' });

        const buffer = await fsPromises.readFile(tempFilePath);

        jobService.update(job.id, { progress: 15, message: 'Extracting text' });
        const document = await processDocument(buffer, file.originalname);

        const chunks = chunkText(document.text);
        if (chunks.length === 0) {
          throw new Error('No text content found in document');
        }

        jobService.update(job.id, { progress: 25, message: `Chunked into ${chunks.length} pieces` });

        // Generate embeddings in batches so we can report progress
        const batchSize = 16;
        const total = chunks.length;
        const embeddings = new Array(total);
        let processed = 0;

        for (let i = 0; i < total; i += batchSize) {
          const batch = chunks.slice(i, i + batchSize);
          jobService.update(job.id, { message: `Generating embeddings: ${Math.min(i + batchSize, total)}/${total}` });
          const batchEmb = await embeddingService.generateEmbeddings(batch);
          for (let j = 0; j < batchEmb.length; j++) {
            embeddings[i + j] = batchEmb[j];
          }
          processed += batch.length;
          const progress = 25 + Math.floor((processed / total) * 60); // 25 -> 85
          jobService.update(job.id, { progress, message: `Embeddings ${processed}/${total}` });
        }

        // Prepare and upsert in Qdrant (could be batched too)
        jobService.update(job.id, { progress: 88, message: 'Preparing points for vector DB' });
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

        jobService.update(job.id, { progress: 92, message: 'Storing vectors into Qdrant' });
        // Insert into Qdrant in one upsert (can be large)
        await qdrantService.upsert(points, true);

        jobService.complete(job.id, { filename: file.originalname, chunks: chunks.length, characters: document.text.length });
      } catch (err) {
        console.error('Background upload processing failed:', err?.message || err);
        jobService.update(job.id, { status: 'failed', message: err?.message || String(err), error: String(err), progress: 0 });
      } finally {
        // Try delete temp file
        try {
          if (tempFilePath) await require('fs').promises.unlink(tempFilePath);
        } catch (e) {
          console.warn('Failed to delete temp file', tempFilePath, e?.message || e);
        }
      }
    })();

    // Return job id to client for polling
    return res.status(202).json({ success: true, jobId: job.id, message: 'Processing started' });

  } catch (error) {
    console.error('❌ Upload error:', error.message);
    return res.status(error.message.includes('password') ? 401 : 500).json({ success: false, error: error.message });
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

/**
 * GET /api/upload/status/:jobId
 * Return job status for background processing
 */
async function getUploadStatus(req, res) {
  try {
    const { jobId } = req.params;
    const job = require('../services/job.service').getJob(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    return res.json({ success: true, data: job });
  } catch (error) {
    console.error('❌ Get job status error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  uploadDocument,
  uploadText,
  getUploadStats,
  getUploadStatus
};

