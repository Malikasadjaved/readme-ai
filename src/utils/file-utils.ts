import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';

export const DEFAULT_IGNORES = [
  'node_modules', 'dist', 'build', '.git', 'coverage', '__pycache__',
  '.next', '.nuxt', '.svelte-kit', '.output', '.cache', '.parcel-cache',
  'target', 'vendor', '.venv', 'venv', 'env',
  '*.lock', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  '*.min.js', '*.min.css', '*.map',
  '*.png', '*.jpg', '*.jpeg', '*.gif', '*.svg', '*.ico', '*.webp',
  '*.woff', '*.woff2', '*.ttf', '*.eot',
  '*.zip', '*.tar.gz', '*.tgz',
  '.DS_Store', 'Thumbs.db',
];

export async function readFileContent(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf-8');
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function loadIgnorePatterns(repoPath: string): Promise<string[]> {
  const ignorePath = path.join(repoPath, '.readmeaiignore');
  try {
    const content = await readFileContent(ignorePath);
    const custom = content.split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));
    return [...DEFAULT_IGNORES, ...custom];
  } catch {
    return DEFAULT_IGNORES;
  }
}

export async function globFiles(repoPath: string, ignores: string[]): Promise<string[]> {
  const ignorePatterns = ignores.map(i => `**/${i}/**`);
  return fg('**/*', {
    cwd: repoPath,
    ignore: ignorePatterns,
    dot: false,
    onlyFiles: true,
    absolute: false,
  });
}

export function generateTree(files: string[], maxDepth: number = 3): string {
  interface TreeNode {
    [key: string]: TreeNode;
  }

  const tree: TreeNode = {};
  for (const file of files) {
    const parts = file.split('/');
    if (parts.length > maxDepth + 1) continue;
    let current = tree;
    for (const part of parts) {
      if (!current[part]) current[part] = {};
      current = current[part];
    }
  }

  function render(node: TreeNode, prefix: string = ''): string {
    const entries = Object.keys(node).sort((a, b) => {
      const aIsDir = Object.keys(node[a]).length > 0;
      const bIsDir = Object.keys(node[b]).length > 0;
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return a.localeCompare(b);
    });

    let result = '';
    entries.forEach((name, i) => {
      const isLast = i === entries.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const childPrefix = isLast ? '    ' : '│   ';
      result += `${prefix}${connector}${name}\n`;
      if (Object.keys(node[name]).length > 0) {
        result += render(node[name], prefix + childPrefix);
      }
    });
    return result;
  }

  return render(tree).trimEnd();
}

export function getFileExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase().slice(1);
}

export function getFileName(filePath: string): string {
  return path.basename(filePath);
}
