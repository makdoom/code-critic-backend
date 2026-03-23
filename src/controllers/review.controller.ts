import { Request, Response } from "express";
import { verifyGitHubSignature } from "../utils/signatureValidation";
import { config } from "../config";
import { fetchPRDiff, postReviewComment } from "../services/github.service";
import { extractPRContext } from "../utils/extractPRContext";
// import { ReviewResult } from "../types";
import { reviewService } from "../services/review.service";

export const reviewController = async (req: Request, res: Response) => {
  try {
    const signature = req.headers["x-hub-signature-256"] as string;
    if (!signature) return res.status(400).send("Missing signature");

    const isValid = verifyGitHubSignature(
      signature,
      req.body as Buffer,
      config.github.webhookSecret,
    );

    if (!isValid) return res.status(401).send("Invalid signature");

    const event = req.headers["x-github-event"];
    const body = JSON.parse(req.body.toString());

    const { action } = body;

    // Only handle PR events
    if (event !== "pull_request") return res.status(200).send("Ignored event");

    if (action !== "opened")
      return res.status(200).send(`Ignored action: ${action}`);

    const context = extractPRContext(body);
    console.log(context);

    console.log("📦 Fetching diff from:", context.diffUrl);

    const diff = await fetchPRDiff(context.diffUrl);
    const review = await reviewService(diff);
    // const review: ReviewResult = {
    //   score: 25,
    //   verdict: "Risky",
    //   summary:
    //     "This PR updates the condition for identifying an 'admin' user. However, it contains a critical runtime error due to attempting to access properties on an undefined value, as the 'users' array is always empty.",
    //   changeIntent: "feature",
    //   walkthrough: [
    //     {
    //       file: "src/App.tsx",
    //       summary:
    //         'The condition within the `users.find()` method was changed from `item.role == "user"` to `item.role == "employee"`. This file also contains a critical bug where `admin.status` is accessed without checking if `admin` is defined, which will always be `undefined` because the `users` array is empty.',
    //     },
    //   ],
    //   issues: [
    //     {
    //       classification: "blocking",
    //       type: "bug",
    //       severity: "critical",
    //       file: "src/App.tsx",
    //       line: 12,
    //       message:
    //         "The `users` array is initialized as empty (`let users = [];`) and is never populated with data. Consequently, `users.find()` will always return `undefined`. The subsequent attempt to access `admin.status` on an `undefined` value will cause a `TypeError: Cannot read properties of undefined (reading 'status')` and crash the application at runtime.",
    //       confidence: 1,
    //       code: '  if (admin.status == "1") {',
    //       suggestion:
    //         "To prevent the application from crashing, ensure that `admin` is defined before attempting to access its properties. Additionally, the `users` array needs to be populated with actual user data for this logic to be meaningful.\n" +
    //         "\n" +
    //         "typescript\n" +
    //         '  let admin = users.find((item) => item.role == "employee");\n' +
    //         '  if (admin?.status === "1") { // Use optional chaining and strict equality\n' +
    //         "    return <p>Admin</p>;\n" +
    //         "  }\n" +
    //         "  // Consider adding a default return or handling the case where no admin is found.\n" +
    //         "  // return <p>Not Admin</p>;\n",
    //     },
    //   ],
    //   suggestions: [
    //     {
    //       file: "src/App.tsx",
    //       message:
    //         "The `users` array is declared globally with `let users = [];`. In a React component, data that affects rendering should typically be managed via React state (`useState`), context, or passed as props, rather than a mutable global variable. This makes data flow harder to track and can lead to unexpected behavior or stale data. Consider how `users` should be populated and managed within the component lifecycle.",
    //     },
    //   ],
    // };

    console.log("🤖 Review result:", review);

    await postReviewComment(context, review);

    return res.status(200).send("PR opened event processed");
  } catch (error) {
    console.error(error);
    throw error;
  }
};
