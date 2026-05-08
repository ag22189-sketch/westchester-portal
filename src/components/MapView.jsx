import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const INITIAL_DESTINATIONS = [
  {
    id: "eds_office",
    label: "Ed's Office",
    address: "1285 Avenue of the Americas, New York, NY",
    coords: [40.7610, -73.9803],
    color: "#F5EFE0",
    showTrainInfo: true,
  },
  {
    id: "domus_hq",
    label: "Domus HQ",
    address: "35 Industrial Drive, East Longmeadow, MA",
    coords: [42.0717, -72.4978],
    color: "#C97B5A",
    showTrainInfo: false,
  },
  {
    id: "erikas_house",
    label: "Erika's House",
    address: "81 Richmond Hill, New Canaan, CT",
    coords: [41.1450, -73.4910],
    color: "#8FA68E",
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

// Dark popup CSS overrides (injected once)
const POPUP_STYLE_ID = "domus-popup-style";
function injectPopupStyles() {
  if (document.getElementById(POPUP_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = POPUP_STYLE_ID;
  style.textContent = `
    .mapboxgl-popup {
      opacity: 0;
      transition: opacity 200ms ease;
      pointer-events: auto;
    }
    .mapboxgl-popup.domus-visible {
      opacity: 1;
    }
    .mapboxgl-popup-content {
      background: #0F1318 !important;
      border: 1px solid rgba(201,169,110,0.3) !important;
      border-radius: 10px !important;
      padding: 14px !important;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6) !important;
      color: #F5EFE0 !important;
      font-family: Georgia, serif !important;
      max-height: calc(100vh - 200px) !important;
      overflow-y: auto !important;
    }
    .mapboxgl-popup-content::-webkit-scrollbar {
      width: 5px;
    }
    .mapboxgl-popup-content::-webkit-scrollbar-track {
      background: #0F1318;
      border-radius: 4px;
    }
    .mapboxgl-popup-content::-webkit-scrollbar-thumb {
      background: rgba(201,169,110,0.3);
      border-radius: 4px;
    }
    .mapboxgl-popup-content::-webkit-scrollbar-thumb:hover {
      background: rgba(201,169,110,0.5);
    }
    .mapboxgl-popup-content {
      scrollbar-width: thin;
      scrollbar-color: rgba(201,169,110,0.3) #0F1318;
    }
    .mapboxgl-popup-tip {
      border-top-color: #0F1318 !important;
      border-bottom-color: #0F1318 !important;
    }
    .mapboxgl-popup-anchor-bottom .mapboxgl-popup-tip {
      border-top-color: #0F1318 !important;
    }
    .mapboxgl-popup-anchor-top .mapboxgl-popup-tip {
      border-bottom-color: #0F1318 !important;
    }
    .mapboxgl-popup-anchor-left .mapboxgl-popup-tip {
      border-right-color: #0F1318 !important;
    }
    .mapboxgl-popup-anchor-right .mapboxgl-popup-tip {
      border-left-color: #0F1318 !important;
    }
    .mapboxgl-popup-close-button {
      color: #F5EFE0 !important;
      font-size: 18px !important;
      padding: 4px 8px !important;
      right: 2px !important;
      top: 2px !important;
    }
    .mapboxgl-popup-close-button:hover {
      background: rgba(201,169,110,0.15) !important;
      border-radius: 4px !important;
    }
  `;
  document.head.appendChild(style);
}

export default function MapView({ towns, onSelectTown }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const townMarkersRef = useRef([]);
  const destMarkersRef = useRef([]);
  const activeTownRef = useRef(null);
  const activePopupRef = useRef(null);
  const closeTimerRef = useRef(null);
  const routeGeometriesRef = useRef([]);
  const [destinations, setDestinations] = useState(INITIAL_DESTINATIONS);
  const destsRef = useRef(destinations);

  useEffect(() => { destsRef.current = destinations; }, [destinations]);

  // Geocode Erika's House on mount
  useEffect(() => {
    async function geocodeErika() {
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent("81 Richmond Hill, New Canaan, CT")}.json?access_token=${TOKEN}&limit=1`
        );
        const data = await res.json();
        const f = data.features?.[0];
        if (f) {
          const [lng, lat] = f.center;
          setDestinations((prev) =>
            prev.map((d) =>
              d.id === "erikas_house" ? { ...d, coords: [lat, lng] } : d
            )
          );
        }
      } catch (e) {
        console.error("Geocode Erika error:", e);
      }
    }
    geocodeErika();
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

  // Draw multiple routes
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
        paint: {
          "line-color": r.color,
          "line-width": 4,
          "line-opacity": 0.85,
        },
      });
      routeGeometriesRef.current.push({ destId: r.destId, geometry: r.geometry });
    }
  }

  function clearAllRoutes(map) {
    for (const dest of destsRef.current) {
      const lyrId = routeLayerId(dest.id);
      const srcId = routeSourceId(dest.id);
      if (map.getLayer(lyrId)) map.removeLayer(lyrId);
      if (map.getSource(srcId)) map.removeSource(srcId);
    }
    routeGeometriesRef.current = [];
  }

  function fitAllRoutesInView() {
    const map = mapRef.current;
    const geoms = routeGeometriesRef.current;
    if (!map || geoms.length === 0) return;
    const allCoords = geoms.flatMap((g) => g.geometry.coordinates);
    const bounds = allCoords.reduce(
      (b, c) => b.extend(c),
      new mapboxgl.LngLatBounds(allCoords[0], allCoords[0])
    );
    map.fitBounds(bounds, { padding: 60, duration: 800 });
  }

  // Train info HTML
  function trainHTML(mn) {
    if (!mn) return "";
    if (!mn.line || !mn.station) {
      return `<div style="font-size: 10px; color: rgba(245,239,232,0.4); font-family: Georgia, serif; margin-top: 2px; line-height: 1.3;">Train: ${mn.note || "No station nearby"}</div>`;
    }
    return `<div style="font-size: 10px; color: rgba(245,239,232,0.5); font-family: Georgia, serif; margin-top: 2px; line-height: 1.3;">Train: <strong style="color: #C9A96E;">${mn.timeToGCT} min</strong> ${mn.line} Line from ${mn.station} &rarr; GCT</div>`;
  }

  // Build popup HTML
  function popupHTML(town, dests, routeResults) {
    const mn = town.metroNorth;
    const isLoading = routeResults === "loading";

    let commuteBlocks = "";
    for (let i = 0; i < dests.length; i++) {
      const d = dests[i];
      const sep = i > 0 ? `<hr style="border: none; border-top: 1px solid rgba(201,169,110,0.12); margin: 5px 0;">` : "";
      const labelColor = d.color === "#F5EFE0" ? "#C9A96E" : d.color;

      let driveLine;
      if (isLoading) {
        driveLine = `<div style="font-size: 11px; color: rgba(245,239,232,0.35); font-style: italic; font-family: Georgia, serif; line-height: 1.3;">Calculating...</div>`;
      } else if (routeResults && routeResults[d.id]) {
        const r = routeResults[d.id];
        driveLine = `<div style="font-size: 12px; color: rgba(245,239,232,0.6); font-family: Georgia, serif; line-height: 1.3;">Drive: <strong style="color: #C9A96E;">${r.duration} min</strong> · ${r.distance} mi</div>`;
      } else {
        driveLine = "";
      }

      const trainLine = d.showTrainInfo ? trainHTML(mn) : "";

      commuteBlocks += `
        ${sep}
        <div style="margin: 2px 0;">
          <div style="font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: ${labelColor}; font-family: Georgia, serif; margin-bottom: 2px; line-height: 1.3;">
            To ${d.label}
          </div>
          <div style="font-size: 11px; color: rgba(245,239,232,0.35); font-family: Georgia, serif; margin-bottom: 3px;">${shortAddress(d.address)}</div>
          ${driveLine}
          ${trainLine}
        </div>
      `;
    }

    const viewRouteLink = !isLoading && routeResults
      ? `<div style="margin-top: 6px;">
          <a href="#" onclick="document.dispatchEvent(new CustomEvent('fitRoute'));return false;"
            style="font-size: 11px; color: #C9A96E; text-decoration: none; border-bottom: 1px solid rgba(201,169,110,0.3); font-family: Georgia, serif;">
            View all routes
          </a>
        </div>`
      : "";

    const dirButtons = dests.map((d) => {
      const btnColor = d.color === "#F5EFE0" ? "#C9A96E" : d.color;
      return `<a href="${directionsUrl(town, d)}" target="_blank" rel="noopener noreferrer"
        style="font-size: 9px; letter-spacing: 0.5px; text-transform: uppercase; padding: 5px 10px;
          background: rgba(201,169,110,0.08); color: ${btnColor}; text-decoration: none; border-radius: 4px;
          border: 1px solid rgba(201,169,110,0.15); font-family: Georgia, serif; white-space: nowrap;">
        ${d.label}
      </a>`;
    }).join("");

    return `
      <div style="font-family: Georgia, serif; padding: 0; min-width: 210px; line-height: 1.4;">
        <div style="font-size: 15px; font-weight: 400; color: #F5EFE0; margin-bottom: 2px;">${town.name}</div>
        <div style="font-size: 11px; color: rgba(245,239,232,0.4); font-style: italic; margin-bottom: 4px;">${town.tagline}</div>
        <div style="font-size: 12px; color: rgba(245,239,232,0.6); margin-bottom: 6px;">
          Median: <strong style="color: #C9A96E;">${fmt(town.medianPrice)}</strong>
        </div>
        <div style="border-top: 1px solid rgba(201,169,110,0.12); padding-top: 6px; margin-bottom: 4px;">
          ${commuteBlocks}
        </div>
        ${viewRouteLink}
        <div style="margin-top: 6px;">
          <div style="font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase; color: rgba(245,239,232,0.3); margin-bottom: 4px; font-family: Georgia, serif;">Directions to</div>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            ${dirButtons}
            <button onclick="document.dispatchEvent(new CustomEvent('selectTown', {detail:'${town.name}'}))"
              style="font-size: 9px; letter-spacing: 0.5px; text-transform: uppercase; padding: 5px 10px;
                background: transparent; color: #F5EFE0; border: 1px solid rgba(245,239,232,0.15); border-radius: 4px;
                cursor: pointer; font-family: Georgia, serif; white-space: nowrap;">
              Town Details
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Close the active popup and clear routes
  function dismissPopup(map) {
    if (activePopupRef.current) {
      // Fade out
      const el = activePopupRef.current.getElement();
      if (el) el.classList.remove("domus-visible");
      const popup = activePopupRef.current;
      setTimeout(() => { popup.remove(); }, 200);
      activePopupRef.current = null;
    }
    activeTownRef.current = null;
    if (map) clearAllRoutes(map);
  }

  // Schedule a delayed dismiss (cancelled if mouse enters popup)
  function scheduleDismiss(map) {
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => dismissPopup(map), 150);
  }

  function cancelDismiss() {
    clearTimeout(closeTimerRef.current);
  }

  // Handle hover on a town pin
  async function handleTownHover(town, map) {
    // If already showing this town, do nothing
    if (activeTownRef.current === town.name) return;

    // Dismiss previous
    dismissPopup(map);
    activeTownRef.current = town.name;

    const dests = destsRef.current;

    // Create popup manually (not attached to marker — full control)
    const popup = new mapboxgl.Popup({
      offset: 15,
      closeButton: false,
      closeOnClick: false,
      closeOnMove: false,
      focusAfterOpen: false,
      maxWidth: "300px",
    })
      .setLngLat([town.lng, town.lat])
      .setHTML(popupHTML(town, dests, "loading"))
      .addTo(map);

    activePopupRef.current = popup;

    // Fade in after a frame (so the transition triggers)
    requestAnimationFrame(() => {
      const el = popup.getElement();
      if (el) {
        el.classList.add("domus-visible");
        // Keep popup alive while mouse is over it
        el.addEventListener("mouseenter", cancelDismiss);
        el.addEventListener("mouseleave", () => scheduleDismiss(map));
      }
    });

    // Fetch routes to all destinations
    try {
      const results = await Promise.all(
        dests.map(async (d) => {
          const [lat, lng] = d.coords;
          const route = await fetchRoute(town.lng, town.lat, lng, lat);
          return { destId: d.id, color: d.color, ...(route || {}) };
        })
      );

      // Bail if user already hovered away
      if (activeTownRef.current !== town.name) return;

      drawRoutes(map, results.filter((r) => r.geometry));

      const resultMap = {};
      for (const r of results) {
        if (r.duration != null) {
          resultMap[r.destId] = { duration: r.duration, distance: r.distance };
        }
      }
      popup.setHTML(popupHTML(town, dests, resultMap));

      // Re-attach popup hover listeners after setHTML replaces DOM
      const el = popup.getElement();
      if (el) {
        el.addEventListener("mouseenter", cancelDismiss);
        el.addEventListener("mouseleave", () => scheduleDismiss(map));
      }
    } catch (err) {
      console.error("Route fetch error:", err);
      if (activeTownRef.current === town.name) {
        popup.setHTML(popupHTML(town, dests, null));
      }
    }
  }

  // Initialize map
  useEffect(() => {
    if (mapRef.current) return;
    injectPopupStyles();
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

  // Add town + destination markers, fitBounds on load
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous
    townMarkersRef.current.forEach((m) => m.remove());
    townMarkersRef.current = [];
    destMarkersRef.current.forEach((m) => m.remove());
    destMarkersRef.current = [];
    dismissPopup(map);

    const onLoad = () => {
      clearAllRoutes(map);
      const allPoints = [];

      // Town markers — hover-based interaction
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
          cancelDismiss();
          handleTownHover(t, map);
        });

        el.addEventListener("mouseleave", () => {
          el.style.transform = "scale(1)";
          el.style.boxShadow = "0 0 8px rgba(201,169,110,0.5)";
          scheduleDismiss(map);
        });

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([t.lng, t.lat])
          .addTo(map);

        townMarkersRef.current.push(marker);
      });

      // Destination markers — proper Mapbox markers at geographic coords
      destinations.forEach((d) => {
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

        // Simple hover label for destinations
        const destPopup = new mapboxgl.Popup({
          offset: 15,
          closeButton: false,
          closeOnClick: false,
          closeOnMove: false,
          focusAfterOpen: false,
          maxWidth: "260px",
        }).setHTML(`
          <div style="font-family: Georgia, serif; padding: 2px 0;">
            <div style="font-size: 14px; font-weight: 400; color: #F5EFE0;">${d.label}</div>
            <div style="font-size: 12px; color: rgba(245,239,232,0.5); margin-top: 2px;">${d.address}</div>
          </div>
        `);

        el.addEventListener("mouseenter", () => {
          destPopup.setLngLat([lng, lat]).addTo(map);
          requestAnimationFrame(() => {
            const popEl = destPopup.getElement();
            if (popEl) popEl.classList.add("domus-visible");
          });
        });
        el.addEventListener("mouseleave", () => {
          const popEl = destPopup.getElement();
          if (popEl) popEl.classList.remove("domus-visible");
          setTimeout(() => destPopup.remove(), 200);
        });

        destMarkersRef.current.push(marker);
      });

      // Fit bounds to include all towns + destinations
      if (allPoints.length > 1) {
        const bounds = allPoints.reduce(
          (b, c) => b.extend(c),
          new mapboxgl.LngLatBounds(allPoints[0], allPoints[0])
        );
        map.fitBounds(bounds, { padding: 50, duration: 0 });
      }
    };

    if (map.loaded()) {
      onLoad();
    } else {
      map.on("load", onLoad);
    }
  }, [towns, destinations]);

  // Event listeners for popup buttons
  useEffect(() => {
    const selectHandler = (e) => { if (onSelectTown) onSelectTown(e.detail); };
    const fitHandler = () => fitAllRoutesInView();
    document.addEventListener("selectTown", selectHandler);
    document.addEventListener("fitRoute", fitHandler);
    return () => {
      document.removeEventListener("selectTown", selectHandler);
      document.removeEventListener("fitRoute", fitHandler);
    };
  }, [onSelectTown]);

  return (
    <div style={{ padding: "0 60px 40px", maxWidth: "1440px", margin: "0 auto" }}>
      <div style={{
        borderRadius: "12px",
        border: "1px solid rgba(201,169,110,0.2)",
        overflow: "hidden",
        height: "600px",
        position: "relative",
      }}>
        <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />
      </div>

      <div style={{
        display: "flex", gap: "20px", marginTop: "14px",
        fontSize: "12px", color: "rgba(255,255,255,0.35)",
        fontFamily: "'Georgia', serif",
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#C9A96E", border: "1.5px solid #F5EFE8" }} />
          Westchester Town
        </div>
        {destinations.map((d) => (
          <div key={d.id} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: d.color, border: "1.5px solid #fff" }} />
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
