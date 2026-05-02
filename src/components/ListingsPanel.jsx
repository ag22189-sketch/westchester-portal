import { useState, useEffect } from "react";
import { fetchListings, fetchSoldListings } from "../api/listings";

const fmtPrice = (n) => {
  if (!n) return "N/A";
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  return `$${(n / 1000).toFixed(0)}K`;
};

const fmtPhone = (num) => {
  if (!num || num.length !== 10) return num;
  return `(${num.slice(0, 3)}) ${num.slice(3, 6)}-${num.slice(6)}`;
};

const fmtDate = (d) => {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const statusColors = {
  for_sale: "#7A9E7E",
  Active: "#7A9E7E",
  active: "#7A9E7E",
  "Coming Soon": "#8B9EB7",
  coming_soon: "#8B9EB7",
  Pending: "#D4956A",
  pending: "#D4956A",
};

export default function ListingsPanel({ townName, accentColor, onSoldData }) {
  const [tab, setTab] = useState("active");
  const [listings, setListings] = useState([]);
  const [sold, setSold] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!townName) return;
    setLoading(true);
    setError(null);
    setTab("active");

    Promise.all([
      fetchListings(townName),
      fetchSoldListings(townName),
    ])
      .then(([active, soldData]) => {
        setListings(active);
        setSold(soldData);
        if (onSoldData) onSoldData(soldData);
      })
      .catch((err) => {
        if (err.message === "NOT_SUBSCRIBED") {
          setError("API subscription required — subscribe to the US Real Estate Listings API on RapidAPI (free tier available), then refresh.");
        } else {
          setError(`Could not load listings: ${err.message}`);
        }
      })
      .finally(() => setLoading(false));
  }, [townName]);

  if (loading) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", letterSpacing: "2px", textTransform: "uppercase" }}>
          Loading listings...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "20px", fontSize: "12px", color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>
        {error}
      </div>
    );
  }

  const tabStyle = (active) => ({
    padding: "8px 20px",
    fontSize: "10px",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    cursor: "pointer",
    background: active ? "rgba(201,169,110,0.12)" : "transparent",
    border: active ? "1px solid rgba(201,169,110,0.3)" : "1px solid rgba(255,255,255,0.08)",
    borderRadius: "20px",
    color: active ? "#C9A96E" : "rgba(255,255,255,0.35)",
    fontFamily: "'Georgia', serif",
    transition: "all 0.2s",
  });

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <button onClick={() => setTab("active")} style={tabStyle(tab === "active")}>
          Active ({listings.length})
        </button>
        <button onClick={() => setTab("sold")} style={tabStyle(tab === "sold")}>
          Sales History ({sold.length})
        </button>
      </div>

      {/* Active Tab */}
      {tab === "active" && (
        !listings.length ? (
          <div style={{ padding: "20px", fontSize: "12px", color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>
            No active listings found.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {listings.map((l) => (
              <div
                key={l.id}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "10px",
                  overflow: "hidden",
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(201,169,110,0.3)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}
              >
                {l.photo && (
                  <div style={{ height: "290px", overflow: "hidden", position: "relative" }}>
                    <img
                      src={l.photo}
                      alt={l.address}
                      style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%" }}
                      onError={(e) => (e.target.style.display = "none")}
                    />
                    <div style={{
                      position: "absolute", bottom: 0, left: 0, right: 0, height: "80px",
                      background: "linear-gradient(to top, rgba(15,19,24,0.7) 0%, transparent 100%)",
                      pointerEvents: "none",
                    }} />
                  </div>
                )}
                <div style={{ padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div style={{ fontSize: "18px", color: "#C9A96E", fontWeight: "400" }}>
                      {fmtPrice(l.price)}
                    </div>
                    <span style={{
                      fontSize: "9px",
                      letterSpacing: "1px",
                      textTransform: "uppercase",
                      padding: "3px 8px",
                      borderRadius: "10px",
                      background: `${statusColors[l.status] || "#7A9E7E"}22`,
                      color: statusColors[l.status] || "#7A9E7E",
                      border: `1px solid ${statusColors[l.status] || "#7A9E7E"}44`,
                    }}>
                      {l.status?.replace(/_/g, " ") || "Active"}
                    </span>
                  </div>
                  <div style={{ fontSize: "13px", color: "#E8E0D5", marginBottom: "8px" }}>
                    {l.address}
                  </div>
                  <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>
                    {l.beds != null && <span>{l.beds} bd</span>}
                    {l.baths != null && <span>{l.baths} ba</span>}
                    {l.sqft != null && <span>{l.sqft.toLocaleString()} sqft</span>}
                    {l.daysOnMarket != null && <span>{l.daysOnMarket}d on market</span>}
                  </div>

                  {l.lastSoldPrice && !l.isNewConstruction && l.appreciation != null && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      marginTop: "10px", fontSize: "11px",
                    }}>
                      <span style={{ color: "rgba(255,255,255,0.35)" }}>
                        Last sold {fmtPrice(l.lastSoldPrice)}{l.lastSoldDate ? ` (${fmtDate(l.lastSoldDate)})` : ""}
                      </span>
                      <span style={{
                        color: l.appreciation >= 0 ? "#7A9E7E" : "#C46B5E",
                        fontWeight: "400",
                      }}>
                        {l.appreciation >= 0 ? "+" : ""}{Math.round(l.appreciation)}%
                      </span>
                    </div>
                  )}

                  {(l.agent || l.brokerage) && (
                    <div style={{
                      marginTop: "12px", paddingTop: "12px",
                      borderTop: "1px solid rgba(255,255,255,0.06)",
                      display: "flex", gap: "10px", alignItems: "flex-start",
                    }}>
                      {l.agentPhoto && (
                        <img
                          src={l.agentPhoto}
                          alt={l.agent}
                          style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid rgba(255,255,255,0.1)" }}
                          onError={(e) => (e.target.style.display = "none")}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {l.agent && (
                          l.agentHref ? (
                            <a href={l.agentHref} target="_blank" rel="noopener noreferrer" style={{
                              fontSize: "13px", color: "#E8E0D5", textDecoration: "none",
                              borderBottom: "1px solid rgba(255,255,255,0.15)",
                              paddingBottom: "1px",
                            }}>{l.agent}</a>
                          ) : (
                            <div style={{ fontSize: "13px", color: "#E8E0D5" }}>{l.agent}</div>
                          )
                        )}
                        {l.brokerage && (
                          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", fontStyle: "italic", marginTop: "2px" }}>{l.brokerage}</div>
                        )}
                        <div style={{ display: "flex", gap: "12px", marginTop: "6px", flexWrap: "wrap" }}>
                          {l.agentPhone && (
                            <a href={`tel:${l.agentPhone}`} style={{
                              fontSize: "11px", color: "#C9A96E", textDecoration: "none",
                              letterSpacing: "0.3px",
                            }}>
                              {fmtPhone(l.agentPhone)}{l.agentPhoneType ? ` (${l.agentPhoneType})` : ""}
                            </a>
                          )}
                          {l.agentEmail && (
                            <a href={`mailto:${l.agentEmail}`} style={{
                              fontSize: "11px", color: "#C9A96E", textDecoration: "none",
                            }}>
                              {l.agentEmail}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {l.link && (
                    <a
                      href={l.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-block",
                        marginTop: "10px",
                        fontSize: "10px",
                        letterSpacing: "1.5px",
                        textTransform: "uppercase",
                        color: "rgba(255,255,255,0.3)",
                        textDecoration: "none",
                        borderBottom: "1px solid rgba(255,255,255,0.1)",
                        paddingBottom: "1px",
                      }}
                    >
                      {/* TODO: Replace with internal listing detail page */}
                      View on Realtor.com →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Sales History Tab */}
      {tab === "sold" && (
        !sold.length ? (
          <div style={{ padding: "20px", fontSize: "12px", color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>
            No recent sales history available for this ZIP.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", fontStyle: "italic", marginBottom: "4px" }}>
              Prior transactions of currently listed homes — showing how values have changed.
            </div>
            {sold.map((s) => {
              const appreciated = s.appreciation != null && s.appreciation > 0;
              const depreciated = s.appreciation != null && s.appreciation < 0;
              const appColor = appreciated ? "#7A9E7E" : depreciated ? "#C46B5E" : "rgba(255,255,255,0.4)";
              const appLabel = s.appreciation != null
                ? `${appreciated ? "+" : ""}${s.appreciation.toFixed(0)}% since last sale`
                : null;

              return (
                <a
                  key={s.id}
                  href={s.link || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "block",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "10px",
                    padding: "18px 20px",
                    transition: "border-color 0.2s",
                    textDecoration: "none",
                    color: "inherit",
                    cursor: s.link ? "pointer" : "default",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}
                >
                  {/* Address & Badge */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div style={{ fontSize: "13px", color: "#E8E0D5" }}>{s.address}</div>
                    <span style={{
                      fontSize: "9px", letterSpacing: "1px", textTransform: "uppercase",
                      padding: "3px 8px", borderRadius: "10px",
                      background: s.isNewConstruction ? "rgba(139,158,183,0.15)" : "rgba(155,139,180,0.15)",
                      color: s.isNewConstruction ? "#8B9EB7" : "#9B8BB4",
                      border: `1px solid ${s.isNewConstruction ? "rgba(139,158,183,0.25)" : "rgba(155,139,180,0.25)"}`,
                      whiteSpace: "nowrap", marginLeft: "12px",
                    }}>{s.isNewConstruction ? "New Build" : "Prior Sale"}</span>
                  </div>

                  {/* Prices side by side */}
                  <div style={{ display: "flex", gap: "24px", marginBottom: "10px", alignItems: "baseline" }}>
                    <div>
                      <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "3px" }}>Last Sold</div>
                      <div style={{ fontSize: "15px", color: "rgba(255,255,255,0.5)", fontWeight: "300" }}>{fmtPrice(s.lastSalePrice)}</div>
                    </div>
                    <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.2)" }}>→</div>
                    <div>
                      <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "3px" }}>Now Listed</div>
                      <div style={{ fontSize: "18px", color: "#C9A96E", fontWeight: "400" }}>{fmtPrice(s.currentListPrice)}</div>
                    </div>
                  </div>

                  {/* Appreciation indicator or new construction label */}
                  {s.isNewConstruction ? (
                    <div style={{
                      display: "inline-block",
                      fontSize: "11px",
                      color: "#8B9EB7",
                      background: "rgba(139,158,183,0.15)",
                      border: "1px solid rgba(139,158,183,0.30)",
                      borderRadius: "12px",
                      padding: "3px 12px",
                      marginBottom: "10px",
                      fontWeight: "400",
                    }}>
                      New Construction — Developer Acquisition
                    </div>
                  ) : appLabel && (
                    <div style={{
                      display: "inline-block",
                      fontSize: "11px",
                      color: appColor,
                      background: `${appColor}15`,
                      border: `1px solid ${appColor}30`,
                      borderRadius: "12px",
                      padding: "3px 12px",
                      marginBottom: "10px",
                      fontWeight: "400",
                    }}>
                      {appLabel}
                    </div>
                  )}

                  {/* Details row */}
                  <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "rgba(255,255,255,0.4)", flexWrap: "wrap" }}>
                    {s.beds != null && <span>{s.beds} bd</span>}
                    {s.baths != null && <span>{s.baths} ba</span>}
                    {s.sqft != null && <span>{s.sqft.toLocaleString()} sqft</span>}
                    {s.daysOnMarket != null && <span>{s.daysOnMarket}d on market</span>}
                    {s.soldDate && <span>Last sold {fmtDate(s.soldDate)}</span>}
                  </div>
                </a>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
