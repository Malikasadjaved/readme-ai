import Conf from 'conf';

export interface ReadmeAIConfig {
  provider: 'anthropic' | 'openai' | 'gemini' | 'ollama';
  model?: string;
  anthropic_api_key?: string;
  openai_api_key?: string;
  gemini_api_key?: string;
  ollama_url?: string;
  github_token?: string;
  default_theme?: string;
  default_output?: string;
}

export const config = new Conf<ReadmeAIConfig>({
  projectName: 'readme-ai',
  defaults: {
    provider: 'anthropic',
    default_theme: 'default',
    default_output: 'README.md',
  },
});

export function getAPIKey(provider: string): string | undefined {
  switch (provider) {
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY || config.get('anthropic_api_key');
    case 'openai':
      return process.env.OPENAI_API_KEY || config.get('openai_api_key');
    case 'gemini':
      return process.env.GEMINI_API_KEY || config.get('gemini_api_key');
    default:
      return undefined;
  }
}

export function getGitHubToken(): string | undefined {
  return process.env.GITHUB_TOKEN || config.get('github_token');
}

export function getOllamaURL(): string {
  return process.env.OLLAMA_BASE_URL || config.get('ollama_url') || 'http://localhost:11434';
}
