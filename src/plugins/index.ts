import path from 'node:path';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import type { Theme, ThemeData } from '../themes/index.js';
import type { CodeAnalysis } from '../analyzers/code-analyzer.js';
import type { ScanResult } from '../analyzers/file-scanner.js';
import type { DependencyAnalysis } from '../analyzers/dependency-analyzer.js';

// ─── Plugin types ────────────────────────────────────────────────────────────

export interface AnalyzerPlugin {
  name: string;
  /** Hook that runs after built-in analysis and can augment results. */
  analyze: (context: AnalyzerContext) => Promise<AnalyzerResult>;
}

export interface AnalyzerContext {
  scan: ScanResult;
  codeAnalysis: CodeAnalysis;
  deps: DependencyAnalysis;
}

export interface AnalyzerResult {
  /** Extra sections appended to the README (markdown strings keyed by heading). */
  sections?: Record<string, string>;
  /** Extra badges in shields.io format. */
  badges?: Array<{ label: string; message: string; color: string; url?: string }>;
}

export interface ThemePlugin {
  name: string;
  render: (data: ThemeData) => string;
}

export type Plugin = {
  name: string;
  analyzers?: AnalyzerPlugin[];
  themes?: ThemePlugin[];
};

// ─── Plugin registry ─────────────────────────────────────────────────────────

const analyzerPlugins: AnalyzerPlugin[] = [];
const themePlugins: Map<string, Theme> = new Map();

export function registerPlugin(plugin: Plugin): void {
  if (plugin.analyzers) {
    for (const analyzer of plugin.analyzers) {
      analyzerPlugins.push(analyzer);
    }
  }
  if (plugin.themes) {
    for (const theme of plugin.themes) {
      themePlugins.set(theme.name, { name: theme.name, render: theme.render });
    }
  }
}

export function getAnalyzerPlugins(): AnalyzerPlugin[] {
  return analyzerPlugins;
}

export function getThemePlugin(name: string): Theme | undefined {
  return themePlugins.get(name);
}

export function listPluginThemes(): string[] {
  return [...themePlugins.keys()];
}

// ─── Plugin loader ───────────────────────────────────────────────────────────

const PLUGIN_CONFIG_KEY = 'plugins';

/**
 * Loads plugins from:
 * 1. Project config `readme-ai.config.js` → `plugins: [...]`
 * 2. `readme-ai-plugin-*` packages found in node_modules
 */
export async function loadPlugins(repoPath: string): Promise<void> {
  // 1. Load from project config
  await loadFromProjectConfig(repoPath);

  // 2. Load from node_modules (auto-discover readme-ai-plugin-* packages)
  await loadFromNodeModules(repoPath);
}

async function loadFromProjectConfig(repoPath: string): Promise<void> {
  const configFiles = ['readme-ai.config.js', 'readme-ai.config.mjs'];

  for (const filename of configFiles) {
    const filePath = path.join(repoPath, filename);
    try {
      await fs.access(filePath);
    } catch {
      continue;
    }

    const fileUrl = pathToFileURL(path.resolve(filePath)).href;
    const mod = await import(fileUrl);
    const config = mod.default || mod;

    if (Array.isArray(config[PLUGIN_CONFIG_KEY])) {
      for (const pluginPath of config[PLUGIN_CONFIG_KEY]) {
        await loadSinglePlugin(repoPath, pluginPath);
      }
    }
    break;
  }
}

async function loadSinglePlugin(repoPath: string, pluginRef: string): Promise<void> {
  let resolved: string;

  if (pluginRef.startsWith('.') || pluginRef.startsWith('/')) {
    // Relative or absolute path
    resolved = pathToFileURL(path.resolve(repoPath, pluginRef)).href;
  } else {
    // npm package name — resolve from node_modules
    resolved = pathToFileURL(path.resolve(repoPath, 'node_modules', pluginRef, 'index.js')).href;
  }

  const mod = await import(resolved);
  const plugin: Plugin = mod.default || mod;

  if (plugin && plugin.name) {
    registerPlugin(plugin);
  }
}

async function loadFromNodeModules(repoPath: string): Promise<void> {
  const nodeModulesPath = path.join(repoPath, 'node_modules');

  try {
    await fs.access(nodeModulesPath);
  } catch {
    return;
  }

  const entries = await fs.readdir(nodeModulesPath);
  const pluginDirs = entries.filter((e) => e.startsWith('readme-ai-plugin-'));

  for (const dir of pluginDirs) {
    try {
      await loadSinglePlugin(repoPath, dir);
    } catch {
      // Skip broken plugins silently
    }
  }
}

/**
 * Run all registered analyzer plugins and collect their results.
 */
export async function runAnalyzerPlugins(context: AnalyzerContext): Promise<AnalyzerResult[]> {
  const results: AnalyzerResult[] = [];

  for (const plugin of analyzerPlugins) {
    try {
      const result = await plugin.analyze(context);
      results.push(result);
    } catch {
      // Skip failing plugins
    }
  }

  return results;
}
