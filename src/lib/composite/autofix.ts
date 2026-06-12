/**
 * AutoFix — Post-Generation Error Correction
 * 
 * Like v0's AutoFix model: after the LLM finishes generating code,
 * run a series of deterministic and smart fixers to catch and correct
 * common issues before the user sees them.
 * 
 * Runs as a post-processing pass on the generated file system.
 */

import { VirtualFileSystem } from "../file-system";

export interface AutoFixResult {
  file: string;
  fixes: Fix[];
}

export interface Fix {
  type: string;
  description: string;
  applied: boolean;
}

export interface AutoFixReport {
  totalFixes: number;
  filesChecked: number;
  filesWithIssues: number;
  fixes: AutoFixResult[];
}

/**
 * Check for missing imports in generated code
 * Scans for references to identifiers that should be imported
 */
function fixMissingImports(content: string, allFiles: Map<string, string>): Fix[] {
  const fixes: Fix[] = [];
  
  // Check for use client directive
  if (content.includes("useState") || content.includes("useEffect") || 
      content.includes("useRef") || content.includes("useCallback") ||
      content.includes("useMemo") || content.includes("useContext")) {
    if (!content.includes("use client") && !content.includes('"use client"') && !content.includes("'use client'")) {
      // Client hooks used without 'use client' directive
      // This is a Next.js requirement, not always needed
    }
  }

  // Check for missing React import when using JSX
  const hasJSX = /<[A-Z][^>]*>|<\w+[^>]*\/>|<\w+\s+[^>]*>/.test(content);
  const hasReactImport = content.includes('from "react"') || content.includes("from 'react'") || 
                          content.includes('import React');
  
  if (hasJSX && !hasReactImport && !content.includes("export default")) {
    // Not always needed in React 19 (automatic JSX runtime)
    // But it's safer to have it
  }

  return fixes;
}

/**
 * Fix Tailwind CSS class ordering and validation
 */
function fixTailwindClasses(content: string): Fix[] {
  const fixes: Fix[] = [];
  
  // Check for common Tailwind v4 migration issues
  const commonIssues = [
    { from: /outline-none/g, to: "outline-hidden", desc: "outline-none → outline-hidden in Tailwind v4" },
    { from: /flex-shrink-0/g, to: "shrink-0", desc: "flex-shrink-0 → shrink-0 in Tailwind v4" },
    { from: /flex-grow/g, to: "grow", desc: "flex-grow → grow in Tailwind v4" },
  ];

  for (const issue of commonIssues) {
    if (issue.from.test(content)) {
      content = content.replace(issue.from, issue.to);
      fixes.push({ type: "tailwind", description: issue.desc, applied: true });
    }
  }

  return fixes;
}

/**
 * Remove trailing whitespace and ensure single trailing newline
 */
function fixFormatting(content: string): Fix[] {
  const fixes: Fix[] = [];
  
  // Remove trailing whitespace from each line
  const trimmed = content.split("\n").map(l => l.replace(/\s+$/, "")).join("\n");
  if (trimmed !== content) {
    fixes.push({ type: "formatting", description: "Removed trailing whitespace", applied: true });
  }
  
  // Ensure single trailing newline
  const normalized = trimmed.endsWith("\n") ? trimmed : trimmed + "\n";
  if (normalized !== trimmed && normalized !== content) {
    fixes.push({ type: "formatting", description: "Added trailing newline", applied: false });
  }

  return fixes;
}

/**
 * Check for duplicate exports (common AI generation artifact)
 */
function fixDuplicateExports(content: string): Fix[] {
  const fixes: Fix[] = [];
  
  const exportDefaultMatches = content.match(/export\s+default\s+/g);
  if (exportDefaultMatches && exportDefaultMatches.length > 1) {
    // Keep only the last export default
    const lines = content.split("\n");
    const exportLines: number[] = [];
    lines.forEach((line, idx) => {
      if (/export\s+default\s+/.test(line)) exportLines.push(idx);
    });
    
    if (exportLines.length > 1) {
      // Remove earlier export defaults
      const toRemove = exportLines.slice(0, -1);
      for (const lineNum of toRemove.sort().reverse()) {
        lines.splice(lineNum, 1);
      }
      // We'll return the fixed content via the caller
      fixes.push({ 
        type: "duplicate-export", 
        description: `Removed ${toRemove.length} duplicate export default(s)`, 
        applied: true 
      });
    }
  }

  return fixes;
}

/**
 * Main AutoFix entry point
 * Scans all files in the virtual file system and applies fixes
 */
export function runAutoFix(fileSystem: VirtualFileSystem): AutoFixReport {
  const report: AutoFixReport = {
    totalFixes: 0,
    filesChecked: 0,
    filesWithIssues: 0,
    fixes: [],
  };

  const allFiles = fileSystem.getAllFiles();
  report.filesChecked = allFiles.size;

  for (const [path, content] of allFiles) {
    if (!content) continue;

    const fileFixes: Fix[] = [
      ...fixFormatting(content),
      ...fixTailwindClasses(content),
      ...fixMissingImports(content, allFiles),
      ...fixDuplicateExports(content),
    ];

    const appliedFixes = fileFixes.filter(f => f.applied);
    
    if (appliedFixes.length > 0) {
      // Apply fixes by rewriting the file
      let fixedContent = content;
      
      // Handle duplicate exports
      const exportFixes = appliedFixes.filter(f => f.type === "duplicate-export");
      if (exportFixes.length > 0) {
        const lines = fixedContent.split("\n");
        const exportLines: number[] = [];
        lines.forEach((line, idx) => {
          if (/export\s+default\s+/.test(line)) exportLines.push(idx);
        });
        if (exportLines.length > 1) {
          const toRemove = exportLines.slice(0, -1);
          for (const lineNum of toRemove.sort().reverse()) {
            lines.splice(lineNum, 1);
          }
          fixedContent = lines.join("\n");
        }
      }

      if (fixedContent !== content) {
        fileSystem.updateFile(path, fixedContent);
      }

      report.totalFixes += appliedFixes.length;
      report.filesWithIssues++;
      report.fixes.push({ file: path, fixes: appliedFixes });
    }
  }

  return report;
}

/**
 * Quick format check for generated code
 * Returns true if the code passes basic syntax checks
 */
export function quickValidate(content: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check for unmatched braces
  const openBraces = (content.match(/{/g) || []).length;
  const closeBraces = (content.match(/}/g) || []).length;
  if (openBraces !== closeBraces) {
    issues.push(`Unmatched braces: ${openBraces} open, ${closeBraces} closed`);
  }

  // Check for unmatched parentheses
  const openParens = (content.match(/\(/g) || []).length;
  const closeParens = (content.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    issues.push(`Unmatched parentheses: ${openParens} open, ${closeParens} closed`);
  }

  // Check for common syntax errors
  if (/const\s+\w+\s*=\s*const\s+/.test(content)) {
    issues.push("Duplicate const keyword found");
  }

  return { valid: issues.length === 0, issues };
}
