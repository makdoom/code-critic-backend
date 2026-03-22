import { Router, Request, Response } from "express";

const healthRouter: Router = Router();

healthRouter.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get("/ready", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ready",
    timestamp: new Date().toISOString(),
  });
});

export default healthRouter;
