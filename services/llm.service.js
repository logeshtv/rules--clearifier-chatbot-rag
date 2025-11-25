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
    const systemPrompt = `You are a professional AI assistant. STRICT RULES:
1) Only answer using the information present in the provided context entries below.
2) Do NOT use any external knowledge, world facts, or assumptions beyond the context.
3) When you provide facts or claims, cite the supporting context entries using bracketed references like [1], [2].
4) If the answer cannot be fully determined from the provided context, reply exactly and only with(not for greetings and related to railways):
   "Sorry, no relevant information is available in the provided context."
   Do not add any additional explanation, guess, or attempt to answer from memory.
5) Keep the answer concise and factual.
6) You can greet the user but do not add any other information beyond that.`;

    const contextText = (contexts && contexts.length > 0)
      ? contexts.map((ctx, idx) => `[${idx + 1}] ${ctx.text}`).join('\n\n')
      : '';

    const userPrompt = `Context Information:\n${contextText}\n\nQuestion: ${query}\n\nINSTRUCTIONS: Only answer if the information needed to answer the question is present in the context above. If it is not, reply exactly: "Sorry, no relevant information is available in the provided context." If you do answer, include bracketed citations linking to the context entries used (for example: "The capital is X. [2]").`;

    const messages = [ { role: 'system', content: systemPrompt } ];

    // Insert retrieved contexts as assistant messages so the model treats them as authoritative
    if (contextText && contextText.trim().length > 0) {
      // split back into individual contexts (we previously joined them)
      const contextEntries = contextText.split('\n\n');
      contextEntries.forEach(entry => {
        messages.push({ role: 'assistant', content: entry });
      });
    }

    // Add chat history for context (preserve roles)
    if (chatHistory && chatHistory.length > 0) {
      chatHistory.forEach(msg => {
        messages.push({ role: 'user', content: msg.query });
        messages.push({ role: 'assistant', content: msg.response });
      });
    }

    // Add current query as the user's message
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
