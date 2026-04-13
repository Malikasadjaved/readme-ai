import type { ScanResult } from '../analyzers/file-scanner.js';
import type { DependencyAnalysis } from '../analyzers/dependency-analyzer.js';

export function generateContributing(scan: ScanResult, deps?: DependencyAnalysis): string {
  const lines: string[] = [];

  lines.push("Contributions are welcome! Here's how to get started:");
  lines.push('');
  lines.push('1. Fork the repository');
  lines.push('2. Create a feature branch (`git checkout -b feature/amazing-feature`)');
  lines.push('3. Make your changes');

  if (scan.hasTests) {
    const testCmd = deps?.testCommand || 'npm test';
    lines.push(`4. Run the tests (\`${testCmd}\`)`);
    lines.push("5. Commit your changes (`git commit -m 'Add amazing feature'`)");
    lines.push('6. Push to the branch (`git push origin feature/amazing-feature`)');
    lines.push('7. Open a Pull Request');
  } else {
    lines.push("4. Commit your changes (`git commit -m 'Add amazing feature'`)");
    lines.push('5. Push to the branch (`git push origin feature/amazing-feature`)');
    lines.push('6. Open a Pull Request');
  }

  return lines.join('\n');
}

export function getLicense(scan: ScanResult): string {
  if (scan.hasLicense) {
    return `This project is licensed under the ${scan.hasLicense} License — see the [LICENSE](LICENSE) file for details.`;
  }
  return 'See the [LICENSE](LICENSE) file for details.';
}
