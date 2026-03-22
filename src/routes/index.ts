import { Router } from "express";
import healthRouter from "./health.routes";
import webHookRouter from "./webhook.routes";

const router: Router = Router();

router.use("/health", healthRouter);
router.use("/webhook", webHookRouter);

export default router;
