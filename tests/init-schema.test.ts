import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('init command schema directive', () => {
  // Read the init.ts source to verify the schema directive is embedded
  const initSource = readFileSync(
    join(__dirname, '../src/commands/init.ts'),
    'utf-8'
  );

  it('defines SCHEMA_URL constant pointing to raw GitHub schema', () => {
    expect(initSource).toContain('SCHEMA_URL');
    expect(initSource).toContain(
      'raw.githubusercontent.com/jkindrix/vitae/main/schemas/resume.schema.json'
    );
  });

  it('includes yaml-language-server directive in template', () => {
    expect(initSource).toContain('# yaml-language-server: $schema=${SCHEMA_URL}');
  });

  it('includes directive in both template and interactive mode', () => {
    // Count occurrences of the schema directive pattern
    const matches = initSource.match(/yaml-language-server: \$schema=\$\{SCHEMA_URL\}/g);
    // Should appear at least twice: EXAMPLE_RESUME template + interactive output
    expect(matches?.length).toBeGreaterThanOrEqual(2);
  });
});
