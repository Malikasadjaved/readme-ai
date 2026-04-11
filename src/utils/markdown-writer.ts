import fs from 'node:fs/promises';
import path from 'node:path';

export async function writeMarkdown(outputPath: string, content: string): Promise<void> {
  const dir = path.dirname(outputPath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(outputPath, content, 'utf-8');
}

export function joinSections(sections: string[]): string {
  return sections.filter(Boolean).join('\n\n---\n\n');
}

export function sanitizeMarkdown(text: string): string {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function escapeForTable(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}
