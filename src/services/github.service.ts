import { Octokit } from "@octokit/rest";
import { ReviewResult } from "../types";
import { PRReviewContext } from "../types/pr.types";
import { createAppAuth } from "@octokit/auth-app";
import { config } from "../config";
import { formatIssue, formatReviewComment } from "../utils/commentFormatter";

export const fetchPRDiff = async (diffUrl: string) => {
  const response = await fetch(diffUrl, {
    headers: {
      Accept: "application/vnd.github.v3.diff",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch PR diff");
  }

  const diff = await response.text();

  return diff;
};

const createOctokit = (installationId: number): Octokit => {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: Number(config.github.githubAppId),
      privateKey: config.github.githubPrivateKey.replace(/\\n/g, "\n"),
      installationId,
    },
  });
};

export async function postReviewComment(
  context: PRReviewContext,
  result: ReviewResult,
): Promise<void> {
  const octokit = createOctokit(context.installationId);

  // 1. Post the main summary comment
  await octokit.rest.issues.createComment({
    owner: context.owner,
    repo: context.repo,
    issue_number: context.prNumber,
    body: formatReviewComment(result),
  });

  console.log(`✅ Summary comment posted on PR #${context.prNumber}`);

  // 2. Build inline comments for issues that have a line number
  const inlineComments = result.issues
    .filter((i) => typeof i.line === "number" && i.line > 0)
    .map((i) => ({
      path: i.file,
      line: i.line as number,
      body: formatIssue(i),
    }));

  // 3. Post inline review (REQUEST_CHANGES if any blocking, else COMMENT)
  if (inlineComments.length > 0) {
    const hasBlocking = result.issues.some(
      (i) => i.classification === "blocking",
    );

    await octokit.rest.pulls.createReview({
      owner: context.owner,
      repo: context.repo,
      pull_number: context.prNumber,
      commit_id: context.headSha,
      event: hasBlocking ? "REQUEST_CHANGES" : "COMMENT",
      comments: inlineComments,
    });

    console.log(
      `✅ Inline review posted — ${inlineComments.length} comment(s)`,
    );
  }
}
