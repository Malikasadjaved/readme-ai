import type { ThemeData } from './index.js';

export function renderAcademic(data: ThemeData): string {
  const sections: string[] = [];

  // Title page style
  sections.push(`# ${data.projectName}

**Abstract:** ${data.tagline}

${data.badgeRow}

---`);

  // Introduction
  sections.push(`## 1. Introduction

${data.description}`);

  // Features / Objectives
  if (data.keyFeatures.length > 0) {
    const cleanFeatures = data.keyFeatures.map((f) =>
      f.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+/u, ''),
    );
    sections.push(`## 2. Objectives

The primary objectives of this project are:

${cleanFeatures.map((f, i) => `${i + 1}. ${f}`).join('\n')}`);
  }

  // Architecture / Methods
  if (data.diagram) {
    sections.push(`## 3. System Architecture

${data.diagram.description}

\`\`\`mermaid
${data.diagram.mermaidCode}
\`\`\``);
  } else {
    sections.push(`## 3. System Architecture`);
  }

  // Project Structure
  if (data.directoryTree) {
    sections.push(`### 3.1 Project Organization

The project follows the following directory structure:

\`\`\`
${data.directoryTree}
\`\`\``);
  }

  // Implementation / Getting Started
  const installLines: string[] = ['## 4. Implementation', ''];
  installLines.push('### 4.1 Prerequisites');
  installLines.push('');
  if (data.installSection.prerequisites.length > 0) {
    installLines.push('The following software is required:');
    installLines.push('');
    installLines.push(data.installSection.prerequisites.map((p) => `- ${p}`).join('\n'));
  } else {
    installLines.push('No specific prerequisites are required.');
  }
  installLines.push('');

  installLines.push('### 4.2 Installation Procedure');
  installLines.push('');
  data.installSection.installSteps.forEach((step, i) => {
    installLines.push(`**Step ${i + 1}.** ${step.title}`);
    installLines.push('');
    installLines.push('```bash');
    installLines.push(step.command);
    installLines.push('```');
    installLines.push('');
  });

  sections.push(installLines.join('\n'));

  // Results / Usage
  if (data.usageSection.examples.length > 0) {
    const usageLines: string[] = ['## 5. Usage and Results', ''];
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

  // API Documentation
  if (data.apiDocs && data.apiDocs.entries.length > 0) {
    const apiLines: string[] = ['## 6. API Specification', ''];
    for (const entry of data.apiDocs.entries) {
      apiLines.push(`#### \`${entry.name}\``);
      apiLines.push('');
      apiLines.push(`**Signature:** \`${entry.signature}\``);
      if (entry.description) {
        apiLines.push('');
        apiLines.push(`**Description:** ${entry.description}`);
      }
      apiLines.push('');
      apiLines.push(`**Source:** \`${entry.file}\``);
      apiLines.push('');
    }
    sections.push(apiLines.join('\n'));
  }

  // Contributing / Acknowledgments
  sections.push(`## ${data.apiDocs ? '7' : '6'}. Contributing

${data.contributingSection}`);

  // License
  sections.push(`## ${data.apiDocs ? '8' : '7'}. License

${data.license}`);

  return sections.join('\n\n').trim() + '\n';
}
