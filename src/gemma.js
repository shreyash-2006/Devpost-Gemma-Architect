const axios = require('axios');

class GemmaClient {
  constructor(config = {}) {
    this.provider = config.provider || process.env.GEMMA_PROVIDER || 'google';
    this.apiKey = config.apiKey || process.env.GEMMA_API_KEY || '';
    this.model = config.model || process.env.GEMMA_MODEL || 'gemma-2-27b-it';
    this.ollamaHost = config.ollamaHost || process.env.OLLAMA_HOST || 'http://localhost:11434';
  }

  /**
   * Main completion method for generating content
   */
  async generateCompletion(systemInstruction, userPrompt) {
    if (this.provider === 'google') {
      return await this.callGoogleAIStudio(systemInstruction, userPrompt);
    } else if (this.provider === 'ollama') {
      return await this.callOllama(systemInstruction, userPrompt);
    } else if (this.provider === 'groq') {
      return await this.callGroq(systemInstruction, userPrompt);
    } else if (this.provider === 'openrouter') {
      return await this.callOpenRouter(systemInstruction, userPrompt);
    } else {
      throw new Error(`Unsupported provider: ${this.provider}`);
    }
  }

  /**
   * Calls Google AI Studio API for Gemma models (e.g. gemma-2-27b-it, gemma-2-9b-it)
   */
  async callGoogleAIStudio(systemInstruction, userPrompt) {
    if (!this.apiKey) {
      throw new Error('Google AI Studio API Key is missing. Please set your GEMMA_API_KEY.');
    }

    // Default to gemma-2-27b-it if not set or if user set a gemini fallback
    const targetModel = this.model || 'gemma-2-27b-it';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${this.apiKey}`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: `${systemInstruction}\n\n${userPrompt}` }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192
      }
    };

    try {
      const response = await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      });

      const candidate = response.data?.candidates?.[0];
      if (!candidate || !candidate.content?.parts?.[0]?.text) {
        throw new Error('No content returned from Google AI Studio API.');
      }

      return candidate.content.parts[0].text;
    } catch (error) {
      if (error.response?.data?.error) {
        throw new Error(`Google Gemma API Error: ${error.response.data.error.message}`);
      }
      throw error;
    }
  }

  /**
   * Calls local Ollama instance (e.g. gemma2, gemma:7b)
   */
  async callOllama(systemInstruction, userPrompt) {
    const url = `${this.ollamaHost}/api/chat`;
    // If model is default gemma-2-27b-it or empty, default to gemma3:4b for Ollama
    let targetModel = this.model;
    if (!targetModel || targetModel === 'gemma-2-27b-it') {
      targetModel = 'gemma3:4b';
    }

    const payload = {
      model: targetModel,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userPrompt }
      ],
      stream: false
    };

    try {
      const response = await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 120000
      });

      return response.data?.message?.content || '';
    } catch (error) {
      throw new Error(`Ollama API Error (${url}): ${error.message}. Make sure Ollama is running and model '${targetModel}' is pulled.`);
    }
  }

  /**
   * Calls Groq API for gemma2-9b-it
   */
  async callGroq(systemInstruction, userPrompt) {
    if (!this.apiKey) {
      throw new Error('Groq API Key is missing. Please set your GROQ_API_KEY / GEMMA_API_KEY.');
    }

    const url = 'https://api.groq.com/openai/v1/chat/completions';
    const targetModel = this.model || 'gemma2-9b-it';

    const payload = {
      model: targetModel,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 4096
    };

    try {
      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      });

      return response.data?.choices?.[0]?.message?.content || '';
    } catch (error) {
      if (error.response?.data?.error) {
        throw new Error(`Groq API Error: ${error.response.data.error.message}`);
      }
      throw error;
    }
  }

  /**
   * Calls OpenRouter API for google/gemma-2-27b-it
   */
  async callOpenRouter(systemInstruction, userPrompt) {
    if (!this.apiKey) {
      throw new Error('OpenRouter API Key is missing.');
    }

    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const targetModel = this.model || 'google/gemma-2-27b-it:free';

    const payload = {
      model: targetModel,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userPrompt }
      ]
    };

    try {
      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://hacktoberfest.devpost.com',
          'X-Title': 'Devpost Gemma Generator'
        },
        timeout: 60000
      });

      return response.data?.choices?.[0]?.message?.content || '';
    } catch (error) {
      if (error.response?.data?.error) {
        throw new Error(`OpenRouter API Error: ${error.response.data.error.message}`);
      }
      throw error;
    }
  }

  /**
   * Helper to parse JSON output safely from Gemma response string
   */
  static parseJSONResponse(rawText) {
    if (!rawText) return null;

    let cleanText = rawText.trim();
    // Remove markdown code block fences if present
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    try {
      return JSON.parse(cleanText);
    } catch (e) {
      // Attempt regex extraction for JSON block
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch (e2) {
          console.error('Failed fallback regex JSON parse:', e2.message);
        }
      }
      return null;
    }
  }
}

module.exports = GemmaClient;
