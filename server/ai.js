/**
 * ai.js — Unified AI engine with provider priority:
 *   1. OpenAI (if OPENAI_API_KEY set)
 *   2. Ollama (if running locally)
 *   3. Smart local fallback
 */

import { buildSystemPrompt } from "./ai/context.js";
import { isOpenAiConfigured, streamOpenAiResponse } from "./ai/providers/openai.js";
import { isOllamaAvailable, streamOllamaResponse } from "./ai/providers/ollama.js";
import { streamFallbackReply } from "./ai/providers/fallback.js";

export { isOllamaAvailable };

export async function getActiveEngine() {
  if (isOpenAiConfigured()) return "openai";
  if (await isOllamaAvailable()) return "ollama";
  return "local-fallback";
}

export async function getAIResponse(userMessage, history, res, org = null) {
  const systemPrompt = buildSystemPrompt(org);

  if (isOpenAiConfigured()) {
    try {
      return await streamOpenAiResponse(userMessage, history, systemPrompt, res);
    } catch (err) {
      console.warn("OpenAI failed, trying fallback:", err.message);
    }
  }

  if (await isOllamaAvailable()) {
    try {
      return await streamOllamaResponse(userMessage, history, systemPrompt, res);
    } catch (err) {
      console.warn("Ollama failed, using local fallback:", err.message);
    }
  }

  return streamFallbackReply(userMessage, res);
}
