import { readFileContent, fileExists } from '../utils/file-utils.js';
import type { RepoContent } from './repo-fetcher.js';
import path from 'node:path';

export interface DependencyAnalysis {
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'pip' | 'cargo' | 'go' | null;
  installCommand: string;
  runCommand: string;
  buildCommand?: string;
  testCommand?: string;
  mainDependencies: string[];
  devDependencies: string[];
  pythonVersion?: string;
  nodeVersion?: string;
  requiresDatabase: boolean;
  requiresEnvFile: boolean;
}

const DB_PACKAGES = new Set([
  'pg', 'mysql', 'mysql2', 'mongodb', 'mongoose', 'redis', 'ioredis',
  'prisma', '@prisma/client', 'typeorm', 'sequelize', 'knex', 'drizzle-orm',
  'better-sqlite3', 'sqlite3',
  'psycopg2', 'pymongo', 'sqlalchemy', 'django', 'peewee', 'tortoise-orm',
  'diesel', 'sqlx', 'sea-orm',
]);

const ENV_PACKAGES = new Set([
  'dotenv', 'python-dotenv', 'django-environ', 'envy',
]);

export async function analyzeDependencies(repo: RepoContent): Promise<DependencyAnalysis> {
  // Check for Node.js project
  if (repo.packageJson) {
    return analyzeNodeProject(repo);
  }

  // Check for Python project
  if (repo.pythonRequirements) {
    return analyzePythonProject(repo);
  }

  // Check for Rust project
  if (repo.cargoToml) {
    return analyzeRustProject(repo);
  }

  // Check for Go project
  if (repo.goMod) {
    return analyzeGoProject(repo);
  }

  // Check for pyproject.toml
  const pyprojectFile = repo.files.find(f => f.path === 'pyproject.toml');
  if (pyprojectFile) {
    return analyzePyprojectProject(repo, pyprojectFile.absolutePath);
  }

  return {
    packageManager: null,
    installCommand: '',
    runCommand: '',
    mainDependencies: [],
    devDependencies: [],
    requiresDatabase: false,
    requiresEnvFile: false,
  };
}

function analyzeNodeProject(repo: RepoContent): DependencyAnalysis {
  const pkg = repo.packageJson as Record<string, unknown>;
  const scripts = (pkg.scripts || {}) as Record<string, string>;
  const deps = Object.keys((pkg.dependencies || {}) as Record<string, string>);
  const devDeps = Object.keys((pkg.devDependencies || {}) as Record<string, string>);
  const allDeps = [...deps, ...devDeps];

  // Detect package manager
  let packageManager: 'npm' | 'yarn' | 'pnpm' = 'npm';
  const hasYarnLock = repo.files.some(f => f.path === 'yarn.lock');
  const hasPnpmLock = repo.files.some(f => f.path === 'pnpm-lock.yaml');
  if (hasPnpmLock) packageManager = 'pnpm';
  else if (hasYarnLock) packageManager = 'yarn';

  const installCommand = `${packageManager} install`;
  let runCommand = '';
  if (scripts.start) runCommand = `${packageManager} start`;
  else if (scripts.dev) runCommand = `${packageManager} run dev`;
  else runCommand = `${packageManager} start`;

  const buildCommand = scripts.build ? `${packageManager} run build` : undefined;
  const testCommand = scripts.test ? `${packageManager} test` : undefined;

  // Node version
  const engines = (pkg.engines || {}) as Record<string, string>;
  const nodeVersion = engines.node;

  return {
    packageManager,
    installCommand,
    runCommand,
    buildCommand,
    testCommand,
    mainDependencies: deps.slice(0, 10),
    devDependencies: devDeps.slice(0, 5),
    nodeVersion,
    requiresDatabase: allDeps.some(d => DB_PACKAGES.has(d)),
    requiresEnvFile: allDeps.some(d => ENV_PACKAGES.has(d)),
  };
}

function analyzePythonProject(repo: RepoContent): DependencyAnalysis {
  const requirements = repo.pythonRequirements!;
  const deps = requirements.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .map(l => l.split(/[=<>!]/)[0].trim());

  const hasManagePy = repo.files.some(f => f.path === 'manage.py');
  const mainPy = repo.files.some(f => f.path === 'main.py' || f.path === 'app.py');

  let runCommand = 'python main.py';
  if (hasManagePy) runCommand = 'python manage.py runserver';
  else if (mainPy) runCommand = 'python main.py';
  else if (deps.includes('uvicorn')) runCommand = 'uvicorn main:app --reload';

  return {
    packageManager: 'pip',
    installCommand: 'pip install -r requirements.txt',
    runCommand,
    testCommand: deps.includes('pytest') ? 'pytest' : undefined,
    mainDependencies: deps.slice(0, 10),
    devDependencies: [],
    requiresDatabase: deps.some(d => DB_PACKAGES.has(d)),
    requiresEnvFile: deps.some(d => ENV_PACKAGES.has(d)),
  };
}

function analyzeRustProject(repo: RepoContent): DependencyAnalysis {
  return {
    packageManager: 'cargo',
    installCommand: 'cargo build --release',
    runCommand: 'cargo run',
    buildCommand: 'cargo build --release',
    testCommand: 'cargo test',
    mainDependencies: [],
    devDependencies: [],
    requiresDatabase: false,
    requiresEnvFile: false,
  };
}

function analyzeGoProject(repo: RepoContent): DependencyAnalysis {
  return {
    packageManager: 'go',
    installCommand: 'go mod download',
    runCommand: 'go run .',
    buildCommand: 'go build -o app .',
    testCommand: 'go test ./...',
    mainDependencies: [],
    devDependencies: [],
    requiresDatabase: false,
    requiresEnvFile: false,
  };
}

async function analyzePyprojectProject(repo: RepoContent, pyprojectPath: string): Promise<DependencyAnalysis> {
  try {
    const content = await readFileContent(pyprojectPath);
    const hasFastAPI = content.includes('fastapi');
    const hasDjango = content.includes('django');

    let runCommand = 'python main.py';
    if (hasFastAPI) runCommand = 'uvicorn main:app --reload';
    if (hasDjango) runCommand = 'python manage.py runserver';

    return {
      packageManager: 'pip',
      installCommand: 'pip install -e .',
      runCommand,
      testCommand: content.includes('pytest') ? 'pytest' : undefined,
      mainDependencies: [],
      devDependencies: [],
      requiresDatabase: false,
      requiresEnvFile: false,
    };
  } catch {
    return {
      packageManager: 'pip',
      installCommand: 'pip install -e .',
      runCommand: 'python main.py',
      mainDependencies: [],
      devDependencies: [],
      requiresDatabase: false,
      requiresEnvFile: false,
    };
  }
}
