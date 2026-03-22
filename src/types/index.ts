export type Verdict =
  | "Excellent"
  | "Good"
  | "Needs Improvement"
  | "Poor"
  | "Critical";

export type ChangeIntent =
  | "bug_fix"
  | "feature"
  | "refactor"
  | "performance"
  | "style"
  | "test"
  | "documentation"
  | "preventive_improvement"
  | "no_meaningful_change";

export type WalkthroughItem = {
  file: string;
  summary: string;
};

export type IssueClassification = "blocking" | "non_blocking" | "improvement";

export type ReviewIssueType =
  | "bug"
  | "performance"
  | "security"
  | "readability"
  | "maintainability"
  | "type_safety"
  | "logic";

export type Severity = "low" | "medium" | "high" | "critical";

export type Suggestion = {
  file?: string;
  message: string;
};

export type ReviewIssue = {
  classification: IssueClassification;
  type: ReviewIssueType;
  severity: Severity;
  file: string;
  line?: number;
  message: string;
  confidence: number; // 0 → 1
  suggestion?: string;
  code?: string;
};

export type ReviewResult = {
  score: number;
  verdict: Verdict;
  summary: string;
  changeIntent: ChangeIntent;
  walkthrough: WalkthroughItem[];
  issues: ReviewIssue[];
  suggestions: Suggestion[];
};
