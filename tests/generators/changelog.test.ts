import { describe, it, expect } from 'vitest';
import { generateChangelogSection, type ChangelogEntry } from '../../src/generators/changelog.js';

describe('generateChangelogSection', () => {
  it('renders multiple entries', () => {
    const entries: ChangelogEntry[] = [
      { version: '1.1.0', date: '2026-04-15', changes: ['Added feature X', 'Fixed bug Y'] },
      { version: '1.0.0', date: '2026-04-11', changes: ['Initial release'] },
    ];
    const result = generateChangelogSection(entries);

    expect(result).toContain('## Changelog');
    expect(result).toContain('### 1.1.0 (2026-04-15)');
    expect(result).toContain('- Added feature X');
    expect(result).toContain('- Fixed bug Y');
    expect(result).toContain('### 1.0.0 (2026-04-11)');
    expect(result).toContain('- Initial release');
  });

  it('returns empty string for empty entries', () => {
    expect(generateChangelogSection([])).toBe('');
  });

  it('renders single entry correctly', () => {
    const entries: ChangelogEntry[] = [
      { version: '0.1.0', date: '2026-01-01', changes: ['First commit'] },
    ];
    const result = generateChangelogSection(entries);
    expect(result).toContain('### 0.1.0 (2026-01-01)');
    expect(result).toContain('- First commit');
  });
});
