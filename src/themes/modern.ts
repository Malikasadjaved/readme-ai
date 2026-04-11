import type { ThemeData } from './index.js';

export function renderModern(data: ThemeData): string {
  const sections: string[] = [];

  // Header with lots of emojis and badges
  sections.push(`<div align="center">

# 🚀 ${data.projectName}

### ${data.tagline}

${data.badgeRow}

---

</div>`);

  // Overview with emoji sections
  sections.push(`## 🌟 About

${data.description}`);

  // Features as a grid-like layout
  if (data.keyFeatures.length > 0) {
    sections.push(`## ⚡ Features

${data.keyFeatures.map(f => `> ${f}`).join('\n>\n')}`);
  }

  // Architecture
  if (data.diagram) {
    sections.push(`## 🏛️ Architecture

<details>
<summary>Click to expand architecture diagram</summary>

\`\`\`mermaid
${data.diagram.mermaidCode}
\`\`\`

</details>

${data.diagram.description}`);
  }

  // Project structure in collapsible
  if (data.directoryTree) {
    sections.push(`## 📂 Project Structure

<details>
<summary>Click to expand</summary>

\`\`\`
${data.directoryTree}
\`\`\`

</details>`);
  }

  // Getting Started
  const installLines: string[] = ['## 🏁 Quick Start', ''];

  if (data.installSection.prerequisites.length > 0) {
    installLines.push('> **Prerequisites**');
    installLines.push('>');
    installLines.push(data.installSection.prerequisites.map(p => `> - ${p}`).join('\n'));
    installLines.push('');
  }

  data.installSection.installSteps.forEach((step, i) => {
    installLines.push(`**Step ${i + 1}: ${step.title}**`);
    installLines.push('');
    installLines.push('```bash');
    installLines.push(step.command);
    installLines.push('```');
    installLines.push('');
  });

  sections.push(installLines.join('\n'));

  // Usage
  if (data.usageSection.examples.length > 0) {
    const usageLines: string[] = ['## 🎯 Usage', ''];
    for (const example of data.usageSection.examples) {
      usageLines.push(`### ${example.title}`);
      usageLines.push('');
      usageLines.push(`> ${example.description}`);
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
    apiLines.push('| Function | Description | File |');
    apiLines.push('|----------|-------------|------|');
    for (const entry of data.apiDocs.entries) {
      const desc = entry.description || '-';
      apiLines.push(`| \`${entry.name}\` | ${desc} | \`${entry.file}\` |`);
    }
    sections.push(apiLines.join('\n'));
  }

  // Contributing
  sections.push(`## 💪 Contributing

${data.contributingSection}`);

  // License
  sections.push(`## 📝 License

${data.license}`);

  // Footer
  sections.push(`<div align="center">

---

Made with ❤️ and AI

</div>`);

  return sections.join('\n\n').trim() + '\n';
}
