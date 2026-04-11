export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export function generateChangelogSection(entries: ChangelogEntry[]): string {
  if (entries.length === 0) return '';

  const lines: string[] = ['## Changelog', ''];

  for (const entry of entries) {
    lines.push(`### ${entry.version} (${entry.date})`);
    lines.push('');
    for (const change of entry.changes) {
      lines.push(`- ${change}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
