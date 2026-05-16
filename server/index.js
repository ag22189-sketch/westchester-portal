import "dotenv/config";
import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { subscribe, unsubscribe, getTownsForEmail } from "./db.js";
import { sendDigests } from "./digest.js";
import { handleAgentChat } from "./agent.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Serve static Vite build
app.use(express.static(join(__dirname, "..", "dist")));

// Subscribe: POST /api/subscribe { email, towns: ["Irvington", ...] }
app.post("/api/subscribe", async (req, res) => {
  const { email, towns } = req.body;

  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Valid email required" });
  }
  if (!Array.isArray(towns) || towns.length === 0) {
    return res.status(400).json({ error: "Select at least one town" });
  }

  try {
    const tracked = await subscribe(email.toLowerCase().trim(), towns);
    res.json({ ok: true, towns: tracked });
  } catch (err) {
    console.error("Subscribe error:", err);
    res.status(500).json({ error: "Failed to subscribe" });
  }
});

// Get subscriptions: GET /api/subscriptions?email=...
app.get("/api/subscriptions", async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: "Email required" });

  try {
    const towns = await getTownsForEmail(email.toLowerCase().trim());
    res.json({ towns });
  } catch (err) {
    console.error("Get subscriptions error:", err);
    res.status(500).json({ error: "Failed to get subscriptions" });
  }
});

// Unsubscribe: DELETE /api/subscribe { email }
app.delete("/api/subscribe", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  try {
    await unsubscribe(email.toLowerCase().trim());
    res.json({ ok: true });
  } catch (err) {
    console.error("Unsubscribe error:", err);
    res.status(500).json({ error: "Failed to unsubscribe" });
  }
});

// Unsubscribe via GET (for email link)
app.get("/unsubscribe", async (req, res) => {
  const email = req.query.email;
  if (email) {
    try {
      await unsubscribe(email.toLowerCase().trim());
    } catch (err) {
      console.error("Unsubscribe error:", err);
    }
  }
  res.send(`
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"><title>Unsubscribed</title></head>
    <body style="background:#0F1318;color:#F5EFE8;font-family:Georgia,serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
      <div style="text-align:center;padding:40px;">
        <div style="font-size:14px;letter-spacing:3px;text-transform:uppercase;color:#C9A96E;margin-bottom:16px;">Westchester Portal</div>
        <h1 style="font-size:28px;font-weight:400;margin:0 0 12px;">Unsubscribed</h1>
        <p style="color:rgba(255,255,255,0.4);font-style:italic;">You've been removed from the weekly digest.</p>
      </div>
    </body></html>
  `);
});

// Trigger digest: GET /api/send-digest?key=SECRET
// Protected by DIGEST_SECRET env var
app.get("/api/send-digest", async (req, res) => {
  const secret = process.env.DIGEST_SECRET;
  if (secret && req.query.key !== secret) {
    return res.status(403).json({ error: "Invalid key" });
  }

  try {
    const result = await sendDigests();
    res.json(result);
  } catch (err) {
    console.error("Digest trigger error:", err);
    res.status(500).json({ error: "Digest failed" });
  }
});

// Agent chat
app.post("/api/agent/chat", handleAgentChat);

// SPA fallback — serve index.html for all other routes
app.get("*", (req, res) => {
  res.sendFile(join(__dirname, "..", "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
