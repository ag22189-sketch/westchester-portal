import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const DESTINATIONS = [
  {
    id: "eds_office",
    label: "Ed's Office",
    address: "11 Madison Avenue, New York, NY",
    coords: [40.7414, -73.9871],
    color: "#F5EFE0",
    displayColor: "#C9A96E",
    showTrainInfo: true,
  },
  {
    id: "domus_hq",
    label: "Domus HQ",
    address: "35 Industrial Drive, East Longmeadow, MA",
    coords: [42.0717, -72.4978],
    color: "#C97B5A",
    displayColor: "#C97B5A",
    showTrainInfo: false,
  },
  {
    id: "erikas_house",
    label: "Erika's House",
    address: "81 Richmond Hill, New Canaan, CT",
    coords: [41.1450, -73.4910],
    color: "#8FA68E",
    displayColor: "#8FA68E",
    showTrainInfo: false,
  },
];

const fmt = (n) =>
  n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : `$${(n / 1000).toFixed(0)}K`;

function routeSourceId(destId) { return `route-${destId}`; }
function routeLayerId(destId) { return `route-line-${destId}`; }

function shortAddress(addr) {
  const parts = addr.split(", ");
  if (parts.length >= 3) return parts.slice(-2).join(", ");
  if (parts.length === 2) return parts[1];
  return addr;
}

function directionsUrl(town, dest) {
  return `https://www.google.com/maps/dir/?api=1&origin=${town.lat},${town.lng}&destination=${encodeURIComponent(dest.address)}&travelmode=driving`;
}

// ── Side Panel (React component, no Mapbox dependency) ──────────────

function SidePanel({ town, routes, destinations, onSelectTown }) {
  const s = styles;

  if (!town) {
    return (
      <div style={s.panel}>
        <div style={s.defaultState}>
          <div style={s.defaultLabel}>Commute Intelligence</div>
          <div style={s.defaultHeadline}>
            Three anchors. Twenty towns.
          </div>
          <div style={s.defaultSub}>
            Hover any pin to see the geography of a family decision.
          </div>
          <div style={{ marginTop: "28px" }}>
            {destinations.map((d) => (
              <div key={d.id} style={s.destRow}>
                <div style={{ ...s.destDot, background: d.color }} />
                <div>
                  <div style={{ ...s.destName, color: d.displayColor }}>{d.label}</div>
                  <div style={s.destAddr}>{d.address}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={s.legendRow}>
            <div style={{ ...s.legendDot, background: "#C9A96E", border: "1.5px solid #F5EFE8" }} />
            <span style={s.legendText}>Westchester Town</span>
          </div>
        </div>
      </div>
    );
  }

  const mn = town.metroNorth;
  const isLoading = routes === null;

  return (
    <div style={s.panel}>
      <div style={s.cardWrap}>
        {/* Header */}
        <div style={s.townName}>{town.name}</div>
        <div style={s.tagline}>{town.tagline}</div>
        <div style={s.median}>
          Median: <strong style={{ color: "#C9A96E" }}>{fmt(town.medianPrice)}</strong>
        </div>

        <div style={s.divider} />

        {/* Destination sections */}
        {destinations.map((d, i) => {
          const r = routes ? routes[d.id] : null;
          return (
            <div key={d.id}>
              {i > 0 && <div style={s.sectionDivider} />}
              <div style={{ ...s.sectionHeader, color: d.displayColor }}>
                To {d.label}
              </div>
              <div style={s.sectionAddr}>{shortAddress(d.address)}</div>
              {isLoading ? (
                <div style={s.calculating}>Calculating...</div>
              ) : r ? (
                <div style={s.driveLine}>
                  Drive: <strong style={{ color: "#C9A96E" }}>{r.duration} min</strong> · {r.distance} mi
                </div>
              ) : null}
              {d.showTrainInfo && mn && (
                mn.line && mn.station ? (
                  <>
                    <div style={s.trainLine}>
                      Train: <strong style={{ color: "#C9A96E" }}>{mn.timeToGCT} min</strong> {mn.line} Line from {mn.station} → Grand Central
                    </div>
                    {d.id === "eds_office" && (
                      <div style={s.subwayLine}>+ 6 min subway (4/5/6) to 23rd St</div>
                    )}
                  </>
                ) : mn.note ? (
                  <div style={s.trainNote}>{mn.note}</div>
                ) : null
              )}
            </div>
          );
        })}

        <div style={s.divider} />

        {/* Direction buttons */}
        <div style={s.dirLabel}>Directions to</div>
        <div style={s.dirRow}>
          {destinations.map((d) => (
            <a
              key={d.id}
              href={directionsUrl(town, d)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...s.dirBtn, color: d.displayColor }}
            >
              {d.label}
            </a>
          ))}
          <button
            onClick={() => onSelectTown && onSelectTown(town.name)}
            style={s.detailsBtn}
          >
            Town Details
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  panel: {
    background: "#0F1318",
    borderLeft: "1px solid rgba(201,169,110,0.15)",
    height: "100%",
    overflowY: "auto",
    padding: "28px 22px",
    fontFamily: "'Georgia', serif",
    scrollbarWidth: "thin",
    scrollbarColor: "rgba(201,169,110,0.3) #0F1318",
  },
  // Default (no town hovered)
  defaultState: { },
  defaultLabel: {
    fontSize: "10px",
    letterSpacing: "2.5px",
    textTransform: "uppercase",
    color: "#C9A96E",
    marginBottom: "14px",
  },
  defaultHeadline: {
    fontSize: "18px",
    color: "#F5EFE0",
    lineHeight: 1.4,
    marginBottom: "8px",
  },
  defaultSub: {
    fontSize: "13px",
    color: "rgba(245,239,232,0.4)",
    fontStyle: "italic",
    lineHeight: 1.5,
  },
  destRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    marginBottom: "14px",
  },
  destDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    border: "1.5px solid #fff",
    flexShrink: 0,
    marginTop: "4px",
  },
  destName: {
    fontSize: "13px",
    fontWeight: 400,
  },
  destAddr: {
    fontSize: "11px",
    color: "rgba(245,239,232,0.35)",
    marginTop: "1px",
  },
  legendRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "20px",
    paddingTop: "16px",
    borderTop: "1px solid rgba(201,169,110,0.1)",
  },
  legendDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    flexShrink: 0,
  },
  legendText: {
    fontSize: "11px",
    color: "rgba(245,239,232,0.35)",
  },
  // Card (town hovered)
  cardWrap: { },
  townName: {
    fontSize: "20px",
    fontWeight: 400,
    color: "#F5EFE0",
    marginBottom: "4px",
  },
  tagline: {
    fontSize: "12px",
    color: "rgba(201,169,110,0.7)",
    fontStyle: "italic",
    marginBottom: "10px",
    lineHeight: 1.4,
  },
  median: {
    fontSize: "14px",
    color: "rgba(245,239,232,0.6)",
    marginBottom: "6px",
  },
  divider: {
    borderTop: "1px solid rgba(201,169,110,0.15)",
    margin: "14px 0",
  },
  sectionDivider: {
    borderTop: "1px solid rgba(201,169,110,0.1)",
    margin: "10px 0",
  },
  sectionHeader: {
    fontSize: "10px",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    marginBottom: "3px",
    lineHeight: 1.3,
  },
  sectionAddr: {
    fontSize: "12px",
    color: "rgba(245,239,232,0.35)",
    marginBottom: "4px",
  },
  calculating: {
    fontSize: "12px",
    color: "rgba(245,239,232,0.3)",
    fontStyle: "italic",
  },
  driveLine: {
    fontSize: "13px",
    color: "rgba(245,239,232,0.6)",
    lineHeight: 1.4,
  },
  trainLine: {
    fontSize: "12px",
    color: "rgba(245,239,232,0.5)",
    marginTop: "3px",
    lineHeight: 1.3,
  },
  subwayLine: {
    fontSize: "11px",
    color: "rgba(245,239,232,0.35)",
    marginTop: "2px",
    lineHeight: 1.3,
    fontStyle: "italic",
  },
  trainNote: {
    fontSize: "11px",
    color: "rgba(245,239,232,0.35)",
    marginTop: "3px",
    lineHeight: 1.3,
  },
  dirLabel: {
    fontSize: "9px",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    color: "rgba(245,239,232,0.3)",
    marginBottom: "8px",
  },
  dirRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  dirBtn: {
    fontSize: "10px",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    padding: "7px 12px",
    background: "rgba(201,169,110,0.08)",
    border: "1px solid rgba(201,169,110,0.15)",
    borderRadius: "5px",
    textDecoration: "none",
    fontFamily: "'Georgia', serif",
    whiteSpace: "nowrap",
  },
  detailsBtn: {
    fontSize: "10px",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    padding: "7px 12px",
    background: "transparent",
    color: "#F5EFE0",
    border: "1px solid rgba(245,239,232,0.15)",
    borderRadius: "5px",
    cursor: "pointer",
    fontFamily: "'Georgia', serif",
    whiteSpace: "nowrap",
  },
};

// ── Main MapView ────────────────────────────────────────────────────

export default function MapView({ towns, onSelectTown }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const townMarkersRef = useRef([]);
  const destMarkersRef = useRef([]);
  const routeGeometriesRef = useRef([]);
  const activeTownRef = useRef(null);

  const [hoveredTown, setHoveredTown] = useState(null);
  const [routeData, setRouteData] = useState(null); // null = loading, {} = results
  const [destCoords, setDestCoords] = useState(DESTINATIONS);

  // Geocode Erika's House on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent("81 Richmond Hill, New Canaan, CT")}.json?access_token=${TOKEN}&limit=1`
        );
        const data = await res.json();
        const f = data.features?.[0];
        if (f) {
          const [lng, lat] = f.center;
          setDestCoords((prev) =>
            prev.map((d) =>
              d.id === "erikas_house" ? { ...d, coords: [lat, lng] } : d
            )
          );
        }
      } catch (e) {
        console.error("Geocode Erika error:", e);
      }
    })();
  }, []);

  // Fetch driving route
  async function fetchRoute(originLng, originLat, destLng, destLat) {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${originLng},${originLat};${destLng},${destLat}?geometries=geojson&overview=full&access_token=${TOKEN}`;
    const res = await fetch(url);
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return null;
    return {
      geometry: route.geometry,
      duration: Math.round(route.duration / 60),
      distance: (route.distance / 1609.344).toFixed(1),
    };
  }

  // Draw route lines on map
  function drawRoutes(map, routeResults) {
    clearAllRoutes(map);
    routeGeometriesRef.current = [];
    for (const r of routeResults) {
      if (!r.geometry) continue;
      const srcId = routeSourceId(r.destId);
      const lyrId = routeLayerId(r.destId);
      map.addSource(srcId, {
        type: "geojson",
        data: { type: "Feature", geometry: r.geometry },
      });
      map.addLayer({
        id: lyrId,
        type: "line",
        source: srcId,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": r.color, "line-width": 4, "line-opacity": 0.85 },
      });
      routeGeometriesRef.current.push({ destId: r.destId, geometry: r.geometry });
    }
  }

  function clearAllRoutes(map) {
    for (const dest of destCoords) {
      const lyrId = routeLayerId(dest.id);
      const srcId = routeSourceId(dest.id);
      if (map.getLayer(lyrId)) map.removeLayer(lyrId);
      if (map.getSource(srcId)) map.removeSource(srcId);
    }
    routeGeometriesRef.current = [];
  }

  // Handle hover — update React state + draw routes
  async function handleHover(town) {
    const map = mapRef.current;
    if (!map) return;
    if (activeTownRef.current === town.name) return;

    activeTownRef.current = town.name;
    setHoveredTown(town);
    setRouteData(null); // show loading state

    try {
      const results = await Promise.all(
        destCoords.map(async (d) => {
          const [lat, lng] = d.coords;
          const route = await fetchRoute(town.lng, town.lat, lng, lat);
          return { destId: d.id, color: d.color, ...(route || {}) };
        })
      );

      if (activeTownRef.current !== town.name) return;

      drawRoutes(map, results.filter((r) => r.geometry));

      const resultMap = {};
      for (const r of results) {
        if (r.duration != null) {
          resultMap[r.destId] = { duration: r.duration, distance: r.distance };
        }
      }
      setRouteData(resultMap);
    } catch (err) {
      console.error("Route fetch error:", err);
      if (activeTownRef.current === town.name) {
        setRouteData({});
      }
    }
  }

  function handleLeave() {
    const map = mapRef.current;
    activeTownRef.current = null;
    setHoveredTown(null);
    setRouteData(null);
    if (map) clearAllRoutes(map);
  }

  // Initialize map
  useEffect(() => {
    if (mapRef.current) return;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-73.78, 41.05],
      zoom: 10,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Add markers + fitBounds on load
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    townMarkersRef.current.forEach((m) => m.remove());
    townMarkersRef.current = [];
    destMarkersRef.current.forEach((m) => m.remove());
    destMarkersRef.current = [];

    const onLoad = () => {
      clearAllRoutes(map);
      const allPoints = [];

      // Town markers
      towns.forEach((t) => {
        if (!t.lat || !t.lng) return;
        allPoints.push([t.lng, t.lat]);

        const el = document.createElement("div");
        el.style.cssText = `
          width: 14px; height: 14px; border-radius: 50%;
          background: #C9A96E; border: 2px solid #F5EFE8;
          cursor: pointer; box-shadow: 0 0 8px rgba(201,169,110,0.5);
          transition: transform 0.15s, box-shadow 0.15s;
        `;

        el.addEventListener("mouseenter", () => {
          el.style.transform = "scale(1.4)";
          el.style.boxShadow = "0 0 14px rgba(201,169,110,0.8)";
          handleHover(t);
        });
        el.addEventListener("mouseleave", () => {
          el.style.transform = "scale(1)";
          el.style.boxShadow = "0 0 8px rgba(201,169,110,0.5)";
          handleLeave();
        });

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([t.lng, t.lat])
          .addTo(map);
        townMarkersRef.current.push(marker);
      });

      // Destination markers
      destCoords.forEach((d) => {
        const [lat, lng] = d.coords;
        allPoints.push([lng, lat]);

        const el = document.createElement("div");
        el.style.cssText = `
          width: 16px; height: 16px; border-radius: 50%;
          background: ${d.color}; border: 2px solid #fff;
          box-shadow: 0 0 10px ${d.color}99;
          cursor: default;
        `;

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map);
        destMarkersRef.current.push(marker);
      });

      // Initial fitBounds — only camera call in the entire file
      if (allPoints.length > 1) {
        const bounds = allPoints.reduce(
          (b, c) => b.extend(c),
          new mapboxgl.LngLatBounds(allPoints[0], allPoints[0])
        );
        map.fitBounds(bounds, { padding: 50, duration: 0 });
      }
    };

    if (map.loaded()) onLoad();
    else map.on("load", onLoad);
  }, [towns, destCoords]);

  return (
    <div style={{
      display: "flex",
      maxWidth: "1440px",
      margin: "0 auto",
      padding: "0 40px 40px",
      gap: "0",
      height: "620px",
    }}>
      {/* Map — 70% */}
      <div style={{
        flex: "7 1 0%",
        minWidth: 0,
        borderRadius: "12px 0 0 12px",
        border: "1px solid rgba(201,169,110,0.2)",
        borderRight: "none",
        overflow: "hidden",
        position: "relative",
      }}>
        <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />
      </div>

      {/* Side Panel — 30% */}
      <div style={{
        flex: "3 1 0%",
        minWidth: "280px",
        maxWidth: "380px",
        borderRadius: "0 12px 12px 0",
        border: "1px solid rgba(201,169,110,0.2)",
        borderLeft: "none",
        overflow: "hidden",
        transition: "opacity 200ms ease",
      }}>
        <SidePanel
          town={hoveredTown}
          routes={routeData}
          destinations={destCoords}
          onSelectTown={onSelectTown}
        />
      </div>
    </div>
  );
}
