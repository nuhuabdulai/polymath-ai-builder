/**
 * Project Scaffold Utilities
 * 
 * Generates boilerplate structures for full-stack apps:
 * - Next.js App Router scaffold
 * - API route templates
 * - Database schema templates
 * - Common configuration files
 */

import { VirtualFileSystem } from "./file-system";
import type { IntentAnalysis } from "./composite/dynamic-prompt";

const TAILWIND_V4_IMPORT = `@import "tailwindcss";`;

/**
 * Scaffold a full Next.js app structure
 */
export function scaffoldNextJSApp(
  fs: VirtualFileSystem,
  intent: IntentAnalysis,
  appName: string
): void {
  // Only scaffold if generating a full app
  if (intent.type !== "full-app" && intent.type !== "dashboard" && intent.type !== "landing-page") {
    return;
  }

  const isFullApp = intent.type === "full-app";

  // app/globals.css
  if (!fs.exists("/app/globals.css")) {
    fs.createFileWithParents(
      "/app/globals.css",
      intent.frameworks.includes("tailwind") ? TAILWIND_V4_IMPORT : "/* global styles */"
    );
  }

  // app/layout.tsx
  if (!fs.exists("/app/layout.tsx")) {
    const layout = `import type { Metadata } from "next";
${intent.frameworks.includes("tailwind") ? `import "./globals.css";` : ""}

export const metadata: Metadata = {
  title: "${appName}",
  description: "Generated with AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;
    fs.createFileWithParents("/app/layout.tsx", layout);
  }

  // app/page.tsx
  if (!fs.exists("/app/page.tsx")) {
    const page = `export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">${appName}</h1>
      <p className="text-lg text-muted-foreground">
        Generated with AI
      </p>
    </main>
  );
}
`;
    fs.createFileWithParents("/app/page.tsx", page);
  }

  // API route scaffold for full apps with backend intent
  if (isFullApp && intent.hasBackendIntent && !fs.exists("/app/api/hello/route.ts")) {
    const apiRoute = `import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "ok", message: "API is running" });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json({ success: true, data: body }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }
}
`;
    fs.createFileWithParents("/app/api/hello/route.ts", apiRoute);
  }

  // Prisma schema for full apps with database intent
  if (isFullApp && intent.hasDatabaseIntent && !fs.exists("/prisma/schema.prisma")) {
    const prismaSchema = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
`;
    fs.createFileWithParents("/prisma/schema.prisma", prismaSchema);
  }

  // .env example
  if (isFullApp && !fs.exists("/.env.example")) {
    fs.createFileWithParents(
      "/.env.example",
      `# Database
DATABASE_URL="file:./dev.db"

# Auth
JWT_SECRET=your-secret-key

# AI Providers (optional)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
`
    );
  }
}

/**
 * Scaffold an API route handler
 */
export function scaffoldAPIRoute(
  fs: VirtualFileSystem,
  routePath: string,
  methods: ("GET" | "POST" | "PUT" | "PATCH" | "DELETE")[]
): void {
  const routeHandlers = methods.map(
    (method) =>
      `export async function ${method}(request: Request) {
  try {
    ${method === "GET" || method === "DELETE"
      ? `return NextResponse.json({ message: "${method} handler" });`
      : `const body = await request.json();
    return NextResponse.json({ success: true, data: body }, { status: ${method === "POST" ? 201 : 200} });`
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}`
  );

  const routeContent = `import { NextResponse } from "next/server";

${routeHandlers.join("\n\n")}
`;

  const filePath = routePath.startsWith("/") ? routePath : `/app/api/${routePath}/route.ts`;
  fs.createFileWithParents(filePath, routeContent);
}

/**
 * Get a suggested app name from user intent
 */
export function suggestAppName(intent: IntentAnalysis, userMessage: string): string {
  // Extract a name from the user's message
  const words = userMessage.split(" ").slice(0, 5);
  const name = words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim();
  
  if (name.length > 30) return name.slice(0, 30) + "...";
  if (name.length > 0) return name;
  
  // Fallback based on type
  const defaults: Record<string, string> = {
    dashboard: "Dashboard App",
    "landing-page": "Landing Page",
    "full-app": "Full Stack App",
    component: "My Component",
  };
  return defaults[intent.type] || "My App";
}
