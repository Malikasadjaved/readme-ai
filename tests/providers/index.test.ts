import { describe, it, expect, vi } from 'vitest';
import { createProvider } from '../../src/providers/index.js';

vi.mock('../../src/providers/anthropic.js', () => ({
  createAnthropicProvider: vi.fn(() => ({
    name: 'anthropic',
    model: 'claude',
    generate: vi.fn(),
    generateJSON: vi.fn(),
  })),
}));

vi.mock('../../src/providers/openai.js', () => ({
  createOpenAIProvider: vi.fn(() => ({
    name: 'openai',
    model: 'gpt-4o',
    generate: vi.fn(),
    generateJSON: vi.fn(),
  })),
}));

vi.mock('../../src/providers/gemini.js', () => ({
  createGeminiProvider: vi.fn(() => ({
    name: 'gemini',
    model: 'gemini-pro',
    generate: vi.fn(),
    generateJSON: vi.fn(),
  })),
}));

vi.mock('../../src/providers/ollama.js', () => ({
  createOllamaProvider: vi.fn(() => ({
    name: 'ollama',
    model: 'llama3',
    generate: vi.fn(),
    generateJSON: vi.fn(),
  })),
}));

describe('createProvider', () => {
  it('creates anthropic provider', async () => {
    const provider = await createProvider('anthropic');
    expect(provider.name).toBe('anthropic');
  });

  it('creates openai provider', async () => {
    const provider = await createProvider('openai');
    expect(provider.name).toBe('openai');
  });

  it('creates gemini provider', async () => {
    const provider = await createProvider('gemini');
    expect(provider.name).toBe('gemini');
  });

  it('creates ollama provider', async () => {
    const provider = await createProvider('ollama');
    expect(provider.name).toBe('ollama');
  });

  it('throws for unknown provider', async () => {
    await expect(createProvider('unknown')).rejects.toThrow('Unknown provider');
  });
});
