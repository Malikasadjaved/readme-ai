import { describe, it, expect, vi } from 'vitest';
import { scanFiles, type ScanResult } from '../../src/analyzers/file-scanner.js';
import type { RepoContent, FileEntry } from '../../src/analyzers/repo-fetcher.js';

function makeFile(filePath: string, overrides: Partial<FileEntry> = {}): FileEntry {
  return {
    path: filePath,
    absolutePath: `/repo/${filePath}`,
    language: 'TypeScript',
    size: 100,
    isEntryPoint: false,
    isConfig: false,
    isTest: false,
    ...overrides,
  };
}

function makeRepo(files: FileEntry[], extra: Partial<RepoContent> = {}): RepoContent {
  return {
    path: '/repo',
    isRemote: false,
    files,
    ...extra,
  };
}

// Mock file-utils so we don't hit the filesystem
vi.mock('../../src/utils/file-utils.js', () => ({
  readFileContent: vi.fn().mockResolvedValue(''),
  fileExists: vi.fn().mockResolvedValue(false),
  generateTree: vi.fn().mockReturnValue('├── src/\n│   └── index.ts'),
  getFileExtension: vi.fn((p: string) => p.split('.').pop() || ''),
}));

describe('scanFiles', () => {
  it('returns correct totalFiles count', async () => {
    const files = [
      makeFile('src/index.ts'),
      makeFile('src/utils.ts'),
      makeFile('README.md'),
    ];
    const result = await scanFiles(makeRepo(files));
    expect(result.totalFiles).toBe(3);
  });

  it('detects Docker presence', async () => {
    const files = [
      makeFile('src/index.ts'),
      makeFile('Dockerfile'),
    ];
    const result = await scanFiles(makeRepo(files));
    expect(result.hasDocker).toBe(true);
  });

  it('detects docker-compose', async () => {
    const files = [
      makeFile('docker-compose.yml'),
    ];
    const result = await scanFiles(makeRepo(files));
    expect(result.hasDocker).toBe(true);
  });

  it('reports hasDocker false when no Docker files', async () => {
    const files = [makeFile('src/index.ts')];
    const result = await scanFiles(makeRepo(files));
    expect(result.hasDocker).toBe(false);
  });

  it('detects CI/CD from GitHub workflows', async () => {
    const files = [
      makeFile('.github/workflows/ci.yml'),
      makeFile('src/index.ts'),
    ];
    const result = await scanFiles(makeRepo(files));
    expect(result.hasCICD).toBe(true);
  });

  it('detects CI/CD from GitLab CI', async () => {
    const files = [makeFile('.gitlab-ci.yml')];
    const result = await scanFiles(makeRepo(files));
    expect(result.hasCICD).toBe(true);
  });

  it('detects CI/CD from Jenkinsfile', async () => {
    const files = [makeFile('Jenkinsfile')];
    const result = await scanFiles(makeRepo(files));
    expect(result.hasCICD).toBe(true);
  });

  it('detects test files', async () => {
    const files = [
      makeFile('src/index.ts'),
      makeFile('tests/index.test.ts', { isTest: true }),
    ];
    const result = await scanFiles(makeRepo(files));
    expect(result.hasTests).toBe(true);
  });

  it('collects entry points', async () => {
    const files = [
      makeFile('src/index.ts', { isEntryPoint: true }),
      makeFile('src/utils.ts'),
    ];
    const result = await scanFiles(makeRepo(files));
    expect(result.entryPoints).toContain('src/index.ts');
    expect(result.entryPoints).not.toContain('src/utils.ts');
  });

  it('collects config files', async () => {
    const files = [
      makeFile('tsconfig.json', { isConfig: true }),
      makeFile('src/index.ts'),
    ];
    const result = await scanFiles(makeRepo(files));
    expect(result.configFiles).toContain('tsconfig.json');
  });

  it('limits keyFiles to 30', async () => {
    const files = Array.from({ length: 50 }, (_, i) =>
      makeFile(`src/file${i}.ts`)
    );
    const result = await scanFiles(makeRepo(files));
    expect(result.keyFiles.length).toBeLessThanOrEqual(30);
  });

  it('excludes test and config files from keyFiles', async () => {
    const files = [
      makeFile('src/index.ts'),
      makeFile('tests/foo.test.ts', { isTest: true }),
      makeFile('tsconfig.json', { isConfig: true }),
    ];
    const result = await scanFiles(makeRepo(files));
    expect(result.keyFiles.map(f => f.path)).toEqual(['src/index.ts']);
  });

  it('detects frameworks from package.json dependencies', async () => {
    const files = [makeFile('src/index.ts')];
    const repo = makeRepo(files, {
      packageJson: {
        dependencies: { react: '^18.0.0', express: '^4.0.0' },
      },
    });
    const result = await scanFiles(repo);
    expect(result.frameworks).toContain('React');
    expect(result.frameworks).toContain('Express');
  });

  it('generates a directory tree', async () => {
    const files = [makeFile('src/index.ts')];
    const result = await scanFiles(makeRepo(files));
    expect(result.directoryTree).toBeDefined();
    expect(typeof result.directoryTree).toBe('string');
  });
});
