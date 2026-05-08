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
  const activeTownRef = useRef(null); // town name with active route
  const [dest, setDest] = useState(DEFAULT_DEST);
  const destRef = useRef(dest);
  const [destInput, setDestInput] = useState("");
  const [geocoding, setGeocoding] = useState(false);

  // Keep destRef in sync
  useEffect(() => {
    destRef.current = dest;
  }, [dest]);

  // Google Maps directions URL
  const directionsUrl = useCallback((town, d) => {
    const destAddr = encodeURIComponent(d.address);
    return `https://www.google.com/maps/dir/?api=1&origin=${town.lat},${town.lng}&destination=${destAddr}&travelmode=driving`;
  }, []);

  // Fetch route from Mapbox Directions API
  async function fetchRoute(originLng, originLat, destLng, destLat) {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${originLng},${originLat};${destLng},${destLat}?geometries=geojson&overview=full&access_token=${TOKEN}`;
    const res = await fetch(url);
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return null;
    return {
      geometry: route.geometry,
      duration: Math.round(route.duration / 60), // minutes
      distance: (route.distance / 1609.344).toFixed(1), // miles
    };
  }

  // Draw route on map
  function drawRoute(map, geometry) {
    clearRoute(map);

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

  // Clear route from map
  function clearRoute(map) {
    if (map.getLayer(ROUTE_LAYER)) map.removeLayer(ROUTE_LAYER);
    if (map.getSource(ROUTE_SOURCE)) map.removeSource(ROUTE_SOURCE);
  }

  // Build popup HTML
  function popupHTML(town, d, routeInfo) {
    const driveInfo = routeInfo === "loading"
      ? `<div style="font-size: 12px; color: #999; font-style: italic; margin-bottom: 8px; font-family: Georgia, serif;">Calculating route...</div>`
      : routeInfo
        ? `<div style="font-size: 13px; color: #1a1f2e; margin-bottom: 8px; font-family: Georgia, serif;">Drive: <strong style="color: #B8943F;">${routeInfo.duration} min</strong> · ${routeInfo.distance} mi</div>`
        : "";

    return `
      <div style="font-family: Georgia, serif; padding: 4px 0;">
        <div style="font-size: 16px; font-weight: 400; color: #1a1f2e; margin-bottom: 4px;">${town.name}</div>
        <div style="font-size: 12px; color: #666; font-style: italic; margin-bottom: 6px;">${town.tagline}</div>
        <div style="font-size: 13px; color: #333; margin-bottom: 8px;">
          Median: <strong style="color: #B8943F;">${fmt(town.medianPrice)}</strong> · ${town.metro} min to GCT
        </div>
        ${driveInfo}
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

  // Handle marker click — fetch route, update popup
  async function handleMarkerClick(town, marker, map) {
    const d = destRef.current;
    activeTownRef.current = town.name;

    // Show popup immediately with loading state
    const popup = marker.getPopup();
    popup.setHTML(popupHTML(town, d, "loading"));
    if (!popup.isOpen()) marker.togglePopup();
    activePopupRef.current = { marker, town };

    // Fetch route
    try {
      const routeInfo = await fetchRoute(town.lng, town.lat, d.lng, d.lat);
      // Only update if this town is still active
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

    // Clear existing markers and route
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    activeTownRef.current = null;
    activePopupRef.current = null;

    const onLoad = () => {
      clearRoute(map);

      towns.forEach((t) => {
        if (!t.lat || !t.lng) return;

        // Custom marker element
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

        // Create popup (initially empty, populated on click)
        const popup = new mapboxgl.Popup({
          offset: 16,
          closeButton: true,
          maxWidth: "280px",
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

        // Override click to fetch route
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          // Close any other open popups
          markersRef.current.forEach((m) => {
            if (m !== marker && m.getPopup().isOpen()) m.togglePopup();
          });
          handleMarkerClick(t, marker, map);
        });

        markersRef.current.push(marker);
      });

      // Destination marker
      updateDestMarker(map);
    };

    if (map.loaded()) {
      onLoad();
    } else {
      map.on("load", onLoad);
    }
  }, [towns, dest]);

  // Listen for selectTown events from popup buttons
  useEffect(() => {
    const handler = (e) => {
      if (onSelectTown) onSelectTown(e.detail);
    };
    document.addEventListener("selectTown", handler);
    return () => document.removeEventListener("selectTown", handler);
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
        if (mapRef.current) {
          mapRef.current.flyTo({ center: [lng, lat], zoom: 11 });
        }
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
