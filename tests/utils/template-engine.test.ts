import { describe, it, expect } from 'vitest';
import {
  fillTemplate,
  indent,
  wrapCodeBlock,
  heading,
  bulletList,
  numberedList,
  table,
  divCenter,
} from '../../src/utils/template-engine.js';

describe('fillTemplate', () => {
  it('replaces placeholders with data', () => {
    expect(fillTemplate('Hello {{name}}!', { name: 'World' })).toBe('Hello World!');
  });

  it('replaces multiple placeholders', () => {
    const result = fillTemplate('{{a}} and {{b}}', { a: 'X', b: 'Y' });
    expect(result).toBe('X and Y');
  });

  it('leaves unknown keys as empty string', () => {
    expect(fillTemplate('Hello {{missing}}!', {})).toBe('Hello !');
  });

  it('handles empty data', () => {
    expect(fillTemplate('No placeholders', {})).toBe('No placeholders');
  });
});

describe('indent', () => {
  it('indents each line by N spaces', () => {
    expect(indent('a\nb', 2)).toBe('  a\n  b');
  });

  it('handles single line', () => {
    expect(indent('hello', 4)).toBe('    hello');
  });
});

describe('wrapCodeBlock', () => {
  it('wraps code in triple backticks', () => {
    expect(wrapCodeBlock('const x = 1', 'typescript')).toBe(
      '```typescript\nconst x = 1\n```'
    );
  });

  it('works without language', () => {
    expect(wrapCodeBlock('code')).toBe('```\ncode\n```');
  });
});

describe('heading', () => {
  it('produces level 1 heading', () => {
    expect(heading('Title', 1)).toBe('# Title');
  });

  it('produces level 3 heading', () => {
    expect(heading('Section', 3)).toBe('### Section');
  });
});

describe('bulletList', () => {
  it('produces dashed list', () => {
    expect(bulletList(['a', 'b', 'c'])).toBe('- a\n- b\n- c');
  });
});

describe('numberedList', () => {
  it('produces numbered list starting at 1', () => {
    expect(numberedList(['first', 'second'])).toBe('1. first\n2. second');
  });
});

describe('table', () => {
  it('produces pipe-delimited markdown table', () => {
    const result = table(['Name', 'Age'], [['Alice', '30'], ['Bob', '25']]);
    expect(result).toContain('| Name | Age |');
    expect(result).toContain('| --- | --- |');
    expect(result).toContain('| Alice | 30 |');
    expect(result).toContain('| Bob | 25 |');
  });
});

describe('divCenter', () => {
  it('wraps content in centered div', () => {
    const result = divCenter('Hello');
    expect(result).toContain('<div align="center">');
    expect(result).toContain('Hello');
    expect(result).toContain('</div>');
  });
});
