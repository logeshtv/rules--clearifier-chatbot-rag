const config = require('../config');
const { v4: uuidv4 } = require('uuid');

/**
 * Chunk text into smaller pieces with overlap
 */
function chunkText(text, chunkSize = null, overlap = null) {
  const size = chunkSize || config.document.chunkSize;
  const overlapSize = overlap || config.document.chunkOverlap;
  
  if (!text || text.trim().length === 0) {
    return [];
  }

  const chunks = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  let currentChunk = '';
  let previousChunk = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    
    if ((currentChunk + ' ' + trimmedSentence).length <= size) {
      currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        
        // Create overlap from end of previous chunk
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(overlapSize / 10));
        previousChunk = overlapWords.join(' ');
        
        currentChunk = previousChunk + ' ' + trimmedSentence;
      } else {
        currentChunk = trimmedSentence;
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Clean text by removing extra whitespace and special characters
 */
function cleanText(text) {
  if (!text) return '';
  
  return text
    .replace(/\s+/g, ' ')           // Replace multiple spaces with single space
    .replace(/\n\s*\n/g, '\n')      // Remove extra blank lines
    .replace(/[^\S\n]+/g, ' ')      // Normalize whitespace except newlines
    .trim();
}

/**
 * Extract metadata from text (like titles, headers, etc.)
 */
function extractMetadata(text, source = '') {
  const metadata = {
    source,
    length: text.length,
    wordCount: text.split(/\s+/).length
  };

  // Try to extract title from first line or first few words
  const firstLine = text.split('\n')[0];
  if (firstLine.length < 100) {
    metadata.title = firstLine.trim();
  } else {
    metadata.title = text.substring(0, 100).trim() + '...';
  }

  return metadata;
}

/**
 * Generate unique ID for document chunks
 * Uses UUID v4 format which is compatible with Qdrant
 */
function generateChunkId(source, index) {
  // Generate a valid UUID that Qdrant accepts
  return uuidv4();
}

/**
 * Validate file size
 */
function validateFileSize(size) {
  if (size > config.document.maxFileSize) {
    throw new Error(
      `File size (${(size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${(config.document.maxFileSize / 1024 / 1024).toFixed(2)}MB)`
    );
  }
  return true;
}

/**
 * Validate file extension
 */
function validateFileExtension(filename) {
  const ext = '.' + filename.split('.').pop().toLowerCase();
  
  if (!config.document.allowedExtensions.includes(ext)) {
    throw new Error(
      `File extension '${ext}' is not allowed. Allowed: ${config.document.allowedExtensions.join(', ')}`
    );
  }
  
  return true;
}

module.exports = {
  chunkText,
  cleanText,
  extractMetadata,
  generateChunkId,
  validateFileSize,
  validateFileExtension
};
