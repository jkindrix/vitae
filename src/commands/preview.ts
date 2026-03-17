import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { resolve, dirname } from 'path';
import { readFile, writeFile } from 'fs/promises';
import { watch, type FSWatcher } from 'fs';
import { randomUUID } from 'crypto';
import chalk from 'chalk';
import {
  loadVariant,
  loadDocument,
  applyVariant,
  normalizeResume,
  renderStandaloneHtml,
  renderCoverLetterStandaloneHtml,
  listThemes,
  loadTheme,
} from '../lib/index.js';
import type { RenderOptions } from '../lib/index.js';
import { readStyles } from '../lib/themes.js';
import { parseCssCustomProperties } from '../lib/css-properties.js';
import { generateConfiguratorPanel } from '../lib/configurator.js';
import type { ConfiguratorTheme } from '../lib/configurator.js';

export interface PreviewCommandOptions {
  theme: string;
  port?: number;
  variant?: string;
  layout?: string;
  configure?: boolean;
}

// Store connected SSE clients
const sseClients = new Set<ServerResponse>();

/**
 * Send event to all connected SSE clients
 */
function broadcastReload(): void {
  for (const client of sseClients) {
    client.write('event: reload\ndata: {}\n\n');
  }
}

/**
 * Preview command - start a local server to preview the resume
 */
export async function previewCommand(
  inputPath: string,
  options: PreviewCommandOptions
): Promise<void> {
  const resolvedInput = resolve(inputPath);
  const resolvedVariant = options.variant ? resolve(options.variant) : undefined;
  const port = options.port ?? 3000;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `Invalid port number: ${options.port}. Must be an integer between 1 and 65535.`
    );
  }

  // Configurator state
  const csrfToken = randomUUID();
  let activeTheme = options.theme;
  const configuratorThemes: ConfiguratorTheme[] = [];

  if (options.configure) {
    console.log(chalk.blue('Starting preview server with theme configurator...'));
    const allThemes = await listThemes();
    for (const t of allThemes) {
      const theme = await loadTheme(t.name);
      const css = await readStyles(theme);
      const properties = css ? parseCssCustomProperties(css) : {};
      configuratorThemes.push({ name: t.name, properties });
    }
  } else {
    console.log(chalk.blue('Starting preview server...'));
  }

  // Watch for file changes in the resume directory
  const watchers: FSWatcher[] = [];
  let debounceTimer: NodeJS.Timeout | null = null;

  const handleFileChange = (): void => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      console.log(chalk.dim(`  [${new Date().toLocaleTimeString()}] File changed, reloading...`));
      broadcastReload();
    }, 100);
  };

  // Watch resume directory
  const resumeWatcher = watch(dirname(resolvedInput), (_eventType, filename) => {
    if (filename?.endsWith('.yaml') || filename?.endsWith('.yml')) {
      handleFileChange();
    }
  });
  watchers.push(resumeWatcher);

  // Watch variant file directory if different from resume directory
  if (resolvedVariant) {
    const variantDir = dirname(resolvedVariant);
    if (variantDir !== dirname(resolvedInput)) {
      const variantWatcher = watch(variantDir, (_eventType, filename) => {
        if (filename?.endsWith('.yaml') || filename?.endsWith('.yml')) {
          handleFileChange();
        }
      });
      watchers.push(variantWatcher);
    }
  }

  const server = createServer(async (req, res) => {
    try {
      // SSE endpoint for hot reload
      if (req.url === '/__vitae_events') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        });

        // Send initial connection message
        res.write('event: connected\ndata: {}\n\n');

        // Add client to set
        sseClients.add(res);

        // Remove client on disconnect
        req.on('close', () => {
          sseClients.delete(res);
        });

        return;
      }

      // Configurator API endpoints
      if (options.configure && req.url === '/__vitae_api/themes') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ current: activeTheme, themes: configuratorThemes }));
        return;
      }

      if (options.configure && req.url?.startsWith('/__vitae_api/switch')) {
        const url = new URL(req.url, `http://localhost:${port}`);
        const themeName = url.searchParams.get('theme');
        if (themeName) {
          activeTheme = themeName;
          broadcastReload();
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      if (options.configure && req.url === '/__vitae_api/export' && req.method === 'POST') {
        const token = req.headers['x-vitae-token'];
        if (token !== csrfToken) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid token' }));
          return;
        }
        const body = await readRequestBody(req);
        const overrides = JSON.parse(body) as {
          colors?: Record<string, string>;
          fonts?: Record<string, string>;
        };
        await writeThemeOverrides(resolvedInput, overrides);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      // Reload document on each request for live updates
      const document = await loadDocument(resolvedInput);

      let html: string;

      const themeName = options.configure ? activeTheme : options.theme;

      if (document.type === 'cover-letter') {
        html = await renderCoverLetterStandaloneHtml(document.coverLetter, themeName);
      } else {
        let resume = document.resume;

        // Apply variant if specified
        let sectionOrder = undefined;
        let variantStyleOverrides: Record<string, string> | undefined;
        if (resolvedVariant) {
          const variant = await loadVariant(resolvedVariant);
          resume = applyVariant(resume, variant);
          sectionOrder = variant.layout;
          variantStyleOverrides = variant.style;
        }

        // Normalize
        const normalized = normalizeResume(resume, sectionOrder);
        const renderOpts: RenderOptions = {};
        if (options.layout) renderOpts.variant = options.layout;
        if (variantStyleOverrides) renderOpts.styleOverrides = variantStyleOverrides;
        const hasRenderOpts = options.layout || variantStyleOverrides;
        html = await renderStandaloneHtml(
          normalized,
          themeName,
          hasRenderOpts ? renderOpts : undefined
        );
      }

      // Inject SSE-based hot reload script
      const hotReloadScript = `
        <script>
          (function() {
            let eventSource = null;
            let reconnectAttempts = 0;
            const maxReconnectAttempts = 10;

            function connect() {
              eventSource = new EventSource('/__vitae_events');

              eventSource.addEventListener('connected', () => {
                console.log('[Vitae] Hot reload connected');
                reconnectAttempts = 0;
              });

              eventSource.addEventListener('reload', () => {
                console.log('[Vitae] Reloading...');
                location.reload();
              });

              eventSource.addEventListener('error', () => {
                eventSource.close();
                if (reconnectAttempts < maxReconnectAttempts) {
                  reconnectAttempts++;
                  console.log('[Vitae] Connection lost, reconnecting...');
                  setTimeout(connect, 1000);
                }
              });
            }

            connect();
          })();
        </script>
      `;

      let injected = hotReloadScript;
      if (options.configure) {
        injected += generateConfiguratorPanel({
          themes: configuratorThemes,
          currentTheme: activeTheme,
          csrfToken,
        });
      }
      const finalHtml = html.replace('</body>', `${injected}</body>`);

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(finalHtml);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(chalk.red(`  Error: ${message}`));
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Error</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; }
            h1 { color: #c41e3a; }
            pre { background: #f5f5f5; padding: 1rem; overflow: auto; border-radius: 4px; }
          </style>
        </head>
        <body>
          <h1>Error loading resume</h1>
          <pre>${escapeHtml(message)}</pre>
          <p>Fix the error and save to auto-reload.</p>
          <script>
            const eventSource = new EventSource('/__vitae_events');
            eventSource.addEventListener('reload', () => location.reload());
          </script>
        </body>
        </html>
      `);
    }
  });

  server.listen(port, () => {
    console.log('');
    console.log(chalk.green(`✓ Preview server running at:`));
    console.log(chalk.cyan(`  http://localhost:${port}`));
    if (resolvedVariant) {
      console.log(chalk.dim(`  Variant: ${resolvedVariant}`));
    }
    console.log('');
    console.log(chalk.dim('  Edit your resume.yaml and the preview will auto-refresh'));
    console.log(chalk.dim('  Press Ctrl+C to stop'));
    console.log('');
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('');
    console.log(chalk.blue('Stopping preview server...'));

    // Close all SSE connections
    for (const client of sseClients) {
      client.end();
    }
    sseClients.clear();

    // Stop file watchers
    for (const w of watchers) {
      w.close();
    }

    server.close(() => {
      process.exit(0);
    });
  });
}

/**
 * Escape HTML special characters for safe display
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Read the full request body as a string
 */
function readRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

/**
 * Surgical YAML write-back — only touches the theme: block.
 * Merges new overrides with existing theme configuration.
 * Preserves all user comments and formatting outside the theme section.
 */
async function writeThemeOverrides(
  filePath: string,
  overrides: { colors?: Record<string, string>; fonts?: Record<string, string> }
): Promise<void> {
  const content = await readFile(filePath, 'utf-8');
  const lines = content.split('\n');

  // Find existing theme: block boundaries
  let themeStart = -1;
  let themeEnd = -1;

  for (let i = 0; i < lines.length; i++) {
    if (/^theme\s*:/.test(lines[i]!)) {
      themeStart = i;
      for (let j = i + 1; j < lines.length; j++) {
        if (/^\S/.test(lines[j]!) && !/^\s*#/.test(lines[j]!) && !/^\s*$/.test(lines[j]!)) {
          themeEnd = j;
          break;
        }
      }
      if (themeEnd === -1) themeEnd = lines.length;
      break;
    }
  }

  // Parse existing theme block to merge with
  const existingColors: Record<string, string> = {};
  const existingFonts: Record<string, string> = {};

  if (themeStart >= 0) {
    let section = '';
    for (let i = themeStart + 1; i < themeEnd; i++) {
      const line = lines[i]!;
      if (/^\s+colors\s*:/.test(line)) {
        section = 'colors';
      } else if (/^\s+fonts\s*:/.test(line)) {
        section = 'fonts';
      } else {
        const kvMatch = line.match(/^\s{4,}(\w+)\s*:\s*(.+)/);
        if (kvMatch) {
          const val = kvMatch[2]!.replace(/^["']|["']$/g, '').trim();
          if (section === 'colors') existingColors[kvMatch[1]!] = val;
          else if (section === 'fonts') existingFonts[kvMatch[1]!] = val;
        }
      }
    }
  }

  // Merge: new overrides take precedence over existing values
  const mergedColors = { ...existingColors, ...overrides.colors };
  const mergedFonts = { ...existingFonts, ...overrides.fonts };

  // Build the merged theme block YAML
  const themeLines: string[] = ['theme:'];
  if (Object.keys(mergedColors).length > 0) {
    themeLines.push('  colors:');
    for (const [key, value] of Object.entries(mergedColors)) {
      themeLines.push(`    ${key}: "${value}"`);
    }
  }
  if (Object.keys(mergedFonts).length > 0) {
    themeLines.push('  fonts:');
    for (const [key, value] of Object.entries(mergedFonts)) {
      themeLines.push(`    ${key}: ${value}`);
    }
  }
  const themeBlock = themeLines.join('\n');

  let result: string;
  if (themeStart >= 0) {
    const before = lines.slice(0, themeStart);
    const after = lines.slice(themeEnd);
    result = [...before, themeBlock, ...after].join('\n');
  } else {
    const trimmed = content.trimEnd();
    result = trimmed + '\n\n' + themeBlock + '\n';
  }

  await writeFile(filePath, result, 'utf-8');
}
