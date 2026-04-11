export function fillTemplate(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? '');
}

export function indent(text: string, spaces: number): string {
  const pad = ' '.repeat(spaces);
  return text.split('\n').map(line => pad + line).join('\n');
}

export function wrapCodeBlock(code: string, language: string = ''): string {
  return `\`\`\`${language}\n${code}\n\`\`\``;
}

export function heading(text: string, level: number): string {
  return `${'#'.repeat(level)} ${text}`;
}

export function bulletList(items: string[]): string {
  return items.map(item => `- ${item}`).join('\n');
}

export function numberedList(items: string[]): string {
  return items.map((item, i) => `${i + 1}. ${item}`).join('\n');
}

export function table(headers: string[], rows: string[][]): string {
  const headerRow = `| ${headers.join(' | ')} |`;
  const separator = `| ${headers.map(() => '---').join(' | ')} |`;
  const dataRows = rows.map(row => `| ${row.join(' | ')} |`).join('\n');
  return `${headerRow}\n${separator}\n${dataRows}`;
}

export function divCenter(content: string): string {
  return `<div align="center">\n\n${content}\n\n</div>`;
}
