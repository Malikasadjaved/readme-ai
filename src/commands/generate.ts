import path from 'node:path';
import fs from 'node:fs/promises';
import chalk from 'chalk';
import ora from 'ora';
import { confirm } from '@inquirer/prompts';
import { fetchRepo } from '../analyzers/repo-fetcher.js';
import { scanFiles } from '../analyzers/file-scanner.js';
import { analyzeDependencies } from '../analyzers/dependency-analyzer.js';
import { analyzeCode } from '../analyzers/code-analyzer.js';
import { generateBadges, formatBadgeRow } from '../analyzers/badge-generator.js';
import { buildDiagram, type DiagramResult } from '../analyzers/diagram-builder.js';
import { createCachedProvider } from '../providers/index.js';
import { generateOverview } from '../generators/overview.js';
import { generateInstallSection } from '../generators/install.js';
import { generateUsageSection, generateAPIDocs, type APIDocsResult } from '../generators/usage.js';
import { generateContributing, getLicense } from '../generators/contributing.js';
import { getTheme } from '../themes/index.js';
import { fileExists } from '../utils/file-utils.js';
import { loadProjectConfig } from '../config.js';
import { loadPlugins, runAnalyzerPlugins, type AnalyzerResult } from '../plugins/index.js';

export interface GenerateOptions {
  repo: string;
  output?: string;
  provider?: string;
  model?: string;
  theme?: string;
  diagram?: boolean;
  badges?: boolean;
  apiDocs?: boolean;
  interactive?: boolean;
  action?: boolean;
  overwrite?: boolean;
  dryRun?: boolean;
  context?: string;
}

export async function runGenerate(opts: GenerateOptions) {
  const spinner = ora();
  const startTime = Date.now();

  try {
    // ─── PHASE 0: LOAD PROJECT CONFIG ────────────────────────────────
    const projectConfig = await loadProjectConfig(path.resolve(opts.repo || '.'));
    // CLI flags override project config; project config overrides defaults
    if (projectConfig.provider && !opts.provider) opts.provider = projectConfig.provider;
    if (projectConfig.model && !opts.model) opts.model = projectConfig.model;
    if (projectConfig.theme && !opts.theme) opts.theme = projectConfig.theme;
    if (projectConfig.output && !opts.output) opts.output = projectConfig.output;
    if (projectConfig.context && !opts.context) opts.context = projectConfig.context;
    if (projectConfig.diagram === false && opts.diagram === undefined) opts.diagram = false;
    if (projectConfig.badges === false && opts.badges === undefined) opts.badges = false;
    if (projectConfig.apiDocs === false && opts.apiDocs === undefined) opts.apiDocs = false;
    if (projectConfig.action === true && !opts.action) opts.action = true;

    // ─── PHASE 0b: LOAD PLUGINS ────────────────────────────────────────
    await loadPlugins(path.resolve(opts.repo || '.'));

    // ─── PHASE 1: FETCH ──────────────────────────────────────────────
    spinner.start('Fetching repository...');
    const repoContent = await fetchRepo(opts.repo);
    spinner.succeed(`Repository loaded: ${repoContent.files.length} files`);

    // ─── PHASE 2: ANALYZE ────────────────────────────────────────────
    spinner.start('Scanning file structure...');
    const scan = await scanFiles(repoContent);
    const langInfo = scan.languages[0]?.name || 'Unknown';
    const fwInfo = scan.frameworks.length > 0 ? ` with ${scan.frameworks.join(', ')}` : '';
    spinner.succeed(`Detected: ${langInfo} project${fwInfo}`);

    spinner.start('Analyzing code...');
    const codeAnalysis = await analyzeCode(scan.keyFiles);
    spinner.succeed(
      `Found ${codeAnalysis.apiEndpoints.length} endpoints, ` +
        `${codeAnalysis.mainFunctions.length} key functions`,
    );

    spinner.start('Analyzing dependencies...');
    const deps = await analyzeDependencies(repoContent);
    spinner.succeed(`Package manager: ${deps.packageManager || 'None detected'}`);

    // Run analyzer plugins
    let pluginResults: AnalyzerResult[] = [];
    const pluginAnalyzers = (await import('../plugins/index.js')).getAnalyzerPlugins();
    if (pluginAnalyzers.length > 0) {
      spinner.start('Running analyzer plugins...');
      pluginResults = await runAnalyzerPlugins({ scan, codeAnalysis, deps });
      spinner.succeed(`${pluginAnalyzers.length} analyzer plugin(s) executed`);
    }

    // ─── PHASE 3: GENERATE WITH AI ───────────────────────────────────
    const provider = await createCachedProvider(opts.provider || 'anthropic', opts.model);

    spinner.start('Generating project overview with AI...');
    const existingDescription = repoContent.packageJson
      ? ((repoContent.packageJson as Record<string, unknown>).description as string | undefined)
      : repoContent.githubMeta?.description || undefined;
    const overview = await generateOverview({
      scan,
      deps,
      codeAnalysis,
      provider,
      existingDescription,
      userContext: opts.context,
    });
    spinner.succeed('Overview generated');

    let diagram: DiagramResult | null = null;
    if (opts.diagram !== false) {
      spinner.start('Building architecture diagram...');
      diagram = await buildDiagram(scan, codeAnalysis, deps, provider);
      spinner.succeed('Architecture diagram created');
    }

    spinner.start('Generating installation instructions...');
    const installSection = generateInstallSection(deps, scan);
    spinner.succeed('Installation section ready');

    spinner.start('Generating usage examples...');
    const usageSection = await generateUsageSection({ codeAnalysis, scan, deps, provider });
    spinner.succeed(`${usageSection.examples.length} usage examples generated`);

    let apiDocs: APIDocsResult | null = null;
    if (opts.apiDocs !== false && codeAnalysis.exports.length > 0) {
      spinner.start('Generating API documentation...');
      apiDocs = await generateAPIDocs({ codeAnalysis, provider });
      spinner.succeed(`API docs generated for ${apiDocs.entries.length} exports`);
    }

    // ─── PHASE 4: RENDER ─────────────────────────────────────────────
    let badgeRow = '';
    if (opts.badges !== false) {
      spinner.start('Generating badges...');
      const badges = generateBadges(scan, deps, repoContent.githubMeta);

      // Append badges from analyzer plugins
      for (const result of pluginResults) {
        if (result.badges) {
          for (const b of result.badges) {
            const badgeUrl = `https://img.shields.io/badge/${encodeURIComponent(b.label)}-${encodeURIComponent(b.message)}-${b.color}`;
            const markdown = b.url
              ? `[![${b.label}](${badgeUrl})](${b.url})`
              : `![${b.label}](${badgeUrl})`;
            badges.push({ label: b.label, url: badgeUrl, markdown, category: 'meta' });
          }
        }
      }

      badgeRow = formatBadgeRow(badges);
      spinner.succeed(`${badges.length} badges generated`);
    }

    const themeName = opts.theme || 'default';
    spinner.start(`Rendering ${themeName} theme...`);
    const theme = getTheme(themeName);

    const projectName = getProjectName(repoContent);
    const readme = theme.render({
      projectName,
      tagline: overview.tagline,
      badgeRow,
      description: overview.description,
      diagram,
      keyFeatures: overview.keyFeatures,
      useCases: overview.useCases,
      installSection,
      usageSection,
      apiDocs,
      contributingSection: generateContributing(scan, deps),
      license: getLicense(scan),
      directoryTree: scan.directoryTree,
    });
    // Append plugin sections
    const pluginSections = pluginResults
      .filter((r) => r.sections)
      .flatMap((r) => Object.entries(r.sections!))
      .map(([heading, content]) => `## ${heading}\n\n${content}`)
      .join('\n\n');
    const readmeWithPlugins = pluginSections ? `${readme}\n\n${pluginSections}` : readme;

    spinner.succeed('README rendered');

    // ─── PHASE 5: OUTPUT ─────────────────────────────────────────────
    if (opts.dryRun) {
      console.log('\n' + readmeWithPlugins);
      return;
    }

    const outputFile = opts.output || 'README.md';
    const outputPath = path.resolve(repoContent.isRemote ? '.' : repoContent.path, outputFile);

    if ((await fileExists(outputPath)) && !opts.overwrite) {
      const shouldOverwrite = await confirm({
        message: `${outputFile} already exists. Overwrite?`,
      });
      if (!shouldOverwrite) {
        console.log(chalk.yellow('Aborted.'));
        return;
      }
    }

    await fs.writeFile(outputPath, readmeWithPlugins, 'utf-8');

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const sizeKB = (Buffer.byteLength(readmeWithPlugins) / 1024).toFixed(1);

    console.log(`
${chalk.green('✓')} README generated successfully!

  ${chalk.bold('Output:')}  ${outputPath}
  ${chalk.bold('Theme:')}   ${themeName}
  ${chalk.bold('Size:')}    ${sizeKB} KB
  ${chalk.bold('Time:')}    ${elapsed}s

  ${chalk.dim('Preview: https://markdownlivepreview.com')}
`);

    // Optionally generate GitHub Action
    if (opts.action) {
      await generateGitHubAction(repoContent.isRemote ? '.' : repoContent.path);
      console.log(`${chalk.green('✓')} GitHub Action created: .github/workflows/readme-update.yml`);
    }
  } catch (error) {
    spinner.fail((error as Error).message);
    process.exit(1);
  }
}

function getProjectName(repo: {
  path: string;
  githubMeta?: { repo: string };
  packageJson?: Record<string, unknown>;
}): string {
  if (repo.githubMeta) return repo.githubMeta.repo;
  if (repo.packageJson?.name) return repo.packageJson.name as string;
  return path.basename(path.resolve(repo.path));
}

async function generateGitHubAction(repoPath: string): Promise<void> {
  const actionContent = `# .github/workflows/readme-update.yml
# Generated by readme-ai — https://github.com/malikasadjaved/readme-ai
# This action auto-regenerates your README on every push to main

name: Update README

on:
  push:
    branches: [main, master]
    paths-ignore:
      - 'README.md'

jobs:
  update-readme:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Generate README
        run: npx @malikasadjaved/readme-ai@latest --overwrite
        env:
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}

      - name: Commit updated README
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: 'docs: auto-update README [skip ci]'
          file_pattern: README.md
`;

  const actionDir = path.join(repoPath, '.github', 'workflows');
  await fs.mkdir(actionDir, { recursive: true });
  await fs.writeFile(path.join(actionDir, 'readme-update.yml'), actionContent, 'utf-8');
}
