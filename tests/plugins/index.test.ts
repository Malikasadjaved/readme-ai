import { describe, it, expect } from 'vitest';
import {
  registerPlugin,
  getAnalyzerPlugins,
  getThemePlugin,
  listPluginThemes,
  runAnalyzerPlugins,
  type Plugin,
  type AnalyzerContext,
} from '../../src/plugins/index.js';

// The plugin registry is module-level state, so plugins registered in one test
// persist into subsequent tests within the same module. Tests are written with
// that in mind (cumulative registration).

describe('registerPlugin', () => {
  it('registers an analyzer plugin', () => {
    const plugin: Plugin = {
      name: 'test-analyzer',
      analyzers: [
        {
          name: 'my-analyzer',
          analyze: async () => ({ sections: { Hello: 'World' } }),
        },
      ],
    };

    registerPlugin(plugin);

    const analyzers = getAnalyzerPlugins();
    expect(analyzers.some((a) => a.name === 'my-analyzer')).toBe(true);
  });

  it('registers a theme plugin', () => {
    const plugin: Plugin = {
      name: 'test-theme',
      themes: [
        {
          name: 'neon',
          render: (data) => `# ${data.projectName}`,
        },
      ],
    };

    registerPlugin(plugin);

    const theme = getThemePlugin('neon');
    expect(theme).toBeDefined();
    expect(theme!.name).toBe('neon');
  });

  it('registers plugin with both analyzers and themes', () => {
    const plugin: Plugin = {
      name: 'combo-plugin',
      analyzers: [
        {
          name: 'combo-analyzer',
          analyze: async () => ({}),
        },
      ],
      themes: [
        {
          name: 'combo-theme',
          render: () => '# Combo',
        },
      ],
    };

    registerPlugin(plugin);

    expect(getAnalyzerPlugins().some((a) => a.name === 'combo-analyzer')).toBe(true);
    expect(getThemePlugin('combo-theme')).toBeDefined();
  });
});

describe('getThemePlugin', () => {
  it('returns undefined for unregistered theme', () => {
    expect(getThemePlugin('nonexistent-theme')).toBeUndefined();
  });
});

describe('listPluginThemes', () => {
  it('returns registered plugin theme names', () => {
    const themes = listPluginThemes();
    expect(themes).toContain('neon');
    expect(themes).toContain('combo-theme');
  });
});

describe('runAnalyzerPlugins', () => {
  const mockContext: AnalyzerContext = {
    scan: {
      languages: [],
      frameworks: [],
      keyFiles: [],
      hasTests: false,
      hasLicense: false,
      hasCI: false,
      hasDocker: false,
      directoryTree: '',
      totalFiles: 0,
      ignorePatterns: [],
    },
    codeAnalysis: {
      exports: [],
      mainFunctions: [],
      apiEndpoints: [],
      cliCommands: [],
      envVariables: [],
      externalDependencies: [],
    },
    deps: {
      packageManager: null,
      installCommand: '',
      runCommand: '',
      mainDependencies: [],
      devDependencies: [],
      requiresDatabase: false,
      requiresEnvFile: false,
    },
  };

  it('runs all analyzer plugins and returns results', async () => {
    const results = await runAnalyzerPlugins(mockContext);
    // We have at least the analyzers registered in earlier tests
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('returns sections from analyzer plugins', async () => {
    const results = await runAnalyzerPlugins(mockContext);
    const withSections = results.filter((r) => r.sections);
    expect(withSections.length).toBeGreaterThanOrEqual(1);
    expect(withSections[0].sections).toHaveProperty('Hello');
  });

  it('skips failing analyzer plugins gracefully', async () => {
    registerPlugin({
      name: 'broken-plugin',
      analyzers: [
        {
          name: 'broken-analyzer',
          analyze: async () => {
            throw new Error('boom');
          },
        },
      ],
    });

    // Should not throw
    const results = await runAnalyzerPlugins(mockContext);
    expect(Array.isArray(results)).toBe(true);
  });
});
