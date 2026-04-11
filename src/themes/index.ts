import type { DiagramResult } from '../analyzers/diagram-builder.js';
import type { InstallResult } from '../generators/install.js';
import type { UsageResult } from '../generators/usage.js';
import type { APIDocsResult } from '../generators/usage.js';
import { renderDefault } from './default.js';
import { renderMinimal } from './minimal.js';
import { renderHacker } from './hacker.js';
import { renderModern } from './modern.js';
import { renderAcademic } from './academic.js';

export interface ThemeData {
  projectName: string;
  tagline: string;
  badgeRow: string;
  description: string;
  diagram: DiagramResult | null;
  keyFeatures: string[];
  useCases: string[];
  installSection: InstallResult;
  usageSection: UsageResult;
  apiDocs: APIDocsResult | null;
  contributingSection: string;
  license: string;
  directoryTree: string;
}

export interface Theme {
  name: string;
  render: (data: ThemeData) => string;
}

const themes: Record<string, Theme> = {
  default: { name: 'default', render: renderDefault },
  minimal: { name: 'minimal', render: renderMinimal },
  hacker: { name: 'hacker', render: renderHacker },
  modern: { name: 'modern', render: renderModern },
  academic: { name: 'academic', render: renderAcademic },
};

export function getTheme(name: string): Theme {
  const theme = themes[name];
  if (!theme) {
    throw new Error(
      `Unknown theme: ${name}\nAvailable themes: ${Object.keys(themes).join(', ')}`
    );
  }
  return theme;
}

export function listThemes(): string[] {
  return Object.keys(themes);
}
