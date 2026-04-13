import { getCached, setCache } from '../utils/cache.js';

export interface AIProvider {
  name: string;
  model: string;
  generate(prompt: string): Promise<string>;
  generateJSON<T>(prompt: string): Promise<T>;
}

function withCache(provider: AIProvider): AIProvider {
  const cacheKey = (prompt: string) => `${provider.name}:${provider.model}:${prompt}`;

  return {
    name: provider.name,
    model: provider.model,
    async generate(prompt: string): Promise<string> {
      const key = cacheKey(prompt);
      const cached = await getCached(key);
      if (cached !== null) return cached;

      const result = await provider.generate(prompt);
      await setCache(key, result);
      return result;
    },
    async generateJSON<T>(prompt: string): Promise<T> {
      const key = cacheKey(prompt);
      const cached = await getCached(key);
      if (cached !== null) return JSON.parse(cached) as T;

      const result = await provider.generateJSON<T>(prompt);
      await setCache(key, JSON.stringify(result));
      return result;
    },
  };
}

export async function createProvider(name: string, model?: string): Promise<AIProvider> {
  switch (name) {
    case 'anthropic': {
      const { createAnthropicProvider } = await import('./anthropic.js');
      return createAnthropicProvider(model);
    }
    case 'openai': {
      const { createOpenAIProvider } = await import('./openai.js');
      return createOpenAIProvider(model);
    }
    case 'gemini': {
      const { createGeminiProvider } = await import('./gemini.js');
      return createGeminiProvider(model);
    }
    case 'ollama': {
      const { createOllamaProvider } = await import('./ollama.js');
      return createOllamaProvider(model);
    }
    default:
      throw new Error(
        `Unknown provider: ${name}\n` + 'Available providers: anthropic, openai, gemini, ollama',
      );
  }
}

export async function createCachedProvider(name: string, model?: string): Promise<AIProvider> {
  const provider = await createProvider(name, model);
  return withCache(provider);
}
