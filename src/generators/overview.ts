import type { ScanResult } from '../analyzers/file-scanner.js';
import type { DependencyAnalysis } from '../analyzers/dependency-analyzer.js';
import type { CodeAnalysis } from '../analyzers/code-analyzer.js';
import type { AIProvider } from '../providers/index.js';

export interface OverviewResult {
  tagline: string;
  description: string;
  keyFeatures: string[];
  useCases: string[];
  targetAudience: string;
}

export async function generateOverview(params: {
  scan: ScanResult;
  deps: DependencyAnalysis;
  codeAnalysis: CodeAnalysis;
  provider: AIProvider;
  existingDescription?: string;
  userContext?: string;
}): Promise<OverviewResult> {
  const { scan, deps, codeAnalysis, provider, existingDescription, userContext } = params;

  const prompt = `Analyze this codebase and generate a README overview.

PROJECT INFO:
- Primary language: ${scan.languages[0]?.name || 'Unknown'} (${scan.languages[0]?.percentage || 0}%)
- Other languages: ${scan.languages.slice(1, 4).map(l => l.name).join(', ') || 'None'}
- Frameworks: ${scan.frameworks.join(', ') || 'None detected'}
- Package manager: ${deps.packageManager || 'None detected'}
- Has tests: ${scan.hasTests}
- Has Docker: ${scan.hasDocker}
- Has CI/CD: ${scan.hasCICD}
- License: ${scan.hasLicense || 'Unknown'}
- Total files: ${scan.totalFiles}

DEPENDENCIES:
${deps.mainDependencies.slice(0, 15).join(', ') || 'None'}

CODE STRUCTURE:
${scan.directoryTree}

ENTRY POINTS:
${scan.entryPoints.join(', ') || 'None found'}

KEY CODE PATTERNS DETECTED:
- API Endpoints: ${codeAnalysis.apiEndpoints.map(e => `${e.method} ${e.path}`).join(', ') || 'None'}
- CLI Commands: ${codeAnalysis.cliCommands.map(c => c.name).join(', ') || 'None'}
- Main exports: ${codeAnalysis.exports.slice(0, 10).map(e => e.name).join(', ') || 'None'}
- Environment variables: ${codeAnalysis.envVariables.join(', ') || 'None'}

${existingDescription ? `EXISTING DESCRIPTION: ${existingDescription}` : ''}
${userContext ? `USER-PROVIDED CONTEXT: ${userContext}` : ''}

Generate a JSON response with these fields:
{
  "tagline": "A compelling one-line description (under 100 chars)",
  "description": "2-3 paragraph project description that explains what the project does, why it exists, and its key technical approach",
  "keyFeatures": ["5-7 bullet points highlighting key features, each starting with an emoji"],
  "useCases": ["3 use case examples showing who would use this and how"],
  "targetAudience": "One sentence describing the target user"
}`;

  try {
    return await provider.generateJSON<OverviewResult>(prompt);
  } catch {
    // Fallback: generate from available data
    return buildFallbackOverview(scan, deps, codeAnalysis, existingDescription);
  }
}

function buildFallbackOverview(
  scan: ScanResult,
  deps: DependencyAnalysis,
  code: CodeAnalysis,
  existingDescription?: string
): OverviewResult {
  const lang = scan.languages[0]?.name || 'Unknown';
  const frameworks = scan.frameworks;

  const tagline = existingDescription || `A ${lang} project${frameworks.length ? ` built with ${frameworks[0]}` : ''}`;

  const parts: string[] = [];
  parts.push(`This project is built with ${lang}${frameworks.length ? ` using ${frameworks.join(', ')}` : ''}.`);
  if (code.apiEndpoints.length > 0) {
    parts.push(`It exposes ${code.apiEndpoints.length} API endpoint${code.apiEndpoints.length > 1 ? 's' : ''}.`);
  }
  if (code.cliCommands.length > 0) {
    parts.push(`It provides ${code.cliCommands.length} CLI command${code.cliCommands.length > 1 ? 's' : ''}.`);
  }
  if (scan.hasTests) parts.push('The project includes a test suite.');
  if (scan.hasDocker) parts.push('Docker support is included for containerized deployment.');

  const features: string[] = [];
  if (frameworks.length) features.push(`Built with ${frameworks.join(', ')}`);
  if (scan.hasTests) features.push('Includes test suite');
  if (scan.hasDocker) features.push('Docker support');
  if (scan.hasCICD) features.push('CI/CD pipeline configured');
  if (code.apiEndpoints.length > 0) features.push(`${code.apiEndpoints.length} API endpoints`);
  if (deps.requiresDatabase) features.push('Database integration');

  return {
    tagline,
    description: parts.join(' '),
    keyFeatures: features.length > 0 ? features : [`Built with ${lang}`],
    useCases: [`Use as a ${lang} ${frameworks[0] || 'application'}`],
    targetAudience: `Developers working with ${lang}`,
  };
}
