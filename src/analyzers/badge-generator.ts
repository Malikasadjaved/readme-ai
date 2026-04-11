import type { ScanResult } from './file-scanner.js';
import type { DependencyAnalysis } from './dependency-analyzer.js';
import type { GitHubMeta } from '../utils/github-api.js';

export interface Badge {
  label: string;
  url: string;
  markdown: string;
  category: 'language' | 'framework' | 'tool' | 'status' | 'meta';
}

const STYLE = 'flat-square';

function shieldsBadge(label: string, message: string, color: string, logo?: string): string {
  const encodedLabel = encodeURIComponent(label);
  const encodedMessage = encodeURIComponent(message);
  let url = `https://img.shields.io/badge/${encodedLabel}-${encodedMessage}-${color}?style=${STYLE}`;
  if (logo) url += `&logo=${encodeURIComponent(logo)}`;
  return url;
}

const LANGUAGE_BADGES: Record<string, { color: string; logo: string }> = {
  'TypeScript': { color: '3178C6', logo: 'typescript' },
  'JavaScript': { color: 'F7DF1E', logo: 'javascript' },
  'Python': { color: '3776AB', logo: 'python' },
  'Rust': { color: '000000', logo: 'rust' },
  'Go': { color: '00ADD8', logo: 'go' },
  'Java': { color: 'ED8B00', logo: 'openjdk' },
  'C#': { color: '239120', logo: 'csharp' },
  'C++': { color: '00599C', logo: 'cplusplus' },
  'Ruby': { color: 'CC342D', logo: 'ruby' },
  'PHP': { color: '777BB4', logo: 'php' },
  'Swift': { color: 'FA7343', logo: 'swift' },
  'Kotlin': { color: '7F52FF', logo: 'kotlin' },
  'Dart': { color: '0175C2', logo: 'dart' },
  'Scala': { color: 'DC322F', logo: 'scala' },
};

const FRAMEWORK_BADGES: Record<string, { color: string; logo: string }> = {
  'React': { color: '61DAFB', logo: 'react' },
  'Next.js': { color: '000000', logo: 'nextdotjs' },
  'Vue': { color: '4FC08D', logo: 'vuedotjs' },
  'Nuxt': { color: '00DC82', logo: 'nuxtdotjs' },
  'Angular': { color: 'DD0031', logo: 'angular' },
  'Svelte': { color: 'FF3E00', logo: 'svelte' },
  'Express': { color: '000000', logo: 'express' },
  'Fastify': { color: '000000', logo: 'fastify' },
  'NestJS': { color: 'E0234E', logo: 'nestjs' },
  'FastAPI': { color: '009688', logo: 'fastapi' },
  'Django': { color: '092E20', logo: 'django' },
  'Flask': { color: '000000', logo: 'flask' },
  'Prisma': { color: '2D3748', logo: 'prisma' },
  'Docker': { color: '2496ED', logo: 'docker' },
  'Tailwind CSS': { color: '06B6D4', logo: 'tailwindcss' },
  'Vite': { color: '646CFF', logo: 'vite' },
};

export function generateBadges(
  scan: ScanResult,
  deps: DependencyAnalysis,
  githubMeta?: GitHubMeta
): Badge[] {
  const badges: Badge[] = [];

  // Primary language badge
  if (scan.languages.length > 0) {
    const lang = scan.languages[0];
    const info = LANGUAGE_BADGES[lang.name];
    if (info) {
      const url = shieldsBadge(lang.name, `${lang.percentage}%25`, info.color, info.logo);
      badges.push({
        label: lang.name,
        url,
        markdown: `[![${lang.name}](${url})](#)`,
        category: 'language',
      });
    }
  }

  // Framework badges
  for (const framework of scan.frameworks) {
    const info = FRAMEWORK_BADGES[framework];
    if (info) {
      const url = shieldsBadge(framework, '', info.color, info.logo);
      badges.push({
        label: framework,
        url,
        markdown: `[![${framework}](${url})](#)`,
        category: 'framework',
      });
    }
  }

  // Node version
  if (deps.nodeVersion) {
    const url = shieldsBadge('Node.js', deps.nodeVersion, '5FA04E', 'nodedotjs');
    badges.push({
      label: 'Node.js',
      url,
      markdown: `[![Node.js](${url})](#)`,
      category: 'tool',
    });
  }

  // License badge
  const license = scan.hasLicense;
  if (license) {
    const url = shieldsBadge('License', license, 'yellow');
    badges.push({
      label: 'License',
      url,
      markdown: `[![License](${url})](#)`,
      category: 'meta',
    });
  }

  // Docker badge
  if (scan.hasDocker) {
    const url = shieldsBadge('Docker', 'Ready', '2496ED', 'docker');
    badges.push({
      label: 'Docker',
      url,
      markdown: `[![Docker](${url})](#)`,
      category: 'tool',
    });
  }

  // CI/CD badge
  if (scan.hasCICD) {
    const url = shieldsBadge('CI/CD', 'Configured', 'brightgreen', 'githubactions');
    badges.push({
      label: 'CI/CD',
      url,
      markdown: `[![CI/CD](${url})](#)`,
      category: 'status',
    });
  }

  // Tests badge
  if (scan.hasTests) {
    const url = shieldsBadge('Tests', 'Included', 'brightgreen', 'vitest');
    badges.push({
      label: 'Tests',
      url,
      markdown: `[![Tests](${url})](#)`,
      category: 'status',
    });
  }

  // GitHub badges
  if (githubMeta) {
    const starsUrl = `https://img.shields.io/github/stars/${githubMeta.owner}/${githubMeta.repo}?style=${STYLE}`;
    badges.push({
      label: 'Stars',
      url: starsUrl,
      markdown: `[![Stars](${starsUrl})](https://github.com/${githubMeta.owner}/${githubMeta.repo})`,
      category: 'meta',
    });
  }

  return badges;
}

export function formatBadgeRow(badges: Badge[]): string {
  return badges.map(b => b.markdown).join(' ');
}
