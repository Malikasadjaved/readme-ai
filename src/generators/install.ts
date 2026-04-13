import type { DependencyAnalysis } from '../analyzers/dependency-analyzer.js';
import type { ScanResult } from '../analyzers/file-scanner.js';

export interface InstallStep {
  title: string;
  command: string;
}

export interface InstallResult {
  prerequisites: string[];
  installSteps: InstallStep[];
  envSetupSteps?: InstallStep[];
  verifyCommand?: string;
}

export function generateInstallSection(deps: DependencyAnalysis, scan: ScanResult): InstallResult {
  const prerequisites: string[] = [];
  const installSteps: InstallStep[] = [];
  const envSetupSteps: InstallStep[] = [];
  let verifyCommand: string | undefined;

  // Clone step
  installSteps.push({
    title: 'Clone the repository',
    command: 'git clone <repository-url>\ncd <project-name>',
  });

  switch (deps.packageManager) {
    case 'npm':
    case 'yarn':
    case 'pnpm':
      prerequisites.push(`Node.js ${deps.nodeVersion || '>= 18'}`);
      if (deps.packageManager !== 'npm') {
        prerequisites.push(deps.packageManager);
      }
      installSteps.push({
        title: 'Install dependencies',
        command: deps.installCommand,
      });
      if (deps.buildCommand) {
        installSteps.push({
          title: 'Build the project',
          command: deps.buildCommand,
        });
      }
      verifyCommand = deps.runCommand;
      break;

    case 'pip':
      prerequisites.push(`Python ${deps.pythonVersion || '>= 3.9'}`);
      prerequisites.push('pip');
      installSteps.push({
        title: 'Create a virtual environment',
        command:
          'python -m venv venv\nsource venv/bin/activate  # On Windows: venv\\Scripts\\activate',
      });
      installSteps.push({
        title: 'Install dependencies',
        command: deps.installCommand,
      });
      verifyCommand = deps.runCommand;
      break;

    case 'cargo':
      prerequisites.push('Rust (latest stable)');
      installSteps.push({
        title: 'Build the project',
        command: deps.installCommand,
      });
      verifyCommand = deps.runCommand;
      break;

    case 'go':
      prerequisites.push('Go >= 1.21');
      installSteps.push({
        title: 'Download dependencies',
        command: deps.installCommand,
      });
      if (deps.buildCommand) {
        installSteps.push({
          title: 'Build the project',
          command: deps.buildCommand,
        });
      }
      verifyCommand = deps.runCommand;
      break;

    default:
      // No recognized package manager
      break;
  }

  // Environment setup
  if (deps.requiresEnvFile) {
    envSetupSteps.push({
      title: 'Copy the example environment file',
      command: 'cp .env.example .env',
    });
    envSetupSteps.push({
      title: 'Edit .env with your configuration',
      command: '# Edit .env and fill in the required values',
    });
  }

  // Docker instructions
  if (scan.hasDocker) {
    installSteps.push({
      title: 'Or run with Docker',
      command: 'docker compose up --build',
    });
  }

  return {
    prerequisites,
    installSteps,
    envSetupSteps: envSetupSteps.length > 0 ? envSetupSteps : undefined,
    verifyCommand,
  };
}
