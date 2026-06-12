import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export interface VisionIssue {
  type: "alignment" | "spacing" | "color" | "typography" | "responsive" | "accessibility" | "layout" | "other";
  severity: "critical" | "major" | "minor" | "cosmetic";
  element: string;
  description: string;
  suggestion: string;
}

export interface VisionAnalysis {
  screenType: string;
  issues: VisionIssue[];
  summary: string;
  overallScore: number;
}

const ANALYSIS_PROMPT = `You are a UI/UX expert analyzing a screenshot of a generated web application.
Examine the screenshot for these categories of issues:

1. **Alignment** - Elements not properly aligned, uneven margins
2. **Spacing** - Inconsistent gaps, padding issues, crammed content
3. **Color** - Poor contrast, inaccessible color combinations, inconsistent palette
4. **Typography** - Font size inconsistencies, hard-to-read text
5. **Responsive** - Content overflow, horizontal scroll, broken layouts
6. **Accessibility** - Missing labels, poor focus indicators, insufficient contrast
7. **Layout** - Broken grid, overlapping elements, structural problems

Return a JSON object with:
- screenType: what type of page this is (dashboard, landing, form, etc.)
- summary: 1-2 sentence overall assessment
- overallScore: 0-100 quality score
- issues: array of issues found, each with:
  - type: one of the categories above
  - severity: critical/major/minor/cosmetic
  - element: what element has the issue (e.g., "header navigation", "sidebar", "stat card")
  - description: what's wrong
  - suggestion: how to fix it

If no issues found, return empty issues array with score 100.`;

export async function analyzeScreenshot(
  imageBase64: string,
  apiKey: string
): Promise<VisionAnalysis> {
  const google = createGoogleGenerativeAI({ apiKey });
  const model = google("gemini-2.5-flash");

  const { text } = await generateText({
    model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: ANALYSIS_PROMPT },
          { type: "image", image: imageBase64 },
        ],
      },
    ],
  });

  try {
    const parsed = JSON.parse(text.replace(/```json\n?/g, "").replace(/```\n?/g, ""));
    return {
      screenType: parsed.screenType || "unknown",
      issues: parsed.issues || [],
      summary: parsed.summary || "",
      overallScore: parsed.overallScore ?? 100,
    };
  } catch {
    return {
      screenType: "unknown",
      issues: [],
      summary: "Failed to parse vision analysis",
      overallScore: 0,
    };
  }
}

export function generateFixPrompt(analysis: VisionAnalysis): string {
  const criticalIssues = analysis.issues
    .filter((i) => i.severity === "critical" || i.severity === "major")
    .map((i) => `- [${i.severity}] ${i.element}: ${i.description}. Fix: ${i.suggestion}`);

  if (criticalIssues.length === 0) return "";

  return `Fix these UI issues found in the visual analysis:\n${criticalIssues.join("\n")}\n\nApply fixes using str_replace_editor.`;
}

export function formatVisionReport(analysis: VisionAnalysis): string {
  const sev = (s: string) =>
    s === "critical" ? "🔴" : s === "major" ? "🟠" : s === "minor" ? "🟡" : "⚪";

  const lines = [
    `**Visual Analysis: ${analysis.screenType}**`,
    `Score: ${analysis.overallScore}/100`,
    `${analysis.summary}`,
  ];

  if (analysis.issues.length > 0) {
    lines.push(`\n**Issues Found (${analysis.issues.length})**`);
    for (const issue of analysis.issues) {
      lines.push(`${sev(issue.severity)} **${issue.element}** — ${issue.description}`);
      lines.push(`   → ${issue.suggestion}`);
    }
  } else {
    lines.push("\n✅ No issues found!");
  }

  return lines.join("\n");
}
