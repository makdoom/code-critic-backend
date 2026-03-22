import type { PRReviewContext } from "../types/pr.types.js";

export function extractPRContext(
  body: Record<string, unknown>,
): PRReviewContext {
  const pr = body.pull_request as Record<string, unknown>;
  const repo = body.repository as Record<string, unknown>;
  const owner = repo.owner as Record<string, unknown>;
  const installation = body.installation as Record<string, unknown> | undefined;

  return {
    owner: owner.login as string,
    repo: repo.name as string,
    prNumber: pr.number as number,
    prTitle: pr.title as string,
    prBody: pr.body as string | null,
    headSha: (pr.head as Record<string, unknown>).sha as string,
    baseSha: (pr.base as Record<string, unknown>).sha as string,
    diffUrl: pr.diff_url as string,
    authorLogin: (pr.user as Record<string, unknown>).login as string,
    installationId: (installation?.id as number) ?? 0,
  };
}
