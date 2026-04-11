import { getFileExtension } from './file-utils.js';

export interface LanguageStat {
  name: string;
  files: number;
  percentage: number;
  icon: string;
}

const EXTENSION_MAP: Record<string, { name: string; icon: string }> = {
  ts: { name: 'TypeScript', icon: '🦕' },
  tsx: { name: 'TypeScript', icon: '🦕' },
  js: { name: 'JavaScript', icon: '🟨' },
  jsx: { name: 'JavaScript', icon: '🟨' },
  mjs: { name: 'JavaScript', icon: '🟨' },
  cjs: { name: 'JavaScript', icon: '🟨' },
  py: { name: 'Python', icon: '🐍' },
  rs: { name: 'Rust', icon: '🦀' },
  go: { name: 'Go', icon: '🐹' },
  java: { name: 'Java', icon: '☕' },
  kt: { name: 'Kotlin', icon: '🟣' },
  swift: { name: 'Swift', icon: '🍎' },
  rb: { name: 'Ruby', icon: '💎' },
  php: { name: 'PHP', icon: '🐘' },
  cs: { name: 'C#', icon: '🟪' },
  cpp: { name: 'C++', icon: '⚙️' },
  c: { name: 'C', icon: '⚙️' },
  h: { name: 'C/C++', icon: '⚙️' },
  hpp: { name: 'C++', icon: '⚙️' },
  scala: { name: 'Scala', icon: '🔴' },
  dart: { name: 'Dart', icon: '🎯' },
  lua: { name: 'Lua', icon: '🌙' },
  r: { name: 'R', icon: '📊' },
  ex: { name: 'Elixir', icon: '💜' },
  exs: { name: 'Elixir', icon: '💜' },
  erl: { name: 'Erlang', icon: '📞' },
  zig: { name: 'Zig', icon: '⚡' },
  vue: { name: 'Vue', icon: '💚' },
  svelte: { name: 'Svelte', icon: '🔥' },
  html: { name: 'HTML', icon: '🌐' },
  css: { name: 'CSS', icon: '🎨' },
  scss: { name: 'SCSS', icon: '🎨' },
  less: { name: 'LESS', icon: '🎨' },
  sql: { name: 'SQL', icon: '🗄️' },
  sh: { name: 'Shell', icon: '🐚' },
  bash: { name: 'Shell', icon: '🐚' },
  zsh: { name: 'Shell', icon: '🐚' },
  yml: { name: 'YAML', icon: '📋' },
  yaml: { name: 'YAML', icon: '📋' },
  json: { name: 'JSON', icon: '📦' },
  toml: { name: 'TOML', icon: '📦' },
  md: { name: 'Markdown', icon: '📝' },
  mdx: { name: 'MDX', icon: '📝' },
};

const CONFIG_EXTENSIONS = new Set([
  'json', 'yaml', 'yml', 'toml', 'xml', 'ini', 'cfg', 'conf',
  'env', 'properties', 'md', 'mdx', 'txt', 'lock',
]);

const TEST_PATTERNS = [
  /\.test\.[^.]+$/,
  /\.spec\.[^.]+$/,
  /_test\.[^.]+$/,
  /test_[^/]+\.[^.]+$/,
  /tests?\//,
  /__tests__\//,
];

const ENTRY_POINT_NAMES = new Set([
  'index.ts', 'index.js', 'index.tsx', 'index.jsx',
  'main.ts', 'main.js', 'main.py', 'main.go', 'main.rs',
  'app.ts', 'app.js', 'app.py',
  'server.ts', 'server.js', 'server.py',
  'mod.rs', 'lib.rs',
  'cli.ts', 'cli.js', 'cli.py',
]);

export function detectLanguage(filePath: string): string {
  const ext = getFileExtension(filePath);
  return EXTENSION_MAP[ext]?.name || ext || 'unknown';
}

export function getLanguageIcon(filePath: string): string {
  const ext = getFileExtension(filePath);
  return EXTENSION_MAP[ext]?.icon || '📄';
}

export function isConfigFile(filePath: string): boolean {
  const ext = getFileExtension(filePath);
  const name = filePath.split('/').pop() || '';
  return CONFIG_EXTENSIONS.has(ext) ||
    name.startsWith('.') ||
    name === 'Dockerfile' ||
    name === 'Makefile' ||
    name === 'Procfile';
}

export function isTestFile(filePath: string): boolean {
  return TEST_PATTERNS.some(p => p.test(filePath));
}

export function isEntryPoint(filePath: string): boolean {
  const name = filePath.split('/').pop() || '';
  return ENTRY_POINT_NAMES.has(name);
}

export function calculateLanguageStats(files: string[]): LanguageStat[] {
  const codeFiles = files.filter(f => !isConfigFile(f) && !isTestFile(f));
  const counts: Record<string, { count: number; icon: string }> = {};

  for (const file of codeFiles) {
    const ext = getFileExtension(file);
    const info = EXTENSION_MAP[ext];
    if (!info) continue;
    if (!counts[info.name]) {
      counts[info.name] = { count: 0, icon: info.icon };
    }
    counts[info.name].count++;
  }

  const total = Object.values(counts).reduce((sum, c) => sum + c.count, 0);
  if (total === 0) return [];

  return Object.entries(counts)
    .map(([name, { count, icon }]) => ({
      name,
      files: count,
      percentage: Math.round((count / total) * 100),
      icon,
    }))
    .sort((a, b) => b.files - a.files);
}

export const FRAMEWORK_INDICATORS: Record<string, { deps?: string[]; files?: string[]; imports?: string[] }> = {
  'React': { deps: ['react', 'react-dom'], imports: ['react'] },
  'Next.js': { deps: ['next'], files: ['next.config.js', 'next.config.ts', 'next.config.mjs'] },
  'Vue': { deps: ['vue'], imports: ['vue'] },
  'Nuxt': { deps: ['nuxt'], files: ['nuxt.config.ts', 'nuxt.config.js'] },
  'Svelte': { deps: ['svelte'], files: ['svelte.config.js'] },
  'Angular': { deps: ['@angular/core'], files: ['angular.json'] },
  'Express': { deps: ['express'], imports: ['express'] },
  'Fastify': { deps: ['fastify'], imports: ['fastify'] },
  'Koa': { deps: ['koa'], imports: ['koa'] },
  'NestJS': { deps: ['@nestjs/core'] },
  'FastAPI': { imports: ['fastapi'] },
  'Django': { imports: ['django'], files: ['manage.py'] },
  'Flask': { imports: ['flask'] },
  'Spring Boot': { files: ['pom.xml', 'build.gradle'] },
  'Prisma': { deps: ['prisma', '@prisma/client'], files: ['prisma/schema.prisma'] },
  'Drizzle': { deps: ['drizzle-orm'] },
  'TypeORM': { deps: ['typeorm'] },
  'Tailwind CSS': { deps: ['tailwindcss'], files: ['tailwind.config.js', 'tailwind.config.ts'] },
  'Vite': { deps: ['vite'], files: ['vite.config.ts', 'vite.config.js'] },
  'Webpack': { deps: ['webpack'], files: ['webpack.config.js'] },
  'Docker': { files: ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml'] },
};
