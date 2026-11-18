const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.disable("x-powered-by");
app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

const rateBuckets = new Map();
function rateLimit(req, res, next) {
  const key = req.ip || "unknown";
  const now = Date.now();
  const bucket = rateBuckets.get(key) || { count: 0, reset: now + 60_000 };
  if (now > bucket.reset) {
    bucket.count = 0;
    bucket.reset = now + 60_000;
  }
  bucket.count += 1;
  rateBuckets.set(key, bucket);
  if (bucket.count > 20) {
    return res.status(429).json({ error: "Too many requests. Please wait one minute and try again." });
  }
  next();
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, aiConfigured: Boolean(process.env.OPENAI_API_KEY) });
});

app.post("/api/chat", rateLimit, async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: "AI is not connected yet. Add OPENAI_API_KEY in Render → Environment, then redeploy."
      });
    }

    const { messages, language } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 12) {
      return res.status(400).json({ error: "Please send between 1 and 12 recent messages." });
    }

    const safeMessages = messages.map((m) => {
      const role = m && m.role === "assistant" ? "assistant" : "user";
      const content = String((m && m.content) || "").trim().slice(0, 3000);
      return { role, content };
    }).filter((m) => m.content);

    if (!safeMessages.length) {
      return res.status(400).json({ error: "Your message is empty." });
    }

    const langInstruction = language === "ta"
      ? "Reply in natural, easy-to-understand Tamil. Keep technical names in English when useful."
      : "Reply in clear, friendly English.";

    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.5",
        instructions: "You are FRIDAY, a helpful, safe personal assistant. Be honest about limitations. Never claim to control the user's device or access files unless a tool explicitly provides that ability. " + langInstruction,
        input: safeMessages,
        store: false,
        max_output_tokens: 700
      })
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      console.error("AI provider error:", data.error?.message || upstream.status);
      return res.status(502).json({ error: "The AI service could not complete the request. Check the API key, model access, and billing, then try again." });
    }

    const answer = data.output_text ||
      (data.output || []).flatMap(item => item.content || [])
        .filter(part => part.type === "output_text")
        .map(part => part.text).join("\n");

    if (!answer) {
      return res.status(502).json({ error: "The AI service returned an empty reply. Please try again." });
    }
    res.json({ reply: answer });
  } catch (error) {
    console.error("Chat route error:", error.message);
    res.status(500).json({ error: "Something went wrong on the server. Please try again." });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log(`FRIDAY AI 3.0 listening on ${PORT}`));
