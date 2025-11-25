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
   * Build RAG prompt with context
   */
  buildRAGPrompt(query, contexts, chatHistory = []) {
    const systemPrompt = `You are a helpful AI assistant. Answer questions based on the provided context.
If the context is empty or doesn't contain relevant information, provide a helpful general response using your knowledge.
Be concise, accurate, and cite relevant information from the context when possible.
You are a helpful AI assistant. Answer questions based on the provided context. If the context is empty or doesn't contain relevant information, provide a helpful general response using your knowledge.
Be concise, accurate, and cite relevant information from the context when possible.`;

    const contextText = contexts.length > 0
      ? contexts
          .map((ctx, idx) => `[${idx + 1}] ${ctx.text}`)
          .join('\n\n')
      : 'No specific context available for this query.';

    const userPrompt = `Context Information:
${contextText}

Question: ${query}

Please provide a helpful answer based on the context above.`;

    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Add chat history for context
    if (chatHistory && chatHistory.length > 0) {
      chatHistory.forEach(msg => {
        messages.push({ role: 'user', content: msg.query });
        messages.push({ role: 'assistant', content: msg.response });
      });
    }

    // Add current query
    messages.push({ role: 'user', content: userPrompt });

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
