import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import {
  parseGitHubURL,
  fetchGitHubMeta,
  fetchGitHubTree,
  fetchGitHubFileContent,
  type GitHubMeta,
} from '../utils/github-api.js';
import {
  globFiles,
  loadIgnorePatterns,
  readFileContent,
  fileExists,
  getFileExtension,
} from '../utils/file-utils.js';
import {
  detectLanguage,
  isConfigFile,
  isTestFile,
  isEntryPoint,
} from '../utils/language-detector.js';

export interface FileEntry {
  path: string;
  absolutePath: string;
  language: string;
  size: number;
  isEntryPoint: boolean;
  isConfig: boolean;
  isTest: boolean;
}

export interface RepoContent {
  path: string;
  isRemote: boolean;
  files: FileEntry[];
  packageJson?: Record<string, unknown>;
  pythonRequirements?: string;
  cargoToml?: string;
  goMod?: string;
  githubMeta?: GitHubMeta;
}

const MAX_REMOTE_FILES = 100;
const SOURCE_EXTENSIONS = new Set([
  'ts',
  'tsx',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'py',
  'rs',
  'go',
  'java',
  'kt',
  'swift',
  'rb',
  'php',
  'cs',
  'cpp',
  'c',
  'h',
  'vue',
  'svelte',
  'dart',
  'ex',
  'exs',
  'scala',
  'lua',
  'r',
  'zig',
  'sh',
]);

export async function fetchRepo(input: string): Promise<RepoContent> {
  const github = parseGitHubURL(input);
  if (github) {
    return fetchRemoteRepo(github.owner, github.repo, github.branch);
  }
  return fetchLocalRepo(path.resolve(input));
}

async function fetchLocalRepo(repoPath: string): Promise<RepoContent> {
  const stat = await fs.stat(repoPath);
  if (!stat.isDirectory()) {
    throw new Error(`Not a directory: ${repoPath}`);
  }

  const ignores = await loadIgnorePatterns(repoPath);
  const relativePaths = await globFiles(repoPath, ignores);

  const files: FileEntry[] = relativePaths.map((relPath) => {
    const absPath = path.join(repoPath, relPath);
    return {
      path: relPath,
      absolutePath: absPath,
      language: detectLanguage(relPath),
      size: 0,
      isEntryPoint: isEntryPoint(relPath),
      isConfig: isConfigFile(relPath),
      isTest: isTestFile(relPath),
    };
  });

  const result: RepoContent = { path: repoPath, isRemote: false, files };

  const pkgPath = path.join(repoPath, 'package.json');
  if (await fileExists(pkgPath)) {
    try {
      result.packageJson = JSON.parse(await readFileContent(pkgPath));
    } catch {
      /* ignore parse errors */
    }
  }

  const reqPath = path.join(repoPath, 'requirements.txt');
  if (await fileExists(reqPath)) {
    result.pythonRequirements = await readFileContent(reqPath);
  }

  const cargoPath = path.join(repoPath, 'Cargo.toml');
  if (await fileExists(cargoPath)) {
    result.cargoToml = await readFileContent(cargoPath);
  }

  const goModPath = path.join(repoPath, 'go.mod');
  if (await fileExists(goModPath)) {
    result.goMod = await readFileContent(goModPath);
  }

  return result;
}

async function fetchRemoteRepo(owner: string, repo: string, branch?: string): Promise<RepoContent> {
  const githubMeta = await fetchGitHubMeta(owner, repo);
  const treeEntries = await fetchGitHubTree(owner, repo, branch);

  const tmpDir = path.join(os.tmpdir(), `readme-ai-${owner}-${repo}-${Date.now()}`);
  await fs.mkdir(tmpDir, { recursive: true });

  // Filter to source files and important configs, limit count
  const prioritized = treeEntries
    .filter((entry) => {
      const ext = getFileExtension(entry.path);
      const name = entry.path.split('/').pop() || '';
      return (
        SOURCE_EXTENSIONS.has(ext) ||
        name === 'package.json' ||
        name === 'requirements.txt' ||
        name === 'Cargo.toml' ||
        name === 'go.mod' ||
        name === 'pyproject.toml' ||
        name === 'Dockerfile' ||
        name === 'Makefile'
      );
    })
    .sort((a, b) => {
      // Prioritize entry points and configs
      const aEntry = isEntryPoint(a.path) ? 0 : 1;
      const bEntry = isEntryPoint(b.path) ? 0 : 1;
      if (aEntry !== bEntry) return aEntry - bEntry;
      // Then by path depth (shallower first)
      return a.path.split('/').length - b.path.split('/').length;
    })
    .slice(0, MAX_REMOTE_FILES);

  // Download files in parallel batches
  const batchSize = 10;
  for (let i = 0; i < prioritized.length; i += batchSize) {
    const batch = prioritized.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (entry) => {
        try {
          const content = await fetchGitHubFileContent(owner, repo, entry.path, branch);
          const filePath = path.join(tmpDir, entry.path);
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, content, 'utf-8');
        } catch {
          // Skip files that fail to download
        }
      }),
    );
  }

  const files: FileEntry[] = prioritized.map((entry) => ({
    path: entry.path,
    absolutePath: path.join(tmpDir, entry.path),
    language: detectLanguage(entry.path),
    size: entry.size,
    isEntryPoint: isEntryPoint(entry.path),
    isConfig: isConfigFile(entry.path),
    isTest: isTestFile(entry.path),
  }));

  const result: RepoContent = {
    path: tmpDir,
    isRemote: true,
    files,
    githubMeta,
  };

  // Parse package.json if downloaded
  const pkgFile = files.find((f) => f.path === 'package.json');
  if (pkgFile) {
    try {
      const content = await readFileContent(pkgFile.absolutePath);
      result.packageJson = JSON.parse(content);
    } catch {
      /* ignore */
    }
  }

  return result;
}
