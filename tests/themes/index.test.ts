import { describe, it, expect } from 'vitest';
import { getTheme, listThemes } from '../../src/themes/index.js';

describe('getTheme', () => {
  it('returns default theme', () => {
    const theme = getTheme('default');
    expect(theme.name).toBe('default');
    expect(typeof theme.render).toBe('function');
  });

  it('returns minimal theme', () => {
    expect(getTheme('minimal').name).toBe('minimal');
  });

  it('returns hacker theme', () => {
    expect(getTheme('hacker').name).toBe('hacker');
  });

  it('returns modern theme', () => {
    expect(getTheme('modern').name).toBe('modern');
  });

  it('returns academic theme', () => {
    expect(getTheme('academic').name).toBe('academic');
  });

  it('throws for unknown theme', () => {
    expect(() => getTheme('nonexistent')).toThrow('Unknown theme');
  });
});

describe('listThemes', () => {
  it('returns all 5 theme names', () => {
    const themes = listThemes();
    expect(themes).toHaveLength(5);
    expect(themes).toContain('default');
    expect(themes).toContain('minimal');
    expect(themes).toContain('hacker');
    expect(themes).toContain('modern');
    expect(themes).toContain('academic');
  });
});
