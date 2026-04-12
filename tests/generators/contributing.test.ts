import { describe, it, expect } from 'vitest';
import { generateContributing, getLicense } from '../../src/generators/contributing.js';
import type { ScanResult } from '../../src/analyzers/file-scanner.js';
import type { DependencyAnalysis } from '../../src/analyzers/dependency-analyzer.js';

function makeScan(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    totalFiles: 10,
    languages: [],
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

describe('generateContributing', () => {
  it('includes test step when hasTests is true', () => {
    const result = generateContributing(makeScan({ hasTests: true }));
    expect(result).toContain('Run the tests');
    expect(result).toContain('7. Open a Pull Request');
  });

  it('omits test step when hasTests is false', () => {
    const result = generateContributing(makeScan({ hasTests: false }));
    expect(result).not.toContain('Run the tests');
    expect(result).toContain('6. Open a Pull Request');
  });

  it('uses custom test command when provided', () => {
    const deps = { testCommand: 'pytest' } as DependencyAnalysis;
    const result = generateContributing(makeScan({ hasTests: true }), deps);
    expect(result).toContain('pytest');
  });

  it('defaults to npm test when no deps provided', () => {
    const result = generateContributing(makeScan({ hasTests: true }));
    expect(result).toContain('npm test');
  });
});

describe('getLicense', () => {
  it('returns MIT license text when hasLicense is MIT', () => {
    const result = getLicense(makeScan({ hasLicense: 'MIT' }));
    expect(result).toContain('MIT License');
    expect(result).toContain('[LICENSE](LICENSE)');
  });

  it('returns generic text when no license', () => {
    const result = getLicense(makeScan({ hasLicense: '' }));
    expect(result).toContain('[LICENSE](LICENSE)');
    expect(result).not.toContain('MIT');
  });
});
