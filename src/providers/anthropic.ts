import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider } from './index.js';
import { getAPIKey } from '../config.js';

export function createAnthropicProvider(model?: string): AIProvider {
  const apiKey = getAPIKey('anthropic');
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY not set.\n' +
        'Export your key: export ANTHROPIC_API_KEY=sk-ant-...\n' +
        'Or use Ollama for free: --provider ollama',
    );
  }

  const client = new Anthropic({ apiKey });
  const modelId = model || 'claude-sonnet-4-20250514';

  return {
    name: 'anthropic',
    model: modelId,

    async generate(prompt: string): Promise<string> {
      const response = await client.messages.create({
        model: modelId,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });

      const block = response.content[0];
      if (block.type === 'text') {
        return block.text;
      }
      throw new Error('Unexpected response format from Anthropic');
    },

    async generateJSON<T>(prompt: string): Promise<T> {
      const response = await client.messages.create({
        model: modelId,
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content:
              prompt + '\n\nRespond with valid JSON only. No markdown fences, no explanation.',
          },
        ],
      });

      const block = response.content[0];
      if (block.type === 'text') {
        const text = block.text
          .trim()
          .replace(/^```json\n?/, '')
          .replace(/\n?```$/, '');
        return JSON.parse(text) as T;
      }
      throw new Error('Unexpected response format from Anthropic');
    },
  };
}
