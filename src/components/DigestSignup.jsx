import { useState } from "react";

const TOWNS = [
  "Irvington", "Hastings-on-Hudson", "Dobbs Ferry", "Tarrytown", "Sleepy Hollow",
  "Ardsley", "Chappaqua", "Bedford", "Katonah", "Bronxville",
  "Scarsdale", "Larchmont", "Rye", "Pleasantville", "Pelham",
];

export default function DigestSignup({ currentTown }) {
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState(currentTown ? [currentTown] : []);
  const [status, setStatus] = useState(null); // null | "sending" | "success" | "error"
  const [errorMsg, setErrorMsg] = useState("");
  const [expanded, setExpanded] = useState(false);

  const toggle = (town) => {
    setSelected((prev) =>
      prev.includes(town) ? prev.filter((t) => t !== town) : [...prev, town]
    );
  };

  const handleSubmit = async () => {
    if (!email.includes("@") || selected.length === 0) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, towns: selected }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMsg(data.error || "Something went wrong");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Could not connect to server");
    }
  };

  if (status === "success") {
    return (
      <div style={{
        background: "rgba(201,169,110,0.06)",
        border: "1px solid rgba(201,169,110,0.15)",
        borderRadius: "12px",
        padding: "24px",
        textAlign: "center",
      }}>
        <div style={{ fontSize: "11px", letterSpacing: "3px", textTransform: "uppercase", color: "#C9A96E", marginBottom: "10px" }}>
          Subscribed
        </div>
        <div style={{ fontSize: "15px", color: "#E8E0D5", marginBottom: "6px" }}>
          You'll receive your first digest this Sunday at 8am.
        </div>
        <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>
          Tracking {selected.length} town{selected.length !== 1 ? "s" : ""} — {selected.join(", ")}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: "rgba(201,169,110,0.04)",
      border: "1px solid rgba(201,169,110,0.12)",
      borderRadius: "12px",
      padding: "24px",
    }}>
      <div style={{ fontSize: "11px", letterSpacing: "3px", textTransform: "uppercase", color: "#C9A96E", marginBottom: "6px" }}>
        Weekly Market Digest
      </div>
      <div style={{ fontSize: "15px", color: "#E8E0D5", marginBottom: "4px" }}>
        Get Sunday morning market intelligence delivered to your inbox.
      </div>
      <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", fontStyle: "italic", marginBottom: "20px" }}>
        Active listings, sales history, price trends, and days on market — curated weekly.
      </div>

      {/* Email Input */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          style={{
            flex: 1,
            minWidth: "200px",
            padding: "12px 16px",
            fontSize: "14px",
            fontFamily: "'Georgia', serif",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            color: "#F5EFE8",
            outline: "none",
          }}
          onFocus={(e) => (e.target.style.borderColor = "rgba(201,169,110,0.3)")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
        />
        <button
          onClick={handleSubmit}
          disabled={status === "sending" || !email.includes("@") || selected.length === 0}
          style={{
            padding: "12px 24px",
            fontSize: "12px",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            fontFamily: "'Georgia', serif",
            background: email.includes("@") && selected.length > 0
              ? "rgba(201,169,110,0.15)"
              : "rgba(255,255,255,0.04)",
            border: email.includes("@") && selected.length > 0
              ? "1px solid rgba(201,169,110,0.3)"
              : "1px solid rgba(255,255,255,0.08)",
            borderRadius: "8px",
            color: email.includes("@") && selected.length > 0
              ? "#C9A96E"
              : "rgba(255,255,255,0.25)",
            cursor: email.includes("@") && selected.length > 0 ? "pointer" : "default",
            whiteSpace: "nowrap",
          }}
        >
          {status === "sending" ? "Subscribing..." : "Subscribe"}
        </button>
      </div>

      {/* Town Selection */}
      <div style={{ marginBottom: "4px" }}>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            fontSize: "12px",
            letterSpacing: "1px",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.35)",
            cursor: "pointer",
            fontFamily: "'Georgia', serif",
          }}
        >
          {expanded ? "Hide" : "Choose"} towns to track ({selected.length} selected) {expanded ? "−" : "+"}
        </button>
      </div>

      {expanded && (
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          marginTop: "12px",
        }}>
          {TOWNS.map((t) => {
            const active = selected.includes(t);
            return (
              <button
                key={t}
                onClick={() => toggle(t)}
                style={{
                  padding: "7px 14px",
                  fontSize: "12px",
                  fontFamily: "'Georgia', serif",
                  background: active ? "rgba(201,169,110,0.12)" : "rgba(255,255,255,0.03)",
                  border: active
                    ? "1px solid rgba(201,169,110,0.3)"
                    : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "16px",
                  color: active ? "#C9A96E" : "rgba(255,255,255,0.35)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
      )}

      {status === "error" && (
        <div style={{ marginTop: "12px", fontSize: "13px", color: "#C46B5E" }}>
          {errorMsg}
        </div>
      )}
    </div>
  );
}
