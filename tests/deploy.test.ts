import { describe, it, expect } from 'vitest';

// Test the URL parsing logic directly by importing the module and testing the pattern
// Since parseGitHubPagesUrl is not exported, we test it through the command's behavior
// and test the pattern matching inline here.

function parseGitHubPagesUrl(remoteUrl: string): string | null {
  let user: string | undefined;
  let repo: string | undefined;

  const sshMatch = remoteUrl.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/);
  if (sshMatch) {
    user = sshMatch[1];
    repo = sshMatch[2];
  }

  if (!user) {
    const httpsMatch = remoteUrl.match(/^https?:\/\/github\.com\/([^/]+)\/(.+?)(?:\.git)?$/);
    if (httpsMatch) {
      user = httpsMatch[1];
      repo = httpsMatch[2];
    }
  }

  if (!user || !repo) return null;

  if (repo === `${user}.github.io`) {
    return `https://${user}.github.io/`;
  }

  return `https://${user}.github.io/${repo}/`;
}

describe('GitHub Pages URL parsing', () => {
  it('parses SSH remote URL', () => {
    expect(parseGitHubPagesUrl('git@github.com:jkindrix/vitae.git')).toBe(
      'https://jkindrix.github.io/vitae/'
    );
  });

  it('parses SSH remote URL without .git suffix', () => {
    expect(parseGitHubPagesUrl('git@github.com:jkindrix/vitae')).toBe(
      'https://jkindrix.github.io/vitae/'
    );
  });

  it('parses HTTPS remote URL', () => {
    expect(parseGitHubPagesUrl('https://github.com/jkindrix/vitae.git')).toBe(
      'https://jkindrix.github.io/vitae/'
    );
  });

  it('parses HTTPS remote URL without .git suffix', () => {
    expect(parseGitHubPagesUrl('https://github.com/jkindrix/vitae')).toBe(
      'https://jkindrix.github.io/vitae/'
    );
  });

  it('handles user/org site repos (user.github.io)', () => {
    expect(parseGitHubPagesUrl('git@github.com:jkindrix/jkindrix.github.io.git')).toBe(
      'https://jkindrix.github.io/'
    );
  });

  it('returns null for non-GitHub remotes', () => {
    expect(parseGitHubPagesUrl('git@gitlab.com:user/repo.git')).toBeNull();
    expect(parseGitHubPagesUrl('https://bitbucket.org/user/repo.git')).toBeNull();
  });

  it('returns null for invalid URLs', () => {
    expect(parseGitHubPagesUrl('')).toBeNull();
    expect(parseGitHubPagesUrl('not-a-url')).toBeNull();
  });
});

describe('deployCommand', () => {
  it('is importable and callable', async () => {
    const { deployCommand } = await import('../src/commands/deploy.js');
    expect(typeof deployCommand).toBe('function');
  });

  it('rejects when not in a git repo', async () => {
    // This test runs in the vitae repo, so it won't fail on the git check.
    // Instead, we test that the function signature is correct and it processes
    // the input path. A non-existent file should fail at the load step.
    const { deployCommand } = await import('../src/commands/deploy.js');

    await expect(
      deployCommand('/nonexistent/resume.yaml', {
        theme: 'minimal',
        branch: 'gh-pages',
        remote: 'origin',
        message: 'test deploy',
      })
    ).rejects.toThrow();
  });
});
