import { describe, it, expect, vi } from 'vitest';
import { generateTree, getFileExtension, getFileName } from '../../src/utils/file-utils.js';

// Only test pure functions here — avoid mocking fs for readFileContent/fileExists/globFiles
// since those are thin wrappers and testing them would only test the mock.

describe('generateTree', () => {
  it('builds correct tree structure', () => {
    const files = ['src/index.ts', 'src/utils/helper.ts', 'package.json'];
    const tree = generateTree(files);
    expect(tree).toContain('src');
    expect(tree).toContain('index.ts');
    expect(tree).toContain('utils');
    expect(tree).toContain('helper.ts');
    expect(tree).toContain('package.json');
  });

  it('sorts directories before files', () => {
    const files = ['b.ts', 'a/c.ts'];
    const tree = generateTree(files);
    const lines = tree.split('\n');
    // Directory 'a' should come before file 'b.ts'
    const aIdx = lines.findIndex(l => l.includes('a'));
    const bIdx = lines.findIndex(l => l.includes('b.ts'));
    expect(aIdx).toBeLessThan(bIdx);
  });

  it('respects maxDepth', () => {
    const files = ['a/b/c/d/e.ts', 'a/b/f.ts'];
    const tree = generateTree(files, 2);
    // depth 2 means max 3 parts (0-indexed), so a/b/c/d/e.ts (5 parts) is skipped
    expect(tree).not.toContain('e.ts');
    expect(tree).toContain('f.ts');
  });

  it('uses correct tree connectors', () => {
    const files = ['a.ts', 'b.ts'];
    const tree = generateTree(files);
    expect(tree).toContain('├──');
    expect(tree).toContain('└──');
  });
});

describe('getFileExtension', () => {
  it('returns lowercase extension', () => {
    expect(getFileExtension('file.TS')).toBe('ts');
  });

  it('returns empty string for no extension', () => {
    expect(getFileExtension('Makefile')).toBe('');
  });

  it('handles nested paths', () => {
    expect(getFileExtension('src/utils/helper.js')).toBe('js');
  });
});

describe('getFileName', () => {
  it('returns basename', () => {
    expect(getFileName('src/utils/helper.ts')).toBe('helper.ts');
  });

  it('returns file itself if no directory', () => {
    expect(getFileName('README.md')).toBe('README.md');
  });
});
