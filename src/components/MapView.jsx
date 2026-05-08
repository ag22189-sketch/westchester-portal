import { useEffect, useRef, useState, useCallback } from "react";
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
    coords: [41.1450, -73.4910], // approximate, geocoded on load
    color: "#8FA68E",
    showTrainInfo: false,
  },
];

const fmt = (n) =>
  n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : `$${(n / 1000).toFixed(0)}K`;

function routeSourceId(destId) { return `route-${destId}`; }
function routeLayerId(destId) { return `route-line-${destId}`; }

function shortAddress(addr) {
  // "1285 Avenue of the Americas, New York, NY" → "New York, NY"
  const parts = addr.split(", ");
  if (parts.length >= 3) return parts.slice(-2).join(", ");
  if (parts.length === 2) return parts[1];
  return addr;
}

function directionsUrl(town, dest) {
  return `https://www.google.com/maps/dir/?api=1&origin=${town.lat},${town.lng}&destination=${encodeURIComponent(dest.address)}&travelmode=driving`;
}

export default function MapView({ towns, onSelectTown }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const townMarkersRef = useRef([]);
  const destMarkersRef = useRef([]);
  const activeTownRef = useRef(null);
  const routeGeometriesRef = useRef([]); // [{destId, geometry}, ...]
  const [destinations, setDestinations] = useState(INITIAL_DESTINATIONS);
  const destsRef = useRef(destinations);

  useEffect(() => { destsRef.current = destinations; }, [destinations]);

  // Geocode Erika's House on mount to get exact coords
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
      return `<div style="font-size: 12px; color: #888; font-family: Georgia, serif; margin-top: 4px;">Train: ${mn.note || "No station nearby"}</div>`;
    }
    return `<div style="font-size: 12px; color: #555; font-family: Georgia, serif; margin-top: 4px;">Train: <strong style="color: #333;">${mn.timeToGCT} min</strong> on ${mn.line} Line from ${mn.station} &rarr; Grand Central</div>`;
  }

  // Build popup HTML with all destinations
  function popupHTML(town, dests, routeResults) {
    // routeResults: "loading" | { [destId]: {duration, distance} | null } | null
    const mn = town.metroNorth;
    const isLoading = routeResults === "loading";

    let commuteBlocks = "";
    for (let i = 0; i < dests.length; i++) {
      const d = dests[i];
      const sep = i > 0 ? `<hr style="border: none; border-top: 1px solid #eee; margin: 8px 0;">` : "";

      let driveLine;
      if (isLoading) {
        driveLine = `<div style="font-size: 12px; color: #999; font-style: italic; font-family: Georgia, serif;">Calculating...</div>`;
      } else if (routeResults && routeResults[d.id]) {
        const r = routeResults[d.id];
        driveLine = `<div style="font-size: 13px; color: #1a1f2e; font-family: Georgia, serif;">Drive: <strong style="color: ${d.color === '#F5EFE0' ? '#B8943F' : d.color};">${r.duration} min</strong> · ${r.distance} mi</div>`;
      } else {
        driveLine = "";
      }

      const trainLine = d.showTrainInfo ? trainHTML(mn) : "";

      commuteBlocks += `
        ${sep}
        <div style="margin: 4px 0;">
          <div style="font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: ${d.color === '#F5EFE0' ? '#B8943F' : d.color}; font-family: Georgia, serif; margin-bottom: 3px;">
            To ${d.label}
          </div>
          <div style="font-size: 11px; color: #999; font-family: Georgia, serif; margin-bottom: 3px;">${shortAddress(d.address)}</div>
          ${driveLine}
          ${trainLine}
        </div>
      `;
    }

    // View full route link
    const viewRouteLink = !isLoading && routeResults
      ? `<div style="margin-top: 6px;">
          <a href="#" onclick="document.dispatchEvent(new CustomEvent('fitRoute'));return false;"
            style="font-size: 11px; color: #B8943F; text-decoration: none; border-bottom: 1px solid rgba(184,148,63,0.3); font-family: Georgia, serif;">
            View all routes
          </a>
        </div>`
      : "";

    // Direction buttons
    const dirButtons = dests.map((d) =>
      `<a href="${directionsUrl(town, d)}" target="_blank" rel="noopener noreferrer"
        style="font-size: 10px; letter-spacing: 0.5px; text-transform: uppercase; padding: 5px 10px;
          background: #1a1f2e; color: ${d.color === '#F5EFE0' ? '#C9A96E' : d.color}; text-decoration: none; border-radius: 4px;
          font-family: Georgia, serif; white-space: nowrap;">
        ${d.label}
      </a>`
    ).join("");

    return `
      <div style="font-family: Georgia, serif; padding: 4px 0; min-width: 240px;">
        <div style="font-size: 16px; font-weight: 400; color: #1a1f2e; margin-bottom: 4px;">${town.name}</div>
        <div style="font-size: 12px; color: #666; font-style: italic; margin-bottom: 6px;">${town.tagline}</div>
        <div style="font-size: 13px; color: #333; margin-bottom: 10px;">
          Median: <strong style="color: #B8943F;">${fmt(town.medianPrice)}</strong>
        </div>
        <div style="border-top: 1px solid #ddd; padding-top: 8px; margin-bottom: 8px;">
          ${commuteBlocks}
        </div>
        ${viewRouteLink}
        <div style="margin-top: 8px;">
          <div style="font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: #999; margin-bottom: 5px; font-family: Georgia, serif;">Directions to</div>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            ${dirButtons}
            <button onclick="document.dispatchEvent(new CustomEvent('selectTown', {detail:'${town.name}'}))"
              style="font-size: 10px; letter-spacing: 0.5px; text-transform: uppercase; padding: 5px 10px;
                background: transparent; color: #1a1f2e; border: 1px solid #ddd; border-radius: 4px;
                cursor: pointer; font-family: Georgia, serif; white-space: nowrap;">
              Town Details
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Handle town marker click — fetch routes to ALL destinations
  async function handleMarkerClick(town, marker, map) {
    const dests = destsRef.current;
    activeTownRef.current = town.name;

    const popup = marker.getPopup();
    popup.setHTML(popupHTML(town, dests, "loading"));
    if (!popup.isOpen()) marker.togglePopup();

    try {
      const results = await Promise.all(
        dests.map(async (d) => {
          const [lat, lng] = d.coords;
          const route = await fetchRoute(town.lng, town.lat, lng, lat);
          return { destId: d.id, color: d.color, ...(route || {}) };
        })
      );

      if (activeTownRef.current !== town.name) return;

      // Draw all routes
      drawRoutes(map, results.filter((r) => r.geometry));

      // Build result map for popup
      const resultMap = {};
      for (const r of results) {
        if (r.duration != null) {
          resultMap[r.destId] = { duration: r.duration, distance: r.distance };
        }
      }
      popup.setHTML(popupHTML(town, dests, resultMap));
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
    activeTownRef.current = null;

    const onLoad = () => {
      clearAllRoutes(map);

      // Collect all points for fitBounds
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
          transition: transform 0.15s;
        `;
        el.addEventListener("mouseenter", () => { el.style.transform = "scale(1.4)"; });
        el.addEventListener("mouseleave", () => { el.style.transform = "scale(1)"; });

        const popup = new mapboxgl.Popup({
          offset: 16,
          closeButton: true,
          maxWidth: "340px",
        }).setHTML(popupHTML(t, destinations, null));

        popup.on("close", () => {
          if (activeTownRef.current === t.name) {
            activeTownRef.current = null;
            clearAllRoutes(map);
          }
        });

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([t.lng, t.lat])
          .setPopup(popup)
          .addTo(map);

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          townMarkersRef.current.forEach((m) => {
            if (m !== marker && m.getPopup().isOpen()) m.togglePopup();
          });
          handleMarkerClick(t, marker, map);
        });

        townMarkersRef.current.push(marker);
      });

      // Destination markers
      destinations.forEach((d) => {
        const [lat, lng] = d.coords;
        allPoints.push([lng, lat]);

        const el = document.createElement("div");
        el.style.cssText = `
          width: 16px; height: 16px; border-radius: 50%;
          background: ${d.color}; border: 2px solid #fff;
          box-shadow: 0 0 10px ${d.color}99;
        `;

        const popup = new mapboxgl.Popup({
          offset: 16,
          closeButton: false,
        }).setHTML(`
          <div style="font-family: Georgia, serif; padding: 2px 0;">
            <div style="font-size: 14px; font-weight: 400; color: #1a1f2e;">${d.label}</div>
            <div style="font-size: 12px; color: #666; margin-top: 2px;">${d.address}</div>
          </div>
        `);

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map);

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
