// src/types/pr.types.ts

export interface PRReviewContext {
  // ── Repo identification ──────────────────────────────────────
  owner: string; // "john" — needed for all Octokit API calls
  repo: string; // "my-project" — needed for all Octokit API calls

  // ── PR identification ────────────────────────────────────────
  prNumber: number; // 42 — needed to post comments/reviews
  prTitle: string; // "Fix login bug" — sent to AI for context
  prBody: string | null; // PR description — helps AI understand intent

  // ── Commit info ──────────────────────────────────────────────
  headSha: string; // latest commit SHA — required for inline review comments
  baseSha: string; // base branch SHA — useful for diff context

  // ── Diff ────────────────────────────────────────────────────
  diffUrl: string; // URL to fetch raw unified diff

  // ── Author ──────────────────────────────────────────────────
  authorLogin: string; // PR author username — useful for logs

  // ── GitHub App auth ──────────────────────────────────────────
  installationId: number; // required to authenticate as GitHub App installation
}
