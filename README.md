# RAG Chatbot API 🤖

A production-ready RAG (Retrieval-Augmented Generation) chatbot API with vector search capabilities using Qdrant, Xenova embeddings, and OpenAI LLM.

## ✨ Features

- 🚀 **RESTful API** with Express.js
- 💬 **Streaming Chat Responses** with context-aware conversations
- 📄 **Document Processing** (PDF & TXT files)
- 🔍 **Vector Search** with Qdrant
- 🧠 **Local Embeddings** with Xenova (no API costs!)
- 💾 **Chat History** with pagination
- 🔐 **Password-Protected Uploads**
- 🎨 **Simple Web UI** included
- 🐳 **Docker Support** for easy deployment

## 🏗️ Architecture

```
┌─────────────────┐
│   Web UI        │
└────────┬────────┘
         │
┌────────▼────────┐
│   Express API   │
├─────────────────┤
│  Controllers    │
│  Services       │
│  Utils          │
└─────┬───────┬───┘
      │       │
┌─────▼──┐ ┌─▼──────┐
│ Qdrant │ │ Xenova │
│Vector  │ │Embedder│
│   DB   │ └────────┘
└────────┘
```

## 📋 API Endpoints

### Chat Endpoints
- `POST /api/chat` - Send chat message (streaming response)
- `GET /api/chat/history/:userId` - Get chat history (paginated)
- `DELETE /api/chat/history/:userId` - Clear chat history
- `GET /api/chat/stats` - Get chat statistics

### Upload Endpoints
- `POST /api/upload/document` - Upload PDF or TXT file
- `POST /api/upload/text` - Upload raw text
- `GET /api/upload/stats` - Get upload statistics

### System Endpoints
- `GET /api/health` - Health check
- `GET /api/info` - System information

## 🚀 Quick Start

### Option 1: Docker (Recommended)

1. **Clone and configure**
   ```bash
   cd rules-clarify-rag
   cp .env.example .env
   # Edit .env and add your OPENAI_API_KEY
   ```

2. **Start services**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - UI: http://localhost:3000
   - API: http://localhost:3000/api
   - Qdrant: http://localhost:6333

### Option 2: Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start Qdrant (using Docker)**
   ```bash
   docker run -p 6333:6333 qdrant/qdrant:latest
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env and configure settings
   ```

4. **Start the server**
   ```bash
   npm start
   # or for development with auto-reload
   npm run dev
   ```

## 🔧 Configuration

### Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# Upload Password
UPLOAD_PASSWORD=adrigdeva

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=rag_documents

# Embedding (Xenova - Local)
EMBEDDING_METHOD=XENOVA
XENOVA_MODEL=Xenova/all-MiniLM-L6-v2
XENOVA_DIMENSIONS=384

# LLM (OpenAI)
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4o-mini

# RAG Settings
RAG_TOP_K=5
RAG_MIN_SCORE=0.5
RAG_CONTEXT_WINDOW=10
```

## 📖 Usage Examples

### 1. Upload Documents

**Using UI:**
- Navigate to http://localhost:3000
- Enter password: `adrigdeva`
- Upload PDF or paste text

**Using API:**
```bash
# Upload PDF
curl -X POST http://localhost:3000/api/upload/document \
  -F "password=adrigdeva" \
  -F "file=@document.pdf"

# Upload Text
curl -X POST http://localhost:3000/api/upload/text \
  -H "Content-Type: application/json" \
  -d '{
    "password": "adrigdeva",
    "text": "Your text content here...",
    "source": "manual-input"
  }'
```

### 2. Chat with Bot

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-001",
    "query": "What is the main topic of the documents?"
  }'
```

### 3. Get Chat History

```bash
curl http://localhost:3000/api/chat/history/user-001?page=1&pageSize=20
```

## 📁 Project Structure

```
rules-clarify-rag/
├── config.js                 # Configuration management
├── index.js                  # Express app entry point
├── package.json
├── Dockerfile
├── docker-compose.yml
├── .env.example
│
├── controllers/              # Request handlers
│   ├── chat.controller.js
│   ├── upload.controller.js
│   └── system.controller.js
│
├── services/                 # Business logic
│   ├── qdrant.service.js     # Vector DB operations
│   ├── embedding.service.js  # Embedding generation
│   ├── llm.service.js        # LLM interactions
│   ├── chatHistory.service.js
│   └── cache.service.js
│
├── utils/                    # Utility functions
│   ├── textProcessing.js
│   ├── documentParser.js
│   └── validation.js
│
├── routes/                   # API routes
│   ├── index.js
│   ├── chat.routes.js
│   ├── upload.routes.js
│   └── system.routes.js
│
├── middlewares/              # Express middlewares
│   └── index.js
│
└── public/                   # Frontend UI
    ├── index.html
    ├── styles.css
    └── app.js
```

## 🔍 How It Works

1. **Document Upload**
   - User uploads PDF/TXT or pastes text
   - Text is chunked into smaller pieces (~500 chars)
   - Each chunk is embedded using Xenova (local, free)
   - Embeddings stored in Qdrant vector database

2. **Chat Query**
   - User sends a question
   - Question is embedded
   - Top K similar chunks retrieved from Qdrant
   - Context + chat history sent to OpenAI LLM
   - Response streamed back to user
   - Conversation saved to history

3. **Chat History**
   - Each conversation stored with userId
   - Recent context used for follow-up questions
   - Paginated history retrieval
   - Clear history option

## 🐳 Docker Commands

```bash
# Build and start
npm run docker:build
npm run docker:up

# View logs
npm run docker:logs

# Stop services
npm run docker:down

# Restart
docker-compose restart rag-api
```

## 🔒 Security Notes

- Upload password: `adrigdeva` (change in production!)
- Store your OpenAI API key securely in `.env`
- Never commit `.env` to version control
- Use HTTPS in production
- Implement rate limiting for production use

## 🎯 Performance Tips

1. **Xenova Model**: `all-MiniLM-L6-v2` is fast and efficient (384 dimensions)
2. **Chunk Size**: 500 chars works well for most documents
3. **Top K**: 5 chunks usually provides enough context
4. **Cache**: Embeddings are cached to avoid recomputation
5. **Docker**: Use volumes for persistent storage

## 🛠️ Troubleshooting

**Xenova model loading slow?**
- First load downloads model (~25MB)
- Cached in `/app/.cache` for subsequent uses

**Qdrant connection failed?**
- Ensure Qdrant is running: `docker ps | grep qdrant`
- Check URL in `.env` matches your setup

**Out of memory?**
- Reduce `CHUNK_SIZE` in `.env`
- Process fewer documents at once
- Increase Docker memory allocation

**Large file processing timeout?**
- Processing time scales with file size
- UI shows progress indicator
- Wait up to 10 minutes for large PDFs

## 📊 System Requirements

- **Node.js**: 18.0.0 or higher
- **RAM**: 2GB minimum (4GB recommended)
- **Disk**: 500MB for models and cache
- **Docker**: 20.10 or higher (if using Docker)

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

## 📄 License

ISC

## 🙏 Acknowledgments

- [Qdrant](https://qdrant.tech/) - Vector database
- [Xenova Transformers](https://huggingface.co/Xenova) - Local embeddings
- [OpenAI](https://openai.com/) - LLM API
- [Express.js](https://expressjs.com/) - Web framework

---

Made with ❤️ for RAG applications
