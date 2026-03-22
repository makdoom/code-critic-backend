import { Router } from "express";
import { reviewController } from "../controllers/review.controller";

const webHookRouter: Router = Router();

webHookRouter.post("/github/review", reviewController);

export default webHookRouter;
