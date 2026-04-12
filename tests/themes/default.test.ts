import { describe, it, expect } from 'vitest';
import { renderDefault } from '../../src/themes/default.js';
import type { ThemeData } from '../../src/themes/index.js';

function makeThemeData(overrides: Partial<ThemeData> = {}): ThemeData {
  return {
    projectName: 'test-project',
    tagline: 'A test project',
    badgeRow: '![badge](https://img.shields.io/badge/test-pass-green)',
    description: 'This is a test project description.',
    diagram: {
      mermaidCode: 'graph TD\n  A-->B',
      description: 'Architecture overview',
    },
    keyFeatures: ['Feature one', 'Feature two'],
    useCases: ['Use case A'],
    installSection: {
      prerequisites: ['Node.js >= 18'],
      installSteps: [
        { title: 'Clone the repository', command: 'git clone repo' },
        { title: 'Install dependencies', command: 'npm install' },
      ],
    },
    usageSection: {
      examples: [
        { title: 'Run it', description: 'Start the app:', language: 'bash', code: 'npm start' },
      ],
    },
    apiDocs: {
      entries: [
        { name: 'doStuff', signature: 'function doStuff()', description: 'Does stuff', file: 'src/index.ts' },
      ],
    },
    contributingSection: 'Contributions welcome!',
    license: 'MIT License',
    directoryTree: 'src/\n  index.ts',
    ...overrides,
  };
}

describe('renderDefault', () => {
  it('renders full theme with all sections', () => {
    const output = renderDefault(makeThemeData());

    expect(output).toContain('# test-project');
    expect(output).toContain('A test project');
    expect(output).toContain('![badge]');
    expect(output).toContain('## 📖 Overview');
    expect(output).toContain('## ✨ Features');
    expect(output).toContain('- Feature one');
    expect(output).toContain('## 🏗️ Architecture');
    expect(output).toContain('```mermaid');
    expect(output).toContain('graph TD');
    expect(output).toContain('## 📁 Project Structure');
    expect(output).toContain('## 🚀 Getting Started');
    expect(output).toContain('npm install');
    expect(output).toContain('## 💡 Usage');
    expect(output).toContain('npm start');
    expect(output).toContain('## 📚 API Reference');
    expect(output).toContain('`doStuff`');
    expect(output).toContain('## 🤝 Contributing');
    expect(output).toContain('## 📄 License');
  });

  it('omits architecture when diagram is null', () => {
    const output = renderDefault(makeThemeData({ diagram: null }));
    expect(output).not.toContain('Architecture');
    expect(output).not.toContain('mermaid');
  });

  it('omits API docs when null', () => {
    const output = renderDefault(makeThemeData({ apiDocs: null }));
    expect(output).not.toContain('API Reference');
  });

  it('omits features when empty', () => {
    const output = renderDefault(makeThemeData({ keyFeatures: [] }));
    expect(output).not.toContain('✨ Features');
  });

  it('includes env setup when present', () => {
    const output = renderDefault(makeThemeData({
      installSection: {
        prerequisites: [],
        installSteps: [{ title: 'Install', command: 'npm install' }],
        envSetupSteps: [{ title: 'Copy env', command: 'cp .env.example .env' }],
      },
    }));
    expect(output).toContain('Environment Setup');
    expect(output).toContain('.env');
  });
});
