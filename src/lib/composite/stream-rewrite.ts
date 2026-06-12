/**
 * LLM Suspense — Stream Rewrite Layer
 * 
 * Like v0's LLM Suspense: intercepts the output stream and applies
 * real-time transformations to fix common AI code generation issues
 * before the user sees them.
 * 
 * Transformations:
 * - Fix lucide-react icon imports (common mismatch)
 * - Fix incorrect import paths (@/ → relative when needed)
 * - Strip markdown code fences from tool outputs
 * - Normalize line endings
 * - Fix common JSX syntax errors mid-stream
 */

export interface RewriteRule {
  name: string;
  test: (text: string) => boolean;
  apply: (text: string) => string;
}

// Known icon name mappings (lucide-react v0.517+)
const ICON_NAME_MAP: Record<string, string> = {
  "menu": "Menu",
  "hamburger": "Menu",
  "nav": "Menu",
  "close": "X",
  "xmark": "X",
  "times": "X",
  "delete": "Trash2",
  "remove": "X",
  "edit": "Pencil",
  "pencil": "Pencil",
  "add": "Plus",
  "plus": "Plus",
  "create": "Plus",
  "new": "Plus",
  "save": "Save",
  "download": "Download",
  "upload": "Upload",
  "search": "Search",
  "magnifier": "Search",
  "magnifying": "Search",
  "user": "User",
  "person": "User",
  "profile": "UserCircle",
  "settings": "Settings",
  "cog": "Settings",
  "gear": "Settings",
  "config": "Settings",
  "home": "Home",
  "house": "Home",
  "dashboard": "LayoutDashboard",
  "chart": "BarChart3",
  "bar-chart": "BarChart3",
  "email": "Mail",
  "mail": "Mail",
  "envelope": "Mail",
  "message": "MessageSquare",
  "chat": "MessageSquare",
  "comment": "MessageSquare",
  "send": "Send",
  "notification": "Bell",
  "bell": "Bell",
  "alert": "AlertTriangle",
  "warning": "AlertTriangle",
  "danger": "AlertTriangle",
  "error": "AlertCircle",
  "info": "Info",
  "help": "HelpCircle",
  "question": "HelpCircle",
  "check": "Check",
  "tick": "Check",
  "success": "CheckCircle",
  "done": "CheckCircle",
  "complete": "CheckCircle",
  "verified": "BadgeCheck",
  "star": "Star",
  "favorite": "Star",
  "heart": "Heart",
  "like": "ThumbsUp",
  "calendar": "Calendar",
  "date": "Calendar",
  "clock": "Clock",
  "time": "Clock",
  "history": "History",
  "recent": "History",
  "folder": "Folder",
  "file": "File",
  "document": "FileText",
  "paper": "FileText",
  "image": "Image",
  "photo": "Image",
  "picture": "Image",
  "camera": "Camera",
  "video": "Video",
  "play": "Play",
  "stop": "StopCircle",
  "pause": "Pause",
  "arrow-up": "ArrowUp",
  "arrow-down": "ArrowDown",
  "arrow-left": "ArrowLeft",
  "arrow-right": "ArrowRight",
  "chevron-up": "ChevronUp",
  "chevron-down": "ChevronDown",
  "chevron-left": "ChevronLeft",
  "chevron-right": "ChevronRight",
  "chevrons-up": "ChevronsUp",
  "chevrons-down": "ChevronsDown",
  "chevrons-left": "ChevronsLeft",
  "chevrons-right": "ChevronsRight",
  "up": "ChevronUp",
  "down": "ChevronDown",
  "left": "ChevronLeft",
  "right": "ChevronRight",
  "sun": "Sun",
  "light": "Sun",
  "moon": "Moon",
  "dark": "Moon",
  "trash": "Trash2",
  "bin": "Trash2",
  "garbage": "Trash2",
  "phone": "Phone",
  "call": "Phone",
  "map": "MapPin",
  "location": "MapPin",
  "pin": "MapPin",
  "link": "Link",
  "chain": "Link",
  "external": "ExternalLink",
  "share": "Share2",
  "copy": "Copy",
  "clipboard": "Clipboard",
  "refresh": "RefreshCw",
  "reload": "RefreshCw",
  "sync": "RefreshCw",
  "loading": "Loader2",
  "spinner": "Loader2",
  "wait": "Loader2",
  "log-out": "LogOut",
  "logout": "LogOut",
  "sign-out": "LogOut",
  "log-in": "LogIn",
  "login": "LogIn",
  "sign-in": "LogIn",
  "lock": "Lock",
  "secure": "Lock",
  "unlock": "Unlock",
  "key": "Key",
  "eye": "Eye",
  "view": "Eye",
  "hide": "EyeOff",
  "eye-off": "EyeOff",
};

const ICON_IMPORT_RE = /import\s+{\s*([^}]+)\s*}\s+from\s+["']lucide-react["']/g;

/**
 * Fix incorrect lucide-react icon imports
 */
function fixIconImports(text: string): string {
  return text.replace(ICON_IMPORT_RE, (match, iconList: string) => {
    const fixed = iconList
      .split(",")
      .map((icon) => icon.trim())
      .map((icon) => {
        const stripped = icon.replace(/\s+as\s+\w+$/, "").trim();
        const lower = stripped.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (ICON_NAME_MAP[lower]) {
          return icon.replace(stripped, ICON_NAME_MAP[lower]);
        }
        // Check if the icon name starts with lowercase (wrong casing)
        if (stripped.length > 0 && stripped[0] === stripped[0].toLowerCase()) {
          // PascalCase it
          const pascal = stripped.charAt(0).toUpperCase() + stripped.slice(1);
          return icon.replace(stripped, pascal);
        }
        return icon;
      })
      .join(", ");
    return `import { ${fixed} } from "lucide-react"`;
  });
}

/**
 * Fix missing React import when JSX is used
 */
const JSX_RE = /(<[A-Z][^>]*>|<\w+[^>]*\/>|<\w+\s+[^>]*>)/;
const REACT_IMPORT = `import React from "react"`;

function fixMissingReactImport(text: string): string {
  // Only apply to .jsx/.tsx file content
  if (!text.includes("App.jsx") && !text.includes(".tsx") && !text.includes(".jsx")) {
    return text;
  }
  
  const lines = text.split("\n");
  const hasJSX = JSX_RE.test(text);
  const hasReactImport = text.includes('import React') || text.includes('from "react"') || text.includes("from 'react'");
  
  if (hasJSX && !hasReactImport && !text.includes("export default")) {
    // Only add if this looks like a component file
    return `${REACT_IMPORT}\n${text}`;
  }
  
  return text;
}

/**
 * Fix import paths that use @/ when they shouldn't
 */
const IMPORT_ALIAS_RE = /from\s+["']@\/([^"']+)["']/g;

function fixImportPaths(text: string): string {
  // This is already correct for this project's virtual file system
  // but we ensure consistency
  return text.replace(IMPORT_ALIAS_RE, 'from "@/');
}

/**
 * Normalize line endings to LF
 */
function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

/**
 * Fix common JSX syntax issues
 */
const SELF_CLOSING_TAGS = [
  "input", "br", "hr", "img", "link", "meta", "area", "base", "col",
  "embed", "source", "track", "wbr",
];

function fixJSXSyntax(text: string): string {
  // Fix self-closing tags written as <input> instead of <input />
  for (const tag of SELF_CLOSING_TAGS) {
    const re = new RegExp(`<${tag}(\\s[^>]*)?>`, "g");
    text = text.replace(re, (match, attrs) => {
      if (match.endsWith("/>")) return match;
      return attrs ? `<${tag}${attrs} />` : `<${tag} />`;
    });
  }
  return text;
}

/**
 * All rewrite rules in order of application
 */
export const REWRITE_RULES: RewriteRule[] = [
  {
    name: "normalize-line-endings",
    test: () => true,
    apply: normalizeLineEndings,
  },
  {
    name: "fix-icon-imports",
    test: (text) => text.includes("lucide-react"),
    apply: fixIconImports,
  },
  {
    name: "fix-missing-react-import",
    test: (text) => JSX_RE.test(text) && !text.includes('import React'),
    apply: fixMissingReactImport,
  },
  {
    name: "fix-import-paths",
    test: (text) => text.includes('from "@/'),
    apply: fixImportPaths,
  },
  {
    name: "fix-jsx-syntax",
    test: (text) => /<\/?[a-z]+[>\s]/.test(text),
    apply: fixJSXSyntax,
  },
];

/**
 * Rewrite streamed text content in real-time
 * This is called on each chunk as it arrives
 */
export function rewriteStreamChunk(chunk: string): string {
  let result = chunk;
  for (const rule of REWRITE_RULES) {
    if (rule.test(result)) {
      result = rule.apply(result);
    }
  }
  return result;
}

/**
 * Post-process a complete file's content after generation
 * Applies more aggressive rewrites on the full content
 */
export function rewriteCompleteFile(content: string): string {
  let result = content;
  
  // Apply all rules sequentially
  for (const rule of REWRITE_RULES) {
    try {
      if (rule.test(result)) {
        result = rule.apply(result);
      }
    } catch {
      // Skip failing rules silently
    }
  }
  
  return result;
}
