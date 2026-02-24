/**
 * LLM client abstraction — thin wrapper over native fetch() supporting
 * OpenAI, Anthropic, and Ollama providers.
 */

import { LlmError } from './errors.js';
import type { LlmConfig, LlmMessage, LlmProvider, LlmResponse } from '../types/suggest.js';

// ---------------------------------------------------------------------------
// Default models per provider
// ---------------------------------------------------------------------------

const DEFAULT_MODELS: Record<LlmProvider, string> = {
  anthropic: 'claude-sonnet-4-5-20250929',
  openai: 'gpt-4o-mini',
  ollama: 'llama3.2',
};

const DEFAULT_BASE_URLS: Record<LlmProvider, string> = {
  openai: 'https://api.openai.com',
  anthropic: 'https://api.anthropic.com',
  ollama: 'http://localhost:11434',
};

// ---------------------------------------------------------------------------
// Config resolution
// ---------------------------------------------------------------------------

export interface ResolveLlmConfigOptions {
  provider?: string;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
}

/**
 * Resolve LLM configuration from CLI options and environment variables.
 *
 * Detection priority (when --provider is not specified):
 *   1. ANTHROPIC_API_KEY → anthropic
 *   2. OPENAI_API_KEY   → openai
 *   3. OLLAMA_URL / OLLAMA_HOST → ollama
 */
export function resolveLlmConfig(options?: ResolveLlmConfigOptions): LlmConfig {
  const opts = options ?? {};

  // Explicit provider override
  if (opts.provider) {
    const provider = opts.provider as LlmProvider;
    if (!['openai', 'anthropic', 'ollama'].includes(provider)) {
      throw new LlmError(
        `Unknown provider '${provider}'. Supported: openai, anthropic, ollama`,
        provider,
      );
    }
    const apiKey = opts.apiKey ?? getEnvKey(provider);
    return {
      provider,
      ...(apiKey ? { apiKey } : {}),
      model: opts.model ?? DEFAULT_MODELS[provider],
      baseUrl: opts.baseUrl ?? getEnvBaseUrl(provider) ?? DEFAULT_BASE_URLS[provider],
    };
  }

  // Auto-detect from environment variables
  const anthropicKey = opts.apiKey ?? process.env['ANTHROPIC_API_KEY'];
  if (anthropicKey) {
    return {
      provider: 'anthropic',
      apiKey: anthropicKey,
      model: opts.model ?? DEFAULT_MODELS.anthropic,
      baseUrl: opts.baseUrl ?? DEFAULT_BASE_URLS.anthropic,
    };
  }

  const openaiKey = opts.apiKey ?? process.env['OPENAI_API_KEY'];
  if (openaiKey) {
    return {
      provider: 'openai',
      apiKey: openaiKey,
      model: opts.model ?? DEFAULT_MODELS.openai,
      baseUrl: opts.baseUrl ?? (process.env['OPENAI_BASE_URL'] ?? DEFAULT_BASE_URLS.openai),
    };
  }

  const ollamaUrl = process.env['OLLAMA_URL'] ?? process.env['OLLAMA_HOST'];
  if (ollamaUrl || opts.baseUrl) {
    return {
      provider: 'ollama',
      model: opts.model ?? DEFAULT_MODELS.ollama,
      baseUrl: opts.baseUrl ?? ollamaUrl ?? DEFAULT_BASE_URLS.ollama,
    };
  }

  throw LlmError.noCredentials();
}

function getEnvKey(provider: LlmProvider): string | undefined {
  switch (provider) {
    case 'anthropic':
      return process.env['ANTHROPIC_API_KEY'];
    case 'openai':
      return process.env['OPENAI_API_KEY'];
    case 'ollama':
      return undefined;
  }
}

function getEnvBaseUrl(provider: LlmProvider): string | undefined {
  switch (provider) {
    case 'openai':
      return process.env['OPENAI_BASE_URL'];
    case 'ollama':
      return process.env['OLLAMA_URL'] ?? process.env['OLLAMA_HOST'];
    case 'anthropic':
      return undefined;
  }
}

// ---------------------------------------------------------------------------
// LLM call
// ---------------------------------------------------------------------------

/**
 * Send a chat completion request to the configured LLM provider.
 */
export async function callLlm(config: LlmConfig, messages: LlmMessage[]): Promise<LlmResponse> {
  switch (config.provider) {
    case 'openai':
      return callOpenAi(config, messages);
    case 'anthropic':
      return callAnthropic(config, messages);
    case 'ollama':
      return callOllama(config, messages);
  }
}

// ---------------------------------------------------------------------------
// Provider implementations
// ---------------------------------------------------------------------------

async function callOpenAi(config: LlmConfig, messages: LlmMessage[]): Promise<LlmResponse> {
  const url = `${config.baseUrl}/v1/chat/completions`;

  const body = {
    model: config.model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    temperature: 0.3,
    response_format: { type: 'json_object' },
  };

  const res = await safeFetch(config.provider, url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw LlmError.invalidResponse(
      config.provider,
      new Error('No content in response'),
    );
  }

  return { content };
}

async function callAnthropic(config: LlmConfig, messages: LlmMessage[]): Promise<LlmResponse> {
  const url = `${config.baseUrl}/v1/messages`;

  // Anthropic uses a separate system parameter
  const systemMsg = messages.find((m) => m.role === 'system');
  const userMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role, content: m.content }));

  const body: Record<string, unknown> = {
    model: config.model,
    messages: userMessages,
    max_tokens: 4096,
    temperature: 0.3,
  };
  if (systemMsg) {
    body['system'] = systemMsg.content;
  }

  const res = await safeFetch(config.provider, url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };

  const textBlock = data.content?.find((b) => b.type === 'text');
  if (!textBlock?.text) {
    throw LlmError.invalidResponse(
      config.provider,
      new Error('No text content in response'),
    );
  }

  return { content: textBlock.text };
}

async function callOllama(config: LlmConfig, messages: LlmMessage[]): Promise<LlmResponse> {
  const url = `${config.baseUrl}/api/chat`;

  const body = {
    model: config.model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    stream: false,
    format: 'json',
  };

  const res = await safeFetch(config.provider, url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as {
    message?: { content?: string };
  };

  const content = data.message?.content;
  if (!content) {
    throw LlmError.invalidResponse(
      config.provider,
      new Error('No content in response'),
    );
  }

  return { content };
}

// ---------------------------------------------------------------------------
// Fetch wrapper with error classification
// ---------------------------------------------------------------------------

async function safeFetch(provider: string, url: string, init: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (err) {
    throw LlmError.connectionFailed(provider, err instanceof Error ? err : new Error(String(err)));
  }

  if (res.status === 401 || res.status === 403) {
    throw LlmError.authFailed(provider);
  }
  if (res.status === 429) {
    throw LlmError.rateLimited(provider);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '(unable to read body)');
    throw LlmError.requestFailed(provider, res.status, body);
  }

  return res;
}
