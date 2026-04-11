import OpenAI from 'openai';
import type { AIProvider } from './index.js';
import { getAPIKey } from '../config.js';

export function createOpenAIProvider(model?: string): AIProvider {
  const apiKey = getAPIKey('openai');
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY not set.\n' +
      'Export your key: export OPENAI_API_KEY=sk-...\n' +
      'Or use Ollama for free: --provider ollama'
    );
  }

  const client = new OpenAI({ apiKey });
  const modelId = model || 'gpt-4o-mini';

  return {
    name: 'openai',
    model: modelId,

    async generate(prompt: string): Promise<string> {
      const response = await client.chat.completions.create({
        model: modelId,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096,
      });

      return response.choices[0]?.message?.content || '';
    },

    async generateJSON<T>(prompt: string): Promise<T> {
      const response = await client.chat.completions.create({
        model: modelId,
        messages: [
          {
            role: 'user',
            content: prompt + '\n\nRespond with valid JSON only. No markdown fences, no explanation.',
          },
        ],
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      });

      const text = response.choices[0]?.message?.content || '{}';
      return JSON.parse(text) as T;
    },
  };
}
