import { describe, it, expect, vi } from 'vitest';
import { analyzeDependencies } from '../../src/analyzers/dependency-analyzer.js';
import type { RepoContent, FileEntry } from '../../src/analyzers/repo-fetcher.js';

vi.mock('../../src/utils/file-utils.js', () => ({
  readFileContent: vi.fn().mockResolvedValue(''),
  fileExists: vi.fn().mockResolvedValue(false),
}));

function makeFile(filePath: string): FileEntry {
  return {
    path: filePath,
    absolutePath: `/repo/${filePath}`,
    language: 'TypeScript',
    size: 100,
    isEntryPoint: false,
    isConfig: false,
    isTest: false,
  };
}

function makeRepo(overrides: Partial<RepoContent> = {}): RepoContent {
  return {
    path: '/repo',
    isRemote: false,
    files: [],
    ...overrides,
  };
}

describe('analyzeDependencies', () => {
  describe('Node.js projects', () => {
    it('detects npm as default package manager', async () => {
      const repo = makeRepo({
        packageJson: {
          dependencies: { express: '^4.0.0' },
          scripts: { start: 'node index.js' },
        },
      });
      const result = await analyzeDependencies(repo);
      expect(result.packageManager).toBe('npm');
      expect(result.installCommand).toBe('npm install');
      expect(result.runCommand).toBe('npm start');
    });

    it('detects yarn when yarn.lock present', async () => {
      const repo = makeRepo({
        packageJson: { dependencies: {}, scripts: { start: 'node index.js' } },
        files: [makeFile('yarn.lock')],
      });
      const result = await analyzeDependencies(repo);
      expect(result.packageManager).toBe('yarn');
    });

    it('detects pnpm when pnpm-lock.yaml present', async () => {
      const repo = makeRepo({
        packageJson: { dependencies: {}, scripts: { start: 'node index.js' } },
        files: [makeFile('pnpm-lock.yaml')],
      });
      const result = await analyzeDependencies(repo);
      expect(result.packageManager).toBe('pnpm');
    });

    it('detects database requirement', async () => {
      const repo = makeRepo({
        packageJson: { dependencies: { prisma: '^5.0.0' }, scripts: {} },
      });
      const result = await analyzeDependencies(repo);
      expect(result.requiresDatabase).toBe(true);
    });

    it('detects env file requirement', async () => {
      const repo = makeRepo({
        packageJson: { dependencies: { dotenv: '^16.0.0' }, scripts: {} },
      });
      const result = await analyzeDependencies(repo);
      expect(result.requiresEnvFile).toBe(true);
    });

    it('extracts build and test commands', async () => {
      const repo = makeRepo({
        packageJson: {
          dependencies: {},
          scripts: { build: 'tsc', test: 'vitest run', start: 'node dist/index.js' },
        },
      });
      const result = await analyzeDependencies(repo);
      expect(result.buildCommand).toBe('npm run build');
      expect(result.testCommand).toBe('npm test');
    });

    it('extracts node version from engines', async () => {
      const repo = makeRepo({
        packageJson: {
          dependencies: {},
          scripts: {},
          engines: { node: '>= 20' },
        },
      });
      const result = await analyzeDependencies(repo);
      expect(result.nodeVersion).toBe('>= 20');
    });
  });

  describe('Python projects', () => {
    it('detects pip for requirements.txt', async () => {
      const repo = makeRepo({
        pythonRequirements: 'fastapi>=0.100.0\nuvicorn\npytest',
      });
      const result = await analyzeDependencies(repo);
      expect(result.packageManager).toBe('pip');
      expect(result.installCommand).toContain('requirements.txt');
      expect(result.testCommand).toBe('pytest');
    });
  });

  describe('Rust projects', () => {
    it('detects cargo for Cargo.toml', async () => {
      const repo = makeRepo({ cargoToml: '[package]\nname = "app"' });
      const result = await analyzeDependencies(repo);
      expect(result.packageManager).toBe('cargo');
      expect(result.installCommand).toContain('cargo build');
      expect(result.testCommand).toBe('cargo test');
    });
  });

  describe('Go projects', () => {
    it('detects go for go.mod', async () => {
      const repo = makeRepo({ goMod: 'module example.com/app\n\ngo 1.21' });
      const result = await analyzeDependencies(repo);
      expect(result.packageManager).toBe('go');
      expect(result.installCommand).toBe('go mod download');
      expect(result.testCommand).toBe('go test ./...');
    });
  });

  describe('pyproject.toml projects', () => {
    it('detects pip install -e .', async () => {
      const { readFileContent } = await import('../../src/utils/file-utils.js');
      (readFileContent as ReturnType<typeof vi.fn>).mockResolvedValue('[project]\nname = "myapp"\n[tool.pytest]');

      const repo = makeRepo({
        files: [makeFile('pyproject.toml')],
      });
      const result = await analyzeDependencies(repo);
      expect(result.packageManager).toBe('pip');
      expect(result.installCommand).toBe('pip install -e .');
      expect(result.testCommand).toBe('pytest');
    });
  });

  describe('unrecognized projects', () => {
    it('returns null package manager', async () => {
      const result = await analyzeDependencies(makeRepo());
      expect(result.packageManager).toBeNull();
      expect(result.installCommand).toBe('');
    });
  });
});
