import { createServer } from 'http';
import { resolve } from 'path';
import chalk from 'chalk';
import { loadResume, renderStandaloneHtml } from '../lib/index.js';

export interface PreviewCommandOptions {
  theme: string;
  port?: number;
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

  const server = createServer(async (req, res) => {
    try {
      // Reload resume on each request for live updates
      const resume = await loadResume(resolvedInput);
      const html = await renderStandaloneHtml(resume, options.theme);

      // Inject auto-refresh script for simple hot reload
      const refreshScript = `
        <script>
          // Simple polling-based refresh
          let lastModified = null;
          setInterval(async () => {
            try {
              const resp = await fetch('/__vitae_check');
              const data = await resp.json();
              if (lastModified && lastModified !== data.modified) {
                location.reload();
              }
              lastModified = data.modified;
            } catch {}
          }, 1000);
        </script>
      `;

      if (req.url === '/__vitae_check') {
        // Return modification timestamp
        const { stat } = await import('fs/promises');
        const stats = await stat(resolvedInput);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ modified: stats.mtimeMs }));
        return;
      }

      const htmlWithRefresh = html.replace('</body>', `${refreshScript}</body>`);

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(htmlWithRefresh);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>Error</title></head>
        <body>
          <h1>Error loading resume</h1>
          <pre>${message}</pre>
          <script>setTimeout(() => location.reload(), 2000);</script>
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
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('');
    console.log(chalk.blue('Stopping preview server...'));
    server.close(() => {
      process.exit(0);
    });
  });
}
