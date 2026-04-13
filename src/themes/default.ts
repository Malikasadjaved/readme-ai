import type { ThemeData } from './index.js';

export function renderDefault(data: ThemeData): string {
  const sections: string[] = [];

  // Header
  sections.push(`<div align="center">

# ${data.projectName}

> ${data.tagline}

${data.badgeRow}

</div>`);

  // Overview
  sections.push(`## 📖 Overview

${data.description}`);

  // Features
  if (data.keyFeatures.length > 0) {
    sections.push(`## ✨ Features

${data.keyFeatures.map((f) => `- ${f}`).join('\n')}`);
  }

  // Architecture diagram
  if (data.diagram) {
    sections.push(`## 🏗️ Architecture

\`\`\`mermaid
${data.diagram.mermaidCode}
\`\`\`

${data.diagram.description}`);
  }

  // Project structure
  if (data.directoryTree) {
    sections.push(`## 📁 Project Structure

\`\`\`
${data.directoryTree}
\`\`\``);
  }

  // Getting Started
  const installLines: string[] = [];
  installLines.push('## 🚀 Getting Started');
  installLines.push('');

  if (data.installSection.prerequisites.length > 0) {
    installLines.push('### Prerequisites');
    installLines.push('');
    installLines.push(data.installSection.prerequisites.map((p) => `- ${p}`).join('\n'));
    installLines.push('');
  }

  installLines.push('### Installation');
  installLines.push('');
  data.installSection.installSteps.forEach((step, i) => {
    installLines.push(`${i + 1}. **${step.title}**`);
    installLines.push(`   \`\`\`bash`);
    installLines.push(`   ${step.command}`);
    installLines.push(`   \`\`\``);
    installLines.push('');
  });

  if (data.installSection.envSetupSteps) {
    installLines.push('### Environment Setup');
    installLines.push('');
    data.installSection.envSetupSteps.forEach((step, i) => {
      installLines.push(`${i + 1}. **${step.title}**`);
      installLines.push(`   \`\`\`bash`);
      installLines.push(`   ${step.command}`);
      installLines.push(`   \`\`\``);
      installLines.push('');
    });
  }

  sections.push(installLines.join('\n'));

  // Usage
  if (data.usageSection.examples.length > 0) {
    const usageLines: string[] = ['## 💡 Usage', ''];
    for (const example of data.usageSection.examples) {
      usageLines.push(`### ${example.title}`);
      usageLines.push('');
      usageLines.push(example.description);
      usageLines.push('');
      usageLines.push(`\`\`\`${example.language}`);
      usageLines.push(example.code);
      usageLines.push('```');
      usageLines.push('');
    }
    sections.push(usageLines.join('\n'));
  }

  // API Docs
  if (data.apiDocs && data.apiDocs.entries.length > 0) {
    const apiLines: string[] = ['## 📚 API Reference', ''];
    for (const entry of data.apiDocs.entries) {
      apiLines.push(`### \`${entry.name}\``);
      apiLines.push('');
      apiLines.push(`\`\`\`\n${entry.signature}\n\`\`\``);
      if (entry.description) {
        apiLines.push('');
        apiLines.push(entry.description);
      }
      apiLines.push('');
      apiLines.push(`*Defined in \`${entry.file}\`*`);
      apiLines.push('');
    }
    sections.push(apiLines.join('\n'));
  }

  // Contributing
  sections.push(`## 🤝 Contributing

${data.contributingSection}`);

  // License
  sections.push(`## 📄 License

${data.license}`);

  return sections.join('\n\n---\n\n').trim() + '\n';
}
