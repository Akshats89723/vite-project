const OPENAI_BASE = process.env.OPENAI_BASE || "https://api.openai.com/v1";
const OPENAI_MODEL = process.env.AI_MODEL || "gpt-4o-mini";

export function isOpenAiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function streamOpenAiResponse(userMessage, history, systemPrompt, res) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set");

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-10).map(m => ({ role: m.sender === "user" ? "user" : "assistant", content: m.text })),
    { role: "user", content: userMessage },
  ];

  const apiRes = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model: OPENAI_MODEL, messages, stream: true }),
  });

  if (!apiRes.ok) {
    const err = await apiRes.text();
    throw new Error(`OpenAI error ${apiRes.status}: ${err.slice(0, 200)}`);
  }

  const reader = apiRes.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split("\n").filter(l => l.startsWith("data: "))) {
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;
      try {
        const json = JSON.parse(data);
        const token = json.choices?.[0]?.delta?.content ?? "";
        if (token) {
          fullText += token;
          res.write(`data: ${JSON.stringify({ token })}\n\n`);
        }
      } catch { /* skip */ }
    }
  }

  res.write(`data: ${JSON.stringify({ done: true, full: fullText, engine: "openai" })}\n\n`);
  return fullText;
}
