import type { ScanResult } from './file-scanner.js';
import type { CodeAnalysis } from './code-analyzer.js';
import type { DependencyAnalysis } from './dependency-analyzer.js';
import type { AIProvider } from '../providers/index.js';

export interface DiagramResult {
  type: 'flowchart' | 'graph' | 'sequence';
  mermaidCode: string;
  description: string;
}

export async function buildDiagram(
  scan: ScanResult,
  codeAnalysis: CodeAnalysis,
  deps: DependencyAnalysis,
  provider: AIProvider
): Promise<DiagramResult> {
  // Try to build a diagram from code structure first
  const structureDiagram = buildFromStructure(scan, codeAnalysis, deps);
  if (structureDiagram) return structureDiagram;

  // Fall back to AI-generated diagram
  return buildWithAI(scan, codeAnalysis, deps, provider);
}

function buildFromStructure(
  scan: ScanResult,
  codeAnalysis: CodeAnalysis,
  deps: DependencyAnalysis
): DiagramResult | null {
  const hasAPI = codeAnalysis.apiEndpoints.length > 0;
  const hasCLI = codeAnalysis.cliCommands.length > 0;
  const hasDB = deps.requiresDatabase;
  const frameworks = scan.frameworks;

  // REST API architecture
  if (hasAPI) {
    return buildAPIDiagram(codeAnalysis, deps, frameworks);
  }

  // CLI tool architecture
  if (hasCLI) {
    return buildCLIDiagram(codeAnalysis, deps);
  }

  // React/Vue/Svelte frontend
  if (frameworks.some(f => ['React', 'Vue', 'Svelte', 'Angular', 'Next.js', 'Nuxt'].includes(f))) {
    return buildFrontendDiagram(scan, deps, frameworks);
  }

  // Generic project from directory structure
  return buildGenericDiagram(scan, deps);
}

function buildAPIDiagram(
  code: CodeAnalysis,
  deps: DependencyAnalysis,
  frameworks: string[]
): DiagramResult {
  const nodes: string[] = ['  A[Client] -->|HTTP Request| B[API Server]'];

  // Middleware
  nodes.push('  B --> C[Route Handlers]');

  // Detect auth
  if (code.envVariables.some(v => v.includes('JWT') || v.includes('AUTH') || v.includes('SECRET'))) {
    nodes.push('  B --> D[Auth Middleware]');
    nodes.push('  D --> C');
  }

  // Service layer
  nodes.push('  C --> E[Service Layer]');

  // Database
  if (deps.requiresDatabase) {
    const dbDeps = deps.mainDependencies;
    let dbName = 'Database';
    if (dbDeps.some(d => d.includes('pg') || d.includes('postgres'))) dbName = 'PostgreSQL';
    else if (dbDeps.some(d => d.includes('mongo'))) dbName = 'MongoDB';
    else if (dbDeps.some(d => d.includes('mysql'))) dbName = 'MySQL';
    else if (dbDeps.some(d => d.includes('redis'))) dbName = 'Redis';
    nodes.push(`  E --> F[(${dbName})]`);
  }

  // Cache
  if (deps.mainDependencies.some(d => d.includes('redis') || d.includes('ioredis'))) {
    nodes.push('  E --> G[(Redis Cache)]');
  }

  const mermaidCode = `graph TD\n${nodes.join('\n')}`;
  return {
    type: 'graph',
    mermaidCode,
    description: 'The API follows a layered architecture with route handlers delegating to a service layer for business logic.',
  };
}

function buildCLIDiagram(code: CodeAnalysis, deps: DependencyAnalysis): DiagramResult {
  const commands = code.cliCommands.slice(0, 5);
  const nodes: string[] = ['  A[CLI Input] --> B[Command Parser]'];

  if (commands.length > 0) {
    commands.forEach((cmd, i) => {
      nodes.push(`  B --> C${i}[${cmd.name}]`);
    });
  } else {
    nodes.push('  B --> C[Command Handler]');
    nodes.push('  C --> D[Process]');
    nodes.push('  D --> E[Output]');
  }

  const mermaidCode = `graph TD\n${nodes.join('\n')}`;
  return {
    type: 'flowchart',
    mermaidCode,
    description: 'The CLI processes user commands through a command parser that delegates to specific handlers.',
  };
}

function buildFrontendDiagram(
  scan: ScanResult,
  deps: DependencyAnalysis,
  frameworks: string[]
): DiagramResult {
  const nodes: string[] = [];
  const framework = frameworks.find(f => ['React', 'Vue', 'Svelte', 'Angular', 'Next.js', 'Nuxt'].includes(f)) || 'Frontend';

  nodes.push(`  A[${framework} App] --> B[Pages/Routes]`);
  nodes.push('  B --> C[Components]');
  nodes.push('  C --> D[State Management]');
  nodes.push('  C --> E[API Client]');
  nodes.push('  E --> F[Backend API]');

  if (deps.mainDependencies.some(d => d.includes('redux') || d.includes('zustand') || d.includes('pinia'))) {
    nodes.push('  D --> G[Store]');
  }

  const mermaidCode = `graph TD\n${nodes.join('\n')}`;
  return {
    type: 'graph',
    mermaidCode,
    description: `The ${framework} application uses a component-based architecture with centralized state management.`,
  };
}

function buildGenericDiagram(scan: ScanResult, deps: DependencyAnalysis): DiagramResult {
  const nodes: string[] = [];

  // Group files by top-level directory
  const dirs = new Map<string, number>();
  for (const file of scan.keyFiles) {
    const topDir = file.path.split('/')[0];
    dirs.set(topDir, (dirs.get(topDir) || 0) + 1);
  }

  const topDirs = [...dirs.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  if (topDirs.length === 0) {
    return {
      type: 'graph',
      mermaidCode: 'graph TD\n  A[Project] --> B[Source Files]',
      description: 'Project structure overview.',
    };
  }

  nodes.push('  A[Project Root]');
  topDirs.forEach(([dir, count], i) => {
    nodes.push(`  A --> B${i}[${dir}/ - ${count} files]`);
  });

  const mermaidCode = `graph TD\n${nodes.join('\n')}`;
  return {
    type: 'graph',
    mermaidCode,
    description: 'High-level project structure showing the main directories and their contents.',
  };
}

async function buildWithAI(
  scan: ScanResult,
  code: CodeAnalysis,
  deps: DependencyAnalysis,
  provider: AIProvider
): Promise<DiagramResult> {
  const prompt = `Generate a Mermaid architecture diagram for this project.

Project info:
- Primary language: ${scan.languages[0]?.name || 'Unknown'}
- Frameworks: ${scan.frameworks.join(', ') || 'None detected'}
- Has API endpoints: ${code.apiEndpoints.length > 0}
- Has CLI commands: ${code.cliCommands.length > 0}
- Has database: ${deps.requiresDatabase}
- Entry points: ${scan.entryPoints.join(', ')}

Directory structure:
${scan.directoryTree}

API endpoints: ${code.apiEndpoints.map(e => `${e.method} ${e.path}`).join(', ') || 'None'}

Return ONLY valid Mermaid code starting with "graph TD" or "flowchart TD". No markdown fences, no explanation. Keep it under 15 nodes.`;

  try {
    const response = await provider.generate(prompt);
    const mermaidCode = response.trim().replace(/^```mermaid\n?/, '').replace(/\n?```$/, '');

    return {
      type: 'graph',
      mermaidCode,
      description: 'AI-generated architecture diagram showing the main components and their relationships.',
    };
  } catch {
    // Fall back to generic diagram
    return buildGenericDiagram(scan, deps);
  }
}
