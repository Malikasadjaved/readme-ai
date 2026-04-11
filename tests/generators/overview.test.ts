import { describe, it, expect, vi } from 'vitest';
import { generateOverview, type OverviewResult } from '../../src/generators/overview.js';
import type { ScanResult } from '../../src/analyzers/file-scanner.js';
import type { DependencyAnalysis } from '../../src/analyzers/dependency-analyzer.js';
import type { CodeAnalysis } from '../../src/analyzers/code-analyzer.js';
import type { AIProvider } from '../../src/providers/index.js';

function makeScan(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    totalFiles: 10,
    languages: [{ name: 'TypeScript', files: 8, percentage: 80, icon: '🦕' }],
    frameworks: ['Express'],
    hasTests: true,
    hasDocker: true,
    hasCICD: true,
    hasLicense: 'MIT',
    entryPoints: ['src/index.ts'],
    configFiles: ['tsconfig.json'],
    directoryTree: '├── src/\n│   └── index.ts',
    keyFiles: [],
    ...overrides,
  };
}

function makeCode(overrides: Partial<CodeAnalysis> = {}): CodeAnalysis {
  return {
    exports: [],
    mainFunctions: [],
    apiEndpoints: [
      { method: 'GET', path: '/api/users', handler: 'getUsers', file: 'routes.ts' },
    ],
    cliCommands: [],
    envVariables: [],
    externalDependencies: [],
    ...overrides,
  };
}

function makeDeps(overrides: Partial<DependencyAnalysis> = {}): DependencyAnalysis {
  return {
    packageManager: 'npm',
    installCommand: 'npm install',
    runCommand: 'npm run',
    mainDependencies: ['express', 'prisma'],
    devDependencies: ['vitest', 'typescript'],
    requiresDatabase: true,
    requiresEnvFile: false,
    ...overrides,
  };
}

describe('generateOverview', () => {
  it('uses AI provider when available and returns structured result', async () => {
    const mockResult: OverviewResult = {
      tagline: 'A fast REST API for task management',
      description: 'This project provides a REST API built with Express and TypeScript.',
      keyFeatures: ['JWT auth', 'RBAC', 'Real-time updates'],
      useCases: ['Team task management'],
      targetAudience: 'Backend developers',
    };

    const provider: AIProvider = {
      name: 'mock',
      model: 'mock-1',
      generate: vi.fn().mockResolvedValue(''),
      generateJSON: vi.fn().mockResolvedValue(mockResult),
    };

    const result = await generateOverview({
      scan: makeScan(),
      deps: makeDeps(),
      codeAnalysis: makeCode(),
      provider,
    });

    expect(result.tagline).toBe('A fast REST API for task management');
    expect(result.keyFeatures).toHaveLength(3);
    expect(result.useCases).toHaveLength(1);
    expect(provider.generateJSON).toHaveBeenCalledOnce();
  });

  it('falls back gracefully when AI fails', async () => {
    const provider: AIProvider = {
      name: 'mock',
      model: 'mock-1',
      generate: vi.fn().mockRejectedValue(new Error('API error')),
      generateJSON: vi.fn().mockRejectedValue(new Error('API error')),
    };

    const result = await generateOverview({
      scan: makeScan(),
      deps: makeDeps(),
      codeAnalysis: makeCode(),
      provider,
    });

    // Should return fallback result
    expect(result.tagline).toBeDefined();
    expect(result.description).toBeDefined();
    expect(result.keyFeatures.length).toBeGreaterThan(0);
    expect(result.description).toContain('TypeScript');
  });

  it('fallback includes framework info', async () => {
    const provider: AIProvider = {
      name: 'mock',
      model: 'mock-1',
      generate: vi.fn().mockRejectedValue(new Error('fail')),
      generateJSON: vi.fn().mockRejectedValue(new Error('fail')),
    };

    const result = await generateOverview({
      scan: makeScan({ frameworks: ['React', 'Vite'] }),
      deps: makeDeps(),
      codeAnalysis: makeCode(),
      provider,
    });

    expect(result.keyFeatures.some(f => f.includes('React'))).toBe(true);
  });

  it('fallback mentions API endpoints when present', async () => {
    const provider: AIProvider = {
      name: 'mock',
      model: 'mock-1',
      generate: vi.fn().mockRejectedValue(new Error('fail')),
      generateJSON: vi.fn().mockRejectedValue(new Error('fail')),
    };

    const result = await generateOverview({
      scan: makeScan(),
      deps: makeDeps(),
      codeAnalysis: makeCode({
        apiEndpoints: [
          { method: 'GET', path: '/a', handler: 'a', file: 'a.ts' },
          { method: 'POST', path: '/b', handler: 'b', file: 'b.ts' },
        ],
      }),
      provider,
    });

    expect(result.description).toContain('2 API endpoint');
  });

  it('fallback uses existing description as tagline', async () => {
    const provider: AIProvider = {
      name: 'mock',
      model: 'mock-1',
      generate: vi.fn().mockRejectedValue(new Error('fail')),
      generateJSON: vi.fn().mockRejectedValue(new Error('fail')),
    };

    const result = await generateOverview({
      scan: makeScan(),
      deps: makeDeps(),
      codeAnalysis: makeCode(),
      provider,
      existingDescription: 'My awesome project',
    });

    expect(result.tagline).toBe('My awesome project');
  });
});
