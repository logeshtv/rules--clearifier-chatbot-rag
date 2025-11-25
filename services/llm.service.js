const OpenAI = require('openai');
const config = require('../config');

class LLMService {
  constructor() {
    this.provider = config.llm.provider;
    
    if (this.provider === 'OPENAI') {
      this.client = new OpenAI({
        apiKey: config.llm.openai.apiKey,
        timeout: config.llm.openai.timeout
      });
    }
  }

  /**
   * Generate chat completion with streaming support
   */
  async *generateResponse(messages, stream = false) {
    if (this.provider === 'OPENAI') {
      const params = {
        model: config.llm.openai.model,
        messages,
        temperature: config.llm.openai.temperature,
        max_tokens: config.llm.openai.maxTokens,
        stream
      };

      if (stream) {
        const response = await this.client.chat.completions.create(params);
        
        for await (const chunk of response) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            yield content;
          }
        }
      } else {
        const response = await this.client.chat.completions.create(params);
        yield response.choices[0].message.content;
      }
    } else {
      throw new Error(`Unsupported LLM provider: ${this.provider}`);
    }
  }

  /**
   * Detect if query is a greeting or casual conversation
   */
  isGreeting(query) {
    const greetingPatterns = [
      /^(hi|hello|hey|greetings|good morning|good afternoon|good evening|namaste|namaskar)$/i,
      /^(hi|hello|hey|greetings|good morning|good afternoon|good evening|namaste|namaskar)[\s!.,?]*$/i,
      /^(how are you|what's up|whats up|sup)[\s!.,?]*$/i,
      /^(thank you|thanks|thank you very much|ok|okay)[\s!.,?]*$/i
    ];
    return greetingPatterns.some(pattern => pattern.test(query.trim()));
  }

  /**
   * Build RAG prompt with context - Production version for Railway Government Project
   */
  buildRAGPrompt(query, contexts, chatHistory = []) {
    // Handle greetings separately - no context needed
    if (this.isGreeting(query)) {
      return [
        {
          role: 'system',
          content: 'You are a professional AI assistant for a Railway Government Information System. Respond to greetings politely and professionally. Keep responses brief.'
        },
        { role: 'user', content: query }
      ];
    }

    // Main system prompt for factual queries
    const systemPrompt = `You are a professional AI assistant for the Railway Government Information System.

STRICT OPERATIONAL RULES:
1. Answer ONLY using information from the provided knowledge base entries below
2. Do NOT use external knowledge, assumptions, or world facts beyond the given context
3. For every fact or claim, cite the source using bracketed references: [1], [2], etc.
4. If the answer cannot be determined from the knowledge base, respond with:
   "I apologize, but I don't have information about that in the current knowledge base. Please contact the railway helpdesk for assistance."
5. Keep responses concise, accurate, and professional
6. Use formal government communication style`;

    const messages = [{ role: 'system', content: systemPrompt }];

    // Add knowledge base context as assistant messages (authoritative source)
    if (contexts && contexts.length > 0) {
      contexts.forEach((ctx, idx) => {
        if (ctx.text && ctx.text.trim()) {
          messages.push({
            role: 'assistant',
            content: `Knowledge Base Entry [${idx + 1}]: ${ctx.text}`
          });
        }
      });
    }

    // Add conversation history for continuity
    if (chatHistory && chatHistory.length > 0) {
      chatHistory.forEach(msg => {
        messages.push({ role: 'user', content: msg.query });
        messages.push({ role: 'assistant', content: msg.response });
      });
    }

    // Add current user query
    messages.push({
      role: 'user',
      content: query
    });

    return messages;
  }


  /**
   * Get model info
   */
  getInfo() {
    return {
      provider: this.provider,
      model: config.llm.openai.model,
      temperature: config.llm.openai.temperature,
      maxTokens: config.llm.openai.maxTokens
    };
  }
}

module.exports = new LLMService();
