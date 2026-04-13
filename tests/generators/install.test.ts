import { describe, it, expect } from 'vitest';
import { generateInstallSection } from '../../src/generators/install.js';
import type { DependencyAnalysis } from '../../src/analyzers/dependency-analyzer.js';
import type { ScanResult } from '../../src/analyzers/file-scanner.js';

function makeDeps(overrides: Partial<DependencyAnalysis> = {}): DependencyAnalysis {
  return {
    packageManager: null,
    installCommand: '',
    runCommand: '',
    mainDependencies: [],
    devDependencies: [],
    requiresDatabase: false,
    requiresEnvFile: false,
    ...overrides,
  };
}

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

describe('generateInstallSection', () => {
  it('generates npm install steps', () => {
    const deps = makeDeps({
      packageManager: 'npm',
      installCommand: 'npm install',
      runCommand: 'npm start',
    });
    const result = generateInstallSection(deps, makeScan());

    expect(result.prerequisites).toContain('Node.js >= 18');
    expect(result.installSteps.some((s) => s.command === 'npm install')).toBe(true);
    expect(result.verifyCommand).toBe('npm start');
  });

  it('generates yarn install steps with build', () => {
    const deps = makeDeps({
      packageManager: 'yarn',
      installCommand: 'yarn install',
      runCommand: 'yarn start',
      buildCommand: 'yarn run build',
    });
    const result = generateInstallSection(deps, makeScan());

    expect(result.prerequisites).toContain('yarn');
    expect(result.installSteps.some((s) => s.command === 'yarn run build')).toBe(true);
  });

  it('generates pip install steps with venv', () => {
    const deps = makeDeps({
      packageManager: 'pip',
      installCommand: 'pip install -r requirements.txt',
      runCommand: 'python main.py',
    });
    const result = generateInstallSection(deps, makeScan());

    expect(result.prerequisites.some((p) => p.includes('Python'))).toBe(true);
    expect(result.installSteps.some((s) => s.command.includes('venv'))).toBe(true);
  });

  it('generates cargo install steps', () => {
    const deps = makeDeps({
      packageManager: 'cargo',
      installCommand: 'cargo build --release',
      runCommand: 'cargo run',
    });
    const result = generateInstallSection(deps, makeScan());

    expect(result.prerequisites.some((p) => p.includes('Rust'))).toBe(true);
  });

  it('generates go install steps', () => {
    const deps = makeDeps({
      packageManager: 'go',
      installCommand: 'go mod download',
      runCommand: 'go run .',
      buildCommand: 'go build -o app .',
    });
    const result = generateInstallSection(deps, makeScan());

    expect(result.prerequisites.some((p) => p.includes('Go'))).toBe(true);
    expect(result.installSteps.some((s) => s.command.includes('go build'))).toBe(true);
  });

  it('adds Docker step when hasDocker is true', () => {
    const deps = makeDeps({ packageManager: 'npm', installCommand: 'npm install', runCommand: '' });
    const scan = makeScan({ hasDocker: true });
    const result = generateInstallSection(deps, scan);

    expect(result.installSteps.some((s) => s.command.includes('docker compose'))).toBe(true);
  });

  it('adds env setup steps when requiresEnvFile is true', () => {
    const deps = makeDeps({ requiresEnvFile: true });
    const result = generateInstallSection(deps, makeScan());

    expect(result.envSetupSteps).toBeDefined();
    expect(result.envSetupSteps!.some((s) => s.command.includes('.env'))).toBe(true);
  });

  it('returns no env steps when not needed', () => {
    const result = generateInstallSection(makeDeps(), makeScan());
    expect(result.envSetupSteps).toBeUndefined();
  });
});
