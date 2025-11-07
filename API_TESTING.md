# API Testing Guide

## Prerequisites
- Server running on http://localhost:3000
- Qdrant running on http://localhost:6333
- OpenAI API key configured in .env

## 1. Health Check

```bash
# Check if services are running
curl http://localhost:3000/api/health
```

**Expected Response:**
```json
{
  "success": true,
  "status": "healthy",
  "services": {
    "qdrant": { "status": "connected" },
    "embedding": { "method": "XENOVA" },
    "llm": { "provider": "OPENAI" }
  }
}
```

## 2. Upload Text Document

```bash
curl -X POST http://localhost:3000/api/upload/text \
  -H "Content-Type: application/json" \
  -d '{
    "password": "adrigdeva",
    "source": "test-document",
    "text": "Artificial Intelligence (AI) is revolutionizing the world. Machine learning is a subset of AI that enables computers to learn from data. Deep learning uses neural networks with multiple layers. Natural Language Processing (NLP) helps computers understand human language. RAG combines retrieval with generation for better responses."
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "source": "test-document",
    "chunks": 1,
    "characters": 350,
    "message": "Successfully processed and stored 1 chunks"
  }
}
```

## 3. Upload PDF Document

```bash
# Replace 'document.pdf' with your file path
curl -X POST http://localhost:3000/api/upload/document \
  -F "password=adrigdeva" \
  -F "file=@document.pdf"
```

## 4. Chat Request (Non-Streaming)

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-001",
    "query": "What is artificial intelligence?"
  }'
```

**Note:** The response will be streamed in SSE format.

## 5. Get Chat History

```bash
# Get first page
curl "http://localhost:3000/api/chat/history/test-user-001?page=1&pageSize=10"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "userId": "test-user-001",
    "messages": [
      {
        "id": "...",
        "query": "What is artificial intelligence?",
        "response": "...",
        "timestamp": "2025-11-07T..."
      }
    ],
    "page": 1,
    "pageSize": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

## 6. Get Upload Statistics

```bash
curl http://localhost:3000/api/upload/stats
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "totalChunks": 5,
    "collectionInfo": {
      "vectorSize": 384,
      "distance": "Cosine"
    }
  }
}
```

## 7. Clear Chat History

```bash
curl -X DELETE http://localhost:3000/api/chat/history/test-user-001
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Chat history cleared"
  }
}
```

## 8. System Information

```bash
curl http://localhost:3000/api/info
```

## Testing with Python

```python
import requests

API_BASE = "http://localhost:3000/api"

# Upload text
response = requests.post(
    f"{API_BASE}/upload/text",
    json={
        "password": "adrigdeva",
        "source": "python-test",
        "text": "This is a test document about Python programming."
    }
)
print(response.json())

# Chat
response = requests.post(
    f"{API_BASE}/chat",
    json={
        "userId": "python-user",
        "query": "What is Python?"
    },
    stream=True
)

for line in response.iter_lines():
    if line:
        print(line.decode())
```

## Testing with Node.js

```javascript
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

// Upload text
async function uploadText() {
  const response = await axios.post(`${API_BASE}/upload/text`, {
    password: 'adrigdeva',
    source: 'nodejs-test',
    text: 'Node.js is a JavaScript runtime built on Chrome V8 engine.'
  });
  console.log(response.data);
}

// Chat with streaming
async function chat() {
  const response = await axios.post(
    `${API_BASE}/chat`,
    {
      userId: 'nodejs-user',
      query: 'Tell me about Node.js'
    },
    { responseType: 'stream' }
  );
  
  response.data.on('data', (chunk) => {
    console.log(chunk.toString());
  });
}

uploadText().then(() => chat());
```

## Common Issues

### 401 Unauthorized
- Check password is exactly "adrigdeva"

### 500 Internal Server Error
- Check Qdrant is running
- Check OpenAI API key is valid
- Check logs: `docker-compose logs -f rag-api`

### Embedding Generation Slow
- First time loads model (~30 seconds)
- Subsequent requests are cached

### No Results from Chat
- Ensure documents are uploaded first
- Check RAG_MIN_SCORE in .env (lower if needed)

## Load Testing

```bash
# Install Apache Bench
brew install apache2 # macOS
apt-get install apache2-utils # Ubuntu

# Test health endpoint
ab -n 100 -c 10 http://localhost:3000/api/health

# Test upload with POST
# Create test.json first
ab -n 10 -c 2 -p test.json -T application/json http://localhost:3000/api/upload/text
```

## Monitoring

```bash
# Watch logs
docker-compose logs -f rag-api

# Check Qdrant status
curl http://localhost:6333/collections

# Check memory usage
docker stats rag-chatbot-api
```
