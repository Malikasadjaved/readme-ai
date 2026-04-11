import type { ThemeData } from './index.js';

function asciiBox(title: string, subtitle: string): string {
  const width = Math.max(title.length, subtitle.length) + 4;
  const top = '╔' + '═'.repeat(width) + '╗';
  const bottom = '╚' + '═'.repeat(width) + '╝';
  const padTitle = title.padEnd(width - 2);
  const padSub = subtitle.padEnd(width - 2);
  return `\`\`\`
${top}
║  ${padTitle}  ║
║  ${padSub}  ║
${bottom}
\`\`\``;
}

export function renderHacker(data: ThemeData): string {
  const sections: string[] = [];

  // ASCII Header
  sections.push(asciiBox(data.projectName, data.tagline));

  // Badges in a code-like format
  if (data.badgeRow) {
    sections.push(data.badgeRow);
  }

  // Overview
  sections.push(`## // Overview

> ${data.description.split('\n').join('\n> ')}`);

  // Features
  if (data.keyFeatures.length > 0) {
    const cleanFeatures = data.keyFeatures.map(f =>
      f.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+/u, '')
    );
    sections.push(`## // Features

${cleanFeatures.map(f => `- [x] ${f}`).join('\n')}`);
  }

  // Architecture
  if (data.diagram) {
    sections.push(`## // Architecture

\`\`\`mermaid
${data.diagram.mermaidCode}
\`\`\`

> ${data.diagram.description}`);
  }

  // File tree
  if (data.directoryTree) {
    sections.push(`## // Project Structure

\`\`\`
${data.directoryTree}
\`\`\``);
  }

  // Setup
  const installLines: string[] = ['## // Setup', ''];

  if (data.installSection.prerequisites.length > 0) {
    installLines.push('**Requirements:**');
    installLines.push(data.installSection.prerequisites.map(p => `- \`${p}\``).join('\n'));
    installLines.push('');
  }

  installLines.push('**Install:**');
  installLines.push('');
  installLines.push('```bash');
  data.installSection.installSteps.forEach(step => {
    installLines.push(`# ${step.title}`);
    installLines.push(step.command);
  });
  installLines.push('```');

  sections.push(installLines.join('\n'));

  // Usage
  if (data.usageSection.examples.length > 0) {
    const usageLines: string[] = ['## // Usage', ''];
    for (const example of data.usageSection.examples) {
      usageLines.push(`\`\`\`${example.language}`);
      usageLines.push(`# ${example.title}`);
      usageLines.push(example.code);
      usageLines.push('```');
      usageLines.push('');
    }
    sections.push(usageLines.join('\n'));
  }

  // API
  if (data.apiDocs && data.apiDocs.entries.length > 0) {
    const apiLines: string[] = ['## // API Reference', ''];
    for (const entry of data.apiDocs.entries) {
      apiLines.push(`\`${entry.signature}\``);
      if (entry.description) apiLines.push(`> ${entry.description}`);
      apiLines.push('');
    }
    sections.push(apiLines.join('\n'));
  }

  // Contributing
  sections.push(`## // Contributing

${data.contributingSection}`);

  // License
  sections.push(`## // License

${data.license}`);

  return sections.join('\n\n---\n\n').trim() + '\n';
}
