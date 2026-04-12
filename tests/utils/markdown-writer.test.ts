import { describe, it, expect, vi } from 'vitest';
import { joinSections, sanitizeMarkdown, escapeForTable, writeMarkdown } from '../../src/utils/markdown-writer.js';

vi.mock('node:fs/promises', () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('joinSections', () => {
  it('joins sections with --- separator', () => {
    const result = joinSections(['A', 'B', 'C']);
    expect(result).toBe('A\n\n---\n\nB\n\n---\n\nC');
  });

  it('filters out empty strings', () => {
    const result = joinSections(['A', '', 'B']);
    expect(result).toBe('A\n\n---\n\nB');
  });

  it('returns empty string for no sections', () => {
    expect(joinSections([])).toBe('');
  });
});

describe('sanitizeMarkdown', () => {
  it('escapes < and > characters', () => {
    expect(sanitizeMarkdown('<script>')).toBe('&lt;script&gt;');
  });

  it('leaves normal text unchanged', () => {
    expect(sanitizeMarkdown('Hello world')).toBe('Hello world');
  });
});

describe('escapeForTable', () => {
  it('escapes pipe characters', () => {
    expect(escapeForTable('a|b')).toBe('a\\|b');
  });

  it('replaces newlines with spaces', () => {
    expect(escapeForTable('line1\nline2')).toBe('line1 line2');
  });
});

describe('writeMarkdown', () => {
  it('creates directory and writes file', async () => {
    const fs = (await import('node:fs/promises')).default;
    await writeMarkdown('/out/README.md', '# Hello');
    expect(fs.mkdir).toHaveBeenCalledWith('/out', { recursive: true });
    expect(fs.writeFile).toHaveBeenCalledWith('/out/README.md', '# Hello', 'utf-8');
  });
});
