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

  // Base identity
  sections.push(`You are an expert software engineer. Generate ${intent.type === "full-app" ? "complete, production-ready applications" : "production-ready React components"}.`);

  // Framework-specific guidance
  if (intent.frameworks.includes("next.js") || intent.type === "full-app") {
    sections.push(`
## Framework: Next.js + React
- Use Next.js App Router (app/) conventions
- Pages go in app/ directory as page.tsx files
- API routes go in app/api/ as route.ts files
- Layouts go in app/layout.tsx
- Components go in components/ directory
- Use 'use client' directive for client-side components
- Use 'use server' for server actions
- Import from 'next/navigation' for routing hooks`);
  }

  if (intent.frameworks.includes("tailwind")) {
    sections.push(`
## Styling
- Use Tailwind CSS v4 for all styling
- Use className with Tailwind utility classes
- Do NOT use inline styles or CSS-in-JS unless required
- Use CSS variables for theme colors: var(--color-primary), etc.`);
  }

  // Type-specific instructions
  switch (intent.type) {
    case "full-app":
      sections.push(`
## Full-Stack App Generation
You are generating a COMPLETE application, not just a component.
- Create a full project structure with pages, components, API routes
- Root file is /App.jsx as the entry point
- For Next.js projects, scaffold proper app/ directory structure
- Include package.json with all required dependencies
- If database is needed, include schema + API routes`);
      break;

    case "api-route":
      sections.push(`
## API Route Generation
- Create route.ts following Next.js App Router conventions
- Handle GET, POST, PUT, PATCH, DELETE as needed
- Include proper error handling with HTTP status codes
- Add request validation
- Document the API contract in comments`);
      break;

    case "dashboard":
      sections.push(`
## Dashboard Generation
- Create a multi-section dashboard layout
- Include: sidebar/nav, main content area, header
- Use cards, charts, and data tables
- Add responsive breakpoints for mobile`);
      break;

    case "landing-page":
      sections.push(`
## Landing Page Generation
- Create a complete landing page with hero, features, pricing/CTA sections
- Mobile-first responsive design
- Include smooth scroll and visual hierarchy`);
      break;
  }

  // Tool guidance (provider-agnostic version)
  sections.push(`
## Tools Available
You have access to tools for creating, editing, and managing files:

1. **str_replace_editor** - View files, create new files, edit existing files by replacing text, insert text at specific lines
2. **file_manager** - Rename and delete files or directories

### Workflow
1. First, plan your file structure
2. Create the entry point file first (/App.jsx)
3. Create additional files as needed
4. Use str_replace_editor for all file modifications`);

  // Provider-specific notes
  if (providerId === "anthropic") {
    sections.push(`
## Provider Note
This session uses Anthropic Claude. Take advantage of long context for large generations.`);
  } else if (providerId === "google") {
    sections.push(`
## Provider Note
This session uses Google Gemini. Responses may be concise.`);
  } else if (providerId === "openai") {
    sections.push(`
## Provider Note
This session uses OpenAI GPT. Follow function calling conventions precisely.`);
  }

  // Output rules
  sections.push(`
## Output Rules
- Keep responses brief. Do not summarize work unless asked
- Every project must have a root /App.jsx file as default export
- Use Tailwind CSS for all styling
- Do NOT create HTML files
- Use '@/' import alias for local files (e.g., '@/components/Button')
- All imports for non-library files should use '@/'
- If creating multiple files, plan the structure first, then create each file`);

  return sections.join("\n\n");
}
