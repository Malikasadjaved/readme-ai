import { describe, it, expect, vi } from 'vitest';
import { generateUsageSection, generateAPIDocs } from '../../src/generators/usage.js';
import type { CodeAnalysis } from '../../src/analyzers/code-analyzer.js';
import type { ScanResult } from '../../src/analyzers/file-scanner.js';
import type { DependencyAnalysis } from '../../src/analyzers/dependency-analyzer.js';
import type { AIProvider } from '../../src/providers/index.js';

function makeMockProvider(overrides: Partial<AIProvider> = {}): AIProvider {
  return {
    name: 'mock',
    model: 'mock-1',
    generate: vi.fn().mockResolvedValue(''),
    generateJSON: vi.fn().mockResolvedValue({ examples: [] }),
    ...overrides,
  };
}

function makeCode(overrides: Partial<CodeAnalysis> = {}): CodeAnalysis {
  return {
    exports: [],
    mainFunctions: [],
    apiEndpoints: [],
    cliCommands: [],
    envVariables: [],
    externalDependencies: [],
    ...overrides,
  };
}

function makeScan(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    totalFiles: 10,
    languages: [{ name: 'TypeScript', files: 5, percentage: 100, icon: '🦕' }],
    frameworks: [],
    hasDocker: false,
    hasCICD: false,
    hasTests: false,
    hasLicense: '',
    keyFiles: [],
    configFiles: [],
    entryPoints: [],
    directoryTree: '',
    ...overrides,
  };
}

function makeDeps(overrides: Partial<DependencyAnalysis> = {}): DependencyAnalysis {
  return {
    packageManager: 'npm',
    installCommand: 'npm install',
    runCommand: 'npm start',
    mainDependencies: [],
    devDependencies: [],
    requiresDatabase: false,
    requiresEnvFile: false,
    ...overrides,
  };
}

describe('generateUsageSection', () => {
  it('includes run command example', async () => {
    const result = await generateUsageSection({
      codeAnalysis: makeCode(),
      scan: makeScan(),
      deps: makeDeps({ runCommand: 'npm start' }),
      provider: makeMockProvider(),
    });
    expect(result.examples.some(e => e.title === 'Running the project')).toBe(true);
  });

  it('includes test command example', async () => {
    const result = await generateUsageSection({
      codeAnalysis: makeCode(),
      scan: makeScan(),
      deps: makeDeps({ testCommand: 'npm test' }),
      provider: makeMockProvider(),
    });
    expect(result.examples.some(e => e.title === 'Running tests')).toBe(true);
  });

  it('includes API endpoint examples with curl', async () => {
    const result = await generateUsageSection({
      codeAnalysis: makeCode({
        apiEndpoints: [
          { method: 'GET', path: '/users', handler: '', file: 'routes.ts' },
        ],
      }),
      scan: makeScan(),
      deps: makeDeps(),
      provider: makeMockProvider(),
    });
    expect(result.examples.some(e => e.title === 'API Examples')).toBe(true);
    expect(result.examples.find(e => e.title === 'API Examples')!.code).toContain('curl');
  });

  it('includes CLI command examples', async () => {
    const result = await generateUsageSection({
      codeAnalysis: makeCode({
        cliCommands: [{ name: 'init', description: 'Initialize', file: 'cli.ts' }],
      }),
      scan: makeScan(),
      deps: makeDeps(),
      provider: makeMockProvider(),
    });
    expect(result.examples.some(e => e.title === 'CLI Commands')).toBe(true);
  });

  it('falls back to Getting Started when no examples', async () => {
    const result = await generateUsageSection({
      codeAnalysis: makeCode(),
      scan: makeScan(),
      deps: makeDeps({ runCommand: '', testCommand: undefined }),
      provider: makeMockProvider(),
    });
    expect(result.examples.some(e => e.title === 'Getting Started')).toBe(true);
  });

  it('uses AI when few examples and exports exist', async () => {
    const provider = makeMockProvider({
      generateJSON: vi.fn().mockResolvedValue({
        examples: [
          { title: 'AI Example', description: 'desc', language: 'typescript', code: 'code' },
        ],
      }),
    });
    const result = await generateUsageSection({
      codeAnalysis: makeCode({
        exports: [{ name: 'foo', type: 'function', signature: 'function foo()', file: 'a.ts' }],
      }),
      scan: makeScan(),
      deps: makeDeps({ runCommand: '', testCommand: undefined }),
      provider,
    });
    expect(provider.generateJSON).toHaveBeenCalled();
    expect(result.examples.some(e => e.title === 'AI Example')).toBe(true);
  });
});

describe('generateAPIDocs', () => {
  it('returns entries for function and class exports', async () => {
    const result = await generateAPIDocs({
      codeAnalysis: makeCode({
        exports: [
          { name: 'doStuff', type: 'function', signature: 'function doStuff()', file: 'a.ts' },
          { name: 'Config', type: 'const', signature: 'const Config', file: 'a.ts' },
          { name: 'Service', type: 'class', signature: 'class Service', file: 'b.ts' },
        ],
      }),
      provider: makeMockProvider({
        generateJSON: vi.fn().mockResolvedValue({ descriptions: { doStuff: 'Does stuff' } }),
      }),
    });
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].name).toBe('doStuff');
    expect(result.entries[0].description).toBe('Does stuff');
    expect(result.entries[1].name).toBe('Service');
  });

  it('handles AI failure gracefully', async () => {
    const result = await generateAPIDocs({
      codeAnalysis: makeCode({
        exports: [
          { name: 'foo', type: 'function', signature: 'function foo()', file: 'a.ts' },
        ],
      }),
      provider: makeMockProvider({
        generateJSON: vi.fn().mockRejectedValue(new Error('API error')),
      }),
    });
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].description).toBe('');
  });
});
