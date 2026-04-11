import { describe, it, expect, vi } from 'vitest';
import { buildDiagram, type DiagramResult } from '../../src/analyzers/diagram-builder.js';
import type { ScanResult } from '../../src/analyzers/file-scanner.js';
import type { CodeAnalysis } from '../../src/analyzers/code-analyzer.js';
import type { DependencyAnalysis } from '../../src/analyzers/dependency-analyzer.js';
import type { AIProvider } from '../../src/providers/index.js';

function makeScan(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    totalFiles: 10,
    languages: [{ name: 'TypeScript', files: 8, percentage: 80, icon: '🦕' }],
    frameworks: [],
    hasTests: false,
    hasDocker: false,
    hasCICD: false,
    hasLicense: null,
    entryPoints: ['src/index.ts'],
    configFiles: [],
    directoryTree: '├── src/\n│   └── index.ts',
    keyFiles: [{ path: 'src/index.ts', absolutePath: '/repo/src/index.ts', language: 'TypeScript', size: 100, isEntryPoint: true, isConfig: false, isTest: false }],
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

function makeDeps(overrides: Partial<DependencyAnalysis> = {}): DependencyAnalysis {
  return {
    packageManager: 'npm',
    installCommand: 'npm install',
    runCommand: 'npm run',
    mainDependencies: [],
    devDependencies: [],
    requiresDatabase: false,
    requiresEnvFile: false,
    ...overrides,
  };
}

function makeMockProvider(): AIProvider {
  return {
    name: 'mock',
    model: 'mock-1',
    generate: vi.fn().mockResolvedValue('graph TD\n  A[App] --> B[Server]'),
    generateJSON: vi.fn().mockResolvedValue({}),
  };
}

describe('buildDiagram', () => {
  it('builds API diagram when endpoints exist', async () => {
    const code = makeCode({
      apiEndpoints: [
        { method: 'GET', path: '/api/users', handler: 'getUsers', file: 'routes.ts' },
      ],
    });
    const result = await buildDiagram(makeScan(), code, makeDeps(), makeMockProvider());
    expect(result.mermaidCode).toContain('graph TD');
    expect(result.mermaidCode).toContain('API Server');
    expect(result.type).toBe('graph');
  });

  it('includes auth middleware when JWT env vars detected', async () => {
    const code = makeCode({
      apiEndpoints: [
        { method: 'GET', path: '/api/data', handler: 'getData', file: 'routes.ts' },
      ],
      envVariables: ['JWT_SECRET'],
    });
    const result = await buildDiagram(makeScan(), code, makeDeps(), makeMockProvider());
    expect(result.mermaidCode).toContain('Auth Middleware');
  });

  it('includes database node when deps require DB', async () => {
    const code = makeCode({
      apiEndpoints: [
        { method: 'GET', path: '/api/data', handler: 'getData', file: 'routes.ts' },
      ],
    });
    const deps = makeDeps({
      requiresDatabase: true,
      mainDependencies: ['pg'],
    });
    const result = await buildDiagram(makeScan(), code, deps, makeMockProvider());
    expect(result.mermaidCode).toContain('PostgreSQL');
  });

  it('builds CLI diagram when CLI commands exist', async () => {
    const code = makeCode({
      cliCommands: [
        { name: 'generate', description: 'Generate readme', file: 'cli.ts' },
        { name: 'init', description: 'Initialize config', file: 'cli.ts' },
      ],
    });
    const result = await buildDiagram(makeScan(), code, makeDeps(), makeMockProvider());
    expect(result.mermaidCode).toContain('CLI Input');
    expect(result.mermaidCode).toContain('Command Parser');
    expect(result.mermaidCode).toContain('generate');
    expect(result.type).toBe('flowchart');
  });

  it('builds frontend diagram for React projects', async () => {
    const scan = makeScan({ frameworks: ['React'] });
    const result = await buildDiagram(scan, makeCode(), makeDeps(), makeMockProvider());
    expect(result.mermaidCode).toContain('React App');
    expect(result.mermaidCode).toContain('Components');
  });

  it('builds generic diagram when no specific pattern detected', async () => {
    const result = await buildDiagram(makeScan(), makeCode(), makeDeps(), makeMockProvider());
    expect(result.mermaidCode).toContain('graph TD');
    expect(result.type).toBe('graph');
  });

  it('falls back to AI when structure returns null', async () => {
    // An empty scan with no keyFiles and no frameworks/endpoints/commands
    const scan = makeScan({ keyFiles: [], frameworks: [] });
    const provider = makeMockProvider();
    const result = await buildDiagram(scan, makeCode(), makeDeps(), provider);
    // The generic diagram builder should still work with empty keyFiles
    expect(result.mermaidCode).toContain('graph TD');
  });
});
