import { describe, it, expect } from 'vitest';
import { parseGitHubURL } from '../../src/utils/github-api.js';

// Only test the pure parseGitHubURL function.
// fetchGitHubMeta/fetchGitHubTree/fetchGitHubFileContent are thin Octokit wrappers
// that would require heavy mocking with minimal value.

describe('parseGitHubURL', () => {
  it('parses github:user/repo shorthand', () => {
    const result = parseGitHubURL('github:expressjs/express');
    expect(result).toEqual({ owner: 'expressjs', repo: 'express' });
  });

  it('parses full HTTPS URL', () => {
    const result = parseGitHubURL('https://github.com/expressjs/express');
    expect(result).toEqual({ owner: 'expressjs', repo: 'express', branch: undefined });
  });

  it('parses URL with branch', () => {
    const result = parseGitHubURL('https://github.com/user/repo/tree/develop');
    expect(result).toEqual({ owner: 'user', repo: 'repo', branch: 'develop' });
  });

  it('parses URL with .git suffix', () => {
    const result = parseGitHubURL('https://github.com/user/repo.git');
    expect(result).toEqual({ owner: 'user', repo: 'repo', branch: undefined });
  });

  it('returns null for non-GitHub input', () => {
    expect(parseGitHubURL('/local/path')).toBeNull();
    expect(parseGitHubURL('https://gitlab.com/user/repo')).toBeNull();
  });

  it('returns null for plain text', () => {
    expect(parseGitHubURL('just some text')).toBeNull();
  });
});
