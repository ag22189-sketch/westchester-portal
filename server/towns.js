// Canonical town list for all Westchester Portal systems.
// Single source of truth: Chessie, digest, notifiers, portal map all use this.
// Priority: Pelham #1, Bronxville #2, Scarsdale #3, then alphabetical.

export const TOWNS = [
  { name: "Pelham", zips: ["10803"] },
  { name: "Bronxville", zips: ["10708"] },
  { name: "Scarsdale", zips: ["10583"] },
  { name: "Ardsley", zips: ["10502"] },
  { name: "Bedford", zips: ["10506", "10507"] },
  { name: "Chappaqua", zips: ["10514"] },
  { name: "Dobbs Ferry", zips: ["10522"] },
  { name: "Eastchester", zips: ["10709"] },
  { name: "Hartsdale", zips: ["10530"] },
  { name: "Harrison", zips: ["10528"] },
  { name: "Hastings-on-Hudson", zips: ["10706"] },
  { name: "Ho-Ho-Kus", zips: ["07423"] },
  { name: "Irvington", zips: ["10533"] },
  { name: "Larchmont", zips: ["10538"] },
  { name: "Mamaroneck", zips: ["10543"] },
  { name: "Mount Vernon", zips: ["10552"] },
  { name: "Pleasantville", zips: ["10570"] },
  { name: "Ridgewood", zips: ["07450", "07451"] },
  { name: "Tarrytown", zips: ["10591"] },
  { name: "Tuckahoe", zips: ["10707"] },
];

// Flat zip-to-town map for quick lookups
export const ZIP_TO_TOWN = {};
for (const t of TOWNS) {
  for (const z of t.zips) {
    ZIP_TO_TOWN[z] = t.name;
  }
}

// Town names in priority order
export const TOWN_NAMES = TOWNS.map((t) => t.name);

// Flat array of { zip, town } for notifier-style iteration
export const TOWN_ZIPS = TOWNS.flatMap((t) =>
  t.zips.map((zip) => ({ zip, town: t.name }))
);

export const TOWN_COUNT = TOWNS.length;

// --- Price drop thresholds ---
// A drop must exceed BOTH of these to trigger an alert.
// Effective threshold = max(MIN_PCT% of old price, MIN_ABS dollars).
export const PRICE_DROP_MIN_PCT = 1;     // percent
export const PRICE_DROP_MIN_ABS = 5000;  // dollars

// --- Email notification whitelist ---
// Only these mailing cities trigger email alerts (case-insensitive).
// All 20 towns are still fetched for Chessie's cache and seen-ID tracking.
export const NOTIFY_WHITELIST = ["scarsdale", "pelham", "pelham manor", "bronxville", "tuckahoe", "ho-ho-kus", "ridgewood"];

// Display order for the weekly digest email
export const DIGEST_TOWN_ORDER = ["Scarsdale", "Pelham", "Pelham Manor", "Bronxville", "Tuckahoe", "Ho-Ho-Kus", "Ridgewood"];

// ZIPs to fetch for the digest (includes Eastchester for Bronxville P.O.)
export const DIGEST_FETCH_ZIPS = [
  { zip: "10583", town: "Scarsdale" },
  { zip: "10803", town: "Pelham" },       // also covers Pelham Manor
  { zip: "10708", town: "Bronxville" },
  { zip: "10709", town: "Eastchester" },   // for Bronxville P.O. listings
  { zip: "10707", town: "Tuckahoe" },
  { zip: "07423", town: "Ho-Ho-Kus" },
  { zip: "07450", town: "Ridgewood" },
  { zip: "07451", town: "Ridgewood" },
];

// Checks whether a listing should trigger an email notification.
// Returns { notify: boolean, rule?: string }.
export function shouldNotifyEmail(listing, fetchTown) {
  const addr = listing.location?.address || {};
  const city = (addr.city || "").trim().toLowerCase();
  const zip = (addr.postal_code || "").trim();

  if (NOTIFY_WHITELIST.includes(city)) {
    if (fetchTown.toLowerCase() === "eastchester" && city === "bronxville") {
      return { notify: true, rule: "bronxville-po" };
    }
    return { notify: true };
  }

  // Fallback: Eastchester-fetched listing with Bronxville ZIP (10708)
  if (fetchTown.toLowerCase() === "eastchester" && zip === "10708") {
    return { notify: true, rule: "bronxville-po-zip" };
  }

  return { notify: false };
}

// For the digest: maps a listing to its display town name, or null if not whitelisted.
const WHITELIST_DISPLAY = {
  scarsdale: "Scarsdale",
  pelham: "Pelham",
  "pelham manor": "Pelham Manor",
  bronxville: "Bronxville",
  tuckahoe: "Tuckahoe",
  "ho-ho-kus": "Ho-Ho-Kus",
  ridgewood: "Ridgewood",
};

export function getDisplayTown(listing, fetchTown) {
  const addr = listing.location?.address || {};
  const city = (addr.city || "").trim().toLowerCase();
  if (WHITELIST_DISPLAY[city]) return WHITELIST_DISPLAY[city];
  // Bronxville P.O. fallback by ZIP
  if (fetchTown.toLowerCase() === "eastchester") {
    const zip = (addr.postal_code || "").trim();
    if (zip === "10708") return "Bronxville";
  }
  return null;
}
