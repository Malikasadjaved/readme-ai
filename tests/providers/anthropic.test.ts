import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@anthropic-ai/sdk', () => {
  const mockCreate = vi.fn();
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: { create: mockCreate },
    })),
    __mockCreate: mockCreate,
  };
});

vi.mock('../../src/config.js', () => ({
  getAPIKey: vi.fn(),
}));

describe('createAnthropicProvider', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('throws when API key is not set', async () => {
    const { getAPIKey } = await import('../../src/config.js');
    (getAPIKey as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

    const { createAnthropicProvider } = await import('../../src/providers/anthropic.js');
    expect(() => createAnthropicProvider()).toThrow('ANTHROPIC_API_KEY not set');
  });

  it('creates provider when API key is set', async () => {
    const { getAPIKey } = await import('../../src/config.js');
    (getAPIKey as ReturnType<typeof vi.fn>).mockReturnValue('sk-ant-test');

    const { createAnthropicProvider } = await import('../../src/providers/anthropic.js');
    const provider = createAnthropicProvider();
    expect(provider.name).toBe('anthropic');
    expect(typeof provider.generate).toBe('function');
    expect(typeof provider.generateJSON).toBe('function');
  });

  it('generate() returns text from API response', async () => {
    const { getAPIKey } = await import('../../src/config.js');
    (getAPIKey as ReturnType<typeof vi.fn>).mockReturnValue('sk-ant-test');

    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const instance = new Anthropic({ apiKey: 'test' });
    (instance.messages.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: [{ type: 'text', text: 'Hello world' }],
    });

    const { createAnthropicProvider } = await import('../../src/providers/anthropic.js');
    const provider = createAnthropicProvider();
    const result = await provider.generate('test prompt');
    expect(result).toBe('Hello world');
  });

  it('generateJSON() parses JSON response', async () => {
    const { getAPIKey } = await import('../../src/config.js');
    (getAPIKey as ReturnType<typeof vi.fn>).mockReturnValue('sk-ant-test');

    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const instance = new Anthropic({ apiKey: 'test' });
    (instance.messages.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: [{ type: 'text', text: '{"key": "value"}' }],
    });

    const { createAnthropicProvider } = await import('../../src/providers/anthropic.js');
    const provider = createAnthropicProvider();
    const result = await provider.generateJSON<{ key: string }>('test');
    expect(result).toEqual({ key: 'value' });
  });

  it('generateJSON() strips markdown fences', async () => {
    const { getAPIKey } = await import('../../src/config.js');
    (getAPIKey as ReturnType<typeof vi.fn>).mockReturnValue('sk-ant-test');

    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const instance = new Anthropic({ apiKey: 'test' });
    (instance.messages.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: [{ type: 'text', text: '```json\n{"key": "value"}\n```' }],
    });

    const { createAnthropicProvider } = await import('../../src/providers/anthropic.js');
    const provider = createAnthropicProvider();
    const result = await provider.generateJSON<{ key: string }>('test');
    expect(result).toEqual({ key: 'value' });
  });
});
