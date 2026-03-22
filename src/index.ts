import { configDotenv } from "dotenv";
import { config } from "./config";
import { logger } from "./utils/logger";
import app from "./app";

configDotenv();

app.listen(config.port, () => {
  logger.info(
    `Server running on port ${config.port} in ${config.nodeEnv} mode`,
  );
});
