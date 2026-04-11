export interface AIProvider {
  name: string;
  model: string;
  generate(prompt: string): Promise<string>;
  generateJSON<T>(prompt: string): Promise<T>;
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
        `Unknown provider: ${name}\n` +
        'Available providers: anthropic, openai, gemini, ollama'
      );
  }
}
