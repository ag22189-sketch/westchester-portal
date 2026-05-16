import { useState, useRef, useEffect } from "react";

function renderMarkdown(text) {
  // Basic markdown: bold, italic, links, code blocks, lists
  let html = text
    // Code blocks
    .replace(/```[\s\S]*?```/g, (match) => {
      const code = match.slice(3, -3).replace(/^\w*\n/, "");
      return `<pre style="background:rgba(255,255,255,0.05);padding:12px;border-radius:6px;overflow-x:auto;font-size:13px;">${escapeHtml(code)}</pre>`;
    })
    // Inline code
    .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:3px;font-size:13px;">$1</code>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#C9A96E;text-decoration:underline;">$1</a>')
    // Line breaks
    .replace(/\n/g, "<br>");

  return html;
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export default function AgentChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function sendMessage(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      if (data.error) {
        setMessages([...newMessages, { role: "assistant", content: `Error: ${data.error}` }]);
      } else {
        setMessages([...newMessages, { role: "assistant", content: data.response }]);
      }
    } catch (err) {
      setMessages([...newMessages, { role: "assistant", content: "Something went wrong. Try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0F1318",
      color: "#F5EFE8",
      fontFamily: "Georgia, 'Times New Roman', serif",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        padding: "28px 32px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <a href="/" style={{
          fontSize: "11px",
          letterSpacing: "3px",
          textTransform: "uppercase",
          color: "#C9A96E",
          textDecoration: "none",
          display: "block",
          marginBottom: "12px",
        }}>Westchester Portal</a>
        <h1 style={{
          fontSize: "28px",
          fontWeight: 400,
          color: "#F5EFE8",
          margin: 0,
        }}>House Hunting Agent</h1>
        <p style={{
          color: "rgba(255,255,255,0.4)",
          fontSize: "14px",
          fontStyle: "italic",
          marginTop: "6px",
        }}>Ask about listings, open houses, or plan a route</p>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "24px 32px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}>
        {messages.length === 0 && (
          <div style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "rgba(255,255,255,0.3)",
          }}>
            <p style={{ fontSize: "16px", marginBottom: "16px" }}>Try asking:</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "center" }}>
              {["What's worth seeing this weekend?", "Show me what's new in Pelham", "Plan a route for Saturday open houses"].map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); inputRef.current?.focus(); }}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    padding: "10px 18px",
                    color: "#F5EFE8",
                    fontFamily: "inherit",
                    fontSize: "14px",
                    cursor: "pointer",
                    transition: "border-color 0.2s",
                  }}
                  onMouseOver={(e) => e.target.style.borderColor = "rgba(201,169,110,0.4)"}
                  onMouseOut={(e) => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            display: "flex",
            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
          }}>
            <div style={{
              maxWidth: "720px",
              padding: "14px 18px",
              borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: msg.role === "user"
                ? "rgba(201,169,110,0.15)"
                : "rgba(255,255,255,0.04)",
              border: msg.role === "user"
                ? "1px solid rgba(201,169,110,0.3)"
                : "1px solid rgba(255,255,255,0.08)",
              fontSize: "15px",
              lineHeight: "1.6",
            }}>
              {msg.role === "user" ? (
                <span>{msg.content}</span>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{
              padding: "14px 18px",
              borderRadius: "16px 16px 16px 4px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.4)",
              fontSize: "14px",
              fontStyle: "italic",
            }}>
              Thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} style={{
        padding: "16px 32px 24px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        gap: "12px",
      }}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about listings, open houses, routes..."
          disabled={loading}
          style={{
            flex: 1,
            padding: "14px 18px",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.04)",
            color: "#F5EFE8",
            fontFamily: "inherit",
            fontSize: "15px",
            outline: "none",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => e.target.style.borderColor = "rgba(201,169,110,0.5)"}
          onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            padding: "14px 24px",
            borderRadius: "12px",
            border: "none",
            background: input.trim() && !loading ? "#C9A96E" : "rgba(201,169,110,0.3)",
            color: input.trim() && !loading ? "#0F1318" : "rgba(15,19,24,0.5)",
            fontFamily: "inherit",
            fontSize: "15px",
            fontWeight: 600,
            cursor: input.trim() && !loading ? "pointer" : "default",
            transition: "background 0.2s",
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
