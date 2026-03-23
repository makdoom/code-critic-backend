// // src/services/commentFormatter.ts

import type {
  ReviewResult,
  ReviewIssue,
  Verdict,
  Severity,
  IssueClassification,
} from "../types/index.js";

// ── Emoji maps ────────────────────────────────────────────────────────────────

const VERDICT_EMOJI: Record<Verdict, string> = {
  Excellent: "✅",
  Good: "🟡",
  "Needs Improvement": "🟠",
  Risky: "🔴",
  Critical: "🚨",
};

const SEVERITY_EMOJI: Record<Severity, string> = {
  critical: "🚨",
  high: "🔴",
  medium: "🟠",
  low: "🔵",
};

const CLASSIFICATION_BADGE: Record<IssueClassification, string> = {
  blocking: "🔒 BLOCKING",
  non_blocking: "⚠️ Non-blocking",
  improvement: "💡 Improvement",
};

const scoreBar = (score: number): string => {
  const filled = Math.round(score / 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
};

const scoreIndicator = (score: number) => {
  if (score >= 90) return "🟢";
  if (score >= 75) return "🟡";
  if (score >= 50) return "🟠";
  return "🔴";
};

const scoreDisplay = (score: number, verdict: string, intent: string) => {
  return [
    `${scoreIndicator(score)} **${verdict} · ${score}/100** · \`${intent}\``,
    `\`${scoreBar(score)}\``,
  ].join("\n");
};

export const formatIssue = (issue: ReviewIssue): string => {
  const severityEmoji = SEVERITY_EMOJI[issue.severity];
  const badge = CLASSIFICATION_BADGE[issue.classification];
  const location = issue.line
    ? `${issue.file} line ${issue.line}`
    : `${issue.file}`;

  const summaryLine = `${severityEmoji} ${badge} · ${issue.type} · ${location}`;

  const bodyLines: string[] = [
    `<details>`,
    `<summary>${summaryLine}</summary>`,
    ``,
    issue.message,
  ];

  if (issue.code) {
    bodyLines.push(
      ``,
      `**Existing code**`,
      `\`\`\`typescript`,
      issue.code,
      `\`\`\``,
    );
  }

  if (issue.suggestion) {
    bodyLines.push(
      ``,
      `**Suggestion**`,
      `\`\`\`typescript`,
      issue.suggestion,
      `\`\`\``,
    );
  }

  bodyLines.push(``, `</details>`);

  return bodyLines.join("\n");
};

const getMergeDecision = (result: ReviewResult): string => {
  const hasBlocking = result.issues.some(
    (i) => i.classification === "blocking",
  );

  if (hasBlocking) {
    return `🚫 **Do not merge** — blocking issues must be resolved`;
  }

  if (result.score >= 90) {
    return `✅ **Ready to merge** — no significant issues`;
  }

  return `⚠️ **Safe to merge with minor improvements**`;
};

// ── Main formatter ────────────────────────────────────────────────────────────

export const formatReviewComment = (result: ReviewResult): string => {
  const emoji = VERDICT_EMOJI[result.verdict] || "⚫️";

  const blocking: ReviewIssue[] = [];
  const nonBlocking: ReviewIssue[] = [];
  const improvements: ReviewIssue[] = [];

  result.issues.forEach((issue) => {
    if (issue.classification == "blocking") blocking.push(issue);
    if (issue.classification == "non_blocking") nonBlocking.push(issue);
    if (issue.classification == "improvement") improvements.push(issue);
  });

  const lines: string[] = [];

  // Header
  lines.push(`## ${emoji} AI Code Review · **${result.verdict}**`);
  lines.push(``);

  lines.push(`> ${getMergeDecision(result)}`);
  lines.push(``);

  lines.push(scoreDisplay(result.score, result.verdict, result.changeIntent));
  lines.push(``);

  lines.push("### ⚙️ PR Summary");
  lines.push(` ${result.summary}`);
  lines.push(``);

  // Walkthrough
  if (result.walkthrough.length > 0) {
    lines.push(`### 📋 Walkthrough`);
    lines.push(``);
    for (const entry of result.walkthrough) {
      lines.push(`- **\`${entry.file}\`** — ${entry.summary}`);
    }
    lines.push(``);
  }

  // Stats row
  lines.push(
    `| 🔒 Blocking | ⚠️ Non-blocking | 💡 Improvements | 📝 Suggestions |`,
  );
  lines.push(
    `|------------|----------------|-----------------|----------------|`,
  );
  lines.push(
    `| ${blocking.length} | ${nonBlocking.length} | ${improvements.length} | ${result.suggestions.length} |`,
  );
  lines.push(``);

  // Blocking issues
  if (blocking.length > 0) {
    lines.push(`### 🔒 Blocking Issues - ${blocking.length}`);
    lines.push(``);

    for (const issueIndex in blocking) {
      lines.push(
        `${issueIndex}. ${blocking[issueIndex].file} at line ${blocking[issueIndex].line}`,
      );
    }
  }

  // Non-blocking issues
  if (nonBlocking.length > 0) {
    lines.push(`### ⚠️ Non-blocking Issues`);
    lines.push(``);
    for (const issue of nonBlocking) {
      lines.push(formatIssue(issue));
      lines.push(``);
    }
  }

  // Improvements
  if (improvements.length > 0) {
    lines.push(`### 💡 Improvements`);
    lines.push(``);
    for (const issue of improvements) {
      lines.push(formatIssue(issue));
      lines.push(``);
    }
  }

  // Suggestions
  if (result.suggestions.length > 0) {
    lines.push(`### 📝 Suggestions`);
    lines.push(``);
    for (const s of result.suggestions) {
      const filePrefix = s.file ? `**\`${s.file}\`** — ` : "";
      lines.push(`- ${filePrefix}${s.message}`);
    }
    lines.push(``);
  }

  // Footer
  lines.push(`---`);
  lines.push(`<sub>🤖 Generated by ai-code-reviewer</sub>`);

  return lines.join("\n");
};

// import type {
//   ReviewResult,
//   ReviewIssue,
//   Verdict,
//   Severity,
//   IssueClassification,
// } from "../types/index.js";

// // ── Emoji maps ────────────────────────────────────────────────────────────────

// const VERDICT_EMOJI: Record<Verdict, string> = {
//   Excellent: "✅",
//   Good: "🟡",
//   "Needs Improvement": "🟠",
//   Risky: "🔴",
//   Critical: "🚨",
// };

// const SEVERITY_EMOJI: Record<Severity, string> = {
//   critical: "🚨",
//   high: "🔴",
//   medium: "🟠",
//   low: "🔵",
// };

// const CLASSIFICATION_BADGE: Record<IssueClassification, string> = {
//   blocking: "🔒 **BLOCKING**",
//   non_blocking: "⚠️ **Non-blocking**",
//   improvement: "💡 **Improvement**",
// };

// // ── Helpers ───────────────────────────────────────────────────────────────────

// const scoreBar = (score: number): string => {
//   const filled = Math.round(score / 10);
//   return "█".repeat(filled) + "░".repeat(10 - filled);
// };

// const getMergeDecision = (result: ReviewResult): string => {
//   const hasBlocking = result.issues.some(
//     (i) => i.classification === "blocking",
//   );

//   if (hasBlocking) {
//     return `🚫 **Do not merge** — blocking issues must be resolved`;
//   }

//   if (result.score >= 90) {
//     return `✅ **Ready to merge** — no significant issues`;
//   }

//   return `⚠️ **Safe to merge with minor improvements**`;
// };

// const groupByFile = (issues: ReviewIssue[]) => {
//   return issues.reduce<Record<string, ReviewIssue[]>>((acc, issue) => {
//     acc[issue.file] = acc[issue.file] || [];
//     acc[issue.file].push(issue);
//     return acc;
//   }, {});
// };

// // ── Issue Formatter ───────────────────────────────────────────────────────────

// export const formatIssue = (issue: ReviewIssue): string => {
//   const severityEmoji = SEVERITY_EMOJI[issue.severity];
//   const badge = CLASSIFICATION_BADGE[issue.classification];

//   const location = issue.line
//     ? `\`${issue.file}\` line ${issue.line}`
//     : `\`${issue.file}\``;

//   const summaryLine = `${severityEmoji} ${badge} · **${issue.type.toUpperCase()}** · ${location}`;

//   const bodyLines: string[] = [
//     `<details>`,
//     `<summary>${summaryLine}</summary>`,
//     ``,
//     issue.message,
//   ];

//   // Add impact hint (builds trust)
//   if (issue.classification === "blocking") {
//     bodyLines.push(
//       ``,
//       `> ⚠️ This issue can break functionality or cause incorrect behavior`,
//     );
//   }

//   if (issue.code) {
//     bodyLines.push(
//       ``,
//       `**Existing code**`,
//       `\`\`\`typescript`,
//       issue.code,
//       `\`\`\``,
//     );
//   }

//   if (issue.suggestion) {
//     bodyLines.push(
//       ``,
//       `**Suggested fix**`,
//       `\`\`\`typescript`,
//       issue.suggestion,
//       `\`\`\``,
//     );
//   }

//   bodyLines.push(
//     ``,
//     `<sub>Confidence: ${Math.round(issue.confidence * 100)}%</sub>`,
//     `</details>`,
//   );

//   return bodyLines.join("\n");
// };

// // ── Section Renderer ──────────────────────────────────────────────────────────

// const renderIssueGroup = (
//   lines: string[],
//   title: string,
//   issues: ReviewIssue[],
// ) => {
//   if (issues.length === 0) return;

//   lines.push(`<details open>`);
//   lines.push(`<summary>${title} (${issues.length})</summary>`);
//   lines.push(``);

//   const grouped = groupByFile(issues);

//   for (const file in grouped) {
//     lines.push(`#### 📄 \`${file}\``);
//     lines.push(``);

//     for (const issue of grouped[file]) {
//       lines.push(formatIssue(issue));
//       lines.push(``);
//     }
//   }

//   lines.push(`</details>`);
//   lines.push(``);
// };

// // ── Main Formatter ────────────────────────────────────────────────────────────

// export const formatReviewComment = (result: ReviewResult): string => {
//   const emoji = VERDICT_EMOJI[result.verdict] || "⚫️";

//   const blocking: ReviewIssue[] = [];
//   const nonBlocking: ReviewIssue[] = [];
//   const improvements: ReviewIssue[] = [];

//   result.issues.forEach((issue) => {
//     if (issue.classification === "blocking") blocking.push(issue);
//     if (issue.classification === "non_blocking") nonBlocking.push(issue);
//     if (issue.classification === "improvement") improvements.push(issue);
//   });

//   const lines: string[] = [];

//   // ── Header ──────────────────────────────────────────────────────────────────

//   lines.push(`## ${emoji} AI Code Review · **${result.verdict}**`);
//   lines.push(``);

//   lines.push(`> ${getMergeDecision(result)}`);
//   lines.push(``);

//   lines.push(
//     `\`${scoreBar(result.score)}\` **${result.score}/100** · \`${result.changeIntent}\``,
//   );
//   lines.push(``);

//   lines.push(`> ${result.summary}`);
//   lines.push(``);

//   // ── Quick Stats ─────────────────────────────────────────────────────────────

//   lines.push(
//     `**🔒 ${blocking.length} Blocking · ⚠️ ${nonBlocking.length} Non-blocking · 💡 ${improvements.length} Improvements · 📝 ${result.suggestions.length} Suggestions**`,
//   );
//   lines.push(``);

//   // ── Top Issues (fast scan) ──────────────────────────────────────────────────

//   const topIssues = blocking.slice(0, 3);

//   if (topIssues.length > 0) {
//     lines.push(`### 🚨 Top Issues to Fix First`);
//     lines.push(``);

//     for (const issue of topIssues) {
//       lines.push(
//         `- **\`${issue.file}:${issue.line ?? "-"}\`** — ${issue.message}`,
//       );
//     }

//     lines.push(``);
//   }

//   // ── Walkthrough ─────────────────────────────────────────────────────────────

//   if (result.walkthrough.length > 0) {
//     lines.push(`### 📋 Walkthrough`);
//     lines.push(``);

//     for (const entry of result.walkthrough) {
//       lines.push(`- **\`${entry.file}\`** — ${entry.summary}`);
//     }

//     lines.push(``);
//   }

//   // ── Issues (Grouped + Collapsible) ──────────────────────────────────────────

//   renderIssueGroup(lines, `### 🔒 Blocking Issues`, blocking);
//   renderIssueGroup(lines, `### ⚠️ Non-blocking Issues`, nonBlocking);
//   renderIssueGroup(lines, `### 💡 Improvements`, improvements);

//   // ── Suggestions ─────────────────────────────────────────────────────────────

//   if (result.suggestions.length > 0) {
//     lines.push(`### 📝 Suggestions`);
//     lines.push(``);

//     for (const s of result.suggestions) {
//       const filePrefix = s.file ? `**\`${s.file}\`** — ` : "";
//       lines.push(`- ${filePrefix}${s.message}`);
//     }

//     lines.push(``);
//   }

//   // ── Footer ──────────────────────────────────────────────────────────────────

//   lines.push(`---`);
//   lines.push(`<sub>🤖 Generated by ai-code-reviewer</sub>`);

//   return lines.join("\n");
// };
