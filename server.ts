import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openRouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://ai.studio/build",
    "X-Title": "Vibra AI",
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for DeepSeek via OpenRouter
  app.post("/api/chat/deepseek", async (req, res) => {
    try {
      const { messages } = req.body;

      if (!process.env.OPENROUTER_API_KEY) {
        return res.status(500).json({ error: "OPENROUTER_API_KEY is not configured on the server." });
      }

      const response = await openRouter.chat.completions.create({
        model: "deepseek/deepseek-r1",
        messages: [
          { 
            role: "system", 
            content: `You are DEEPSEEK-R1 (Hyper-Logic Core), integrated into Vibra AI.
            
            CORE ATTRIBUTES:
            - UNPARALLELED REASONING: You solve complex technical, mathematical, and logical problems through extreme first-principles analysis.
            - CHAIN-OF-THOUGHT: You MUST use <thought> tags for every response to show your internal reasoning process.
            - ARCHITECTURAL PRECISION: When writing code, prioritize efficiency, security, and scalability.
            - DIRECTNESS: Be objective, technical, and precise. Avoid conversational fluff.`
          },
          ...messages
        ],
        stream: true,
      });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error: any) {
      console.error("DeepSeek Proxy Error:", error);
      res.status(500).json({ error: error.message || "Failed to proxy request to DeepSeek" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
