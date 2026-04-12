import { describe, it, expect, vi } from 'vitest';
import { analyzeCode } from '../../src/analyzers/code-analyzer.js';
import type { FileEntry } from '../../src/analyzers/repo-fetcher.js';

vi.mock('../../src/utils/file-utils.js', () => ({
  readFileContent: vi.fn(),
}));

function makeFile(filePath: string, language = 'TypeScript'): FileEntry {
  return {
    path: filePath,
    absolutePath: `/repo/${filePath}`,
    language,
    size: 100,
    isEntryPoint: false,
    isConfig: false,
    isTest: false,
  };
}

async function getReadFileContent() {
  const mod = await import('../../src/utils/file-utils.js');
  return mod.readFileContent as ReturnType<typeof vi.fn>;
}

describe('analyzeCode', () => {
  describe('TypeScript exports', () => {
    it('extracts exported functions', async () => {
      const mock = await getReadFileContent();
      mock.mockResolvedValue('export function foo(x: number): string { return ""; }');

      const result = await analyzeCode([makeFile('src/index.ts')]);
      expect(result.exports.some(e => e.name === 'foo' && e.type === 'function')).toBe(true);
    });

    it('extracts exported classes', async () => {
      const mock = await getReadFileContent();
      mock.mockResolvedValue('export class MyService extends Base { }');

      const result = await analyzeCode([makeFile('src/service.ts')]);
      expect(result.exports.some(e => e.name === 'MyService' && e.type === 'class')).toBe(true);
    });

    it('extracts exported constants', async () => {
      const mock = await getReadFileContent();
      mock.mockResolvedValue('export const config: Config = {};');

      const result = await analyzeCode([makeFile('src/config.ts')]);
      expect(result.exports.some(e => e.name === 'config' && e.type === 'const')).toBe(true);
    });

    it('extracts exported interfaces', async () => {
      const mock = await getReadFileContent();
      mock.mockResolvedValue('export interface Options { timeout: number; }');

      const result = await analyzeCode([makeFile('src/types.ts')]);
      expect(result.exports.some(e => e.name === 'Options' && e.type === 'interface')).toBe(true);
    });

    it('extracts exported types', async () => {
      const mock = await getReadFileContent();
      mock.mockResolvedValue('export type Theme = "default" | "dark";');

      const result = await analyzeCode([makeFile('src/types.ts')]);
      expect(result.exports.some(e => e.name === 'Theme' && e.type === 'type')).toBe(true);
    });
  });

  describe('API endpoints', () => {
    it('extracts Express endpoints', async () => {
      const mock = await getReadFileContent();
      mock.mockResolvedValue(`app.get('/users', handler);\napp.post('/users', createHandler);`);

      const result = await analyzeCode([makeFile('src/routes.ts')]);
      expect(result.apiEndpoints).toHaveLength(2);
      expect(result.apiEndpoints[0]).toEqual(
        expect.objectContaining({ method: 'GET', path: '/users' })
      );
      expect(result.apiEndpoints[1]).toEqual(
        expect.objectContaining({ method: 'POST', path: '/users' })
      );
    });

    it('extracts FastAPI endpoints from Python', async () => {
      const mock = await getReadFileContent();
      mock.mockResolvedValue(`@app.post("/items")\ndef create_item(): pass`);

      const result = await analyzeCode([makeFile('app/main.py', 'Python')]);
      expect(result.apiEndpoints.some(e => e.method === 'POST' && e.path === '/items')).toBe(true);
    });
  });

  describe('CLI commands', () => {
    it('extracts Commander commands', async () => {
      const mock = await getReadFileContent();
      mock.mockResolvedValue(`.command('init').description('Initialize project')`);

      const result = await analyzeCode([makeFile('src/cli.ts')]);
      expect(result.cliCommands.some(c => c.name === 'init' && c.description === 'Initialize project')).toBe(true);
    });
  });

  describe('env variables', () => {
    it('extracts process.env references', async () => {
      const mock = await getReadFileContent();
      mock.mockResolvedValue('const url = process.env.DATABASE_URL;');

      const result = await analyzeCode([makeFile('src/db.ts')]);
      expect(result.envVariables).toContain('DATABASE_URL');
    });

    it('extracts Python os.environ references', async () => {
      const mock = await getReadFileContent();
      mock.mockResolvedValue(`key = os.environ["SECRET_KEY"]`);

      const result = await analyzeCode([makeFile('app/config.py', 'Python')]);
      expect(result.envVariables).toContain('SECRET_KEY');
    });
  });

  describe('imports', () => {
    it('extracts TS external imports', async () => {
      const mock = await getReadFileContent();
      mock.mockResolvedValue(`import express from 'express';\nimport { foo } from './local.js';`);

      const result = await analyzeCode([makeFile('src/app.ts')]);
      expect(result.externalDependencies).toContain('express');
      expect(result.externalDependencies).not.toContain('./local.js');
    });

    it('extracts scoped package imports', async () => {
      const mock = await getReadFileContent();
      mock.mockResolvedValue(`import Anthropic from '@anthropic-ai/sdk';`);

      const result = await analyzeCode([makeFile('src/provider.ts')]);
      expect(result.externalDependencies).toContain('@anthropic-ai/sdk');
    });

    it('excludes node: built-ins', async () => {
      const mock = await getReadFileContent();
      mock.mockResolvedValue(`import fs from 'node:fs/promises';`);

      const result = await analyzeCode([makeFile('src/util.ts')]);
      expect(result.externalDependencies).not.toContain('node:fs');
    });

    it('extracts Python imports excluding stdlib', async () => {
      const mock = await getReadFileContent();
      mock.mockResolvedValue(`import fastapi\nimport os\nimport json`);

      const result = await analyzeCode([makeFile('app/main.py', 'Python')]);
      expect(result.externalDependencies).toContain('fastapi');
      expect(result.externalDependencies).not.toContain('os');
      expect(result.externalDependencies).not.toContain('json');
    });
  });

  describe('error handling', () => {
    it('gracefully skips unreadable files', async () => {
      const mock = await getReadFileContent();
      mock.mockRejectedValue(new Error('ENOENT'));

      const result = await analyzeCode([makeFile('missing.ts')]);
      expect(result.exports).toHaveLength(0);
      expect(result.apiEndpoints).toHaveLength(0);
    });
  });
});
