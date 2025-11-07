# Quick Start Guide 🚀

## 🎯 What You Have

A complete **RAG Chatbot API** with:
- ✅ Vector database (Qdrant)
- ✅ Local embeddings (Xenova - FREE!)
- ✅ Chat with streaming responses
- ✅ Document upload (PDF & TXT)
- ✅ Chat history with pagination
- ✅ Beautiful web UI
- ✅ Docker deployment ready

## 📝 Before You Start

**Required:**
- Docker & Docker Compose installed
- OpenAI API key (for LLM responses)

**Get OpenAI API Key:**
1. Go to https://platform.openai.com/api-keys
2. Create new secret key
3. Copy the key

## 🚀 Installation (3 Steps)

### Step 1: Add Your OpenAI API Key

Edit the `.env` file and add your key:
```bash
OPENAI_API_KEY=sk-your-actual-api-key-here
```

### Step 2: Install Dependencies & Start

**Option A: Using Script (Recommended)**
```bash
./setup.sh
```

**Option B: Manual**
```bash
# Install Node.js dependencies
npm install

# Start with Docker
docker-compose up -d
```

### Step 3: Open Browser

Go to: **http://localhost:3000**

## 💡 First Usage

### 1. Upload Documents

**Via UI:**
1. Click "📁 Upload Documents" tab
2. Enter password: `adrigdeva`
3. Upload a PDF or paste text
4. Wait for processing (10 seconds - 10 minutes depending on size)

**Via API:**
```bash
curl -X POST http://localhost:3000/api/upload/text \
  -H "Content-Type: application/json" \
  -d '{
    "password": "adrigdeva",
    "text": "Your document content here...",
    "source": "my-document"
  }'
```

### 2. Start Chatting

**Via UI:**
1. Click "💬 Chat" tab
2. Enter your User ID (e.g., "john-001")
3. Ask questions about your documents
4. Watch the streaming response!

**Via API:**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "john-001",
    "query": "What is the main topic?"
  }'
```

### 3. View Chat History

**Via UI:**
- Click "📜 View History" button in Chat tab

**Via API:**
```bash
curl "http://localhost:3000/api/chat/history/john-001?page=1&pageSize=10"
```

## 🎨 Web UI Features

### Upload Tab
- 📄 Upload PDF files (up to 50MB)
- 📝 Paste raw text
- 🔐 Password protected (adrigdeva)
- ⏱️ Progress indicator

### Chat Tab
- 💬 Real-time streaming responses
- 👤 Per-user chat history
- 📜 View complete history
- 🗑️ Clear history option
- 🔄 Context-aware conversations

### Stats Tab
- 📊 System health
- 📈 Upload statistics
- 🗃️ Vector database info

## 📡 API Endpoints Summary

```
POST   /api/chat                    - Send chat message
GET    /api/chat/history/:userId    - Get history
DELETE /api/chat/history/:userId    - Clear history
POST   /api/upload/document         - Upload PDF/TXT
POST   /api/upload/text             - Upload text
GET    /api/health                  - Health check
GET    /api/info                    - System info
GET    /api/upload/stats            - Upload stats
```

## 🐳 Docker Commands

```bash
# View logs
docker-compose logs -f rag-api

# Stop services
docker-compose down

# Restart
docker-compose restart

# Rebuild
docker-compose up -d --build
```

## ⚙️ Configuration

Edit `.env` file to customize:

```env
# Upload Password
UPLOAD_PASSWORD=your-secure-password

# Embedding Method
EMBEDDING_METHOD=XENOVA  # or OPENAI

# Chunk Size (affects document processing)
CHUNK_SIZE=500
CHUNK_OVERLAP=50

# RAG Settings
RAG_TOP_K=5              # Number of relevant chunks
RAG_MIN_SCORE=0.5        # Minimum similarity score
RAG_CONTEXT_WINDOW=10    # Chat history messages
```

## 🔧 Troubleshooting

### Server won't start
```bash
# Check if ports are in use
lsof -i :3000
lsof -i :6333

# Check Docker logs
docker-compose logs rag-api
```

### Qdrant connection failed
```bash
# Restart Qdrant
docker-compose restart qdrant

# Check if running
docker ps | grep qdrant
```

### Upload failing
- Check password is exactly: `adrigdeva`
- Verify file is PDF or TXT
- Ensure file size < 50MB

### Chat not working
- Verify OpenAI API key is valid
- Check you uploaded documents first
- Lower `RAG_MIN_SCORE` in `.env` if needed

### Slow embedding generation
- First time downloads model (~30 seconds)
- Subsequent requests use cache
- This is normal for Xenova!

## 📊 Performance Tips

1. **For faster uploads**: Reduce `CHUNK_SIZE` to 300
2. **For better answers**: Increase `RAG_TOP_K` to 10
3. **For more context**: Increase `RAG_CONTEXT_WINDOW` to 20
4. **To save costs**: Use Xenova for embeddings (already default!)

## 🎓 Example Use Cases

### Customer Support
- Upload product manuals
- Customers chat with bot
- Get instant answers

### Internal Knowledge Base
- Upload company documents
- Employees ask questions
- Context-aware responses

### Research Assistant
- Upload research papers
- Ask about findings
- Get cited information

### Document Analysis
- Upload legal documents
- Query specific clauses
- Extract key information

## 📝 Next Steps

1. ✅ Test with sample documents
2. ✅ Adjust RAG settings for your needs
3. ✅ Customize UI styling (public/styles.css)
4. ✅ Add authentication for production
5. ✅ Deploy to cloud (AWS, Azure, GCP)

## 🆘 Need Help?

- Check `README.md` for detailed docs
- See `API_TESTING.md` for API examples
- View logs: `docker-compose logs -f rag-api`

## 🎉 Congratulations!

You now have a production-ready RAG chatbot! 🤖

Start by uploading your first document and asking questions!

---

**Password:** adrigdeva
**UI:** http://localhost:3000
**API:** http://localhost:3000/api
