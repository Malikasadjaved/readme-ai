#!/usr/bin/env node
import { Command } from 'commander';
import { runGenerate } from './commands/generate.js';
import { runCLI } from './cli.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const program = new Command();

program
  .name('readme-ai')
  .description('Generate production-quality READMEs from any codebase')
  .version(pkg.version)
  .argument('[repo]', 'Local path or GitHub URL (github:user/repo or https://github.com/...)')
  .option('-o, --output <file>', 'Output file path', 'README.md')
  .option('-p, --provider <name>', 'AI provider: anthropic | openai | gemini | ollama', 'anthropic')
  .option('-m, --model <name>', 'Model name (depends on provider)')
  .option(
    '-t, --theme <name>',
    'README theme: default | minimal | hacker | modern | academic',
    'default',
  )
  .option('--no-diagram', 'Skip Mermaid architecture diagram')
  .option('--no-badges', 'Skip badge generation')
  .option('--no-api-docs', 'Skip API documentation section')
  .option('--interactive', 'Run in interactive mode (asks questions about your project)')
  .option('--action', 'Also generate a GitHub Action for auto-updating README')
  .option('--overwrite', 'Overwrite existing README without asking')
  .option('--dry-run', 'Print README to stdout instead of writing to file')
  .action(async (repo, opts) => {
    if (!repo && opts.interactive) {
      await runCLI();
    } else {
      await runGenerate({
        repo: repo || '.',
        output: opts.output,
        provider: opts.provider,
        model: opts.model,
        theme: opts.theme,
        diagram: opts.diagram,
        badges: opts.badges,
        apiDocs: opts.apiDocs,
        interactive: opts.interactive,
        action: opts.action,
        overwrite: opts.overwrite,
        dryRun: opts.dryRun,
      });
    }
  });

program.parse();
