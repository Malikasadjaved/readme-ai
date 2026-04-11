import { describe, it, expect } from 'vitest';
import { generateBadges, formatBadgeRow, type Badge } from '../../src/analyzers/badge-generator.js';
import type { ScanResult } from '../../src/analyzers/file-scanner.js';
import type { DependencyAnalysis } from '../../src/analyzers/dependency-analyzer.js';
import type { GitHubMeta } from '../../src/utils/github-api.js';

function makeScan(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    totalFiles: 10,
    languages: [{ name: 'TypeScript', files: 8, percentage: 80, icon: '🦕' }],
    frameworks: [],
    hasTests: false,
    hasDocker: false,
    hasCICD: false,
    hasLicense: null,
    entryPoints: [],
    configFiles: [],
    directoryTree: '',
    keyFiles: [],
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

describe('generateBadges', () => {
  it('generates a language badge for the primary language', () => {
    const badges = generateBadges(makeScan(), makeDeps());
    const langBadge = badges.find(b => b.category === 'language');
    expect(langBadge).toBeDefined();
    expect(langBadge!.label).toBe('TypeScript');
    expect(langBadge!.url).toContain('shields.io');
    expect(langBadge!.url).toContain('typescript');
  });

  it('generates framework badges', () => {
    const scan = makeScan({ frameworks: ['React', 'Express'] });
    const badges = generateBadges(scan, makeDeps());
    const frameworkBadges = badges.filter(b => b.category === 'framework');
    expect(frameworkBadges.length).toBe(2);
    expect(frameworkBadges.map(b => b.label)).toContain('React');
    expect(frameworkBadges.map(b => b.label)).toContain('Express');
  });

  it('generates Node.js version badge when nodeVersion present', () => {
    const deps = makeDeps({ nodeVersion: '>=18' });
    const badges = generateBadges(makeScan(), deps);
    const nodeBadge = badges.find(b => b.label === 'Node.js');
    expect(nodeBadge).toBeDefined();
    expect(nodeBadge!.url).toContain('nodedotjs');
  });

  it('generates license badge', () => {
    const scan = makeScan({ hasLicense: 'MIT' });
    const badges = generateBadges(scan, makeDeps());
    const licenseBadge = badges.find(b => b.label === 'License');
    expect(licenseBadge).toBeDefined();
    expect(licenseBadge!.url).toContain('MIT');
  });

  it('generates Docker badge when hasDocker', () => {
    const scan = makeScan({ hasDocker: true });
    const badges = generateBadges(scan, makeDeps());
    const dockerBadge = badges.find(b => b.label === 'Docker');
    expect(dockerBadge).toBeDefined();
  });

  it('generates CI/CD badge when hasCICD', () => {
    const scan = makeScan({ hasCICD: true });
    const badges = generateBadges(scan, makeDeps());
    const ciBadge = badges.find(b => b.label === 'CI/CD');
    expect(ciBadge).toBeDefined();
  });

  it('generates Tests badge when hasTests', () => {
    const scan = makeScan({ hasTests: true });
    const badges = generateBadges(scan, makeDeps());
    const testBadge = badges.find(b => b.label === 'Tests');
    expect(testBadge).toBeDefined();
  });

  it('generates GitHub stars badge when githubMeta provided', () => {
    const meta: GitHubMeta = {
      owner: 'user',
      repo: 'my-repo',
      description: 'A project',
      stars: 100,
      forks: 10,
      topics: [],
      license: 'MIT',
      defaultBranch: 'main',
      language: 'TypeScript',
    };
    const badges = generateBadges(makeScan(), makeDeps(), meta);
    const starsBadge = badges.find(b => b.label === 'Stars');
    expect(starsBadge).toBeDefined();
    expect(starsBadge!.url).toContain('github');
    expect(starsBadge!.markdown).toContain('user/my-repo');
  });

  it('returns empty array for unknown language', () => {
    const scan = makeScan({ languages: [{ name: 'Brainfuck', files: 1, percentage: 100, icon: '?' }] });
    const badges = generateBadges(scan, makeDeps());
    const langBadge = badges.find(b => b.category === 'language');
    expect(langBadge).toBeUndefined();
  });
});

describe('formatBadgeRow', () => {
  it('joins badge markdown with spaces', () => {
    const badges: Badge[] = [
      { label: 'A', url: 'https://a', markdown: '[![A](https://a)](#)', category: 'language' },
      { label: 'B', url: 'https://b', markdown: '[![B](https://b)](#)', category: 'tool' },
    ];
    const row = formatBadgeRow(badges);
    expect(row).toBe('[![A](https://a)](#) [![B](https://b)](#)');
  });

  it('returns empty string for empty badge array', () => {
    expect(formatBadgeRow([])).toBe('');
  });
});
