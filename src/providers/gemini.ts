import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIProvider } from './index.js';
import { getAPIKey } from '../config.js';

export function createGeminiProvider(model?: string): AIProvider {
  const apiKey = getAPIKey('gemini');
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY not set.\n' +
      'Export your key: export GEMINI_API_KEY=...\n' +
      'Or use Ollama for free: --provider ollama'
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelId = model || 'gemini-1.5-flash';

  return {
    name: 'gemini',
    model: modelId,

    async generate(prompt: string): Promise<string> {
      const genModel = genAI.getGenerativeModel({ model: modelId });
      const result = await genModel.generateContent(prompt);
      return result.response.text();
    },

    async generateJSON<T>(prompt: string): Promise<T> {
      const genModel = genAI.getGenerativeModel({ model: modelId });
      const result = await genModel.generateContent(
        prompt + '\n\nRespond with valid JSON only. No markdown fences, no explanation.'
      );
      const text = result.response.text().trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
      return JSON.parse(text) as T;
    },
  };
}
