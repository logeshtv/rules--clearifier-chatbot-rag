# Troubleshooting Guide

## Common Issues and Solutions

### 1. "Bad Request" During Upload

**Symptom**: Upload job fails with "Bad Request" error message during vector database upsert.

**Common Causes**:
- Payload fields contain very large strings or binary data
- Vector dimensions don't match collection configuration
- Invalid characters in payload strings
- Request payload size exceeds Qdrant limits

**Solutions**:

1. **Check server logs** for detailed error messages:
   ```bash
   docker-compose logs -f api
   ```
   
   Look for lines like:
   - `Qdrant upsert: sending X points...` - shows batch size and sample point
   - `Point id=... has vector length...` - dimension mismatch
   - `Point id=... vector contains non-finite value` - NaN/Infinity in embeddings

2. **Reduce upsert batch size** by setting environment variable:
   ```bash
   UPSERT_BATCH_SIZE=100
   ```
   
   Lower values (50-200) are more reliable for large documents. Default is 200.

3. **Check collection vector size** matches embedding dimensions:
   ```bash
   # For Xenova (default):
   XENOVA_DIMENSIONS=384
   
   # For OpenAI:
   OPENAI_EMBEDDING_DIMENSIONS=1536
   ```

4. **Verify Qdrant is running and healthy**:
   ```bash
   curl http://localhost:6333/collections
   ```
   
   Or visit: http://localhost:6333/dashboard

5. **Check document content** - some PDFs contain binary data or very long metadata that can cause issues. The system now automatically:
   - Truncates payload string fields to 32KB max
   - Sanitizes metadata to prevent oversized payloads
   - Validates vectors before upsert

6. **Test with smaller files first** to isolate the issue:
   - Try uploading a simple .txt file with a few paragraphs
   - If that works, the issue is likely with specific PDF content

7. **Check Qdrant memory/resources**:
   ```bash
   docker stats qdrant
   ```
   
   Qdrant might reject large batches if running low on memory.

### 2. Upload Timeouts or 502 Errors

**Symptom**: Upload request times out or returns 502 Bad Gateway.

**Solution**: 
- Large uploads now process in background (returns 202 with jobId)
- Poll `/api/upload/status/:jobId` to check progress
- Increase `MAX_FILE_SIZE` if needed (default 250MB)

### 3. Embeddings Generation Slow

**Symptom**: Upload stuck at "Generating embeddings" for a long time.

**Solutions**:
- **Xenova (local)**: First run downloads model (~90MB), subsequent runs are fast
- **Switch to OpenAI**: Set `EMBEDDING_METHOD=OPENAI` and provide API key (faster but paid)
- **Reduce chunk size**: Lower `CHUNK_SIZE` to create fewer chunks

### 4. Qdrant Connection Failed

**Symptom**: `Qdrant connection failed` in health check.

**Solutions**:
1. **Check Qdrant is running**:
   ```bash
   docker-compose ps
   ```

2. **Verify URL is correct**:
   ```bash
   QDRANT_URL=http://qdrant:6333  # for docker-compose
   # or
   QDRANT_URL=http://localhost:6333  # for local development
   ```

3. **Check Qdrant logs**:
   ```bash
   docker-compose logs qdrant
   ```

### 5. Chat Responses Empty or Irrelevant

**Symptom**: Chatbot returns empty responses or doesn't use uploaded documents.

**Solutions**:
1. **Check documents uploaded successfully**:
   ```bash
   curl http://localhost:3000/api/upload/stats
   ```

2. **Adjust RAG parameters** in `.env`:
   ```bash
   RAG_TOP_K=10           # Retrieve more chunks (default: 5)
   RAG_MIN_SCORE=0.3      # Lower threshold (default: 0.5)
   RAG_CONTEXT_WINDOW=20  # More chat history (default: 10)
   ```

3. **Check OpenAI API key** is valid if using OpenAI LLM

### 6. Memory Issues

**Symptom**: Server crashes or becomes unresponsive during upload.

**Solutions**:
1. **Increase Docker memory limits** in `docker-compose.yml`:
   ```yaml
   services:
     api:
       mem_limit: 4g
   ```

2. **Use disk-based uploads** (already configured):
   - Files stored temporarily on disk, not in memory
   - Automatically cleaned up after processing

3. **Reduce batch sizes**:
   ```bash
   UPSERT_BATCH_SIZE=100
   # Embedding batch is hardcoded to 16 in controller
   ```

## Debugging Tools

### Test Upsert Script

Run the diagnostic script to test Qdrant upsert with sample data:

```bash
node scripts/test-upsert.js
```

This will:
- Generate sample embeddings
- Create test points
- Attempt upsert
- Report success or detailed error

### Check Logs with Filters

```bash
# Show only errors
docker-compose logs api | grep "❌\|Error"

# Show upload progress
docker-compose logs api | grep "Upserting\|Embeddings"

# Show Qdrant operations
docker-compose logs api | grep "Qdrant"
```

### Manual API Testing

See `API_TESTING.md` for curl examples and VS Code REST Client collection (`api.rest`).

## Getting Help

If issues persist:

1. **Collect information**:
   - Server logs (especially error stack traces)
   - Job ID and status JSON
   - File size and type
   - Environment variables (redact sensitive keys)

2. **Try with minimal config**:
   - Use default `.env.example` values
   - Test with small .txt file first
   - Check Qdrant dashboard: http://localhost:6333/dashboard

3. **Common fixes checklist**:
   - [ ] Qdrant is running and accessible
   - [ ] Collection vector size matches embedding dimensions
   - [ ] `UPSERT_BATCH_SIZE` is set to 200 or lower
   - [ ] Server has enough memory (4GB+ recommended)
   - [ ] Docker containers have sufficient resources
   - [ ] No firewall blocking ports 3000 or 6333
