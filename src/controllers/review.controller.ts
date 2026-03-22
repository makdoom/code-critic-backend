import { Request, Response } from "express";
import { verifyGitHubSignature } from "../utils/signatureValidation";
import { config } from "../config";
import { fetchPRDiff, postReviewComment } from "../services/github.service";
import { reviewService } from "../services/review.service";
import { extractPRContext } from "../utils/extractPRContext";

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

    console.log(body);
    process.exit();
    const context = extractPRContext(body);
    console.log(context);

    console.log("📦 Fetching diff from:", context.diffUrl);

    const diff = await fetchPRDiff(context.diffUrl);
    const review = await reviewService(diff);

    console.log("🤖 Review result:", review);

    await postReviewComment(context, review);

    return res.status(200).send("PR opened event processed");
  } catch (error) {
    console.error(error);
    throw error;
  }
};
