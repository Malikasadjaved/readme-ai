import type { CodeAnalysis } from '../analyzers/code-analyzer.js';
import type { ScanResult } from '../analyzers/file-scanner.js';
import type { DependencyAnalysis } from '../analyzers/dependency-analyzer.js';
import type { AIProvider } from '../providers/index.js';

export interface UsageExample {
  title: string;
  description: string;
  language: string;
  code: string;
}

export interface UsageResult {
  examples: UsageExample[];
}

export interface APIDocEntry {
  name: string;
  signature: string;
  description: string;
  file: string;
}

export interface APIDocsResult {
  entries: APIDocEntry[];
}

export async function generateUsageSection(params: {
  codeAnalysis: CodeAnalysis;
  scan: ScanResult;
  deps: DependencyAnalysis;
  provider: AIProvider;
}): Promise<UsageResult> {
  const { codeAnalysis, scan, deps, provider } = params;

  // Build usage examples from detected patterns
  const examples: UsageExample[] = [];

  // Run command
  if (deps.runCommand) {
    examples.push({
      title: 'Running the project',
      description: 'Start the application:',
      language: 'bash',
      code: deps.runCommand,
    });
  }

  // Test command
  if (deps.testCommand) {
    examples.push({
      title: 'Running tests',
      description: 'Execute the test suite:',
      language: 'bash',
      code: deps.testCommand,
    });
  }

  // API endpoints
  if (codeAnalysis.apiEndpoints.length > 0) {
    const curlExamples = codeAnalysis.apiEndpoints
      .slice(0, 3)
      .map((ep) => {
        const method = ep.method === 'GET' ? '' : ` -X ${ep.method}`;
        return `curl${method} http://localhost:3000${ep.path}`;
      })
      .join('\n');

    examples.push({
      title: 'API Examples',
      description: 'Making requests to the API:',
      language: 'bash',
      code: curlExamples,
    });
  }

  // CLI commands
  if (codeAnalysis.cliCommands.length > 0) {
    const cmdExamples = codeAnalysis.cliCommands
      .slice(0, 3)
      .map((cmd) => `# ${cmd.description}\n${cmd.name}`)
      .join('\n\n');

    examples.push({
      title: 'CLI Commands',
      description: 'Available commands:',
      language: 'bash',
      code: cmdExamples,
    });
  }

  // If we have very few examples, ask AI for more
  if (examples.length < 2 && codeAnalysis.exports.length > 0) {
    try {
      const aiExamples = await generateAIUsageExamples(codeAnalysis, scan, provider);
      examples.push(...aiExamples);
    } catch {
      // AI generation failed, that's ok
    }
  }

  // Ensure at least one example
  if (examples.length === 0) {
    examples.push({
      title: 'Getting Started',
      description: `Start using the project:`,
      language: 'bash',
      code: deps.runCommand || deps.installCommand || `# See documentation for usage instructions`,
    });
  }

  return { examples };
}

async function generateAIUsageExamples(
  code: CodeAnalysis,
  scan: ScanResult,
  provider: AIProvider,
): Promise<UsageExample[]> {
  const exports = code.exports
    .slice(0, 5)
    .map((e) => `${e.type} ${e.signature} (${e.file})`)
    .join('\n');

  const prompt = `Generate 2 practical usage examples for this project.

Language: ${scan.languages[0]?.name || 'Unknown'}
Key exports:
${exports}

Return JSON:
{
  "examples": [
    {
      "title": "Example title",
      "description": "What this example demonstrates",
      "language": "${scan.languages[0]?.name === 'Python' ? 'python' : 'typescript'}",
      "code": "// actual code example"
    }
  ]
}`;

  const result = await provider.generateJSON<{ examples: UsageExample[] }>(prompt);
  return result.examples || [];
}

export async function generateAPIDocs(params: {
  codeAnalysis: CodeAnalysis;
  provider: AIProvider;
}): Promise<APIDocsResult> {
  const { codeAnalysis, provider } = params;

  // Group exports by file
  const entries: APIDocEntry[] = codeAnalysis.exports
    .filter((exp) => exp.type === 'function' || exp.type === 'class')
    .slice(0, 20)
    .map((exp) => ({
      name: exp.name,
      signature: exp.signature,
      description: '',
      file: exp.file,
    }));

  // Try to get AI descriptions for the exports
  if (entries.length > 0 && entries.length <= 15) {
    try {
      const prompt = `Generate brief descriptions (1 sentence each) for these exported functions/classes:

${entries.map((e) => `- ${e.signature} (in ${e.file})`).join('\n')}

Return JSON:
{
  "descriptions": {
    "functionName": "Brief description of what it does"
  }
}`;

      const result = await provider.generateJSON<{ descriptions: Record<string, string> }>(prompt);
      for (const entry of entries) {
        if (result.descriptions[entry.name]) {
          entry.description = result.descriptions[entry.name];
        }
      }
    } catch {
      // AI failed, leave descriptions empty
    }
  }

  return { entries };
}
