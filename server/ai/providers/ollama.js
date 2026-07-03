const OLLAMA_BASE = process.env.OLLAMA_BASE || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";

export async function isOllamaAvailable() {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function streamOllamaResponse(userMessage, history, systemPrompt, res) {
  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-10).map(m => ({ role: m.sender === "user" ? "user" : "assistant", content: m.text })),
    { role: "user", content: userMessage },
  ];

  const ollamaRes = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: OLLAMA_MODEL, messages, stream: true }),
  });

  if (!ollamaRes.ok) throw new Error(`Ollama error: ${ollamaRes.status}`);

  const reader = ollamaRes.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split("\n").filter(Boolean)) {
      try {
        const json = JSON.parse(line);
        const token = json.message?.content ?? "";
        if (token) {
          fullText += token;
          res.write(`data: ${JSON.stringify({ token })}\n\n`);
        }
        if (json.done) {
          res.write(`data: ${JSON.stringify({ done: true, full: fullText, engine: "ollama" })}\n\n`);
          return fullText;
        }
      } catch { /* partial line */ }
    }
  }

  res.write(`data: ${JSON.stringify({ done: true, full: fullText, engine: "ollama" })}\n\n`);
  return fullText;
}
