import Anthropic from "@anthropic-ai/sdk";

const API_KEY = process.env.RAPIDAPI_KEY || process.env.VITE_RAPIDAPI_KEY;
const API_HOST = "us-real-estate-listings.p.rapidapi.com";

const ZIP_CODES = {
  Pelham: "10803",
  Bronxville: "10708",
  Scarsdale: "10583",
  Ardsley: "10502",
  Bedford: "10506",
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

const SYSTEM_PROMPT = `You are Ali's personal real estate agent for Westchester County. You help her find homes worth visiting and plan efficient open house routes.

Ali's situation:
- Currently lives at Hamilton Cove in Weehawken, NJ with her husband Ed
- Planning to eventually buy in Westchester County
- Town priority ranking: Pelham first, Bronxville second, Scarsdale third, then the other 14 towns
- Default starting location for any route planning: Hamilton Cove, Weehawken NJ

Ali's deal-breakers (FLAG, do not filter out, she still wants to see these properties):
- No primary/master bathroom
- No yard or extremely small yard
- Inadequate primary bedroom closet space

When showing properties, tag each one with quick status indicators. For example:
🟢 12 Oak Lane, Pelham — $1.8M, 4 bed, 3 bath. Primary bath ✓, yard ✓, closet ✓
🟡 8 Elm Street, Bronxville — $2.1M, 4 bed, 2 bath. Primary bath unclear in listing, small yard, closet unclear

Format every property address as a clickable Google Maps link using markdown: [123 Main St, Pelham NY](https://www.google.com/maps/search/?api=1&query=123+Main+St+Pelham+NY).

Communication style: casual, direct, no em dashes (use commas, periods, or parentheses instead). Sound like a knowledgeable friend, not a corporate realtor.

ROUTE FORMAT (strict):
When she asks to plan a route, use EXACTLY this format. No deviations.
1. Sort stops chronologically by open house start time. Earliest first. Never list a later time before an earlier time.
2. Each stop uses this format:
   1. **12:00pm** — [123 Address St, Town NY](https://www.google.com/maps/search/?api=1&query=123+Address+St+Town+NY) — $1.8M, 4 bed, 3 bath 🟢
   2. **1:00pm** — [456 Next St, Town NY](https://www.google.com/maps/search/?api=1&query=456+Next+St+Town+NY) — $2.1M, 3 bed, 2 bath 🟡
3. Do NOT include "Previous Location → Next Location" arrows. The order of the list IS the route.
4. Do NOT add headers like "SUNDAY MAY 17 ROUTE" unless she asks. Just the numbered list.
5. Every address MUST be a fully formed markdown link to Google Maps. No plain text addresses.
6. After the list, add one optional line summary like "All Pelham, then Bronxville, ending in Scarsdale" so she knows the geographic arc.

Always verify your output renders cleanly. If you write a markdown link, make sure both the opening bracket and closing parenthesis are present and properly formed.

Be discriminating but not gatekeeping. If something is borderline, show it and flag the issue.`;

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
      const satStr = weekend.saturday.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      const sunStr = weekend.sunday.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

      dataContext = `\n\n--- CURRENT LISTINGS DATA (as of ${new Date().toLocaleDateString()}) ---\n`;
      dataContext += `Total active listings across 17 towns: ${allListings.length}\n\n`;

      if (openHouses.length > 0) {
        dataContext += `OPEN HOUSES THIS WEEKEND (${satStr} - ${sunStr}):\n`;
        openHouses.forEach((l) => {
          dataContext += `- ${l.address} (${l.town}) - $${l.price?.toLocaleString()}, ${l.beds}bd/${l.baths}ba`;
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
          if (l.openHouses?.length > 0) dataContext += " | HAS OPEN HOUSE";
          dataContext += "\n";
        });
        dataContext += "\n";
      }
    } catch (err) {
      console.error("Failed to fetch listing data for agent:", err.message);
      dataContext = "\n\n[Note: Could not fetch live listings data. Respond based on general knowledge and ask the user to try again shortly.]\n";
    }

    const client = new Anthropic({ apiKey: anthropicKey });
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
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
