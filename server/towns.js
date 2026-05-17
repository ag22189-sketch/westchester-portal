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
  { name: "Irvington", zips: ["10533"] },
  { name: "Larchmont", zips: ["10538"] },
  { name: "Mamaroneck", zips: ["10543"] },
  { name: "Mount Vernon", zips: ["10552"] },
  { name: "Pleasantville", zips: ["10570"] },
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
