// Provider registry - defines all supported AI providers
// Each provider has a name, available models, default model, and env key

export const PROVIDERS = {
  anthropic: {
    name: "Anthropic",
    models: [
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", contextWindow: 200000 },
      { id: "claude-haiku-4-5-20250514", name: "Claude Haiku 4.5", contextWindow: 200000 },
      { id: "claude-opus-4-20250514", name: "Claude Opus 4", contextWindow: 200000 },
    ],
    default: "claude-sonnet-4-20250514",
    envKey: "ANTHROPIC_API_KEY",
    supportsTools: true,
  },
  openai: {
    name: "OpenAI",
    models: [
      { id: "gpt-4o", name: "GPT-4o", contextWindow: 128000 },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", contextWindow: 128000 },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo", contextWindow: 128000 },
      { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", contextWindow: 16385 },
    ],
    default: "gpt-4o-mini",
    envKey: "OPENAI_API_KEY",
    supportsTools: true,
  },
  google: {
    name: "Google Gemini",
    models: [
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash (vision)", contextWindow: 1000000 },
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", contextWindow: 1000000 },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", contextWindow: 1000000 },
    ],
    default: "gemini-2.5-flash",
    envKey: "GOOGLE_AI_API_KEY",
    supportsTools: true,
  },
  openrouter: {
    name: "OpenRouter",
    models: [
      { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", contextWindow: 200000 },
      { id: "openai/gpt-4o", name: "GPT-4o", contextWindow: 128000 },
      { id: "google/gemini-pro-1.5", name: "Gemini Pro 1.5", contextWindow: 1000000 },
      { id: "meta-llama/llama-3.1-405b-instruct", name: "Llama 3.1 405B", contextWindow: 131072 },
    ],
    default: "anthropic/claude-3.5-sonnet",
    envKey: "OPENROUTER_API_KEY",
    supportsTools: true,
  },
  xai: {
    name: "xAI (Grok)",
    models: [
      { id: "grok-2", name: "Grok 2", contextWindow: 131072 },
      { id: "grok-2-mini", name: "Grok 2 Mini", contextWindow: 131072 },
    ],
    default: "grok-2-mini",
    envKey: "XAI_API_KEY",
    supportsTools: true,
  },
  completions: {
    name: "Free AI API",
    models: [
      { id: "smart-chat", name: "Smart Chat (auto-route)", contextWindow: 128000 },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", contextWindow: 1000000 },
      { id: "kimi-k2.5", name: "Kimi K2.5", contextWindow: 128000 },
      { id: "gpt-5.5", name: "GPT-5.5", contextWindow: 128000 },
    ],
    default: "smart-chat",
    envKey: "COMPLETIONS_API_KEY",
    supportsTools: true,
  },
  freetheai: {
    name: "FreeTheAi",
    models: [
      { id: "opc/deepseek-v4-flash-free", name: "DeepSeek V4 Flash", contextWindow: 128000 },
      { id: "opc/minimax-m3-free", name: "MiniMax M3", contextWindow: 128000 },
      { id: "opc/qwen3.6-plus-free", name: "Qwen 3.6 Plus", contextWindow: 128000 },
      { id: "kai/openrouter/free", name: "OpenRouter Free", contextWindow: 128000 },
      { id: "kai/poolside/laguna-m.1:free", name: "Laguna M.1", contextWindow: 128000 },
    ],
    default: "opc/deepseek-v4-flash-free",
    envKey: "FREETHEAI_API_KEY",
    supportsTools: true,
  },
  groq: {
    name: "Groq (Free)",
    models: [
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B (best)", contextWindow: 131072 },
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B (fastest)", contextWindow: 131072 },
      { id: "llama-4-scout-17b-16e-instruct", name: "Llama 4 Scout", contextWindow: 131072 },
      { id: "llama-4-maverick-21b-12b-instruct", name: "Llama 4 Maverick", contextWindow: 131072 },
      { id: "deepseek-r1-distill-llama-70b", name: "DeepSeek R1 70B", contextWindow: 131072 },
      { id: "qwen-qwq-32b", name: "Qwen QwQ 32B", contextWindow: 131072 },
      { id: "mistral-saba-24b", name: "Mistral Saba 24B", contextWindow: 32768 },
      { id: "gemma2-9b-it", name: "Gemma 2 9B", contextWindow: 8192 },
    ],
    default: "llama-3.3-70b-versatile",
    envKey: "GROQ_API_KEY",
    supportsTools: true,
  },
  cerebras: {
    name: "Cerebras (Free)",
    models: [
      { id: "llama3.1-8b", name: "Llama 3.1 8B", contextWindow: 131072 },
      { id: "llama-3.3-70b", name: "Llama 3.3 70B", contextWindow: 131072 },
    ],
    default: "llama-3.3-70b",
    envKey: "CEREBRAS_API_KEY",
    supportsTools: true,
  },
  deepseek: {
    name: "DeepSeek",
    models: [
      { id: "deepseek-chat", name: "DeepSeek V3.2", contextWindow: 131072 },
      { id: "deepseek-reasoner", name: "DeepSeek R1", contextWindow: 164000 },
    ],
    default: "deepseek-chat",
    envKey: "DEEPSEEK_API_KEY",
    supportsTools: true,
  },
  github: {
    name: "GitHub Models",
    models: [
      { id: "gpt-4o", name: "GPT-4o", contextWindow: 131072 },
      { id: "gpt-4.1", name: "GPT-4.1", contextWindow: 1000000 },
      { id: "Llama-3.3-70B-Instruct", name: "Llama 3.3 70B", contextWindow: 131072 },
      { id: "DeepSeek-R1", name: "DeepSeek R1", contextWindow: 65536 },
      { id: "Mistral-small-3.1-24B-Instruct-2503", name: "Mistral Small 3.1", contextWindow: 131072 },
      { id: "Llama-4-Scout-17B-16E-Instruct", name: "Llama 4 Scout", contextWindow: 131072 },
    ],
    default: "gpt-4o",
    envKey: "GITHUB_API_KEY",
    supportsTools: true,
  },
} as const;

export type ProviderId = keyof typeof PROVIDERS;
export type ProviderConfig = (typeof PROVIDERS)[ProviderId];
export type ModelConfig = ProviderConfig["models"][number];

// Get the default model for a provider
export function getDefaultModel(providerId: ProviderId): string {
  return PROVIDERS[providerId].default;
}

// Get model config by ID
export function getModelConfig(
  providerId: ProviderId,
  modelId: string
): ModelConfig | undefined {
  const provider = PROVIDERS[providerId];
  return provider.models.find((m) => m.id === modelId);
}

// Check if a provider ID is valid
export function isValidProvider(id: string): id is ProviderId {
  return id in PROVIDERS;
}

// Get all provider IDs
export function getProviderIds(): ProviderId[] {
  return Object.keys(PROVIDERS) as ProviderId[];
}
