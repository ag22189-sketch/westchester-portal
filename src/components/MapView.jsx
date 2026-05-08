import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const DEFAULT_DEST = {
  label: "Ed's Office",
  address: "1285 Avenue of the Americas, New York, NY",
  lng: -73.9803,
  lat: 40.7610,
};

const ROUTE_SOURCE = "driving-route";
const ROUTE_LAYER = "driving-route-line";

const fmt = (n) =>
  n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : `$${(n / 1000).toFixed(0)}K`;

export default function MapView({ towns, onSelectTown }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const destMarkerRef = useRef(null);
  const activePopupRef = useRef(null);
  const activeTownRef = useRef(null);
  const routeGeometryRef = useRef(null);
  const [dest, setDest] = useState(DEFAULT_DEST);
  const destRef = useRef(dest);
  const [destInput, setDestInput] = useState("");
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    destRef.current = dest;
  }, [dest]);

  const directionsUrl = useCallback((town, d) => {
    const destAddr = encodeURIComponent(d.address);
    return `https://www.google.com/maps/dir/?api=1&origin=${town.lat},${town.lng}&destination=${destAddr}&travelmode=driving`;
  }, []);

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

  function drawRoute(map, geometry) {
    clearRoute(map);
    routeGeometryRef.current = geometry;

    map.addSource(ROUTE_SOURCE, {
      type: "geojson",
      data: { type: "Feature", geometry },
    });

    map.addLayer({
      id: ROUTE_LAYER,
      type: "line",
      source: ROUTE_SOURCE,
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#C9A96E",
        "line-width": 4,
        "line-opacity": 0.85,
      },
    });
  }

  function clearRoute(map) {
    if (map.getLayer(ROUTE_LAYER)) map.removeLayer(ROUTE_LAYER);
    if (map.getSource(ROUTE_SOURCE)) map.removeSource(ROUTE_SOURCE);
    routeGeometryRef.current = null;
  }

  function fitRouteInView() {
    const map = mapRef.current;
    const geom = routeGeometryRef.current;
    if (!map || !geom) return;
    const coords = geom.coordinates;
    const bounds = coords.reduce(
      (b, c) => b.extend(c),
      new mapboxgl.LngLatBounds(coords[0], coords[0])
    );
    map.fitBounds(bounds, { padding: 60, duration: 800 });
  }

  // Build Metro-North info HTML
  function trainHTML(mn) {
    if (!mn) return "";
    if (!mn.line || !mn.station) {
      return `<div style="font-size: 12px; color: #888; font-family: Georgia, serif;">Train: ${mn.note || "No station nearby"}</div>`;
    }
    return `<div style="font-size: 12px; color: #555; font-family: Georgia, serif;">Train: <strong style="color: #333;">${mn.timeToGCT} min</strong> on ${mn.line} Line from ${mn.station} &rarr; Grand Central</div>`;
  }

  function popupHTML(town, d, routeInfo) {
    const mn = town.metroNorth;

    let commuteBlock;
    if (routeInfo === "loading") {
      commuteBlock = `
        <div style="margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #eee;">
          <div style="font-size: 12px; color: #999; font-style: italic; font-family: Georgia, serif;">Calculating route...</div>
        </div>
        ${trainHTML(mn) ? `<div style="margin-bottom: 10px;">${trainHTML(mn)}</div>` : ""}
      `;
    } else if (routeInfo) {
      commuteBlock = `
        <div style="margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #eee;">
          <div style="font-size: 13px; color: #1a1f2e; font-family: Georgia, serif;">
            Drive: <strong style="color: #B8943F;">${routeInfo.duration} min</strong> · ${routeInfo.distance} mi
          </div>
          <a href="#" onclick="document.dispatchEvent(new CustomEvent('fitRoute'));return false;"
            style="font-size: 11px; color: #B8943F; text-decoration: none; border-bottom: 1px solid rgba(184,148,63,0.3); font-family: Georgia, serif;">
            View full route
          </a>
        </div>
        ${trainHTML(mn) ? `<div style="margin-bottom: 10px;">${trainHTML(mn)}</div>` : ""}
      `;
    } else {
      commuteBlock = trainHTML(mn) ? `<div style="margin-bottom: 10px;">${trainHTML(mn)}</div>` : "";
    }

    return `
      <div style="font-family: Georgia, serif; padding: 4px 0;">
        <div style="font-size: 16px; font-weight: 400; color: #1a1f2e; margin-bottom: 4px;">${town.name}</div>
        <div style="font-size: 12px; color: #666; font-style: italic; margin-bottom: 6px;">${town.tagline}</div>
        <div style="font-size: 13px; color: #333; margin-bottom: 8px;">
          Median: <strong style="color: #B8943F;">${fmt(town.medianPrice)}</strong>
        </div>
        ${commuteBlock}
        <div style="display: flex; gap: 8px;">
          <a href="${directionsUrl(town, d)}" target="_blank" rel="noopener noreferrer"
            style="font-size: 11px; letter-spacing: 1px; text-transform: uppercase; padding: 6px 12px;
              background: #1a1f2e; color: #C9A96E; text-decoration: none; border-radius: 4px;
              font-family: Georgia, serif;">
            Get Directions
          </a>
          <button onclick="document.dispatchEvent(new CustomEvent('selectTown', {detail:'${town.name}'}))"
            style="font-size: 11px; letter-spacing: 1px; text-transform: uppercase; padding: 6px 12px;
              background: transparent; color: #1a1f2e; border: 1px solid #ddd; border-radius: 4px;
              cursor: pointer; font-family: Georgia, serif;">
            View Details
          </button>
        </div>
      </div>
    `;
  }

  async function handleMarkerClick(town, marker, map) {
    const d = destRef.current;
    activeTownRef.current = town.name;

    const popup = marker.getPopup();
    popup.setHTML(popupHTML(town, d, "loading"));
    if (!popup.isOpen()) marker.togglePopup();
    activePopupRef.current = { marker, town };

    try {
      const routeInfo = await fetchRoute(town.lng, town.lat, d.lng, d.lat);
      if (activeTownRef.current === town.name) {
        if (routeInfo) {
          drawRoute(map, routeInfo.geometry);
          popup.setHTML(popupHTML(town, d, routeInfo));
        } else {
          popup.setHTML(popupHTML(town, d, null));
        }
      }
    } catch (err) {
      console.error("Route fetch error:", err);
      if (activeTownRef.current === town.name) {
        popup.setHTML(popupHTML(town, d, null));
      }
    }
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

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Add/update town markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    activeTownRef.current = null;
    activePopupRef.current = null;

    const onLoad = () => {
      clearRoute(map);

      towns.forEach((t) => {
        if (!t.lat || !t.lng) return;

        const el = document.createElement("div");
        el.style.cssText = `
          width: 14px; height: 14px; border-radius: 50%;
          background: #C9A96E; border: 2px solid #F5EFE8;
          cursor: pointer; box-shadow: 0 0 8px rgba(201,169,110,0.5);
          transition: transform 0.15s;
        `;
        el.addEventListener("mouseenter", () => {
          el.style.transform = "scale(1.4)";
        });
        el.addEventListener("mouseleave", () => {
          el.style.transform = "scale(1)";
        });

        const popup = new mapboxgl.Popup({
          offset: 16,
          closeButton: true,
          maxWidth: "300px",
        }).setHTML(popupHTML(t, dest, null));

        popup.on("close", () => {
          if (activeTownRef.current === t.name) {
            activeTownRef.current = null;
            activePopupRef.current = null;
            clearRoute(map);
          }
        });

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([t.lng, t.lat])
          .setPopup(popup)
          .addTo(map);

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          markersRef.current.forEach((m) => {
            if (m !== marker && m.getPopup().isOpen()) m.togglePopup();
          });
          handleMarkerClick(t, marker, map);
        });

        markersRef.current.push(marker);
      });

      updateDestMarker(map);
    };

    if (map.loaded()) {
      onLoad();
    } else {
      map.on("load", onLoad);
    }
  }, [towns, dest]);

  // Listen for events from popup buttons
  useEffect(() => {
    const selectHandler = (e) => {
      if (onSelectTown) onSelectTown(e.detail);
    };
    const fitHandler = () => fitRouteInView();
    document.addEventListener("selectTown", selectHandler);
    document.addEventListener("fitRoute", fitHandler);
    return () => {
      document.removeEventListener("selectTown", selectHandler);
      document.removeEventListener("fitRoute", fitHandler);
    };
  }, [onSelectTown]);

  function updateDestMarker(map) {
    if (destMarkerRef.current) {
      destMarkerRef.current.remove();
    }

    const el = document.createElement("div");
    el.style.cssText = `
      width: 16px; height: 16px; border-radius: 50%;
      background: #E8DCC4; border: 2px solid #fff;
      box-shadow: 0 0 10px rgba(232,220,196,0.6);
    `;

    const popup = new mapboxgl.Popup({
      offset: 16,
      closeButton: false,
    }).setHTML(`
      <div style="font-family: Georgia, serif; padding: 2px 0;">
        <div style="font-size: 14px; font-weight: 400; color: #1a1f2e;">${dest.label}</div>
        <div style="font-size: 12px; color: #666; margin-top: 2px;">${dest.address}</div>
      </div>
    `);

    destMarkerRef.current = new mapboxgl.Marker({ element: el })
      .setLngLat([dest.lng, dest.lat])
      .setPopup(popup)
      .addTo(map);
  }

  async function handleGeocode() {
    if (!destInput.trim()) return;
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(destInput.trim())}.json?access_token=${TOKEN}&limit=1`
      );
      const data = await res.json();
      const feature = data.features?.[0];
      if (feature) {
        const [lng, lat] = feature.center;
        setDest({
          label: feature.text || destInput.trim(),
          address: feature.place_name || destInput.trim(),
          lng,
          lat,
        });
        setDestInput("");
      }
    } catch (err) {
      console.error("Geocode error:", err);
    } finally {
      setGeocoding(false);
    }
  }

  return (
    <div style={{ padding: "0 60px 40px", maxWidth: "1440px", margin: "0 auto" }}>
      {/* Destination input */}
      <div style={{
        display: "flex", gap: "12px", alignItems: "center",
        marginBottom: "20px", flexWrap: "wrap",
      }}>
        <div style={{
          fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase",
          color: "#C9A96E", fontFamily: "'Georgia', serif", whiteSpace: "nowrap",
        }}>
          Set Destination
        </div>
        <div style={{ flex: 1, minWidth: "240px", display: "flex", gap: "8px" }}>
          <input
            type="text"
            value={destInput}
            onChange={(e) => setDestInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGeocode()}
            placeholder={dest.address}
            style={{
              flex: 1,
              padding: "10px 14px",
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
            onClick={handleGeocode}
            disabled={geocoding || !destInput.trim()}
            style={{
              padding: "10px 18px",
              fontSize: "12px",
              letterSpacing: "1px",
              textTransform: "uppercase",
              fontFamily: "'Georgia', serif",
              background: destInput.trim() ? "rgba(201,169,110,0.15)" : "rgba(255,255,255,0.04)",
              border: destInput.trim() ? "1px solid rgba(201,169,110,0.3)" : "1px solid rgba(255,255,255,0.08)",
              borderRadius: "8px",
              color: destInput.trim() ? "#C9A96E" : "rgba(255,255,255,0.25)",
              cursor: destInput.trim() ? "pointer" : "default",
              whiteSpace: "nowrap",
            }}
          >
            {geocoding ? "..." : "Update"}
          </button>
        </div>
        <div style={{
          fontSize: "13px", color: "rgba(255,255,255,0.35)", fontStyle: "italic",
          fontFamily: "'Georgia', serif",
        }}>
          Currently: {dest.label}
        </div>
      </div>

      {/* Map container */}
      <div style={{
        borderRadius: "12px",
        border: "1px solid rgba(201,169,110,0.2)",
        overflow: "hidden",
        height: "600px",
        position: "relative",
      }}>
        <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />
      </div>

      {/* Legend */}
      <div style={{
        display: "flex", gap: "24px", marginTop: "14px",
        fontSize: "12px", color: "rgba(255,255,255,0.35)",
        fontFamily: "'Georgia', serif",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#C9A96E", border: "1.5px solid #F5EFE8" }} />
          Town
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#E8DCC4", border: "1.5px solid #fff" }} />
          Destination
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: "24px", height: "3px", borderRadius: "2px", background: "#C9A96E", opacity: 0.85 }} />
          Driving Route
        </div>
      </div>
    </div>
  );
}
