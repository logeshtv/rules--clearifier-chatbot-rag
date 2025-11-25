# Quick Reference - Railway RAG Chatbot

## 🎯 Core Behavior

### Greetings (No Context Needed)
✅ Hi, Hello, Namaste → Professional greeting  
❌ Should NOT return: "Sorry, no relevant information..."

### Factual Queries (Context Required)
✅ Railway info in DB → Answer with [1], [2] citations  
❌ Info NOT in DB → "I apologize, but I don't have information about that in the current knowledge base. Please contact the railway helpdesk for assistance."  
❌ Should NEVER answer from external knowledge (CM of India, movies, sports, etc.)

---

## 🚀 Quick Test Commands

### Start Server
```bash
npm start
```

### Test Greeting
```bash
curl -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","query":"Hi"}'
```

### Test No-Context Query
```bash
curl -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","query":"Who is the CM of India?"}'
```

### Upload Test Document
```bash
curl -X POST http://localhost:3000/api/upload/text \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test",
    "text": "Indian Railways is headquartered in New Delhi. The railway network spans 67,956 km.",
    "source": "Railway Facts 2024"
  }'
```

### Test With Context (wait 15s after upload)
```bash
curl -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","query":"Where is Indian Railways headquartered?"}'
```

---

## 📊 Monitor Logs

```bash
# Look for context quality
📊 Context quality: 5/8 valid chunks
   Score range: 0.654 - 0.892

# Alert if < 50% valid chunks for railway queries
```

---

## ✅ Success Criteria

| Behavior | Expected | Status |
|----------|----------|--------|
| Greetings work | Natural response | ✅ |
| No external knowledge | Returns fallback | ✅ |
| Citations present | [1], [2] in response | ✅ |
| Professional tone | Government style | ✅ |
| Clean structure | No duplicate instructions | ✅ |

---

## 🔧 Key Files

- `services/llm.service.js` - Prompt builder with greeting detection
- `controllers/chat.controller.js` - Main chat endpoint
- `TESTING-GUIDE.md` - Full testing procedures
- `PRODUCTION-READY.md` - Complete implementation docs

---

## 📞 Quick Health Check

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/info
```

---

## 🎓 Example Responses

### ✅ CORRECT: Greeting
**Query:** "Hi"  
**Response:** "Hello! I'm here to assist you with railway information. How can I help you today?"

### ✅ CORRECT: No Context
**Query:** "Who is the CM of India?"  
**Response:** "I apologize, but I don't have information about that in the current knowledge base. Please contact the railway helpdesk for assistance."

### ✅ CORRECT: With Context
**Query:** "Where is Indian Railways headquartered?"  
**Response:** "Indian Railways is headquartered in New Delhi. [1]"

### ❌ WRONG: Using External Knowledge
**Query:** "Who is the CM of India?"  
**Response:** "The Prime Minister of India is..." ← This should NEVER happen

---

## 🚨 Red Flags

- Greeting returns "Sorry, no relevant information..."
- Factual response without [N] citation
- External knowledge used (movies, politics, sports)
- Casual/informal tone for factual queries
- Duplicate "INSTRUCTIONS:" in response

---

## 📈 Performance Targets

- Greeting: < 1 second
- Simple query: 2-4 seconds
- Complex query: 4-7 seconds
- Context quality: > 50% valid chunks

---

**Quick Start:** `npm start` → Test greeting → Upload doc → Test query → Check citations
