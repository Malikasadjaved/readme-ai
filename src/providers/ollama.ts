import type { AIProvider } from './index.js';
import { getOllamaURL } from '../config.js';

export function createOllamaProvider(model?: string): AIProvider {
  const baseUrl = getOllamaURL();
  const modelId = model || 'llama3.1';

  return {
    name: 'ollama',
    model: modelId,

    async generate(prompt: string): Promise<string> {
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelId,
          prompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Ollama request failed (${response.status}).\n` +
          'Make sure Ollama is running: ollama serve\n' +
          `And the model is pulled: ollama pull ${modelId}`
        );
      }

      const data = await response.json() as { response: string };
      return data.response;
    },

    async generateJSON<T>(prompt: string): Promise<T> {
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelId,
          prompt: prompt + '\n\nRespond with valid JSON only. No markdown fences, no explanation.',
          stream: false,
          format: 'json',
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama request failed (${response.status})`);
      }

      const data = await response.json() as { response: string };
      const text = data.response.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
      return JSON.parse(text) as T;
    },
  };
}
