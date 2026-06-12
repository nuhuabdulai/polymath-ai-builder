/**
 * Key rotation and fallback system for free API providers.
 * Automatically tries multiple providers when one hits rate limits,
 * and cycles through them to maximize free tier usage.
 */

import type { ProviderId } from "../providers";
import { getLanguageModel } from "../provider";
import { generateText } from "ai";
import type { LanguageModel } from "ai";

export interface FallbackProvider {
  providerId: ProviderId;
  modelId: string;
  apiKey?: string;
}

export interface RotationResult {
  text: string;
  providerUsed: ProviderId;
  modelUsed: string;
  attempts: number;
}

const RATE_LIMIT_ERRORS = [
  "rate limit",
  "too many requests",
  "429",
  "quota",
  "tokens per minute",
  "tpm",
  "insufficient balance",
  "suspended",
  "exceeded",
  "checkin_required",
  "403",
];

function isRateLimitError(error: unknown): boolean {
  const msg = String(error).toLowerCase();
  return RATE_LIMIT_ERRORS.some((keyword) => msg.includes(keyword));
}

/**
 * Try providers in order. If one hits rate limits, fall through to the next.
 * Returns the first successful response.
 */
export async function generateWithFallback(
  messages: { role: string; content: string }[],
  fallbacks: FallbackProvider[]
): Promise<RotationResult> {
  let lastError: unknown;

  for (let i = 0; i < fallbacks.length; i++) {
    const { providerId, modelId, apiKey } = fallbacks[i];

    try {
      const model = getLanguageModel(providerId, modelId, apiKey);

      const { text } = await generateText({
        model,
        messages: messages as any,
        maxOutputTokens: 4000,
      });

      return {
        text,
        providerUsed: providerId,
        modelUsed: modelId,
        attempts: i + 1,
      };
    } catch (error) {
      lastError = error;
      console.log(`[Fallback] ${providerId}/${modelId} failed: ${String(error).slice(0, 100)}`);

      if (i < fallbacks.length - 1 && isRateLimitError(error)) {
        console.log(`[Fallback] → trying next provider...`);
        continue;
      }

      if (!isRateLimitError(error)) {
        throw error;
      }
    }
  }

  throw lastError || new Error("All fallback providers exhausted");
}

/**
 * Build a fallback chain from configured providers.
 */
export function buildFallbackChain(
  keys: Record<string, string>
): FallbackProvider[] {
  const chain: FallbackProvider[] = [];

  // Groq (free, already have key)
  if (keys.groq) {
    chain.push({ providerId: "groq", modelId: "llama-3.3-70b-versatile", apiKey: keys.groq });
    chain.push({ providerId: "groq", modelId: "llama-3.1-8b-instant", apiKey: keys.groq });
  }

  // Cerebras (free, fastest)
  if (keys.cerebras) {
    chain.push({ providerId: "cerebras", modelId: "llama-3.3-70b", apiKey: keys.cerebras });
  }

  // FreeTheAi (free, 50+ models)
  if (keys.freetheai) {
    chain.push({ providerId: "freetheai", modelId: "opc/deepseek-v4-flash-free", apiKey: keys.freetheai });
  }

  // DeepSeek (5M free tokens)
  if (keys.deepseek) {
    chain.push({ providerId: "deepseek", modelId: "deepseek-chat", apiKey: keys.deepseek });
  }

  // GitHub Models (45+ models)
  if (keys.github) {
    chain.push({ providerId: "github", modelId: "gpt-4o", apiKey: keys.github });
  }

  return chain;
}
