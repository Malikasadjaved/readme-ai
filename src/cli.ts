import chalk from 'chalk';
import { input, select, checkbox } from '@inquirer/prompts';
import { runGenerate } from './commands/generate.js';

export async function runCLI() {
  console.log(chalk.cyan.bold("\n✨ readme-ai — Let's generate your README\n"));

  const repoPath = await input({
    message: 'Path to your project (or GitHub URL):',
    default: '.',
  });

  const provider = await select({
    message: 'Choose your AI provider:',
    choices: [
      { name: '🟣 Claude (Anthropic) — Recommended', value: 'anthropic' },
      { name: '🟢 GPT-4o-mini (OpenAI)', value: 'openai' },
      { name: '🔵 Gemini Flash (Google)', value: 'gemini' },
      { name: '⚪ Ollama (100% local, free)', value: 'ollama' },
    ],
  });

  const theme = await select({
    message: 'Choose README theme:',
    choices: [
      { name: '📄 Default — Clean & professional', value: 'default' },
      { name: '⚡ Modern — Emoji-rich with colorful badges', value: 'modern' },
      { name: '🖤 Hacker — Terminal/dark ASCII aesthetic', value: 'hacker' },
      { name: '🪶 Minimal — No emojis, pure markdown', value: 'minimal' },
      { name: '🎓 Academic — Formal, citation style', value: 'academic' },
    ],
  });

  const options = await checkbox({
    message: 'What to include:',
    choices: [
      { name: '🏗️  Architecture diagram (Mermaid)', value: 'diagram', checked: true },
      { name: '🏷️  Auto-generated badges', value: 'badges', checked: true },
      { name: '📚 API documentation', value: 'apiDocs', checked: true },
      { name: '🔄 GitHub Action for auto-updates', value: 'action', checked: false },
    ],
  });

  const context = await input({
    message: 'Any additional context for the AI? (optional):',
    default: '',
  });

  const optionsSet = new Set(options);

  await runGenerate({
    repo: repoPath,
    provider,
    theme,
    context: context || undefined,
    diagram: optionsSet.has('diagram'),
    badges: optionsSet.has('badges'),
    apiDocs: optionsSet.has('apiDocs'),
    action: optionsSet.has('action'),
  });
}
