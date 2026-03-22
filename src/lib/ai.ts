import { google } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

export const geminiModel: LanguageModel = google("gemini-2.5-flash");
