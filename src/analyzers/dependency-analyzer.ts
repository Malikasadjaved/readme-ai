import { readFileContent } from '../utils/file-utils.js';
import type { RepoContent } from './repo-fetcher.js';

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
  'pg',
  'mysql',
  'mysql2',
  'mongodb',
  'mongoose',
  'redis',
  'ioredis',
  'prisma',
  '@prisma/client',
  'typeorm',
  'sequelize',
  'knex',
  'drizzle-orm',
  'better-sqlite3',
  'sqlite3',
  'psycopg2',
  'pymongo',
  'sqlalchemy',
  'django',
  'peewee',
  'tortoise-orm',
  'diesel',
  'sqlx',
  'sea-orm',
]);

const ENV_PACKAGES = new Set(['dotenv', 'python-dotenv', 'django-environ', 'envy']);

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

  // Check for Java project (Gradle or Maven)
  const hasGradle = repo.files.some(
    (f) => f.path === 'build.gradle' || f.path === 'build.gradle.kts',
  );
  const hasMaven = repo.files.some((f) => f.path === 'pom.xml');
  if (hasGradle) return analyzeGradleProject(repo);
  if (hasMaven) return analyzeMavenProject(repo);

  // Check for Ruby project (Bundler)
  const hasGemfile = repo.files.some((f) => f.path === 'Gemfile');
  if (hasGemfile) return analyzeRubyProject(repo);

  // Check for Swift project
  const hasSwiftPkg = repo.files.some((f) => f.path === 'Package.swift');
  if (hasSwiftPkg) return analyzeSwiftProject();

  // Check for Dart/Flutter project
  const hasPubspec = repo.files.some((f) => f.path === 'pubspec.yaml');
  if (hasPubspec) return analyzeDartProject(repo);

  // Check for pyproject.toml
  const pyprojectFile = repo.files.find((f) => f.path === 'pyproject.toml');
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
  const hasYarnLock = repo.files.some((f) => f.path === 'yarn.lock');
  const hasPnpmLock = repo.files.some((f) => f.path === 'pnpm-lock.yaml');
  if (hasPnpmLock) packageManager = 'pnpm';
  else if (hasYarnLock) packageManager = 'yarn';

  const installCommand = `${packageManager} install`;
  let runCommand = `${packageManager} start`;
  if (scripts.start) runCommand = `${packageManager} start`;
  else if (scripts.dev) runCommand = `${packageManager} run dev`;

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
    requiresDatabase: allDeps.some((d) => DB_PACKAGES.has(d)),
    requiresEnvFile: allDeps.some((d) => ENV_PACKAGES.has(d)),
  };
}

function analyzePythonProject(repo: RepoContent): DependencyAnalysis {
  const requirements = repo.pythonRequirements!;
  const deps = requirements
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split(/[=<>!]/)[0].trim());

  const hasManagePy = repo.files.some((f) => f.path === 'manage.py');
  const mainPy = repo.files.some((f) => f.path === 'main.py' || f.path === 'app.py');

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
    requiresDatabase: deps.some((d) => DB_PACKAGES.has(d)),
    requiresEnvFile: deps.some((d) => ENV_PACKAGES.has(d)),
  };
}

function analyzeRustProject(_repo: RepoContent): DependencyAnalysis {
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

function analyzeGoProject(_repo: RepoContent): DependencyAnalysis {
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

async function analyzeGradleProject(repo: RepoContent): Promise<DependencyAnalysis> {
  const buildFile = repo.files.find(
    (f) => f.path === 'build.gradle' || f.path === 'build.gradle.kts',
  );
  let deps: string[] = [];
  let requiresDatabase = false;

  if (buildFile) {
    try {
      const content = await readFileContent(buildFile.absolutePath);
      const depMatches = content.matchAll(/['"]([^'"]+:[^'"]+:[^'"]+)['"]/g);
      for (const m of depMatches) {
        const artifact = m[1].split(':')[1];
        if (artifact) deps.push(artifact);
      }
      deps = deps.slice(0, 10);
      requiresDatabase = /jdbc|hibernate|jpa|r2dbc|exposed/.test(content);
    } catch {
      // ignore read errors
    }
  }

  const hasGradlew = repo.files.some((f) => f.path === 'gradlew');
  const prefix = hasGradlew ? './gradlew' : 'gradle';

  return {
    packageManager: null,
    installCommand: `${prefix} build`,
    runCommand: `${prefix} run`,
    buildCommand: `${prefix} build`,
    testCommand: `${prefix} test`,
    mainDependencies: deps,
    devDependencies: [],
    requiresDatabase,
    requiresEnvFile: false,
  };
}

async function analyzeMavenProject(repo: RepoContent): Promise<DependencyAnalysis> {
  const pomFile = repo.files.find((f) => f.path === 'pom.xml');
  let deps: string[] = [];
  let requiresDatabase = false;

  if (pomFile) {
    try {
      const content = await readFileContent(pomFile.absolutePath);
      const artifactMatches = content.matchAll(/<artifactId>([^<]+)<\/artifactId>/g);
      for (const m of artifactMatches) {
        deps.push(m[1]);
      }
      deps = deps.slice(0, 10);
      requiresDatabase = /jdbc|hibernate|jpa|mybatis/.test(content);
    } catch {
      // ignore read errors
    }
  }

  const hasMvnw = repo.files.some((f) => f.path === 'mvnw');
  const prefix = hasMvnw ? './mvnw' : 'mvn';

  return {
    packageManager: null,
    installCommand: `${prefix} install`,
    runCommand: `${prefix} spring-boot:run`,
    buildCommand: `${prefix} package`,
    testCommand: `${prefix} test`,
    mainDependencies: deps,
    devDependencies: [],
    requiresDatabase,
    requiresEnvFile: false,
  };
}

async function analyzeRubyProject(repo: RepoContent): Promise<DependencyAnalysis> {
  const gemfile = repo.files.find((f) => f.path === 'Gemfile');
  let deps: string[] = [];
  let requiresDatabase = false;

  if (gemfile) {
    try {
      const content = await readFileContent(gemfile.absolutePath);
      const gemMatches = content.matchAll(/gem\s+['"]([^'"]+)['"]/g);
      for (const m of gemMatches) {
        deps.push(m[1]);
      }
      deps = deps.slice(0, 10);
      requiresDatabase = /pg|mysql2|sqlite3|mongoid|activerecord/.test(content);
    } catch {
      // ignore read errors
    }
  }

  const hasRails = deps.includes('rails');
  return {
    packageManager: null,
    installCommand: 'bundle install',
    runCommand: hasRails ? 'rails server' : 'ruby main.rb',
    buildCommand: undefined,
    testCommand: deps.includes('rspec') ? 'bundle exec rspec' : 'bundle exec rake test',
    mainDependencies: deps,
    devDependencies: [],
    requiresDatabase,
    requiresEnvFile: deps.includes('dotenv'),
  };
}

function analyzeSwiftProject(): DependencyAnalysis {
  return {
    packageManager: null,
    installCommand: 'swift package resolve',
    runCommand: 'swift run',
    buildCommand: 'swift build',
    testCommand: 'swift test',
    mainDependencies: [],
    devDependencies: [],
    requiresDatabase: false,
    requiresEnvFile: false,
  };
}

async function analyzeDartProject(repo: RepoContent): Promise<DependencyAnalysis> {
  const pubspec = repo.files.find((f) => f.path === 'pubspec.yaml');
  let deps: string[] = [];
  let isFlutter = false;

  if (pubspec) {
    try {
      const content = await readFileContent(pubspec.absolutePath);
      isFlutter = content.includes('flutter:') || content.includes('flutter_test:');
      const depMatches = content.matchAll(/^\s{2}(\w[\w_-]*):/gm);
      for (const m of depMatches) {
        if (m[1] !== 'sdk' && m[1] !== 'flutter') deps.push(m[1]);
      }
      deps = deps.slice(0, 10);
    } catch {
      // ignore read errors
    }
  }

  const prefix = isFlutter ? 'flutter' : 'dart';
  return {
    packageManager: null,
    installCommand: `${prefix} pub get`,
    runCommand: isFlutter ? 'flutter run' : 'dart run',
    buildCommand: isFlutter ? 'flutter build' : 'dart compile exe bin/main.dart',
    testCommand: `${prefix} test`,
    mainDependencies: deps,
    devDependencies: [],
    requiresDatabase: false,
    requiresEnvFile: false,
  };
}

async function analyzePyprojectProject(
  repo: RepoContent,
  pyprojectPath: string,
): Promise<DependencyAnalysis> {
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
