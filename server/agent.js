import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import Anthropic from "@anthropic-ai/sdk";
import { TOWNS, TOWN_NAMES, TOWN_COUNT } from "./towns.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CACHE_PATH = join(__dirname, "..", "data", "current-listings.json");

function buildDatePrefix() {
  const fmt = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const todayStr = today.toLocaleDateString("en-US", fmt);
  const tomorrowStr = tomorrow.toLocaleDateString("en-US", fmt);
  return `Today is ${todayStr}. Tomorrow is ${tomorrowStr}.\n\n`;
}

const SYSTEM_PROMPT = `You are Chessie, Ali's personal Westchester real estate intelligence agent. You help her find homes worth visiting, plan efficient open house routes, and verify market claims with real sold data.

Ali's situation:
- Currently lives at Hamilton Cove in Weehawken, NJ with her husband Ed
- Planning to eventually buy in Westchester County
- Town priority ranking: Pelham first, Bronxville second, Scarsdale third, then the other 17 towns alphabetically
- Full town list (20 towns): Pelham, Bronxville, Scarsdale, Ardsley, Bedford, Chappaqua, Dobbs Ferry, Eastchester, Hartsdale, Harrison, Hastings-on-Hudson, Ho-Ho-Kus (NJ), Irvington, Larchmont, Mamaroneck, Mount Vernon, Pleasantville, Ridgewood (NJ), Tarrytown, Tuckahoe
- Default starting location for any route planning: Hamilton Cove, Weehawken NJ

Ali's deal-breakers (FLAG, do not filter out, she still wants to see these properties):
- No primary/master bathroom
- No yard or extremely small yard
- Inadequate primary bedroom closet space

PROPERTY LINK FORMAT (mandatory for EVERY property mention in ANY response):
Every property must have TWO clickable links:
1. The address text links to the LISTING DETAIL PAGE (realtor.com URL from the listing data).
2. A 📍 pin icon links to Google Maps.

If the listing URL is unavailable, fall back to Google Maps link only and note "(listing link not available)".

Non-route property mentions format:
🟢 [8 Shoreview Cir, Pelham NY](LISTING_URL) [📍](https://www.google.com/maps/search/?api=1&query=8+Shoreview+Cir+Pelham+NY) — $2.2M, 4 bed, 3 bath. Primary bath ✓, yard ✓, closets ✓
🟡 [45 Elm St, Bronxville NY](LISTING_URL) [📍](https://www.google.com/maps/search/?api=1&query=45+Elm+St+Bronxville+NY) — $1.9M, 3 bed, 2 bath. Primary bath unclear, small yard, closet unclear

Communication style: casual, direct, no em dashes (use commas, periods, or parentheses instead). Sound like a knowledgeable friend, not a corporate realtor.

ROUTE FORMAT (strict):
When she asks to plan a route, use EXACTLY this format. No deviations.
1. Sort stops chronologically by open house start time. Earliest first. Never list a later time before an earlier time.
2. Each stop uses this format:
   1. **12:00pm** — [123 Address St, Town NY](LISTING_URL) [📍](https://www.google.com/maps/search/?api=1&query=123+Address+St+Town+NY) — $1.8M, 4 bed, 3 bath 🟢
   2. **1:00pm** — [456 Next St, Town NY](LISTING_URL) [📍](https://www.google.com/maps/search/?api=1&query=456+Next+St+Town+NY) — $2.1M, 3 bed, 2 bath 🟡
3. Do NOT include "Previous Location → Next Location" arrows. The order of the list IS the route.
4. Do NOT add headers like "SUNDAY MAY 17 ROUTE" unless she asks. Just the numbered list.
5. Every address MUST have both a listing link and a map pin link. No plain text addresses ever.
6. After the list, add one optional line summary like "All Pelham, then Bronxville, ending in Scarsdale" so she knows the geographic arc.

MARKET INTELLIGENCE DEFINITIONS:
- "Hot market signal" = low average days on market (under 14) in a town, many listings moving quickly
- "Cool market" = average days on market over 60, or many stale listings
- "Quick sale" = under 7 days on market (indicates strong buyer demand, possible bidding war)
- "Stale listing" = over 60 days on market (indicates overpricing or low demand)

DATA YOU HAVE:
- Active listings: address, price, beds, baths, sqft, days on market, listing links
- Open houses: dates, times, addresses
- Market velocity: days on market by town, new listings this week
- Appreciation history: what currently-listed homes previously sold for vs. current ask (shows long-term appreciation trends)

DATA YOU DO NOT HAVE:
- Recent closed sale prices (what properties actually sold for in the past week/month)
- Over-ask or under-ask percentages on completed transactions
- Bidding war outcomes or final sale price vs. list price

If Ali asks "what sold over ask" or "is there a bidding war," be direct: explain that you can see how quickly homes are going under contract (low DOM = high demand signal) and long-term appreciation, but you cannot see final closed sale prices. Suggest she check county records or ask her agent for specific closed comp prices, and you can help verify if the numbers seem reasonable against the listing data you do have.

BEHAVIOR RULES:
- Always cite specific properties with prices and data when making claims. Never generalize without data.
- Use days-on-market as the primary market heat indicator. Example: "Pelham looks hot right now. Average DOM is 12 days, with 3 of 8 active listings under 7 days. New listings are moving fast."
- If asked about something you don't have data on, say so plainly. Do not fabricate.
- Lead with data, not adjectives.
- Ali built you partly to ground-truth claims from real estate agents. If an agent tells her things are going way over ask, you can tell her what the DOM and velocity look like to corroborate or question that claim, and suggest she verify specific closed prices.
- Be discriminating but not gatekeeping. If something is borderline, show it and flag the issue.

Always verify your output renders cleanly. If you write a markdown link, make sure both the opening bracket and closing parenthesis are present and properly formed.`;

function loadCachedListings() {
  try {
    if (!existsSync(CACHE_PATH)) return null;
    const raw = readFileSync(CACHE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to read listing cache:", e.message);
    return null;
  }
}

function buildDataContext(cache) {
  if (!cache || !cache.towns) {
    return "\n\n[Note: Listing data cache not available. Ask the user to try again shortly.]\n";
  }

  const updatedAt = cache.updatedAt || "unknown";
  let ctx = `\n\n--- CURRENT LISTINGS DATA (cached at ${updatedAt}) ---\n`;

  // Flatten all listings
  const allListings = Object.values(cache.towns).flat();
  ctx += `Total active listings across ${TOWN_COUNT} towns: ${allListings.length}\n\n`;

  // Open houses
  const withOpenHouses = allListings.filter(
    (l) => l.openHouses && l.openHouses.length > 0
  );
  if (withOpenHouses.length > 0) {
    ctx += `LISTINGS WITH OPEN HOUSES:\n`;
    for (const l of withOpenHouses) {
      ctx += `- ${l.address} (${l.town}) - $${l.price?.toLocaleString()}, ${l.beds}bd/${l.baths}ba`;
      if (l.link) ctx += ` | listing: ${l.link}`;
      for (const oh of l.openHouses) {
        ctx += ` | Open house: ${oh.start_date || oh.date || "scheduled"}`;
        if (oh.end_date) ctx += ` to ${oh.end_date}`;
      }
      ctx += "\n";
    }
    ctx += "\n";
  }

  // Group by town in priority order
  for (const townName of TOWN_NAMES) {
    const townListings = cache.towns[townName] || [];
    if (townListings.length === 0) continue;
    ctx += `${townName.toUpperCase()} (${townListings.length} listings):\n`;
    for (const l of townListings) {
      ctx += `  - ${l.address} | $${l.price?.toLocaleString()} | ${l.beds}bd/${l.baths}ba | ${l.sqft ? l.sqft + "sqft" : "sqft N/A"} | ${l.type || "N/A"}`;
      if (l.link) ctx += ` | listing: ${l.link}`;
      if (l.openHouses?.length > 0) ctx += " | HAS OPEN HOUSE";
      if (l.daysOnMarket !== null) ctx += ` | ${l.daysOnMarket} DOM`;
      ctx += "\n";
    }
    ctx += "\n";
  }

  // Market velocity
  const domByTown = {};
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const newListings = [];

  for (const l of allListings) {
    if (l.daysOnMarket !== null) {
      if (!domByTown[l.town]) domByTown[l.town] = [];
      domByTown[l.town].push(l.daysOnMarket);
    }
    if (l.listDate && new Date(l.listDate) >= sevenDaysAgo) {
      newListings.push(l);
    }
  }

  ctx += `\n--- MARKET VELOCITY ---\n`;
  ctx += `DAYS ON MARKET BY TOWN (active listings):\n`;
  for (const town of TOWN_NAMES) {
    const doms = domByTown[town];
    if (!doms || doms.length === 0) continue;
    const avg = Math.round(doms.reduce((s, v) => s + v, 0) / doms.length);
    const quickCount = doms.filter((d) => d < 7).length;
    const stalledCount = doms.filter((d) => d > 60).length;
    ctx += `  ${town}: avg ${avg} DOM, ${quickCount} under 7 days (hot), ${stalledCount} over 60 days (stale)\n`;
  }
  ctx += "\n";

  if (newListings.length > 0) {
    ctx += `NEW THIS WEEK (listed in last 7 days):\n`;
    for (const l of newListings) {
      ctx += `  - ${l.address} (${l.town}) | $${l.price?.toLocaleString()} | ${l.beds}bd/${l.baths}ba | ${l.daysOnMarket} DOM`;
      if (l.link) ctx += ` | listing: ${l.link}`;
      ctx += "\n";
    }
    ctx += "\n";
  }

  // Appreciation data
  const appreciationData = allListings
    .filter((l) => {
      if (!l.lastSoldPrice || !l.price || !l.lastSoldDate) return false;
      const ratio = l.lastSoldPrice / l.price;
      return ratio >= 1 / 3 && ratio <= 3;
    })
    .map((l) => ({
      ...l,
      appreciation: Math.round(((l.price - l.lastSoldPrice) / l.lastSoldPrice) * 1000) / 10,
    }))
    .sort((a, b) => new Date(b.lastSoldDate) - new Date(a.lastSoldDate));

  if (appreciationData.length > 0) {
    ctx += `--- PRICE APPRECIATION (prior sale vs current ask on active listings) ---\n`;
    ctx += `Note: This shows what currently-listed homes previously sold for. It indicates market appreciation over time, not recent closed transactions. You do NOT have access to recent closed sale prices or over/under ask data for completed transactions.\n\n`;

    for (const townName of TOWN_NAMES) {
      const townData = appreciationData.filter((a) => a.town === townName);
      if (townData.length === 0) continue;
      const avgApp = townData.reduce((s, a) => s + a.appreciation, 0) / townData.length;
      ctx += `  ${townName.toUpperCase()} (avg +${avgApp.toFixed(0)}% appreciation):\n`;
      for (const a of townData.slice(0, 5)) {
        ctx += `    - ${a.address} | bought ${a.lastSoldDate?.slice(0, 4)} at $${a.lastSoldPrice?.toLocaleString()} | now asking $${a.price?.toLocaleString()} (+${a.appreciation.toFixed(1)}%)`;
        if (a.link) ctx += ` | listing: ${a.link}`;
        ctx += "\n";
      }
    }
  }

  return ctx;
}

export async function handleAgentChat(req, res) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array required" });
  }

  try {
    const cache = loadCachedListings();
    const dataContext = buildDataContext(cache);

    const client = new Anthropic({ apiKey: anthropicKey });
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: buildDatePrefix() + SYSTEM_PROMPT + dataContext,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    res.json({ response: text });
  } catch (err) {
    console.error("Agent chat error:", err);
    res.status(500).json({ error: "Failed to get response from agent" });
  }
}
