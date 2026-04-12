import { describe, it, expect } from 'vitest';
import {
  detectLanguage,
  getLanguageIcon,
  isConfigFile,
  isTestFile,
  isEntryPoint,
  calculateLanguageStats,
} from '../../src/utils/language-detector.js';

describe('detectLanguage', () => {
  it('returns TypeScript for .ts files', () => {
    expect(detectLanguage('src/index.ts')).toBe('TypeScript');
  });

  it('returns Python for .py files', () => {
    expect(detectLanguage('app/main.py')).toBe('Python');
  });

  it('returns Rust for .rs files', () => {
    expect(detectLanguage('src/main.rs')).toBe('Rust');
  });

  it('returns Go for .go files', () => {
    expect(detectLanguage('main.go')).toBe('Go');
  });

  it('returns the extension for unknown types', () => {
    expect(detectLanguage('file.xyz')).toBe('xyz');
  });

  it('returns unknown for files without extension', () => {
    expect(detectLanguage('Makefile')).toBe('unknown');
  });
});

describe('getLanguageIcon', () => {
  it('returns correct icon for TypeScript', () => {
    expect(getLanguageIcon('file.ts')).toBe('🦕');
  });

  it('returns correct icon for Python', () => {
    expect(getLanguageIcon('file.py')).toBe('🐍');
  });

  it('returns fallback icon for unknown extension', () => {
    expect(getLanguageIcon('file.xyz')).toBe('📄');
  });
});

describe('isConfigFile', () => {
  it('returns true for .json files', () => {
    expect(isConfigFile('package.json')).toBe(true);
  });

  it('returns true for .yml files', () => {
    expect(isConfigFile('config.yml')).toBe(true);
  });

  it('returns true for dotfiles', () => {
    expect(isConfigFile('.eslintrc')).toBe(true);
  });

  it('returns true for Dockerfile', () => {
    expect(isConfigFile('Dockerfile')).toBe(true);
  });

  it('returns true for Makefile', () => {
    expect(isConfigFile('Makefile')).toBe(true);
  });

  it('returns false for source code files', () => {
    expect(isConfigFile('src/index.ts')).toBe(false);
  });
});

describe('isTestFile', () => {
  it('detects .test.ts files', () => {
    expect(isTestFile('foo.test.ts')).toBe(true);
  });

  it('detects .spec.js files', () => {
    expect(isTestFile('bar.spec.js')).toBe(true);
  });

  it('detects files in tests/ directory', () => {
    expect(isTestFile('tests/bar.ts')).toBe(true);
  });

  it('detects files in __tests__/ directory', () => {
    expect(isTestFile('__tests__/baz.js')).toBe(true);
  });

  it('returns false for regular source files', () => {
    expect(isTestFile('src/index.ts')).toBe(false);
  });
});

describe('isEntryPoint', () => {
  it('detects index.ts', () => {
    expect(isEntryPoint('src/index.ts')).toBe(true);
  });

  it('detects main.py', () => {
    expect(isEntryPoint('main.py')).toBe(true);
  });

  it('detects app.js', () => {
    expect(isEntryPoint('src/app.js')).toBe(true);
  });

  it('detects server.ts', () => {
    expect(isEntryPoint('src/server.ts')).toBe(true);
  });

  it('returns false for utility files', () => {
    expect(isEntryPoint('src/utils.ts')).toBe(false);
  });
});

describe('calculateLanguageStats', () => {
  it('counts languages correctly', () => {
    const files = ['a.ts', 'b.ts', 'c.ts', 'main.py'];
    const stats = calculateLanguageStats(files);
    expect(stats[0].name).toBe('TypeScript');
    expect(stats[0].files).toBe(3);
    expect(stats[1].name).toBe('Python');
    expect(stats[1].files).toBe(1);
  });

  it('percentages sum to approximately 100', () => {
    const files = ['a.ts', 'b.ts', 'c.py', 'd.py'];
    const stats = calculateLanguageStats(files);
    const total = stats.reduce((sum, s) => sum + s.percentage, 0);
    expect(total).toBe(100);
  });

  it('sorts by file count descending', () => {
    const files = ['a.py', 'b.ts', 'c.ts', 'd.ts'];
    const stats = calculateLanguageStats(files);
    expect(stats[0].name).toBe('TypeScript');
  });

  it('excludes config and test files', () => {
    const files = ['src/index.ts', 'package.json', 'tests/foo.test.ts'];
    const stats = calculateLanguageStats(files);
    expect(stats).toHaveLength(1);
    expect(stats[0].name).toBe('TypeScript');
    expect(stats[0].files).toBe(1);
  });

  it('returns empty array when no recognized languages', () => {
    const files = ['README.md', '.gitignore'];
    const stats = calculateLanguageStats(files);
    expect(stats).toHaveLength(0);
  });
});
