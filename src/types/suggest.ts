/**
 * Types for the AI content suggestion system
 */

import type { SectionName } from './resume.js';

// ---------------------------------------------------------------------------
// LLM provider configuration
// ---------------------------------------------------------------------------

/** Supported LLM providers */
export type LlmProvider = 'openai' | 'anthropic' | 'ollama';

/** Resolved LLM configuration */
export interface LlmConfig {
  provider: LlmProvider;
  apiKey?: string;
  model: string;
  baseUrl?: string;
}

/** A chat message sent to the LLM */
export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Response from the LLM */
export interface LlmResponse {
  content: string;
}

// ---------------------------------------------------------------------------
// Suggestion types
// ---------------------------------------------------------------------------

/** Category of improvement suggested */
export type SuggestionCategory =
  | 'action-verb'
  | 'quantify'
  | 'impact'
  | 'conciseness'
  | 'clarity'
  | 'keyword'
  | 'general';

/** A single content improvement suggestion */
export interface Suggestion {
  category: SuggestionCategory;
  section: SectionName | 'meta';
  context?: string;
  current: string;
  suggested: string;
  reasoning: string;
}

/** Suggestions grouped by resume section */
export interface SectionSuggestions {
  section: SectionName | 'meta';
  label: string;
  suggestions: Suggestion[];
}

/** Full result from the suggestion engine */
export interface SuggestResult {
  sections: SectionSuggestions[];
  totalSuggestions: number;
  provider: LlmProvider;
  model: string;
}

/** Options for the suggestion engine */
export interface SuggestOptions {
  section?: string;
  provider?: LlmProvider;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
}
