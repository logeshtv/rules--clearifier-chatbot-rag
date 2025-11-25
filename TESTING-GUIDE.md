# Testing Guide - Railway Government RAG Chatbot

## Production Testing Protocol

This guide provides comprehensive testing procedures for the Railway Government Information System chatbot.

---

## 1. Greeting and Casual Conversation Tests

### Test Case 1.1: Simple Greetings
**Expected Behavior:** Should respond naturally without requiring context

```bash
# Test: Hi
curl -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","query":"Hi"}'

# Expected: Professional greeting response
# Should NOT return: "Sorry, no relevant information..."
```

```bash
# Test: Hello
curl -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","query":"Hello"}'

# Expected: Professional greeting response
```

```bash
# Test: Good morning
curl -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","query":"Good morning"}'

# Expected: Professional greeting response
```

```bash
# Test: Namaste (for Indian context)
curl -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","query":"Namaste"}'

# Expected: Professional greeting response
```

---

## 2. Context-Only Response Tests

### Test Case 2.1: Query NOT in Context (Should Fail Gracefully)

```bash
# Test: Who is the CM of India?
curl -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","query":"Who is the CM of India?"}'

# Expected: "I apologize, but I don't have information about that in the current knowledge base. Please contact the railway helpdesk for assistance."
```

```bash
# Test: Guardians of the Galaxy
curl -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","query":"What is Guardians of the Galaxy?"}'

# Expected: Railway-appropriate fallback message
# Should NOT return: Movie information or general knowledge
```

```bash
# Test: Sports query
curl -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","query":"Who won the cricket world cup?"}'

# Expected: Fallback message
# Should NOT return: Sports facts
```

### Test Case 2.2: Query IN Context (Should Answer with Citations)

**Prerequisite:** Upload a document containing railway information

```bash
# Step 1: Upload a railway document
curl -X POST http://localhost:3000/api/upload/text \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "text": "Indian Railways operates the fourth largest railway network in the world. The national transporter runs 13,523 passenger trains and 9,146 freight trains daily. Indian Railways is headquartered in New Delhi. The railway network spans 67,956 km.",
    "source": "Indian Railways Facts 2024"
  }'

# Wait 10-15 seconds for indexing to complete
sleep 15

# Step 2: Query about Indian Railways
curl -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","query":"Where is Indian Railways headquartered?"}'

# Expected: "Indian Railways is headquartered in New Delhi. [1]"
# Should include: Citation [1] referencing the knowledge base entry
```

```bash
# Test: Railway network size
curl -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","query":"How many passenger trains does Indian Railways run daily?"}'

# Expected: "Indian Railways runs 13,523 passenger trains daily. [1]"
# Should include: Citation linking to knowledge base
```

---

## 3. Chat History Continuity Tests

### Test Case 3.1: Multi-turn Conversation

```bash
# Turn 1
curl -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user-history","query":"Hi"}'

# Expected: Greeting

# Turn 2 (reference to previous context)
curl -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user-history","query":"What is the railway network span?"}'

# Expected: Should reference uploaded document with citation
```

---

## 4. Edge Cases and Security Tests

### Test Case 4.1: Empty Query

```bash
curl -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","query":""}'

# Expected: Validation error (400 Bad Request)
```

### Test Case 4.2: Very Long Query

```bash
curl -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","query":"'$(python3 -c 'print("What is the railway " * 500)')'"}'

# Expected: Should handle gracefully (truncate or process within limits)
```

### Test Case 4.3: Special Characters

```bash
curl -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","query":"What are the safety <script>alert(1)</script> measures?"}'

# Expected: Sanitized input, no script execution
```

---

## 5. System Health Tests

### Test Case 5.1: Health Check

```bash
curl http://localhost:3000/api/health

# Expected: 200 OK with system status
```

### Test Case 5.2: System Info

```bash
curl http://localhost:3000/api/info

# Expected: Configuration details (embedding method, vector DB, etc.)
```

### Test Case 5.3: Chat History

```bash
curl http://localhost:3000/api/chat/history/test-user

# Expected: Paginated chat history for the user
```

---

## 6. Production Deployment Checklist

### Before Deployment

- [ ] All greeting tests pass
- [ ] Context-only queries return fallback when no context exists
- [ ] Context-based queries include proper citations [1], [2]
- [ ] No external knowledge leaks (CM of India, movies, sports, etc.)
- [ ] Chat history continuity works
- [ ] Empty/malicious inputs handled gracefully
- [ ] Health endpoints respond correctly

### After Deployment

- [ ] Monitor logs for context quality metrics
- [ ] Verify Railway documents are indexed properly
- [ ] Test with real railway policy documents
- [ ] Validate citation accuracy
- [ ] Check response times (< 5 seconds for most queries)
- [ ] Verify no PII or sensitive data in logs

---

## 7. Expected Response Patterns

### ✅ CORRECT Behaviors

1. **Greetings:** Natural, professional responses without context requirement
2. **Railway Facts (in context):** Factual answer + bracketed citation [1], [2]
3. **Non-railway Facts (not in context):** Government-appropriate fallback message
4. **Professional Tone:** Formal, clear, suitable for government system
5. **Citation Format:** Every factual claim includes [N] reference

### ❌ INCORRECT Behaviors (Report if observed)

1. Answering general knowledge questions (movies, sports, politics) from external knowledge
2. Missing citations on factual claims
3. Generic AI responses like "As an AI assistant, I don't have real-time data..."
4. Hallucinating facts not present in knowledge base
5. Ignoring context and using pre-trained knowledge
6. Casual/informal tone for non-greeting queries

---

## 8. Monitoring Production

### Key Metrics to Track

```bash
# Check context quality logs
tail -f logs/app.log | grep "Context quality"

# Expected format:
# 📊 Context quality: 5/8 valid chunks
#    Score range: 0.654 - 0.892
```

### Alert Conditions

- Context quality < 50% valid chunks for factual queries
- Response time > 10 seconds
- High rate of fallback messages (may indicate poor document coverage)
- Zero context found for railway-related queries (indexing issue)

---

## 9. Sample Railway Test Documents

Create these test files for comprehensive validation:

**test-railway-policies.txt:**
```
Indian Railways Safety Policy 2024:
All trains must undergo safety inspection every 72 hours.
The Railway Board oversees all safety protocols.
Emergency contact: 139 (railway helpline).

Railway Ticketing:
Tickets can be booked online via IRCTC portal.
Reservation window opens 120 days in advance.
```

Upload and test queries like:
- "What is the railway safety inspection frequency?"
- "How to book railway tickets?"
- "What is the railway helpline number?"

---

## 10. Quick Test Script

Save as `test-chatbot.sh`:

```bash
#!/bin/bash

API_URL="http://localhost:3000/api/chat"

echo "=== Test 1: Greeting ==="
curl -s -N -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","query":"Hi"}' | head -5

echo -e "\n\n=== Test 2: No Context Query ==="
curl -s -N -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","query":"Who is the CM of India?"}' | head -5

echo -e "\n\n=== Test 3: System Health ==="
curl -s http://localhost:3000/api/health | jq .

echo -e "\n\nTests completed!"
```

Run: `chmod +x test-chatbot.sh && ./test-chatbot.sh`

---

## Support

For issues or questions, contact the development team with:
- Test case details
- Expected vs actual behavior
- Server logs (sanitized)
- Request/response samples
