import { createServer, type ServerResponse } from 'http';
import { resolve, dirname } from 'path';
import { watch } from 'fs';
import chalk from 'chalk';
import { loadResume, renderStandaloneHtml } from '../lib/index.js';

export interface PreviewCommandOptions {
  theme: string;
  port?: number;
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
  const port = options.port ?? 3000;

  console.log(chalk.blue('Starting preview server...'));

  // Watch for file changes
  let debounceTimer: NodeJS.Timeout | null = null;
  const watcher = watch(dirname(resolvedInput), (_eventType, filename) => {
    // Debounce rapid file changes
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      if (filename?.endsWith('.yaml') || filename?.endsWith('.yml')) {
        console.log(chalk.dim(`  [${new Date().toLocaleTimeString()}] File changed, reloading...`));
        broadcastReload();
      }
    }, 100);
  });

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

      // Reload resume on each request for live updates
      const resume = await loadResume(resolvedInput);
      const html = await renderStandaloneHtml(resume, options.theme);

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

      const htmlWithHotReload = html.replace('</body>', `${hotReloadScript}</body>`);

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(htmlWithHotReload);
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

    // Stop file watcher
    watcher.close();

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
