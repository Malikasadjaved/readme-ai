import { Octokit } from '@octokit/rest';
import { getGitHubToken } from '../config.js';

export interface GitHubMeta {
  owner: string;
  repo: string;
  description: string | null;
  stars: number;
  forks: number;
  topics: string[];
  license: string | null;
  defaultBranch: string;
  language: string | null;
  homepage: string | null;
}

export interface GitHubFileEntry {
  path: string;
  size: number;
  type: 'file' | 'dir';
  downloadUrl: string | null;
}

function createOctokit(): Octokit {
  const token = getGitHubToken();
  return new Octokit(token ? { auth: token } : {});
}

export function parseGitHubURL(input: string): { owner: string; repo: string; branch?: string } | null {
  // github:user/repo
  const shortMatch = input.match(/^github:([^/]+)\/([^/]+)$/);
  if (shortMatch) {
    return { owner: shortMatch[1], repo: shortMatch[2] };
  }

  // https://github.com/user/repo or https://github.com/user/repo/tree/branch
  const urlMatch = input.match(/github\.com\/([^/]+)\/([^/]+?)(?:\/tree\/([^/]+))?(?:\.git)?$/);
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2], branch: urlMatch[3] };
  }

  return null;
}

export async function fetchGitHubMeta(owner: string, repo: string): Promise<GitHubMeta> {
  const octokit = createOctokit();
  const { data } = await octokit.repos.get({ owner, repo });

  return {
    owner,
    repo,
    description: data.description,
    stars: data.stargazers_count,
    forks: data.forks_count,
    topics: data.topics || [],
    license: data.license?.spdx_id || null,
    defaultBranch: data.default_branch,
    language: data.language,
    homepage: data.homepage || null,
  };
}

export async function fetchGitHubTree(
  owner: string,
  repo: string,
  branch?: string
): Promise<GitHubFileEntry[]> {
  const octokit = createOctokit();
  const ref = branch || (await fetchGitHubMeta(owner, repo)).defaultBranch;

  const { data } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: ref,
    recursive: 'true',
  });

  return data.tree
    .filter(item => item.type === 'blob' && item.path && item.size !== undefined)
    .map(item => ({
      path: item.path!,
      size: item.size || 0,
      type: 'file' as const,
      downloadUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${item.path}`,
    }));
}

export async function fetchGitHubFileContent(
  owner: string,
  repo: string,
  filePath: string,
  branch?: string
): Promise<string> {
  const octokit = createOctokit();
  const ref = branch || (await fetchGitHubMeta(owner, repo)).defaultBranch;

  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path: filePath,
    ref,
  });

  if ('content' in data && data.encoding === 'base64') {
    return Buffer.from(data.content, 'base64').toString('utf-8');
  }

  throw new Error(`Could not fetch content for ${filePath}`);
}
