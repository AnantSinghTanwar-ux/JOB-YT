/**
 * Centralized AI Configuration
 *
 * Single source of truth for all AI-related configuration.
 * Reads from environment variables with sensible defaults.
 *
 * Active text-generation provider: Groq
 * Active embedding provider:       HuggingFace (free/local)
 *
 * Environment variables:
 *   GROQ_API_KEY               - Required for text generation and JSON reasoning (Groq)
 *   GROQ_MODEL                 - Groq model name (default: llama-3.3-70b-versatile)
 *   HF_API_KEY / HUGGINGFACE_API_KEY - Optional. Enables authenticated inference for HuggingFace
 *   ENABLE_SEMANTIC_SCORING    - Toggle semantic scoring (default: true)
 *   AI_MAX_RETRIES             - Max retry attempts (default: 2)
 *   AI_TIMEOUT_MS              - Request timeout in ms (default: 30000)
 *   AI_CIRCUIT_BREAKER_THRESHOLD - Failures before circuit opens (default: 5)
 *   AI_CIRCUIT_BREAKER_COOLDOWN_MS - Cooldown after circuit opens (default: 60000)
 */

const LOG_PREFIX = '[AI Config]';

export interface AIConfig {
  /** Groq API key — powers text generation and JSON reasoning */
  groqApiKey: string | null;
  /** xAI / Grok API key — used specifically for Resume Builder when configured */
  xaiApiKey: string | null;
  /** xAI model name (e.g. grok-1) */
  xaiModel: string;
  /** Whether xAI / Grok is configured */
  xaiConfigured: boolean;
  /** Anthropic API key — powers Claude text generation */
  anthropicApiKey: string | null;
  /** Anthropic model name (default: claude-3-5-sonnet-20241022) */
  anthropicModel: string;
  /** Whether Anthropic / Claude is configured */
  anthropicConfigured: boolean;
  /** OpenAI API key — fallback for Claude text generation */
  openaiApiKey: string | null;
  /** OpenAI model name (default: gpt-4o) */
  openaiModel: string;
  /** Whether OpenAI is configured */
  openaiConfigured: boolean;
  /** HuggingFace API Key/Token */
  huggingfaceApiKey: string | null;
  /**
   * Whether the active text-generation provider (Groq) is configured.
   * AI reasoning features will be disabled when false.
   */
  isConfigured: boolean;
  /**
   * Whether embeddings are available (checked based on EMBEDDING_PROVIDER).
   * When false, unifiedMatch falls back to keyword-only scoring.
   */
  embeddingsConfigured: boolean;
  /** Active embedding provider name: 'huggingface' */
  embeddingProvider: string;
  /** Text generation model name (Groq model) */
  textModel: string;

  /** Embedding model name */
  embeddingModel: string;
  /** Embedding model version tag for cache isolation */
  embeddingVersion: string;
  /** Custom embedding dimensions (default: 384) */
  embeddingDimensions: number;
  /** Whether semantic scoring is enabled */
  enableSemanticScoring: boolean;
  /** Maximum retry attempts for failed API calls */
  maxRetries: number;
  /** Request timeout in milliseconds */
  timeoutMs: number;
  /** Number of failures before circuit breaker opens */
  circuitBreakerThreshold: number;
  /** Cooldown period after circuit breaker opens (ms) */
  circuitBreakerCooldownMs: number;
  /** Maximum input characters for embedding text */
  maxEmbeddingInputChars: number;
  /** Temperature for text generation */
  defaultTemperature: number;
  /** Default question count for mock interviews */
  defaultQuestionCount: number;
  /** Ollama base URL (default: http://localhost:11434) */
  ollamaBaseUrl: string;
  /** Ollama model name (default: llama3.1:8b) */
  ollamaModel: string;
  /** Whether Ollama is configured */
  ollamaConfigured: boolean;
}

function loadAIConfig(): AIConfig {
  // ── Groq (text generation) ────────────────────────────────────────────────
  const groqApiKey = process.env.GROQ_API_KEY || null;
  const isConfigured = Boolean(groqApiKey && groqApiKey !== 'your_groq_api_key_here');
  // ── xAI / Grok (optional) ───────────────────────────────────────────────
  const xaiApiKey = process.env.XAI_API_KEY || null;
  const xaiModel = process.env.XAI_MODEL || process.env.GROQ_MODEL || 'grok-1';

  // ── Anthropic / Claude (optional) ──────────────────────────────────────────
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || null;
  const anthropicModel = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
  const anthropicConfigured = Boolean(anthropicApiKey && anthropicApiKey !== 'your_anthropic_api_key_here');

  // ── OpenAI Configuration (Fallback) ────────────────────────────────────────
  const openaiApiKey = process.env.OPENAI_API_KEY || null;
  const openaiModel = process.env.OPENAI_MODEL || 'gpt-4o';
  const openaiConfigured = Boolean(openaiApiKey && openaiApiKey !== 'your_openai_api_key_here');

  // ── Ollama Configuration (Local development fallback) ─────────────────────
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.1:8b';
  const ollamaConfigured = Boolean(ollamaBaseUrl);

  // ── Embedding Provider Selection ──────────────────────────────────────────
  const huggingfaceApiKey = process.env.HF_API_KEY || process.env.HUGGINGFACE_API_KEY || null;

  const embeddingProvider = (process.env.EMBEDDING_PROVIDER || 'huggingface').toLowerCase().trim();

  // Validate active provider key configuration
  let embeddingsConfigured = false;
  if (embeddingProvider === 'huggingface' && process.env.ENABLE_SEMANTIC_SCORING === 'true') {
    embeddingsConfigured = true;
  }

  // Resolve default models per provider if not explicitly defined in env
  const defaultEmbeddingModel = 'sentence-transformers/all-MiniLM-L6-v2';
  const embeddingModel = process.env.EMBEDDING_MODEL || defaultEmbeddingModel;
  const embeddingVersion = process.env.EMBEDDING_VERSION || 'v2';

  const embeddingDimensions = parseInt(process.env.EMBEDDING_DIMENSIONS || '384', 10);

  const xaiConfigured = Boolean(xaiApiKey && xaiApiKey !== 'your_xai_api_key_here');

  const config: AIConfig = {
    groqApiKey: isConfigured ? groqApiKey : null,
    xaiApiKey: xaiConfigured ? xaiApiKey : null,
    xaiModel,
    xaiConfigured,
    anthropicApiKey: anthropicConfigured ? anthropicApiKey : null,
    anthropicModel,
    anthropicConfigured,
    openaiApiKey: openaiConfigured ? openaiApiKey : null,
    openaiModel,
    openaiConfigured,
    huggingfaceApiKey: huggingfaceApiKey && huggingfaceApiKey !== 'your_huggingface_api_key_here' ? huggingfaceApiKey : null,
    isConfigured,
    embeddingsConfigured,
    embeddingProvider,
    textModel: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    embeddingModel,
    embeddingVersion,
    embeddingDimensions,
    enableSemanticScoring: process.env.ENABLE_SEMANTIC_SCORING !== 'false',
    maxRetries: parseInt(process.env.AI_MAX_RETRIES || '2', 10),
    timeoutMs: parseInt(process.env.AI_TIMEOUT_MS || '60000', 10),
    circuitBreakerThreshold: parseInt(process.env.AI_CIRCUIT_BREAKER_THRESHOLD || '5', 10),
    circuitBreakerCooldownMs: parseInt(process.env.AI_CIRCUIT_BREAKER_COOLDOWN_MS || '60000', 10),
    maxEmbeddingInputChars: 8000,
    defaultTemperature: 0.1,
    defaultQuestionCount: parseInt(process.env.INTERVIEW_QUESTION_COUNT || '5', 10),
    ollamaBaseUrl,
    ollamaModel,
    ollamaConfigured,
  };

  if (!isConfigured) {
    console.warn(`${LOG_PREFIX} GROQ_API_KEY is not configured — AI text features will be disabled`);
  }
  if (!xaiApiKey) {
    console.log(`${LOG_PREFIX} XAI_API_KEY not provided — Grok provider will be disabled until configured`);
  }
  if (!anthropicApiKey) {
    console.log(`${LOG_PREFIX} ANTHROPIC_API_KEY not provided — Claude provider will be disabled until configured`);
  } else {
    console.log(`${LOG_PREFIX} Claude provider configured using model: "${anthropicModel}"`);
  }
  if (!openaiApiKey) {
    console.log(`${LOG_PREFIX} OPENAI_API_KEY not provided — OpenAI fallback will be disabled`);
  } else {
    console.log(`${LOG_PREFIX} OpenAI fallback configured using model: "${openaiModel}"`);
  }
  if (ollamaConfigured) {
    console.log(`${LOG_PREFIX} Ollama local fallback configured using model: "${ollamaModel}" at "${ollamaBaseUrl}"`);
  }
  if (!embeddingsConfigured) {
    console.warn(
      `${LOG_PREFIX} Embedding provider "${embeddingProvider}" is not configured — ` +
        'semantic scoring will be disabled (keyword scoring will be used instead)',
    );
  } else {
    console.log(
      `${LOG_PREFIX} Embedding provider configured: "${embeddingProvider}" using model: "${embeddingModel}" (dims: ${embeddingDimensions}, version: ${embeddingVersion})`,
    );
  }

  return config;
}

/** Singleton AI configuration, loaded once at module import. */
export const aiConfig = loadAIConfig();
