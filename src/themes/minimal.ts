import type { ThemeData } from './index.js';

export function renderMinimal(data: ThemeData): string {
  const sections: string[] = [];

  // Header - no emojis, no badges
  sections.push(`# ${data.projectName}

${data.tagline}`);

  // Overview
  sections.push(`## Overview

${data.description}`);

  // Features
  if (data.keyFeatures.length > 0) {
    const cleanFeatures = data.keyFeatures.map(f =>
      f.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+/u, '')
    );
    sections.push(`## Features

${cleanFeatures.map(f => `- ${f}`).join('\n')}`);
  }

  // Architecture diagram
  if (data.diagram) {
    sections.push(`## Architecture

\`\`\`mermaid
${data.diagram.mermaidCode}
\`\`\``);
  }

  // Project structure
  if (data.directoryTree) {
    sections.push(`## Project Structure

\`\`\`
${data.directoryTree}
\`\`\``);
  }

  // Getting Started
  const installLines: string[] = ['## Getting Started', ''];

  if (data.installSection.prerequisites.length > 0) {
    installLines.push('### Prerequisites');
    installLines.push('');
    installLines.push(data.installSection.prerequisites.map(p => `- ${p}`).join('\n'));
    installLines.push('');
  }

  installLines.push('### Installation');
  installLines.push('');
  data.installSection.installSteps.forEach((step, i) => {
    installLines.push(`${i + 1}. ${step.title}`);
    installLines.push('');
    installLines.push('```bash');
    installLines.push(step.command);
    installLines.push('```');
    installLines.push('');
  });

  sections.push(installLines.join('\n'));

  // Usage
  if (data.usageSection.examples.length > 0) {
    const usageLines: string[] = ['## Usage', ''];
    for (const example of data.usageSection.examples) {
      usageLines.push(`\`\`\`${example.language}`);
      usageLines.push(example.code);
      usageLines.push('```');
      usageLines.push('');
    }
    sections.push(usageLines.join('\n'));
  }

  // API Docs
  if (data.apiDocs && data.apiDocs.entries.length > 0) {
    const apiLines: string[] = ['## API', ''];
    for (const entry of data.apiDocs.entries) {
      apiLines.push(`**\`${entry.signature}\`**`);
      if (entry.description) apiLines.push(entry.description);
      apiLines.push('');
    }
    sections.push(apiLines.join('\n'));
  }

  // Contributing
  sections.push(`## Contributing

${data.contributingSection}`);

  // License
  sections.push(`## License

${data.license}`);

  return sections.join('\n\n').trim() + '\n';
}
