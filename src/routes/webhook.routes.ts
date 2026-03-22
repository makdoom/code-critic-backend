import { Router, Request, Response } from "express";

const webHookRouter: Router = Router();

webHookRouter.post("/review", (req: Request, res: Response) => {
  const event = req.headers["x-github-event"];
  const { action, pull_request } = req.body;

  // Only handle PR events
  if (event !== "pull_request") return res.status(200).send("Ignored event");

  if (action !== "opened")
    return res.status(200).send(`Ignored action: ${action}`);

  console.log("🔥 PR Opened:", pull_request.title);

  // 👉 Your AI logic here

  return res.status(200).send("PR opened event processed");
});

export default webHookRouter;
