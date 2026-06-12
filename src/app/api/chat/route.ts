import type { FileNode } from "@/lib/file-system";
import { VirtualFileSystem } from "@/lib/file-system";
import { streamText, stepCountIs } from "ai";
import { buildStrReplaceTool } from "@/lib/tools/str-replace";
import { buildFileManagerTool } from "@/lib/tools/file-manager";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getLanguageModel, isMockProvider, PROVIDERS, type ProviderId } from "@/lib/provider";
import { isValidProvider } from "@/lib/providers";
import { generationPrompt } from "@/lib/prompts/generation";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { decryptApiKeys } from "@/lib/crypto";
import { RATE_LIMITS, EMPTY_API_KEYS } from "@/lib/constants";
import {
  invalidContentTypeResponse,
  invalidJsonResponse,
  badRequestResponse,
  rateLimitResponse,
} from "@/lib/api-responses";
import { prepareGeneration, rewriteStream, postProcess, formatPipelineSummary } from "@/lib/composite/pipeline";

// POST handler for chat messages
// Receives: messages array, serialized file state, optional projectId, provider, model
// Returns: Server-sent events stream with text and tool calls
export async function POST(req: Request) {
  // Security: Validate content-type
  const contentType = req.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    return invalidContentTypeResponse();
  }

  let body;
  try {
    body = await req.json();
  } catch (error) {
    return invalidJsonResponse();
  }

  const {
    messages,
    files,
    projectId,
    provider: requestedProvider,
    model: requestedModel,
  }: {
    messages: any[];
    files: Record<string, FileNode>;
    projectId?: string;
    provider?: string;
    model?: string;
  } = body;

  // Validate input
  if (!Array.isArray(messages)) {
    return badRequestResponse("Invalid messages format");
  }

  if (!files || typeof files !== "object") {
    return badRequestResponse("Invalid files format");
  }

  // Validate provider if specified
  const providerId: ProviderId = (requestedProvider && isValidProvider(requestedProvider))
    ? requestedProvider
    : "anthropic";

  // Rate limiting: Apply stricter limits for anonymous users
  const session = await getSession();
  if (!session) {
    // Anonymous users: 10 requests per hour
    const clientIP = getClientIP(req.headers);
    const rateLimitResult = rateLimit(`chat-anon:${clientIP}`, RATE_LIMITS.CHAT_ANON);

    if (!rateLimitResult.success) {
      return rateLimitResponse("Rate limit exceeded. Please sign in for unlimited access.");
    }
  }

  // Get user's API key from settings (if authenticated)
  let userApiKey: string | undefined;
  if (session) {
    try {
      const settings = await prisma.userSettings.findUnique({
        where: { userId: session.userId },
      });

      if (settings?.apiKeys && settings.apiKeys !== EMPTY_API_KEYS) {
        const userKeys = decryptApiKeys(settings.apiKeys);
        userApiKey = userKeys[providerId];
      }
    } catch (error) {
      console.error("[Chat] Failed to read user settings:", error);
    }
  }

  // Check if API key is available
  const envKey = process.env[PROVIDERS[providerId].envKey];
  const apiKey = userApiKey || envKey;
  const isUsingMock = isMockProvider(providerId, userApiKey);

  // If no API key for the selected provider, return error
  if (!apiKey && !isUsingMock) {
    return new Response(
      JSON.stringify({
        error: `No API key configured for ${PROVIDERS[providerId].name}. Add one in settings or select a different provider.`,
        errorType: "missing_key",
        provider: providerId,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Reconstruct VirtualFileSystem from serialized state sent by client
  const fileSystem = new VirtualFileSystem();
  fileSystem.deserializeFromNodes(files);

  // Get language model for the specified provider
  const model = getLanguageModel(providerId, requestedModel, apiKey);

  // Normalize messages to ensure they work with streamText
  // Handle both UIMessage format (parts) and legacy format (content)
  // Tool messages from persisted conversations need special handling
  const normalizedMessages = messages
    .map((m: any) => {
      if (m.role === "tool") return null;
      if (m.role === "assistant") {
        let textContent = "";
        if (Array.isArray(m.parts)) {
          textContent = m.parts
            .filter((p: any) => p.type === "text" && p.text)
            .map((p: any) => p.text)
            .join("");
        } else if (Array.isArray(m.content)) {
          textContent = m.content
            .filter((c: any) => (c.type === "text" && c.text) || typeof c === "string")
            .map((c: any) => (typeof c === "string" ? c : c.text))
            .join("");
        } else if (typeof m.content === "string") {
          textContent = m.content;
        }
        if (!textContent || textContent.trim() === "") return null;
        return { role: "assistant", content: textContent };
      }
      if (m.role === "user") {
        let textContent = "";
        if (typeof m.content === "string") {
          textContent = m.content;
        } else if (Array.isArray(m.content)) {
          textContent = m.content
            .filter((c: any) => c.type === "text" || typeof c === "string")
            .map((c: any) => (typeof c === "string" ? c : c.text))
            .join("");
        } else if (m.parts && Array.isArray(m.parts)) {
          textContent = m.parts
            .filter((p: any) => p.type === "text")
            .map((p: any) => p.text)
            .join("");
        }
        return { role: "user", content: textContent || "" };
      }
      if (m.role === "system") return { role: "system", content: m.content || "" };
      return null;
    })
    .filter((m: { role: string; content: string } | null): m is { role: string; content: string } => m !== null);

  const startTime = Date.now();
  
  const pipelineMessages = normalizedMessages.filter(m => m.role !== "system");
  const { messages: enhancedMessages, intent } = prepareGeneration(
    pipelineMessages,
    { providerId, enableDynamicPrompt: true, enableStreamRewrite: true, enableAutoFix: true }
  );

  const providerOptions: Record<string, any> = {};
  if (providerId === "anthropic") {
    providerOptions.anthropic = { cacheControl: { type: "ephemeral" } };
  }

  const finalSystemMessage = enhancedMessages.find(m => m.role === "system")?.content || "";
  const fullSystemPrompt = `${generationPrompt}\n\n${finalSystemMessage}`;
  
  enhancedMessages.unshift({
    role: "system",
    content: fullSystemPrompt,
    ...(Object.keys(providerOptions).length > 0 && { providerOptions }),
  });

  // Stream text with tool use (agentic loop)
  const result = streamText({
    model,
    messages: enhancedMessages as any,
    maxOutputTokens: 10_000,
    stopWhen: stepCountIs(isUsingMock ? 2 : 40),
    onError: (err: any) => {
      console.error(`[AI Error] Provider: ${providerId}`, err);
    },
    tools: {
      str_replace_editor: buildStrReplaceTool(fileSystem),
      file_manager: buildFileManagerTool(fileSystem),
    },
    onFinish: async ({ response }) => {
      const { autofixReport } = postProcess(fileSystem);
      const duration = Date.now() - startTime;
      
      if (autofixReport && autofixReport.totalFixes > 0) {
        console.log(`[Pipeline] AutoFix applied ${autofixReport.totalFixes} fixes across ${autofixReport.filesWithIssues} files (${duration}ms)`);
      }

      if (projectId) {
        try {
          const session = await getSession();
          if (!session) {
            console.error("[Save Error] User not authenticated, cannot save project");
            return;
          }

          const responseMessages = response.messages || [];
          const userMessages = messages.filter((m) => m.role !== "system");
          const allMessages = [...userMessages, ...responseMessages];

          await prisma.project.update({
            where: {
              id: projectId,
              userId: session.userId,
            },
            data: {
              messages: JSON.stringify(allMessages),
              data: JSON.stringify(fileSystem.serialize()),
            },
          });
        } catch (error) {
          console.error("Failed to save project data:", error);
        }
      }
    },
  });

  return result.toUIMessageStreamResponse();
}

// Vercel timeout: 120 seconds for API route
export const maxDuration = 120;
