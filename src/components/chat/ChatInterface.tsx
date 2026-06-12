"use client";

import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChat } from "@/lib/contexts/chat-context";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Info, Wand2, ExternalLink, Settings, X, AlertTriangle } from "lucide-react";
import { type ProviderId } from "@/lib/providers";
import { parseProviderError, PROVIDER_KEY_URLS } from "@/lib/provider-errors";

// Map error categories from provider-errors to UI categories
function mapErrorCategory(category: string): "api_key" | "quota" | "model" | "network" | "server" | "unknown" {
  switch (category) {
    case "invalid_key":
    case "expired_key":
      return "api_key";
    case "rate_limit":
    case "quota_exceeded":
      return "quota";
    case "model_error":
      return "model";
    case "network_error":
      return "network";
    case "server_error":
      return "server";
    default:
      return "unknown";
  }
}

function parseError(error: Error | undefined, provider: ProviderId): {
  title: string;
  message: string;
  action: string;
  category: string;
  providerName: string;
  keyUrl: string;
} {
  if (!error) {
    return {
      title: "Request Failed",
      message: "An error occurred while processing your message.",
      action: "Please check your settings and try again.",
      category: "unknown",
      providerName: provider,
      keyUrl: PROVIDER_KEY_URLS[provider] || "#",
    };
  }

  const parsed = parseProviderError(provider, error);
  return {
    title: parsed.title,
    message: parsed.message,
    action: parsed.action,
    category: mapErrorCategory(parsed.category),
    providerName: parsed.providerName,
    keyUrl: parsed.keyUrl,
  };
}

export function ChatInterface() {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { messages, input, setInput, handleSubmit, status, error, reload, provider } = useChat();

  // Count user messages and detect demo mode
  const { userMessageCount, isDemoMode } = useMemo(() => {
    const userMsgs = messages.filter((m) => m.role === "user").length;

    // Helper to extract all text from a message (handles various formats)
    const extractText = (msg: any): string => {
      const texts: string[] = [];

      // Check string content
      if (typeof msg.content === "string") {
        texts.push(msg.content);
      }

      // Check array content (AI SDK format)
      if (Array.isArray(msg.content)) {
        msg.content.forEach((c: any) => {
          if (c?.type === "text" && typeof c?.text === "string") {
            texts.push(c.text);
          }
        });
      }

      // Check parts array
      if (Array.isArray(msg.parts)) {
        msg.parts.forEach((p: any) => {
          if (p?.type === "text" && typeof p?.text === "string") {
            texts.push(p.text);
          }
        });
      }

      return texts.join(" ");
    };

    // Detect demo mode by checking for demo response text in any format
    const demoPatterns = ["static demo response", "ANTHROPIC_API_KEY", "demo mode"];
    const hasDemo = messages.some((m) => {
      if (m.role !== "assistant") return false;
      const text = extractText(m).toLowerCase();
      return demoPatterns.some((pattern) => text.includes(pattern.toLowerCase()));
    });

    return { userMessageCount: userMsgs, isDemoMode: hasDemo };
  }, [messages]);

  // Show warning and block input after 1 message in demo mode
  const showDemoWarning = isDemoMode && userMessageCount >= 1;
  const isInputBlocked = isDemoMode && userMessageCount >= 1;

  // Parse error for display
  const parsedError = useMemo(() => {
    if (!error) return null;
    return parseError(error, provider);
  }, [error, provider]);

  // Auto-retry state for network errors
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);

  // Cancel auto-retry
  const cancelRetry = useCallback(() => {
    setRetryCountdown(null);
  }, []);

  // Start auto-retry countdown for network errors
  useEffect(() => {
    if (parsedError?.category === "network" && retryCountdown === null) {
      setRetryCountdown(10);
    } else if (!parsedError) {
      setRetryCountdown(null);
    }
  }, [parsedError, retryCountdown]);

  // Countdown timer
  useEffect(() => {
    if (retryCountdown === null) return;
    if (retryCountdown === 0) {
      reload?.();
      setRetryCountdown(null);
      return;
    }
    const timer = setTimeout(() => setRetryCountdown((c) => (c ?? 1) - 1), 1000);
    return () => clearTimeout(timer);
  }, [retryCountdown, reload]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-card">
      {/* Demo Mode Top Banner */}
      {isDemoMode && !showDemoWarning && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Demo Mode</strong> — Limited to 1 message
            </span>
          </div>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              // Find and click the settings button
              const settingsBtn = document.querySelector('[title="Settings"]');
              if (settingsBtn instanceof HTMLElement) settingsBtn.click();
            }}
            className="text-sm font-medium text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 transition-colors"
          >
            Add API Key →
          </a>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
          <div className="text-center max-w-lg animate-fade-in">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 mx-auto mb-6 flex items-center justify-center shadow-lg shadow-primary/20">
              <Wand2 className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2 tracking-tight">
              What do you want to build?
            </h2>
            <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
              Describe a component or app in plain English. I&apos;ll generate
              production-ready React code with Tailwind CSS.
            </p>

            {/* Template quick-starts */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              {[
                { label: "Counter", desc: "Interactive counter", icon: "＋", color: "from-blue-500/20 to-blue-600/10", border: "hover:border-blue-500/50" },
                { label: "Contact Form", desc: "Form with validation", icon: "✉", color: "from-green-500/20 to-green-600/10", border: "hover:border-green-500/50" },
                { label: "Pricing Card", desc: "3-tier pricing table", icon: "💰", color: "from-purple-500/20 to-purple-600/10", border: "hover:border-purple-500/50" },
                { label: "Dashboard", desc: "Analytics dashboard", icon: "📊", color: "from-amber-500/20 to-amber-600/10", border: "hover:border-amber-500/50" },
                { label: "User Profile", desc: "Profile with avatar", icon: "👤", color: "from-rose-500/20 to-rose-600/10", border: "hover:border-rose-500/50" },
                { label: "Chat UI", desc: "Message interface", icon: "💬", color: "from-cyan-500/20 to-cyan-600/10", border: "hover:border-cyan-500/50" },
                { label: "Landing Page", desc: "Marketing hero + CTA", icon: "🚀", color: "from-orange-500/20 to-orange-600/10", border: "hover:border-orange-500/50" },
                { label: "Data Table", desc: "Sortable table", icon: "📋", color: "from-teal-500/20 to-teal-600/10", border: "hover:border-teal-500/50" },
              ].map((template, index) => (
                <button
                  key={template.label}
                  onClick={() => setInput(`Create a ${template.label.toLowerCase()} component. ${template.desc}. Use Tailwind CSS.`)}
                  className={`group relative flex items-start gap-3 p-4 rounded-xl bg-gradient-to-br ${template.color} border border-border/50 ${template.border} transition-all duration-200 hover:shadow-md hover:border-opacity-100 active:scale-[0.98] text-left animate-fade-in`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <span className="text-xl flex-shrink-0 mt-0.5">{template.icon}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {template.label}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {template.desc}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 justify-center text-xs text-muted-foreground">
              <span>✨ Multi-provider AI</span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span>🎨 Tailwind CSS</span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span>⚡ Live preview</span>
            </div>
          </div>
        </div>
      ) : (
        <ScrollArea ref={scrollAreaRef} className="flex-1 overflow-hidden">
          <div className="p-4">
            <MessageList messages={messages} isLoading={status === "streaming"} />
          </div>
        </ScrollArea>
      )}

      {/* Demo Mode Progress Indicator */}
      {isDemoMode && !showDemoWarning && userMessageCount === 0 && (
        <div className="mx-4 mb-2 flex-shrink-0 animate-fade-in">
          <div className="flex items-center gap-3 text-xs text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2 border border-border/50">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span>Demo Mode</span>
                <span className="font-medium">{userMessageCount}/1 message</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${(userMessageCount / 1) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Demo Mode Warning */}
      {showDemoWarning && (
        <div className="mx-4 mb-4 flex-shrink-0 bg-secondary border border-border rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Info className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground mb-1">
                API Key Required
              </h3>
              <p className="text-sm text-muted-foreground">
                Add your API key in Settings to continue creating components.
              </p>
              <div className="mt-3 text-sm bg-background rounded-md p-3 border border-border">
                <p className="font-medium text-foreground mb-2">Quick Setup:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground">
                  <li>
                    Get your API key from{" "}
                    <a
                      href="https://console.anthropic.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium"
                    >
                      console.anthropic.com
                    </a>
                  </li>
                  <li>
                    Click the <span className="font-medium text-foreground">Settings</span> button above
                  </li>
                  <li>Paste your API key and save</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display with Actionable Guidance */}
      {parsedError && (
        <div className="mx-4 mb-4 flex-shrink-0 bg-destructive/5 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-md bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-4 w-4 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground mb-1">
                {parsedError.title}
              </h3>
              <p className="text-sm text-muted-foreground break-words">
                {parsedError.message}
              </p>

              {/* Actionable guidance based on error type */}
              <div className="mt-3 text-sm bg-background rounded-md p-3 border border-border">
                <p className="font-medium text-foreground mb-2">How to fix this:</p>
                <p className="text-xs text-muted-foreground mb-2">{parsedError.action}</p>

                {/* API key related errors - show links to settings and provider */}
                {parsedError.category === "api_key" && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <a
                      href={parsedError.keyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Get {parsedError.providerName} API key
                    </a>
                    <span className="text-muted-foreground text-xs">then</span>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Settings className="h-3 w-3" />
                      Update in Settings above
                    </span>
                  </div>
                )}

                {/* Quota errors - show provider dashboard link */}
                {parsedError.category === "quota" && (
                  <a
                    href={parsedError.keyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium mt-2"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Check usage at {parsedError.providerName}
                  </a>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              {parsedError.category === "network" && retryCountdown !== null && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Retrying in {retryCountdown}s</span>
                  <button
                    onClick={cancelRetry}
                    className="p-1 hover:bg-muted rounded"
                    aria-label="Cancel auto-retry"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              <Button
                onClick={() => {
                  cancelRetry();
                  reload?.();
                }}
                variant="outline"
                size="sm"
                className="border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry Now
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 pt-0 flex-shrink-0">
        <MessageInput
          input={input}
          setInput={setInput}
          handleSubmit={handleSubmit}
          isLoading={status === "submitted" || status === "streaming"}
          isDisabled={isInputBlocked}
          disabledMessage="Add an API key to continue"
        />
      </div>
    </div>
  );
}
