import { readFileContent } from '../utils/file-utils.js';
import type { FileEntry } from './repo-fetcher.js';

export interface CodeAnalysis {
  exports: ExportInfo[];
  mainFunctions: FunctionInfo[];
  apiEndpoints: Endpoint[];
  cliCommands: CLICommand[];
  envVariables: string[];
  externalDependencies: string[];
}

export interface ExportInfo {
  name: string;
  type: 'function' | 'class' | 'const' | 'type' | 'interface';
  signature: string;
  file: string;
}

export interface FunctionInfo {
  name: string;
  signature: string;
  description: string;
  file: string;
}

export interface Endpoint {
  method: string;
  path: string;
  handler: string;
  file: string;
}

export interface CLICommand {
  name: string;
  description: string;
  file: string;
}

export async function analyzeCode(keyFiles: FileEntry[]): Promise<CodeAnalysis> {
  const exports: ExportInfo[] = [];
  const mainFunctions: FunctionInfo[] = [];
  const apiEndpoints: Endpoint[] = [];
  const cliCommands: CLICommand[] = [];
  const envVariables = new Set<string>();
  const externalDependencies = new Set<string>();

  for (const file of keyFiles) {
    try {
      const content = await readFileContent(file.absolutePath);

      if (['TypeScript', 'JavaScript'].includes(file.language)) {
        extractTSExports(content, file.path, exports);
        extractTSFunctions(content, file.path, mainFunctions);
        extractExpressEndpoints(content, file.path, apiEndpoints);
        extractCommanderCommands(content, file.path, cliCommands);
        extractEnvVars(content, envVariables);
        extractTSImports(content, externalDependencies);
      } else if (file.language === 'Python') {
        extractPythonFunctions(content, file.path, mainFunctions);
        extractFastAPIEndpoints(content, file.path, apiEndpoints);
        extractEnvVars(content, envVariables);
        extractPythonImports(content, externalDependencies);
      }
    } catch {
      // Skip files that can't be read
    }
  }

  return {
    exports,
    mainFunctions,
    apiEndpoints,
    cliCommands,
    envVariables: [...envVariables],
    externalDependencies: [...externalDependencies],
  };
}

function extractTSExports(content: string, filePath: string, exports: ExportInfo[]): void {
  // export function name(...)
  const funcRegex = /export\s+(?:async\s+)?function\s+(\w+)\s*(\([^)]*\)(?:\s*:\s*[^{]+)?)/g;
  let match;
  while ((match = funcRegex.exec(content)) !== null) {
    exports.push({
      name: match[1],
      type: 'function',
      signature: `function ${match[1]}${match[2]}`,
      file: filePath,
    });
  }

  // export class Name
  const classRegex = /export\s+class\s+(\w+)(?:\s+extends\s+\w+)?(?:\s+implements\s+[\w,\s]+)?/g;
  while ((match = classRegex.exec(content)) !== null) {
    exports.push({
      name: match[1],
      type: 'class',
      signature: match[0],
      file: filePath,
    });
  }

  // export const name
  const constRegex = /export\s+const\s+(\w+)\s*(?::\s*([^=]+))?\s*=/g;
  while ((match = constRegex.exec(content)) !== null) {
    exports.push({
      name: match[1],
      type: 'const',
      signature: `const ${match[1]}${match[2] ? ': ' + match[2].trim() : ''}`,
      file: filePath,
    });
  }

  // export interface Name
  const ifaceRegex = /export\s+interface\s+(\w+)(?:<[^>]+>)?/g;
  while ((match = ifaceRegex.exec(content)) !== null) {
    exports.push({
      name: match[1],
      type: 'interface',
      signature: match[0],
      file: filePath,
    });
  }

  // export type Name
  const typeRegex = /export\s+type\s+(\w+)(?:<[^>]+>)?/g;
  while ((match = typeRegex.exec(content)) !== null) {
    exports.push({
      name: match[1],
      type: 'type',
      signature: match[0],
      file: filePath,
    });
  }
}

function extractTSFunctions(content: string, filePath: string, functions: FunctionInfo[]): void {
  // Match exported async/sync functions with JSDoc
  const funcWithDocRegex =
    /\/\*\*\s*([\s\S]*?)\*\/\s*export\s+(?:async\s+)?function\s+(\w+)\s*(\([^)]*\)(?:\s*:\s*[^{]+)?)/g;
  let match;
  while ((match = funcWithDocRegex.exec(content)) !== null) {
    const doc = match[1].replace(/\s*\*\s*/g, ' ').trim();
    functions.push({
      name: match[2],
      signature: `function ${match[2]}${match[3]}`,
      description: doc,
      file: filePath,
    });
  }

  // Functions without JSDoc
  const funcRegex = /export\s+(?:async\s+)?function\s+(\w+)\s*(\([^)]*\)(?:\s*:\s*[^{]+)?)/g;
  while ((match = funcRegex.exec(content)) !== null) {
    if (!functions.some((f) => f.name === match![1] && f.file === filePath)) {
      functions.push({
        name: match[1],
        signature: `function ${match[1]}${match[2]}`,
        description: '',
        file: filePath,
      });
    }
  }
}

function extractExpressEndpoints(content: string, filePath: string, endpoints: Endpoint[]): void {
  // router.get('/path', handler) or app.post('/path', handler)
  const routeRegex =
    /(?:router|app|server)\.(get|post|put|patch|delete|all)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    endpoints.push({
      method: match[1].toUpperCase(),
      path: match[2],
      handler: '',
      file: filePath,
    });
  }
}

function extractFastAPIEndpoints(content: string, filePath: string, endpoints: Endpoint[]): void {
  // @app.get("/path") or @router.post("/path")
  const routeRegex = /@(?:app|router)\.(get|post|put|patch|delete)\s*\(\s*["']([^"']+)["']/gi;
  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    endpoints.push({
      method: match[1].toUpperCase(),
      path: match[2],
      handler: '',
      file: filePath,
    });
  }
}

function extractCommanderCommands(content: string, filePath: string, commands: CLICommand[]): void {
  // .command('name') or .name('name')
  const cmdRegex =
    /\.command\s*\(\s*['"`]([^'"`]+)['"`]\)[\s\S]*?\.description\s*\(\s*['"`]([^'"`]+)['"`]\)/g;
  let match;
  while ((match = cmdRegex.exec(content)) !== null) {
    commands.push({
      name: match[1],
      description: match[2],
      file: filePath,
    });
  }
}

function extractPythonFunctions(
  content: string,
  filePath: string,
  functions: FunctionInfo[],
): void {
  // def name(params): with optional docstring
  const funcRegex =
    /def\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*[^:]+)?:\s*\n\s*(?:"""([\s\S]*?)"""|'''([\s\S]*?)''')?/g;
  let match;
  while ((match = funcRegex.exec(content)) !== null) {
    const name = match[1];
    if (name.startsWith('_')) continue; // skip private
    functions.push({
      name,
      signature: `def ${name}(${match[2]})`,
      description: (match[3] || match[4] || '').trim(),
      file: filePath,
    });
  }
}

function extractEnvVars(content: string, envVars: Set<string>): void {
  // process.env.VAR_NAME or os.environ["VAR_NAME"] or os.getenv("VAR_NAME")
  const patterns = [
    /process\.env\.(\w+)/g,
    /os\.environ\[["'](\w+)["']\]/g,
    /os\.getenv\(["'](\w+)["']\)/g,
    /os\.environ\.get\(["'](\w+)["']\)/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      envVars.add(match[1]);
    }
  }
}

function extractTSImports(content: string, deps: Set<string>): void {
  const importRegex = /(?:import|from)\s+['"]([^'"./][^'"]*)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const pkg = match[1].startsWith('@')
      ? match[1].split('/').slice(0, 2).join('/')
      : match[1].split('/')[0];
    if (!pkg.startsWith('node:')) {
      deps.add(pkg);
    }
  }
}

function extractPythonImports(content: string, deps: Set<string>): void {
  const importRegex = /(?:^|\n)\s*(?:import|from)\s+(\w+)/g;
  const stdLib = new Set([
    'os',
    'sys',
    'json',
    'pathlib',
    'typing',
    'datetime',
    'collections',
    're',
    'functools',
    'itertools',
    'math',
    'random',
    'string',
    'time',
    'logging',
    'unittest',
    'abc',
    'io',
    'copy',
    'enum',
    'dataclasses',
    'contextlib',
    'asyncio',
    'http',
    'urllib',
    'hashlib',
    'base64',
    'struct',
    'argparse',
    'shutil',
    'glob',
    'subprocess',
    'threading',
    'multiprocessing',
  ]);
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    if (!stdLib.has(match[1])) {
      deps.add(match[1]);
    }
  }
}
