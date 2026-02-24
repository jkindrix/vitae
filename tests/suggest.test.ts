import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveLlmConfig, callLlm } from '../src/lib/llm.js';
import { generateSuggestions, extractResumeContent } from '../src/lib/suggest.js';
import { LlmError } from '../src/lib/errors.js';
import type { Resume } from '../src/types/resume.js';
import type { LlmConfig } from '../src/types/suggest.js';

// ---------------------------------------------------------------------------
// Factory: minimal resume for testing
// ---------------------------------------------------------------------------

function sampleResume(overrides?: Partial<Resume>): Resume {
  return {
    meta: { name: 'Jane Smith', title: 'Software Engineer' },
    experience: [
      {
        company: 'Acme Corp',
        roles: [
          {
            title: 'Senior Engineer',
            start: '2020-01',
            summary: 'Worked on backend systems',
            highlights: [
              'Helped improve API performance',
              'Did code reviews for the team',
            ],
          },
        ],
      },
    ],
    skills: [
      { category: 'Languages', items: ['TypeScript', 'Python'] },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mock fetch helper
// ---------------------------------------------------------------------------

function mockFetchResponse(body: unknown, status = 200): void {
  const response = {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;

  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
}

function mockFetchError(error: Error): void {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
}

// ---------------------------------------------------------------------------
// Canned LLM response
// ---------------------------------------------------------------------------

const CANNED_RESPONSE = {
  sections: [
    {
      section: 'experience',
      label: 'Experience — Senior Engineer at Acme Corp',
      suggestions: [
        {
          category: 'action-verb',
          current: 'Helped improve API performance',
          suggested: 'Optimized API performance',
          reasoning: 'Stronger action verb conveys direct contribution',
        },
        {
          category: 'quantify',
          current: 'Did code reviews for the team',
          suggested: 'Conducted 50+ code reviews monthly for a team of 8 engineers',
          reasoning: 'Adding metrics demonstrates scope and consistency',
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Environment variable management
// ---------------------------------------------------------------------------

let savedEnv: NodeJS.ProcessEnv;

beforeEach(() => {
  savedEnv = { ...process.env };
  // Clear LLM-related env vars for clean test state
  delete process.env['ANTHROPIC_API_KEY'];
  delete process.env['OPENAI_API_KEY'];
  delete process.env['OPENAI_BASE_URL'];
  delete process.env['OLLAMA_URL'];
  delete process.env['OLLAMA_HOST'];
});

afterEach(() => {
  process.env = savedEnv;
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// resolveLlmConfig
// ---------------------------------------------------------------------------

describe('resolveLlmConfig', () => {
  it('throws when no credentials are set', () => {
    expect(() => resolveLlmConfig()).toThrow(LlmError);
    expect(() => resolveLlmConfig()).toThrow(/No LLM credentials found/);
  });

  it('auto-detects anthropic from env', () => {
    process.env['ANTHROPIC_API_KEY'] = 'sk-ant-test';
    const config = resolveLlmConfig();
    expect(config.provider).toBe('anthropic');
    expect(config.apiKey).toBe('sk-ant-test');
    expect(config.model).toContain('claude');
  });

  it('auto-detects openai from env', () => {
    process.env['OPENAI_API_KEY'] = 'sk-openai-test';
    const config = resolveLlmConfig();
    expect(config.provider).toBe('openai');
    expect(config.apiKey).toBe('sk-openai-test');
    expect(config.model).toContain('gpt');
  });

  it('auto-detects ollama from OLLAMA_URL', () => {
    process.env['OLLAMA_URL'] = 'http://localhost:11434';
    const config = resolveLlmConfig();
    expect(config.provider).toBe('ollama');
    expect(config.baseUrl).toBe('http://localhost:11434');
    expect(config.apiKey).toBeUndefined();
  });

  it('auto-detects ollama from OLLAMA_HOST', () => {
    process.env['OLLAMA_HOST'] = 'http://myhost:11434';
    const config = resolveLlmConfig();
    expect(config.provider).toBe('ollama');
    expect(config.baseUrl).toBe('http://myhost:11434');
  });

  it('prioritizes anthropic over openai', () => {
    process.env['ANTHROPIC_API_KEY'] = 'sk-ant';
    process.env['OPENAI_API_KEY'] = 'sk-oai';
    const config = resolveLlmConfig();
    expect(config.provider).toBe('anthropic');
  });

  it('respects explicit --provider override', () => {
    process.env['ANTHROPIC_API_KEY'] = 'sk-ant';
    process.env['OPENAI_API_KEY'] = 'sk-oai';
    const config = resolveLlmConfig({ provider: 'openai' });
    expect(config.provider).toBe('openai');
    expect(config.apiKey).toBe('sk-oai');
  });

  it('respects explicit --model override', () => {
    process.env['OPENAI_API_KEY'] = 'sk-oai';
    const config = resolveLlmConfig({ model: 'gpt-4' });
    expect(config.model).toBe('gpt-4');
  });

  it('respects explicit --api-key override', () => {
    process.env['OPENAI_API_KEY'] = 'sk-from-env';
    const config = resolveLlmConfig({ apiKey: 'sk-from-flag' });
    // apiKey flag is checked first, triggers anthropic detection path
    // because anthropicKey = opts.apiKey ?? process.env['ANTHROPIC_API_KEY']
    expect(config.apiKey).toBe('sk-from-flag');
  });

  it('respects explicit --base-url for ollama', () => {
    const config = resolveLlmConfig({ provider: 'ollama', baseUrl: 'http://gpu:11434' });
    expect(config.baseUrl).toBe('http://gpu:11434');
  });

  it('throws for unknown provider', () => {
    expect(() => resolveLlmConfig({ provider: 'invalid' })).toThrow(/Unknown provider/);
  });

  it('uses OPENAI_BASE_URL when set', () => {
    process.env['OPENAI_API_KEY'] = 'sk-test';
    process.env['OPENAI_BASE_URL'] = 'https://custom.openai.proxy.com';
    const config = resolveLlmConfig();
    expect(config.baseUrl).toBe('https://custom.openai.proxy.com');
  });
});

// ---------------------------------------------------------------------------
// callLlm — OpenAI
// ---------------------------------------------------------------------------

describe('callLlm — openai', () => {
  const config: LlmConfig = {
    provider: 'openai',
    apiKey: 'sk-test',
    model: 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com',
  };

  it('sends correct request format', async () => {
    mockFetchResponse({
      choices: [{ message: { content: '{"sections":[]}' } }],
    });

    await callLlm(config, [
      { role: 'system', content: 'You are helpful.' },
      { role: 'user', content: 'Hello' },
    ]);

    const fetchFn = vi.mocked(globalThis.fetch);
    expect(fetchFn).toHaveBeenCalledOnce();

    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(init?.method).toBe('POST');

    const headers = init?.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer sk-test');

    const body = JSON.parse(init?.body as string);
    expect(body.model).toBe('gpt-4o-mini');
    expect(body.messages).toHaveLength(2);
    expect(body.response_format).toEqual({ type: 'json_object' });
  });

  it('extracts content from openai response', async () => {
    mockFetchResponse({
      choices: [{ message: { content: '{"result":"ok"}' } }],
    });

    const result = await callLlm(config, [{ role: 'user', content: 'test' }]);
    expect(result.content).toBe('{"result":"ok"}');
  });

  it('throws on empty response', async () => {
    mockFetchResponse({ choices: [] });
    await expect(callLlm(config, [{ role: 'user', content: 'test' }])).rejects.toThrow(
      /No content/,
    );
  });
});

// ---------------------------------------------------------------------------
// callLlm — Anthropic
// ---------------------------------------------------------------------------

describe('callLlm — anthropic', () => {
  const config: LlmConfig = {
    provider: 'anthropic',
    apiKey: 'sk-ant-test',
    model: 'claude-sonnet-4-5-20250929',
    baseUrl: 'https://api.anthropic.com',
  };

  it('sends correct request format', async () => {
    mockFetchResponse({
      content: [{ type: 'text', text: '{"sections":[]}' }],
    });

    await callLlm(config, [
      { role: 'system', content: 'System prompt' },
      { role: 'user', content: 'User message' },
    ]);

    const fetchFn = vi.mocked(globalThis.fetch);
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe('https://api.anthropic.com/v1/messages');

    const headers = init?.headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('sk-ant-test');
    expect(headers['anthropic-version']).toBe('2023-06-01');

    const body = JSON.parse(init?.body as string);
    expect(body.system).toBe('System prompt');
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].role).toBe('user');
    expect(body.max_tokens).toBe(4096);
  });

  it('extracts content from anthropic response', async () => {
    mockFetchResponse({
      content: [{ type: 'text', text: '{"data":"value"}' }],
    });

    const result = await callLlm(config, [{ role: 'user', content: 'test' }]);
    expect(result.content).toBe('{"data":"value"}');
  });
});

// ---------------------------------------------------------------------------
// callLlm — Ollama
// ---------------------------------------------------------------------------

describe('callLlm — ollama', () => {
  const config: LlmConfig = {
    provider: 'ollama',
    model: 'llama3.2',
    baseUrl: 'http://localhost:11434',
  };

  it('sends correct request format', async () => {
    mockFetchResponse({
      message: { content: '{"sections":[]}' },
    });

    await callLlm(config, [
      { role: 'system', content: 'System' },
      { role: 'user', content: 'Hello' },
    ]);

    const fetchFn = vi.mocked(globalThis.fetch);
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe('http://localhost:11434/api/chat');

    const body = JSON.parse(init?.body as string);
    expect(body.model).toBe('llama3.2');
    expect(body.stream).toBe(false);
    expect(body.format).toBe('json');
    expect(body.messages).toHaveLength(2);
  });

  it('sends no auth headers', async () => {
    mockFetchResponse({ message: { content: '{}' } });

    await callLlm(config, [{ role: 'user', content: 'test' }]);

    const fetchFn = vi.mocked(globalThis.fetch);
    const headers = fetchFn.mock.calls[0]![1]?.headers as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
    expect(headers['x-api-key']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// callLlm — error handling
// ---------------------------------------------------------------------------

describe('callLlm — errors', () => {
  const config: LlmConfig = {
    provider: 'openai',
    apiKey: 'sk-test',
    model: 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com',
  };

  it('throws authFailed on 401', async () => {
    mockFetchResponse({}, 401);
    await expect(callLlm(config, [{ role: 'user', content: 'test' }])).rejects.toThrow(
      /Authentication failed/,
    );
  });

  it('throws authFailed on 403', async () => {
    mockFetchResponse({}, 403);
    await expect(callLlm(config, [{ role: 'user', content: 'test' }])).rejects.toThrow(
      /Authentication failed/,
    );
  });

  it('throws rateLimited on 429', async () => {
    mockFetchResponse({}, 429);
    await expect(callLlm(config, [{ role: 'user', content: 'test' }])).rejects.toThrow(
      /Rate limited/,
    );
  });

  it('throws requestFailed on 500', async () => {
    mockFetchResponse({ error: 'internal' }, 500);
    await expect(callLlm(config, [{ role: 'user', content: 'test' }])).rejects.toThrow(
      /request failed.*500/i,
    );
  });

  it('throws connectionFailed on network error', async () => {
    mockFetchError(new Error('ECONNREFUSED'));
    await expect(callLlm(config, [{ role: 'user', content: 'test' }])).rejects.toThrow(
      /Failed to connect/,
    );
  });
});

// ---------------------------------------------------------------------------
// extractResumeContent
// ---------------------------------------------------------------------------

describe('extractResumeContent', () => {
  it('extracts all sections by default', () => {
    const resume = sampleResume({
      summary: 'Experienced engineer with 5 years.',
      projects: [{ name: 'fastcache', description: 'Caching library' }],
    });
    const content = extractResumeContent(resume);

    expect(content).toContain('## Meta');
    expect(content).toContain('Jane Smith');
    expect(content).toContain('## Summary');
    expect(content).toContain('Experienced engineer');
    expect(content).toContain('## Experience');
    expect(content).toContain('Senior Engineer at Acme Corp');
    expect(content).toContain('## Skills');
    expect(content).toContain('TypeScript');
    expect(content).toContain('## Projects');
    expect(content).toContain('fastcache');
  });

  it('filters to specific section', () => {
    const resume = sampleResume({ summary: 'My summary.' });
    const content = extractResumeContent(resume, 'summary');

    expect(content).toContain('## Summary');
    expect(content).not.toContain('## Experience');
    expect(content).not.toContain('## Skills');
  });

  it('includes experience highlights', () => {
    const resume = sampleResume();
    const content = extractResumeContent(resume, 'experience');

    expect(content).toContain('Helped improve API performance');
    expect(content).toContain('Did code reviews for the team');
  });

  it('handles tagged highlights', () => {
    const resume = sampleResume({
      experience: [
        {
          company: 'Test',
          roles: [
            {
              title: 'Dev',
              start: '2020-01',
              highlights: [
                { text: 'Tagged highlight', tags: ['backend'] },
                'Plain highlight',
              ],
            },
          ],
        },
      ],
    });
    const content = extractResumeContent(resume, 'experience');

    expect(content).toContain('Tagged highlight');
    expect(content).toContain('Plain highlight');
  });

  it('handles empty resume gracefully', () => {
    const resume: Resume = {
      meta: { name: 'Empty' },
      experience: [],
    };
    const content = extractResumeContent(resume);

    expect(content).toContain('## Meta');
    expect(content).toContain('Empty');
    expect(content).not.toContain('## Experience');
  });

  it('includes education section', () => {
    const resume = sampleResume({
      education: [
        {
          institution: 'MIT',
          degree: 'BS',
          field: 'Computer Science',
          highlights: ['Summa Cum Laude'],
        },
      ],
    });
    const content = extractResumeContent(resume, 'education');

    expect(content).toContain('## Education');
    expect(content).toContain('MIT');
    expect(content).toContain('Summa Cum Laude');
  });

  it('includes volunteer section', () => {
    const resume = sampleResume({
      volunteer: [
        {
          organization: 'Code for America',
          position: 'Tech Lead',
          summary: 'Led civic tech projects',
        },
      ],
    });
    const content = extractResumeContent(resume, 'volunteer');

    expect(content).toContain('## Volunteer');
    expect(content).toContain('Code for America');
  });
});

// ---------------------------------------------------------------------------
// generateSuggestions — integration with mocked fetch
// ---------------------------------------------------------------------------

describe('generateSuggestions', () => {
  beforeEach(() => {
    process.env['OPENAI_API_KEY'] = 'sk-test';
  });

  it('returns parsed suggestions from LLM response', async () => {
    mockFetchResponse({
      choices: [{ message: { content: JSON.stringify(CANNED_RESPONSE) } }],
    });

    const resume = sampleResume();
    const result = await generateSuggestions(resume);

    expect(result.provider).toBe('openai');
    expect(result.model).toContain('gpt');
    expect(result.totalSuggestions).toBe(2);
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0]!.section).toBe('experience');
    expect(result.sections[0]!.suggestions[0]!.category).toBe('action-verb');
    expect(result.sections[0]!.suggestions[0]!.current).toBe('Helped improve API performance');
  });

  it('filters to requested section', async () => {
    const multiSectionResponse = {
      sections: [
        {
          section: 'summary',
          label: 'Summary',
          suggestions: [
            { category: 'clarity', current: 'old', suggested: 'new', reasoning: 'better' },
          ],
        },
        {
          section: 'experience',
          label: 'Experience',
          suggestions: [
            { category: 'action-verb', current: 'old', suggested: 'new', reasoning: 'better' },
          ],
        },
      ],
    };

    mockFetchResponse({
      choices: [{ message: { content: JSON.stringify(multiSectionResponse) } }],
    });

    const resume = sampleResume({ summary: 'My summary' });
    const result = await generateSuggestions(resume, { section: 'experience' });

    expect(result.sections).toHaveLength(1);
    expect(result.sections[0]!.section).toBe('experience');
    expect(result.totalSuggestions).toBe(1);
  });

  it('returns empty result when LLM has no suggestions', async () => {
    mockFetchResponse({
      choices: [{ message: { content: '{"sections":[]}' } }],
    });

    const resume = sampleResume();
    const result = await generateSuggestions(resume);

    expect(result.totalSuggestions).toBe(0);
    expect(result.sections).toHaveLength(0);
  });

  it('handles markdown-wrapped JSON response', async () => {
    const wrapped = '```json\n' + JSON.stringify(CANNED_RESPONSE) + '\n```';
    mockFetchResponse({
      choices: [{ message: { content: wrapped } }],
    });

    const resume = sampleResume();
    const result = await generateSuggestions(resume);
    expect(result.totalSuggestions).toBe(2);
  });

  it('throws on invalid JSON response', async () => {
    mockFetchResponse({
      choices: [{ message: { content: 'not valid json' } }],
    });

    const resume = sampleResume();
    await expect(generateSuggestions(resume)).rejects.toThrow(/Invalid response/);
  });

  it('throws on missing sections field', async () => {
    mockFetchResponse({
      choices: [{ message: { content: '{"data":"no sections"}' } }],
    });

    const resume = sampleResume();
    await expect(generateSuggestions(resume)).rejects.toThrow(/missing.*sections/i);
  });

  it('skips suggestions with invalid sections', async () => {
    const response = {
      sections: [
        {
          section: 'invalid_section',
          label: 'Invalid',
          suggestions: [
            { category: 'general', current: 'old', suggested: 'new', reasoning: 'why' },
          ],
        },
        {
          section: 'experience',
          label: 'Experience',
          suggestions: [
            { category: 'action-verb', current: 'old', suggested: 'new', reasoning: 'why' },
          ],
        },
      ],
    };

    mockFetchResponse({
      choices: [{ message: { content: JSON.stringify(response) } }],
    });

    const resume = sampleResume();
    const result = await generateSuggestions(resume);
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0]!.section).toBe('experience');
  });

  it('normalizes unknown categories to general', async () => {
    const response = {
      sections: [
        {
          section: 'summary',
          label: 'Summary',
          suggestions: [
            { category: 'unknown_cat', current: 'old', suggested: 'new', reasoning: 'why' },
          ],
        },
      ],
    };

    mockFetchResponse({
      choices: [{ message: { content: JSON.stringify(response) } }],
    });

    const resume = sampleResume({ summary: 'Test' });
    const result = await generateSuggestions(resume);
    expect(result.sections[0]!.suggestions[0]!.category).toBe('general');
  });

  it('skips suggestions with empty current or suggested', async () => {
    const response = {
      sections: [
        {
          section: 'summary',
          label: 'Summary',
          suggestions: [
            { category: 'clarity', current: '', suggested: 'new', reasoning: 'why' },
            { category: 'clarity', current: 'old', suggested: '', reasoning: 'why' },
            { category: 'clarity', current: 'valid old', suggested: 'valid new', reasoning: 'ok' },
          ],
        },
      ],
    };

    mockFetchResponse({
      choices: [{ message: { content: JSON.stringify(response) } }],
    });

    const resume = sampleResume({ summary: 'Test' });
    const result = await generateSuggestions(resume);
    expect(result.sections[0]!.suggestions).toHaveLength(1);
    expect(result.sections[0]!.suggestions[0]!.current).toBe('valid old');
  });

  it('respects provider option', async () => {
    process.env['ANTHROPIC_API_KEY'] = 'sk-ant';
    mockFetchResponse({
      content: [{ type: 'text', text: JSON.stringify(CANNED_RESPONSE) }],
    });

    const resume = sampleResume();
    const result = await generateSuggestions(resume, { provider: 'anthropic' });
    expect(result.provider).toBe('anthropic');
  });
});

// ---------------------------------------------------------------------------
// LlmError
// ---------------------------------------------------------------------------

describe('LlmError', () => {
  it('noCredentials has descriptive message', () => {
    const err = LlmError.noCredentials();
    expect(err.message).toContain('ANTHROPIC_API_KEY');
    expect(err.message).toContain('OPENAI_API_KEY');
    expect(err.message).toContain('OLLAMA_URL');
    expect(err.provider).toBe('none');
    expect(err.code).toBe('LLM_ERROR');
  });

  it('authFailed includes provider', () => {
    const err = LlmError.authFailed('openai');
    expect(err.message).toContain('openai');
    expect(err.message).toContain('Authentication failed');
    expect(err.provider).toBe('openai');
  });

  it('rateLimited includes provider', () => {
    const err = LlmError.rateLimited('anthropic');
    expect(err.message).toContain('Rate limited');
    expect(err.provider).toBe('anthropic');
  });

  it('connectionFailed includes cause', () => {
    const cause = new Error('ECONNREFUSED');
    const err = LlmError.connectionFailed('ollama', cause);
    expect(err.message).toContain('ECONNREFUSED');
    expect(err.cause).toBe(cause);
  });

  it('requestFailed includes status and truncated body', () => {
    const err = LlmError.requestFailed('openai', 500, 'Internal Server Error');
    expect(err.message).toContain('500');
    expect(err.message).toContain('Internal Server Error');
  });

  it('invalidResponse includes cause message', () => {
    const cause = new Error('missing field');
    const err = LlmError.invalidResponse('anthropic', cause);
    expect(err.message).toContain('missing field');
  });

  it('is instance of VitaeError', async () => {
    const { VitaeError } = await import('../src/lib/errors.js');
    const err = LlmError.noCredentials();
    expect(err).toBeInstanceOf(VitaeError);
  });
});
