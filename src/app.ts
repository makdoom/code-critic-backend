import express, { Express } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { errorHandler } from "./middleware/error-handler";
import router from "./routes";

const app: Express = express();

app.use(helmet());
app.use(express.json({ limit: "10mb" }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use("/api/v1", router);

app.use(errorHandler);

export default app;
