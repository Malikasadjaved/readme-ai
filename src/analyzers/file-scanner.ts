import { readFileContent, fileExists } from '../utils/file-utils.js';
import { generateTree } from '../utils/file-utils.js';
import {
  calculateLanguageStats,
  isTestFile,
  isConfigFile,
  isEntryPoint,
  FRAMEWORK_INDICATORS,
  type LanguageStat,
} from '../utils/language-detector.js';
import type { RepoContent, FileEntry } from './repo-fetcher.js';
import path from 'node:path';

export interface ScanResult {
  totalFiles: number;
  languages: LanguageStat[];
  frameworks: string[];
  hasTests: boolean;
  hasDocker: boolean;
  hasCICD: boolean;
  hasLicense: string | null;
  entryPoints: string[];
  configFiles: string[];
  directoryTree: string;
  keyFiles: FileEntry[];
}

export async function scanFiles(repoContent: RepoContent): Promise<ScanResult> {
  const { files } = repoContent;
  const filePaths = files.map(f => f.path);

  const languages = calculateLanguageStats(filePaths);
  const frameworks = await detectFrameworks(repoContent);

  const hasTests = files.some(f => f.isTest || isTestFile(f.path));
  const hasDocker = files.some(f => {
    const name = f.path.split('/').pop() || '';
    return name === 'Dockerfile' || name.startsWith('docker-compose');
  });
  const hasCICD = files.some(f =>
    f.path.includes('.github/workflows/') ||
    f.path.includes('.gitlab-ci') ||
    f.path.includes('.circleci/') ||
    f.path.includes('Jenkinsfile')
  );

  const hasLicense = await detectLicense(repoContent);

  const entryPoints = files.filter(f => f.isEntryPoint).map(f => f.path);
  const configFiles = files.filter(f => f.isConfig).map(f => f.path);
  const directoryTree = generateTree(filePaths, 3);

  // Key files: entry points + src/ files (non-test, non-config), limited to 30
  const keyFiles = files
    .filter(f => !f.isTest && !f.isConfig)
    .sort((a, b) => {
      if (a.isEntryPoint && !b.isEntryPoint) return -1;
      if (!a.isEntryPoint && b.isEntryPoint) return 1;
      return a.path.split('/').length - b.path.split('/').length;
    })
    .slice(0, 30);

  return {
    totalFiles: files.length,
    languages,
    frameworks,
    hasTests,
    hasDocker,
    hasCICD,
    hasLicense,
    entryPoints,
    configFiles,
    directoryTree,
    keyFiles,
  };
}

async function detectFrameworks(repo: RepoContent): Promise<string[]> {
  const detected: string[] = [];
  const filePaths = new Set(repo.files.map(f => f.path.split('/').pop() || ''));
  const allPaths = new Set(repo.files.map(f => f.path));

  // Get dependencies from package.json
  const deps = new Set<string>();
  if (repo.packageJson) {
    const pkg = repo.packageJson as Record<string, unknown>;
    const allDeps = {
      ...(pkg.dependencies as Record<string, string> || {}),
      ...(pkg.devDependencies as Record<string, string> || {}),
    };
    Object.keys(allDeps).forEach(d => deps.add(d));
  }

  for (const [framework, indicators] of Object.entries(FRAMEWORK_INDICATORS)) {
    // Check dependency names
    if (indicators.deps?.some(d => deps.has(d))) {
      detected.push(framework);
      continue;
    }
    // Check file existence
    if (indicators.files?.some(f => filePaths.has(f) || allPaths.has(f))) {
      detected.push(framework);
      continue;
    }
  }

  return detected;
}

async function detectLicense(repo: RepoContent): Promise<string | null> {
  if (repo.githubMeta?.license) {
    return repo.githubMeta.license;
  }

  const licenseFile = repo.files.find(f => {
    const name = (f.path.split('/').pop() || '').toLowerCase();
    return name === 'license' || name === 'license.md' || name === 'license.txt';
  });

  if (!licenseFile) return null;

  try {
    const content = await readFileContent(licenseFile.absolutePath);
    if (content.includes('MIT License')) return 'MIT';
    if (content.includes('Apache License')) return 'Apache-2.0';
    if (content.includes('GNU GENERAL PUBLIC LICENSE')) return 'GPL-3.0';
    if (content.includes('BSD')) return 'BSD-3-Clause';
    if (content.includes('ISC License')) return 'ISC';
    return 'Custom';
  } catch {
    return null;
  }
}
