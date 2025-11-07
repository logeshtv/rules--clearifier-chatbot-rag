#!/usr/bin/env node
/**
 * Diagnostic script to test Qdrant upsert payload shape
 * Run: node scripts/test-upsert.js
 */

const qdrantService = require('../services/qdrant.service');
const embeddingService = require('../services/embedding.service');
const { generateChunkId } = require('../utils/textProcessing');

async function testUpsert() {
  try {
    console.log('🧪 Testing Qdrant upsert with sample points...\n');

    // Create a small sample point
    const testTexts = [
      'This is a test document for Qdrant upsert validation.',
      'Another test chunk to verify payload shape.'
    ];

    console.log('Generating embeddings...');
    const embeddings = await embeddingService.generateEmbeddings(testTexts);
    console.log(`Generated ${embeddings.length} embeddings\n`);

    // Build points
    const points = testTexts.map((text, index) => ({
      id: generateChunkId('test-document.pdf', index),
      vector: embeddings[index],
      payload: {
        text,
        source: 'test-document.pdf',
        chunkIndex: index,
        totalChunks: testTexts.length,
        uploadedAt: new Date().toISOString(),
        metadata: { test: true }
      }
    }));

    console.log('Sample point structure:');
    console.log(JSON.stringify({
      id: points[0].id,
      vectorLength: points[0].vector.length,
      vectorSample: points[0].vector.slice(0, 5),
      payload: points[0].payload
    }, null, 2));

    console.log('\n📤 Attempting upsert...');
    await qdrantService.upsert(points, true);
    console.log('✅ Upsert succeeded!');

    // Verify by searching
    console.log('\n🔍 Verifying with search...');
    const searchResults = await qdrantService.search(embeddings[0], 1);
    console.log(`Found ${searchResults.length} results`);
    if (searchResults.length > 0) {
      console.log('First result:', {
        id: searchResults[0].id,
        score: searchResults[0].score,
        payload: searchResults[0].payload
      });
    }

    console.log('\n✅ Test passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testUpsert();
