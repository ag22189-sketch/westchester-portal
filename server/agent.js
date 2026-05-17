import Anthropic from "@anthropic-ai/sdk";

const API_KEY = process.env.RAPIDAPI_KEY || process.env.VITE_RAPIDAPI_KEY;
const API_HOST = "us-real-estate-listings.p.rapidapi.com";

const ZIP_CODES = {
  Pelham: "10803",
  Bronxville: "10708",
  Scarsdale: "10583",
  Ardsley: "10502",
  Bedford: "10506",
  "Bedford Hills": "10507",
  Chappaqua: "10514",
  "Dobbs Ferry": "10522",
  "Hastings-on-Hudson": "10706",
  Irvington: "10533",
  Katonah: "10536",
  Larchmont: "10538",
  "Mount Vernon": "10552",
  Pleasantville: "10570",
  Rye: "10580",
  "Sleepy Hollow": "10591",
  Tarrytown: "10591",
  Tuckahoe: "10707",
};

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
- Town priority ranking: Pelham first, Bronxville second, Scarsdale third, then the other 14 towns
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

async function fetchListingsForAllTowns() {
  if (!API_KEY) return [];

  const towns = Object.entries(ZIP_CODES);
  const results = [];

  // Fetch in batches of 4 to avoid rate limits
  for (let i = 0; i < towns.length; i += 4) {
    const batch = towns.slice(i, i + 4);
    const promises = batch.map(async ([town, zip]) => {
      try {
        const res = await fetch(
          `https://${API_HOST}/for-sale?location=${zip}&offset=0&limit=12`,
          {
            headers: {
              "x-rapidapi-key": API_KEY,
              "x-rapidapi-host": API_HOST,
            },
          }
        );
        if (!res.ok) return [];
        const data = await res.json();
        const listings = data?.listings || [];
        return listings.map((p) => ({
          town,
          address: formatAddress(p),
          price: p.list_price || 0,
          beds: p.description?.beds || null,
          baths: p.description?.baths || null,
          sqft: p.description?.sqft || null,
          type: p.description?.type?.replace(/_/g, " ") || null,
          status: p.status || "for_sale",
          link: p.href || null,
          openHouses: p.open_houses || [],
          listDate: p.list_date || null,
          description: p.description?.text || null,
          lastSoldPrice: p.last_sold_price || null,
          lastSoldDate: p.last_sold_date || null,
          daysOnMarket: p.list_date
            ? Math.max(0, Math.floor((Date.now() - new Date(p.list_date).getTime()) / 86400000))
            : null,
        }));
      } catch {
        return [];
      }
    });
    const batchResults = await Promise.all(promises);
    results.push(...batchResults.flat());
  }

  return results;
}

function extractAppreciationData(allListings) {
  // Extract prior sale history from active listings to show market appreciation
  // This is what we CAN get: what properties previously sold for vs. current ask
  const results = [];

  for (const l of allListings) {
    if (!l.lastSoldPrice || !l.price || !l.lastSoldDate) continue;
    const ratio = l.lastSoldPrice / l.price;
    if (ratio > 3 || ratio < 1 / 3) continue; // filter anomalies

    const appreciation = Math.round(((l.price - l.lastSoldPrice) / l.lastSoldPrice) * 1000) / 10;
    results.push({
      town: l.town,
      address: l.address,
      lastSoldPrice: l.lastSoldPrice,
      lastSoldDate: l.lastSoldDate,
      currentAsk: l.price,
      appreciation,
      link: l.link,
    });
  }

  return results.sort((a, b) => new Date(b.lastSoldDate) - new Date(a.lastSoldDate));
}

async function fetchOpenHouses() {
  if (!API_KEY) return [];

  // Get upcoming weekend dates
  const now = new Date();
  const day = now.getDay();
  const daysToSat = (6 - day + 7) % 7 || 7;
  const saturday = new Date(now);
  saturday.setDate(now.getDate() + daysToSat);
  const sunday = new Date(saturday);
  sunday.setDate(saturday.getDate() + 1);

  // Filter listings with open houses from the full set
  const allListings = await fetchListingsForAllTowns();
  const withOpenHouses = allListings.filter(
    (l) => l.openHouses && l.openHouses.length > 0
  );

  return { allListings, openHouses: withOpenHouses, weekend: { saturday, sunday } };
}

function formatAddress(p) {
  const addr = p.location?.address || {};
  return addr.line && addr.city
    ? `${addr.line}, ${addr.city}`
    : "Address unavailable";
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
    // Fetch real estate data
    let dataContext = "";
    try {
      const { allListings, openHouses, weekend } = await fetchOpenHouses();
      const appreciationData = extractAppreciationData(allListings);
      const satStr = weekend.saturday.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      const sunStr = weekend.sunday.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

      dataContext = `\n\n--- CURRENT LISTINGS DATA (as of ${new Date().toLocaleDateString()}) ---\n`;
      dataContext += `Total active listings across 17 towns: ${allListings.length}\n\n`;

      if (openHouses.length > 0) {
        dataContext += `OPEN HOUSES THIS WEEKEND (${satStr} - ${sunStr}):\n`;
        openHouses.forEach((l) => {
          dataContext += `- ${l.address} (${l.town}) - $${l.price?.toLocaleString()}, ${l.beds}bd/${l.baths}ba`;
          if (l.link) dataContext += ` | listing: ${l.link}`;
          if (l.openHouses.length > 0) {
            const oh = l.openHouses[0];
            dataContext += ` | Open house: ${oh.start_date || oh.date || "this weekend"}`;
          }
          dataContext += "\n";
        });
        dataContext += "\n";
      }

      // Group by town, priority order
      const priorityOrder = ["Pelham", "Bronxville", "Scarsdale"];
      const otherTowns = Object.keys(ZIP_CODES).filter((t) => !priorityOrder.includes(t));
      const orderedTowns = [...priorityOrder, ...otherTowns];

      for (const town of orderedTowns) {
        const townListings = allListings.filter((l) => l.town === town);
        if (townListings.length === 0) continue;
        dataContext += `${town.toUpperCase()} (${townListings.length} listings):\n`;
        townListings.forEach((l) => {
          dataContext += `  - ${l.address} | $${l.price?.toLocaleString()} | ${l.beds}bd/${l.baths}ba | ${l.sqft ? l.sqft + "sqft" : "sqft N/A"} | ${l.type || "N/A"}`;
          if (l.link) dataContext += ` | listing: ${l.link}`;
          if (l.openHouses?.length > 0) dataContext += " | HAS OPEN HOUSE";
          dataContext += "\n";
        });
        dataContext += "\n";
      }

      // Market velocity: days on market analysis
      const domByTown = {};
      const newListings = []; // listed in last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      for (const l of allListings) {
        if (l.daysOnMarket !== null) {
          if (!domByTown[l.town]) domByTown[l.town] = [];
          domByTown[l.town].push(l.daysOnMarket);
        }
        if (l.listDate && new Date(l.listDate) >= sevenDaysAgo) {
          newListings.push(l);
        }
      }

      dataContext += `\n--- MARKET VELOCITY ---\n`;
      dataContext += `DAYS ON MARKET BY TOWN (active listings):\n`;
      for (const town of orderedTowns) {
        const doms = domByTown[town];
        if (!doms || doms.length === 0) continue;
        const avg = Math.round(doms.reduce((s, v) => s + v, 0) / doms.length);
        const quickCount = doms.filter(d => d < 7).length;
        const stalledCount = doms.filter(d => d > 60).length;
        dataContext += `  ${town}: avg ${avg} DOM, ${quickCount} under 7 days (hot), ${stalledCount} over 60 days (stale)\n`;
      }
      dataContext += "\n";

      if (newListings.length > 0) {
        dataContext += `NEW THIS WEEK (listed in last 7 days):\n`;
        for (const l of newListings) {
          dataContext += `  - ${l.address} (${l.town}) | $${l.price?.toLocaleString()} | ${l.beds}bd/${l.baths}ba | ${l.daysOnMarket} DOM`;
          if (l.link) dataContext += ` | listing: ${l.link}`;
          dataContext += "\n";
        }
        dataContext += "\n";
      }

      // Appreciation data (prior sale history on active listings)
      if (appreciationData.length > 0) {
        dataContext += `--- PRICE APPRECIATION (prior sale vs current ask on active listings) ---\n`;
        dataContext += `Note: This shows what currently-listed homes previously sold for. It indicates market appreciation over time, not recent closed transactions. You do NOT have access to recent closed sale prices or over/under ask data for completed transactions.\n\n`;

        for (const town of orderedTowns) {
          const townData = appreciationData.filter((a) => a.town === town);
          if (townData.length === 0) continue;
          const avgApp = townData.reduce((s, a) => s + a.appreciation, 0) / townData.length;
          dataContext += `  ${town.toUpperCase()} (avg +${avgApp.toFixed(0)}% appreciation):\n`;
          for (const a of townData.slice(0, 5)) {
            dataContext += `    - ${a.address} | bought ${a.lastSoldDate?.slice(0, 4)} at $${a.lastSoldPrice?.toLocaleString()} | now asking $${a.currentAsk?.toLocaleString()} (+${a.appreciation.toFixed(1)}%)`;
            if (a.link) dataContext += ` | listing: ${a.link}`;
            dataContext += "\n";
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch listing data for agent:", err.message);
      dataContext = "\n\n[Note: Could not fetch live listings data. Respond based on general knowledge and ask the user to try again shortly.]\n";
    }

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
