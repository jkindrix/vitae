/**
 * Deploy command — publish resume as a GitHub Pages site.
 *
 * Renders standalone HTML and pushes it to a deploy branch (default: gh-pages)
 * on the configured git remote. Uses plain git operations — no gh CLI required.
 */

import { resolve, join } from 'path';
import { mkdir, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { execFile as execFileCb } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import {
  loadDocument,
  loadVariant,
  applyVariant,
  normalizeResume,
  renderStandaloneHtml,
  renderCoverLetterStandaloneHtml,
} from '../lib/index.js';

const execFile = promisify(execFileCb);

export interface DeployCommandOptions {
  theme: string;
  variant?: string;
  layout?: string;
  branch: string;
  remote: string;
  message: string;
  cname?: string;
}

// ---------------------------------------------------------------------------
// Git helpers
// ---------------------------------------------------------------------------

async function git(args: string[], cwd?: string): Promise<string> {
  const { stdout } = await execFile('git', args, { cwd });
  return stdout.trim();
}

async function isGitRepo(): Promise<boolean> {
  try {
    await git(['rev-parse', '--is-inside-work-tree']);
    return true;
  } catch {
    return false;
  }
}

async function getRemoteUrl(remote: string): Promise<string> {
  return git(['remote', 'get-url', remote]);
}

/**
 * Parse a GitHub remote URL into the expected Pages URL.
 *
 * Supports:
 *   git@github.com:user/repo.git  → https://user.github.io/repo/
 *   https://github.com/user/repo.git → https://user.github.io/repo/
 *   https://github.com/user/repo   → https://user.github.io/repo/
 *
 * For user/org sites (repo name = user.github.io):
 *   → https://user.github.io/
 *
 * Returns null for non-GitHub remotes.
 */
function parseGitHubPagesUrl(remoteUrl: string): string | null {
  let user: string | undefined;
  let repo: string | undefined;

  // SSH format: git@github.com:user/repo.git
  const sshMatch = remoteUrl.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/);
  if (sshMatch) {
    user = sshMatch[1];
    repo = sshMatch[2];
  }

  // HTTPS format: https://github.com/user/repo.git
  if (!user) {
    const httpsMatch = remoteUrl.match(/^https?:\/\/github\.com\/([^/]+)\/(.+?)(?:\.git)?$/);
    if (httpsMatch) {
      user = httpsMatch[1];
      repo = httpsMatch[2];
    }
  }

  if (!user || !repo) return null;

  // User/org site: repo name is user.github.io
  if (repo === `${user}.github.io`) {
    return `https://${user}.github.io/`;
  }

  return `https://${user}.github.io/${repo}/`;
}

// ---------------------------------------------------------------------------
// Deploy logic
// ---------------------------------------------------------------------------

export async function deployCommand(
  inputPath: string,
  options: DeployCommandOptions
): Promise<void> {
  // 1. Validate git context
  if (!(await isGitRepo())) {
    throw new Error('Not a git repository. The deploy command must be run from within a git repo.');
  }

  let remoteUrl: string;
  try {
    remoteUrl = await getRemoteUrl(options.remote);
  } catch {
    throw new Error(
      `Remote "${options.remote}" not found. Add a remote with: git remote add ${options.remote} <url>`
    );
  }

  console.log(chalk.blue('Preparing deploy...'));

  // 2. Load and render HTML
  const resolvedInput = resolve(inputPath);
  const document = await loadDocument(resolvedInput);

  let html: string;

  if (document.type === 'cover-letter') {
    console.log(chalk.green(`\u2713 Loaded cover letter for ${document.coverLetter.meta.name}`));
    html = await renderCoverLetterStandaloneHtml(document.coverLetter, options.theme);
  } else {
    let resume = document.resume;
    console.log(chalk.green(`\u2713 Loaded resume for ${resume.meta.name}`));

    if (options.variant) {
      const variant = await loadVariant(resolve(options.variant));
      resume = applyVariant(resume, variant);
      console.log(chalk.green('\u2713 Applied variant'));
    }

    const normalized = normalizeResume(resume, undefined);
    const renderOpts: { variant?: string; styleOverrides?: Record<string, string> } = {};
    if (options.layout) renderOpts.variant = options.layout;
    const hasRenderOpts = options.layout;
    html = await renderStandaloneHtml(
      normalized,
      options.theme,
      hasRenderOpts ? renderOpts : undefined
    );
  }

  console.log(chalk.green(`\u2713 Rendered HTML with ${options.theme} theme`));

  // 3. Create temp directory and set up deploy content
  const tempDir = join(tmpdir(), `vitae-deploy-${randomUUID()}`);
  await mkdir(tempDir, { recursive: true });

  try {
    // Write index.html
    await writeFile(join(tempDir, 'index.html'), html, 'utf-8');

    // Write CNAME if custom domain specified
    if (options.cname) {
      await writeFile(join(tempDir, 'CNAME'), options.cname, 'utf-8');
    }

    // Add .nojekyll to bypass Jekyll processing (faster, allows files starting with _)
    await writeFile(join(tempDir, '.nojekyll'), '', 'utf-8');

    // 4. Initialize git repo in temp dir, commit, and push
    console.log(chalk.blue(`Deploying to ${options.remote}/${options.branch}...`));

    await git(['init'], tempDir);
    await git(['checkout', '--orphan', options.branch], tempDir);
    await git(['add', '.'], tempDir);
    await git(['commit', '-m', options.message], tempDir);
    await git(['remote', 'add', 'origin', remoteUrl], tempDir);
    await git(['push', '--force', 'origin', options.branch], tempDir);

    console.log(chalk.green(`\u2713 Pushed to ${options.branch}`));

    // 5. Print the URL
    const pagesUrl = parseGitHubPagesUrl(remoteUrl);
    console.log('');
    if (options.cname) {
      console.log(chalk.green(`\u2713 Deployed to https://${options.cname}/`));
    } else if (pagesUrl) {
      console.log(chalk.green(`\u2713 Deployed to ${pagesUrl}`));
    } else {
      console.log(chalk.green(`\u2713 Deployed to ${options.remote}/${options.branch}`));
    }
    console.log('');
    console.log(
      chalk.dim(
        'Note: GitHub Pages may take a few minutes to update. Ensure GitHub Pages is\n' +
          `enabled in your repo settings with source branch "${options.branch}".`
      )
    );
  } finally {
    // 6. Clean up temp directory
    await rm(tempDir, { recursive: true, force: true });
  }
}
