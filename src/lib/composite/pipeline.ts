/**
 * Composite Pipeline — Orchestrator
 * 
 * The main coordinator that ties together:
 * 1. Dynamic System Prompt Layer — intent-aware prompt building
 * 2. Stream Rewrite Layer (LLM Suspense) — real-time stream transformations
 * 3. AutoFix Pass — post-generation error correction
 * 
 * This is the core of what makes this better than v0:
 * - v0: static prompt + one model + single pass
 * - This: dynamic prompt + multi-provider + stream rewrite + autofix
 */

import { analyzeIntent, buildDynamicPrompt, type IntentAnalysis } from "./dynamic-prompt";
import { rewriteStreamChunk, rewriteCompleteFile } from "./stream-rewrite";
import { runAutoFix, quickValidate, type AutoFixReport } from "./autofix";
import { VirtualFileSystem } from "../file-system";
import type { ProviderId } from "../providers";

export interface PipelineConfig {
  providerId: ProviderId;
  modelId?: string;
  enableStreamRewrite: boolean;
  enableAutoFix: boolean;
  enableDynamicPrompt: boolean;
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  providerId: "anthropic",
  enableStreamRewrite: true,
  enableAutoFix: true,
  enableDynamicPrompt: true,
};

export interface GenerationResult {
  intent: IntentAnalysis;
  autofixReport: AutoFixReport | null;
  validation: { valid: boolean; issues: string[] } | null;
  duration: number;
}

/**
 * Analyze user input and build the enhanced system prompt
 */
export function prepareGeneration(
  userMessages: { role: string; content: string }[],
  config: PipelineConfig = DEFAULT_PIPELINE_CONFIG
): { 
  messages: { role: string; content: string }[]; 
  intent: IntentAnalysis;
} {
  const lastUserMessage = userMessages
    .filter(m => m.role === "user")
    .pop()?.content || "";

  // Step 1: Analyze intent
  const intent = analyzeIntent(lastUserMessage);

  let messages = [...userMessages];

  if (config.enableDynamicPrompt) {
    // Step 2: Build dynamic system prompt
    const dynamicSystemPrompt = buildDynamicPrompt(intent, config.providerId);

    // Replace or prepend system message
    const systemIndex = messages.findIndex(m => m.role === "system");
    if (systemIndex >= 0) {
      // Merge with existing system prompt
      const existing = messages[systemIndex].content || "";
      messages[systemIndex] = {
        role: "system",
        content: `${existing}\n\n${dynamicSystemPrompt}`,
      };
    } else {
      messages.unshift({
        role: "system",
        content: dynamicSystemPrompt,
      });
    }
  }

  return { messages, intent };
}

/**
 * Rewrite a streamed text chunk in real-time (LLM Suspense)
 */
export function rewriteStream(text: string): string {
  return rewriteStreamChunk(text);
}

/**
 * Post-process the generated file system (AutoFix pass)
 */
export function postProcess(
  fileSystem: VirtualFileSystem,
  config: PipelineConfig = DEFAULT_PIPELINE_CONFIG
): { autofixReport: AutoFixReport | null; validations: { path: string; valid: boolean; issues: string[] }[] } {
  const validations: { path: string; valid: boolean; issues: string[] }[] = [];
  let autofixReport: AutoFixReport | null = null;

  if (config.enableAutoFix) {
    // Run AutoFix on all files
    autofixReport = runAutoFix(fileSystem);

    // Validate each file
    const allFiles = fileSystem.getAllFiles();
    for (const [path, content] of allFiles) {
      if (content) {
        const validation = quickValidate(content);
        validations.push({ path, ...validation });
      }
    }
  }

  // Always apply stream rewrites to completed files
  const allFiles = fileSystem.getAllFiles();
  for (const [path, content] of allFiles) {
    if (content) {
      const rewritten = rewriteCompleteFile(content);
      if (rewritten !== content) {
        // Check if the file still exists and update
        if (fileSystem.exists(path)) {
          fileSystem.updateFile(path, rewritten);
        }
      }
    }
  }

  return { autofixReport, validations };
}

/**
 * Format the pipeline results into a user-friendly summary
 */
export function formatPipelineSummary(
  intent: IntentAnalysis,
  autofixReport: AutoFixReport | null,
  duration: number
): string {
  const parts: string[] = [];

  parts.push(`**Generation complete** (${duration}ms)`);
  parts.push(`Type: ${intent.type} | Frameworks: ${intent.frameworks.join(", ")}`);

  if (autofixReport && autofixReport.totalFixes > 0) {
    parts.push(`\n**AutoFix**: ${autofixReport.totalFixes} fix(es) applied across ${autofixReport.filesWithIssues} file(s)`);
    for (const fileFix of autofixReport.fixes) {
      for (const fix of fileFix.fixes) {
        parts.push(`- ${fileFix.file}: ${fix.description}`);
      }
    }
  } else if (autofixReport) {
    parts.push(`\n**AutoFix**: No issues found ✓`);
  }

  return parts.join("\n");
}
