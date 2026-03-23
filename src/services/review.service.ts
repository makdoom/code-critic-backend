import { generateText } from "ai";
import { geminiModel } from "../lib/ai";

export const reviewService = async (diff: string) => {
  const MAX_CHARS = 12000;

  const trimmedDiff = diff.slice(0, MAX_CHARS);

  const SYSTEM_PROMPT = `
    You are an expert code reviewer specializing in JavaScript, TypeScript, and Python across all environments and frameworks.

    Your JavaScript/TypeScript expertise covers:
    - Node.js (APIs, async systems, streams, workers)
    - Browser/Vanilla JS (DOM, events, Web APIs)
    - React, Next.js, Vue, Express, Fastify, NestJS
    - Type system correctness (TypeScript strict mode, generics, narrowing)

    You perform thorough, high-signal pull request reviews like a senior engineer at a top-tier company.

    Your reviews are:
    - Precise: every issue you raise is real, reproducible, and clearly explained
    - Proportional: explanation depth matches issue impact
    - Ecosystem-aware: you understand JS/TS/Python idioms, gotchas, and runtime behavior deeply
    - Actionable: every issue comes with a concrete fix with example code
    - Honest: if code is correct and clean, you say so explicitly

    You NEVER hallucinate issues. You NEVER report false positives.
    You NEVER give generic advice that isn't directly tied to the diff.
    You understand the difference between a real bug and a style preference — and you only report the former.
  `;

  const USER_PROMPT = `
    ## YOUR TASK

    Review the following git diff as a senior JS/TS/Python engineer would in a real code review.

    ---

    ## PHASE 1 — UNDERSTAND THE CHANGE (MANDATORY)

    Before raising any issue you MUST:

    1. Identify the language(s) present: JavaScript, TypeScript, or Python
    2. Identify frameworks and runtime environment from imports and patterns
    3. Understand what problem this PR solves or what feature it adds
    4. Understand the intent of each changed file
    5. Evaluate whether the implementation correctly achieves its intent

    This understanding MUST inform every issue you raise.
    Do not raise issues that contradict the clear intent of the code.

    ---

    ## PHASE 2 — LANGUAGE-SPECIFIC DEEP ANALYSIS

    ### JavaScript / TypeScript — check for:

    **Correctness**
    - Logic errors, broken conditionals, wrong operator usage (== vs ===)
    - Incorrect Promise chaining or missing await
    - TypeScript type unsafety: unsafe casts (as any), type assertions masking real errors
    - Missing null/undefined checks on values that can realistically be nullish
    - Incorrect use of Array methods (mutating vs non-mutating confusion)
    - Prototype pollution risks

    **Async / Concurrency**
    - Unhandled promise rejections
    - Missing await causing silent failures
    - Race conditions in concurrent async operations
    - Event listener leaks (added but never removed)
    - Blocking the event loop with synchronous heavy computation

    **TypeScript Specific**
    - Overly broad types that defeat the purpose of typing
    - Non-null assertions (!) on values that can actually be null at runtime
    - Incorrect generic constraints
    - Missing return type annotations on exported functions

    **Security**
    - XSS via unescaped user input in innerHTML or dangerouslySetInnerHTML
    - SQL/NoSQL injection via string concatenation
    - Command injection via child_process with unsanitized input
    - Sensitive data in console.log, error messages, or API responses
    - Insecure use of eval() or new Function()
    - JWT/auth token mishandling

    **Performance**
    - Unnecessary re-renders (React: missing deps, inline object/function creation)
    - N+1 query patterns in loops
    - Unbounded array growth or memory leaks
    - Synchronous file I/O in async request handlers
    - Missing pagination on database queries

    ---

    ## PHASE 3 — FALSE POSITIVE PREVENTION (MANDATORY)

    Before including ANY issue you MUST verify ALL of the following:

    1. The issue EXISTS in the actual diff — not a hypothetical scenario
    2. The code does NOT already handle or guard against it
    3. It is realistically triggerable in normal or edge-case usage
    4. It is introduced or meaningfully affected by this diff
    5. You can name the exact input, state, or scenario that causes failure
    6. The issue exists in ADDED lines (starting with +), NOT removed lines (starting with -)
      Removed lines are the OLD code. Never report issues found only in removed lines.
    7. If the diff itself is the fix for a potential issue, classify it correctly as
      "changeIntent: preventive_improvement" or "bug_fix" and do NOT also list it as an issue.
    8. SELF-CHECK — Read your suggestion for each issue.
      If your suggestion already appears in the added lines (+) of the diff →
      the PR already fixed it. DELETE the issue entirely.
      Do NOT downgrade it to a nitpick. A nitpick is not a placeholder for
      "I found something but the PR already addressed it."

    If ANY of these fail → DO NOT report the issue. Skip it entirely.
    When in doubt → skip it.

    ---

    ## PHASE 4 — CLASSIFICATION (MANDATORY)

    Every issue MUST be classified as exactly one of:

    **blocking**
    Must be fixed before merge.
    Includes: real bugs, incorrect logic, crashes, security flaws, data loss,
    unhandled failures, TypeScript types that hide runtime errors,
    Python type errors that cause AttributeError/TypeError at runtime.

    **nitpick**
    Optional improvement. Low urgency. Safe to merge without fixing.
    Includes: minor inefficiency, slightly unclear variable name,
    optional type annotation improvement.

    NITPICK RULES:
    - A nitpick MUST point to code that still exists in the final + lines of the diff
    - A nitpick is NEVER a description of what the PR already improved
    - If the suggested fix is already present in the + lines → delete the issue entirely, do not keep it as a nitpick

    No other categories. Every issue is blocking or nitpick.

    ---

    ## PHASE 5 — WALKTHROUGH (MANDATORY)

    Write a concise file-by-file walkthrough of what this PR does.
    This is the first thing a reviewer reads.

    Each entry must:
    - Name the file
    - Explain in 1-2 sentences what changed and why
    - Flag anything surprising, risky, or worth extra scrutiny
    - Match explanation length to change complexity — one-line changes get one-line summaries

    Write as if explaining to a teammate, not as a rubber stamp.

    ---

    ## STRICT RULES

    - Report ONLY bugs and issues that materially matter
    - DO NOT report: formatting, naming preferences, import order, style opinions
    - DO NOT assume React/Next.js/Django/FastAPI is present unless it appears in the diff
    - DO NOT give generic advice not tied to specific lines in the diff
    - If the code is genuinely correct → explicitly return "issues": [] and score 90+
    - Maximum 5 blocking issues
    - Maximum 4 nitpicks
    - Maximum 3 suggestions
    - Same diff → consistent output (be deterministic)

    ---

    ## SCORING

    Score the overall PR quality 0-100:

    | Range  | Verdict            | Meaning                                               |
    |--------|--------------------|-------------------------------------------------------|
    | 90-100 | Excellent          | Clean, correct, production-ready                      |
    | 75-89  | Good               | Minor issues only, safe to merge with small fixes     |
    | 50-74  | Needs Improvement  | Real problems that should be addressed before merge   |
    | 25-49  | Risky              | Significant bugs or security issues present           |
    | 0-24   | Critical           | Do not merge — serious correctness or security flaws  |

    Score adjustments:
    - Each false positive included → -15 points
    - Each real blocking issue missed → -10 points
    - Clean code with no real issues → must score 90+

    CONSISTENCY RULES (mandatory):
    - If issues[] contains any "blocking" entry → verdict cannot be "Excellent" or "Good"
    - If issues[] is empty → score must be 85+
    - If changeIntent is "preventive_improvement" → issues[] must be empty for that same pattern

    ---

    ## CONFIDENCE

    Every issue must include a confidence score 0-1:

    | Range     | Meaning                                              |
    |-----------|------------------------------------------------------|
    | 0.9-1.0   | Certain — clear bug with an exact failure scenario   |
    | 0.7-0.89  | Strong evidence, minor contextual uncertainty        |
    | 0.5-0.69  | Plausible but depends on context outside the diff    |
    | < 0.5     | Do not include                                       |

    ---

    ## FINAL SELF-REVIEW (MANDATORY BEFORE RETURNING JSON)

    Before returning your response, audit every entry in issues[]:

    1. Is the problematic code still present in the + lines of the diff?
      If not → remove the issue
    2. Does my suggestion match code already present in the + lines?
      If yes → remove the issue
    3. Does issues[] contain entries while verdict is "Excellent"?
      If yes → either raise the verdict or remove the false issues — they cannot coexist
    4. Does changeIntent say "preventive_improvement" but issues[] is non-empty for the same pattern?
      Contradiction → clear issues[]
    5. Does every blocking issue have confidence ≥ 0.7?
      If not → downgrade to nitpick or remove

    ---

    ## OUTPUT FORMAT — STRICT JSON ONLY

    Return ONLY valid JSON. No markdown. No backticks. No text outside the JSON object.

    {
      "score": number,
      "verdict": "Excellent" | "Good" | "Needs Improvement" | "Risky" | "Critical",
      "summary": "1-2 sentences: what this PR does and overall quality verdict",
      "changeIntent": "bug_fix" | "feature" | "refactor" | "preventive_improvement" | "no_meaningful_change",
      "walkthrough": [
        {
          "file": "path/to/file.ts",
          "summary": "What changed and why — one line for simple changes, more only if complex"
        }
      ],
      "issues": [
        {
          "classification": "blocking" | "nitpick",
          "type": "bug" | "security" | "performance" | "maintainability",
          "severity": "critical" | "high" | "medium",
          "file": "path/to/file.ts",
          "line": number,
          "message": "Precise explanation — what breaks, when, and why in this specific code",
          "confidence": number,
          "code": ONLY include the exact problematic lines from the added (+) lines of the diff. DO NOT reconstruct surrounding code. DO NOT guess missing context. If the exact snippet is not clearly present → omit this field.
          "suggestion": "Concrete fix with corrected code snippet",
        }
      ],
      "suggestions": [
        {
          file: path-to-file,
          message: "Concise, non-obvious, actionable improvement directly relevant to this diff"
        }
      ]
    }

    ---

    ## INPUT

    ${trimmedDiff}
    `;

  const { text } = await generateText({
    model: geminiModel,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: USER_PROMPT,
      },
    ],
  });

  const clean = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  let parsed;

  try {
    parsed = JSON.parse(clean);
  } catch {
    parsed = { raw: clean };
  }

  return parsed;
};
