/**
 * Dynamic System Prompt Layer
 * 
 * Like v0's composite model family - analyzes user intent and builds
 * a context-aware system prompt with injected knowledge, examples,
 * and constraints. Supports multi-provider syntax differences.
 */

import type { ProviderId } from "../providers";

export interface IntentAnalysis {
  type: "component" | "full-app" | "api-route" | "landing-page" | "dashboard" | "form" | "other";
  frameworks: string[];
  hasBackendIntent: boolean;
  hasDatabaseIntent: boolean;
  hasAuthIntent: boolean;
  keyTerms: string[];
}

/**
 * Analyze user message for intent
 */
export function analyzeIntent(userMessage: string): IntentAnalysis {
  const lower = userMessage.toLowerCase();
  
  const type: IntentAnalysis["type"] = 
    /dashboard|admin|analytics|monitoring/.test(lower) ? "dashboard" :
    /full.?stack|complete app|entire app|backend|api route|database/.test(lower) ? "full-app" :
    /api|endpoint|route handler/.test(lower) ? "api-route" :
    /landing|marketing|hero|homepage/.test(lower) ? "landing-page" :
    /form|login|signup|contact|register/.test(lower) ? "form" :
    /component|button|card|modal|table|list/.test(lower) ? "component" :
    "other";

  const frameworks: string[] = [];
  if (/next\.?js|nextjs/.test(lower)) frameworks.push("next.js");
  if (/react/.test(lower)) frameworks.push("react");
  if (/vue/.test(lower)) frameworks.push("vue");
  if (/tailwind/.test(lower)) frameworks.push("tailwind");
  if (frameworks.length === 0) frameworks.push("react", "tailwind"); // default

  return {
    type,
    frameworks,
    hasBackendIntent: /server|api|backend|database|db|sql|auth|session/.test(lower),
    hasDatabaseIntent: /database|db|sql|prisma|drizzle|postgres|sqlite|mongodb/.test(lower),
    hasAuthIntent: /login|signup|auth|oauth|jwt|session|password/.test(lower),
    keyTerms: lower.match(/\b(\w{4,})\b/g)?.slice(0, 10) || [],
  };
}

/**
 * Build a dynamic system prompt based on intent analysis and provider
 */
export function buildDynamicPrompt(
  intent: IntentAnalysis,
  providerId: ProviderId
): string {
  const sections: string[] = [];

  sections.push(`You are an expert engineer generating ${intent.type === "full-app" ? "complete applications" : "React components"}.`);

  if (intent.frameworks.includes("tailwind")) {
    sections.push(`Style with Tailwind CSS. Use className utilities. No inline styles.`);
  }

  switch (intent.type) {
    case "full-app":
      sections.push(`Generate a complete app: pages, API routes, components. /App.jsx entry point. Scaffold full Next.js structure.`);
      break;
    case "api-route":
      sections.push(`Create route.ts with proper HTTP handlers, validation, error handling.`);
      break;
    case "dashboard":
      sections.push(`Multi-section dashboard: sidebar/nav, main content, header, cards, responsive.`);
      break;
    case "landing-page":
      sections.push(`Complete landing: hero, features, CTA. Mobile-first.`);
      break;
  }

  sections.push(`Tools: str_replace_editor (create/edit files), file_manager (rename/delete). Plan first, create /App.jsx first, then additional files.`);
  sections.push(`Output: brief responses. /App.jsx as default export. @/ import alias. No HTML files.`);

  return sections.join("\n\n");
}
