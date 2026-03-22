import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "8080", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  database: {
    url: process.env.DATABASE_URL || "",
  },

  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },

  github: {
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || "",
    accessToken: process.env.GITHUB_ACCESS_TOKEN || "",
  },

  ai: {
    provider: process.env.AI_PROVIDER || "openai",
    openaiApiKey: process.env.OPENAI_API_KEY || "",
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  },
} as const;

export type Config = typeof config;
