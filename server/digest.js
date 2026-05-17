// Weekly digest job — fetches listing data and sends emails via Resend
// Called by: node server/digest.js (Render cron) or GET /api/send-digest?key=SECRET

import "dotenv/config";
import { Resend } from "resend";
import { getSubscribers } from "./db.js";
import { buildDigestEmail } from "./email-template.js";

const API_KEY = process.env.VITE_RAPIDAPI_KEY;
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

async function fetchTownData(townName) {
  const zip = ZIP_CODES[townName];
  if (!zip || !API_KEY) return { active: [], sold: [] };

  const headers = {
    "x-rapidapi-key": API_KEY,
    "x-rapidapi-host": API_HOST,
  };

  const res = await fetch(
    `https://${API_HOST}/for-sale?location=${zip}&offset=0&limit=42`,
    { headers }
  );

  if (!res.ok) return { active: [], sold: [] };
  const data = await res.json();
  const listings = data?.listings || [];

  // Active listings (first 12)
  const active = listings.slice(0, 12).map((p) => {
    const address = p.location?.address || {};
    const desc = p.description || {};
    return {
      address:
        address.line && address.city
          ? `${address.line}, ${address.city}`
          : "Address unavailable",
      price: p.list_price || 0,
      beds: desc.beds || null,
      baths: desc.baths || null,
      sqft: desc.sqft || null,
      daysOnMarket: p.list_date
        ? Math.max(
            0,
            Math.floor(
              (Date.now() - new Date(p.list_date).getTime()) / 86400000
            )
          )
        : null,
    };
  });

  // Brokerage activity from all listings
  const brokerageCounts = {};
  const agentCounts = {};
  for (const p of listings) {
    const brokeName = p.branding?.[0]?.name || p.advertisers?.find((a) => a.type === "seller")?.office?.name;
    if (brokeName) {
      brokerageCounts[brokeName] = (brokerageCounts[brokeName] || 0) + 1;
    }
    const agent = p.advertisers?.find((a) => a.type === "seller");
    if (agent?.name && brokeName) {
      const key = agent.name;
      if (!agentCounts[key]) agentCounts[key] = { name: agent.name, brokerage: brokeName, count: 0 };
      agentCounts[key].count++;
    }
  }
  const brokerages = Object.entries(brokerageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));
  const topAgents = Object.values(agentCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .filter((a) => a.count >= 2);

  // Sold history
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 10);

  const sold = listings
    .filter((p) => {
      if (!p.last_sold_date || !p.last_sold_price || !p.list_price)
        return false;
      if (new Date(p.last_sold_date) < cutoff) return false;
      const ratio = p.last_sold_price / p.list_price;
      if (ratio > 3 || ratio < 1 / 3) return false;
      return true;
    })
    .sort((a, b) => new Date(b.last_sold_date) - new Date(a.last_sold_date))
    .slice(0, 6)
    .map((p) => {
      const address = p.location?.address || {};
      const desc = p.description || {};
      const currentListPrice = p.list_price || 0;
      const lastSalePrice = p.last_sold_price || 0;
      const rawApp =
        currentListPrice && lastSalePrice
          ? ((currentListPrice - lastSalePrice) / lastSalePrice) * 100
          : null;
      const appreciation =
        rawApp != null ? Math.max(-100, Math.min(100, rawApp)) : null;
      const isNewConstruction =
        p.flags?.is_new_construction === true ||
        p.tags?.includes("new_construction") ||
        (desc.year_built &&
          desc.year_built >= new Date().getFullYear() - 2);

      return {
        address:
          address.line && address.city
            ? `${address.line}, ${address.city}`
            : "Address unavailable",
        lastSalePrice,
        currentListPrice,
        appreciation,
        isNewConstruction,
      };
    });

  return { active, sold, brokerages, topAgents };
}

async function fetchMarketHeat() {
  if (!API_KEY) return { soldOverAsk: [], townHeat: [], quickSales: [], priceReductions: [] };

  const headers = {
    "x-rapidapi-key": API_KEY,
    "x-rapidapi-host": API_HOST,
  };

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const allSoldOverAsk = [];
  const allQuickSales = [];
  const allPriceReductions = [];
  const townOverUnder = {}; // { town: [pctOverAsk, ...] }

  // Priority order for tie-breaking within heat tiers
  const priorityTowns = ["Pelham", "Bronxville", "Scarsdale"];

  for (const [townName, zip] of Object.entries(ZIP_CODES)) {
    try {
      // Fetch recently sold
      const soldRes = await fetch(
        `https://${API_HOST}/for-sale?location=${zip}&offset=0&limit=50&sort=newest&status=sold`,
        { headers }
      );
      let soldListings = [];
      if (soldRes.ok) {
        const soldData = await soldRes.json();
        soldListings = soldData?.listings || [];
      }

      // Filter to last 7 days
      const recentSold = soldListings.filter((p) => {
        const soldDate = p.last_sold_date || p.sold_date;
        if (!soldDate) return false;
        return new Date(soldDate) >= sevenDaysAgo;
      });

      for (const p of recentSold) {
        const askPrice = p.list_price || 0;
        const soldPrice = p.last_sold_price || p.sold_price || 0;
        if (!askPrice || !soldPrice) continue;

        const pctOver = ((soldPrice - askPrice) / askPrice) * 100;
        const address = p.location?.address || {};
        const addr = address.line && address.city
          ? `${address.line}, ${address.city}`
          : "Address unavailable";
        const dom = p.list_date
          ? Math.max(0, Math.floor((new Date(p.last_sold_date || p.sold_date).getTime() - new Date(p.list_date).getTime()) / 86400000))
          : null;

        if (!townOverUnder[townName]) townOverUnder[townName] = [];
        townOverUnder[townName].push(pctOver);

        if (pctOver > 0) {
          allSoldOverAsk.push({ address: addr, town: townName, askPrice, soldPrice, pctOver, dom });
        }

        if (dom !== null && dom < 7) {
          allQuickSales.push({ address: addr, town: townName, dom, soldPrice });
        }
      }

      // Fetch active listings for price reductions
      const activeRes = await fetch(
        `https://${API_HOST}/for-sale?location=${zip}&offset=0&limit=50&sort=newest&status=for_sale`,
        { headers }
      );
      if (activeRes.ok) {
        const activeData = await activeRes.json();
        const activeListings = activeData?.listings || [];

        for (const p of activeListings) {
          // Check for price reduction (price_reduced_amount or comparing list_price vs original)
          const currentPrice = p.list_price || 0;
          const originalPrice = p.original_list_price || p.price_reduced_amount
            ? currentPrice + (p.price_reduced_amount || 0)
            : null;

          if (originalPrice && originalPrice > currentPrice) {
            const pctDrop = ((originalPrice - currentPrice) / originalPrice) * 100;
            // Filter out drops over 50% as likely data errors
            if (pctDrop > 50) continue;
            // Only include recent reductions (listed or reduced in last 7 days)
            const listDate = p.list_date ? new Date(p.list_date) : null;
            const isRecent = listDate && listDate >= sevenDaysAgo;
            const hasReduction = p.price_reduced_amount && p.price_reduced_amount > 0;

            if (isRecent || hasReduction) {
              const address = p.location?.address || {};
              const addr = address.line && address.city
                ? `${address.line}, ${address.city}`
                : "Address unavailable";
              allPriceReductions.push({ address: addr, town: townName, originalPrice, currentPrice, pctDrop });
            }
          }
        }
      }

      await new Promise((r) => setTimeout(r, 400));
    } catch (err) {
      console.error(`Market heat fetch error for ${townName}:`, err.message);
    }
  }

  // Sort sold over ask by highest % over first
  allSoldOverAsk.sort((a, b) => b.pctOver - a.pctOver);

  // Town heat: average over/under by town, sorted hottest first with priority tie-breaking
  const townHeat = Object.entries(townOverUnder)
    .map(([town, pcts]) => ({
      town,
      avgOverUnder: pcts.reduce((s, v) => s + v, 0) / pcts.length,
      count: pcts.length,
    }))
    .sort((a, b) => {
      const diff = b.avgOverUnder - a.avgOverUnder;
      if (Math.abs(diff) < 0.5) {
        // Within same tier, priority towns first
        const aPri = priorityTowns.indexOf(a.town);
        const bPri = priorityTowns.indexOf(b.town);
        const aRank = aPri >= 0 ? aPri : 100;
        const bRank = bPri >= 0 ? bPri : 100;
        return aRank - bRank;
      }
      return diff;
    });

  // Quick sales sorted by fewest DOM
  allQuickSales.sort((a, b) => a.dom - b.dom);

  // Price reductions sorted by largest % drop
  allPriceReductions.sort((a, b) => b.pctDrop - a.pctDrop);

  return {
    soldOverAsk: allSoldOverAsk.slice(0, 10),
    townHeat,
    quickSales: allQuickSales.slice(0, 8),
    priceReductions: allPriceReductions.slice(0, 8),
  };
}

export async function sendDigests() {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error("RESEND_API_KEY not set — skipping digest");
    return { sent: 0, errors: 0 };
  }

  const resend = new Resend(resendKey);
  const subscribers = await getSubscribers(); // { email: [town1, town2, ...] }
  const emails = Object.keys(subscribers);

  if (emails.length === 0) {
    console.log("No subscribers — nothing to send");
    return { sent: 0, errors: 0 };
  }

  // Cache town data so we don't re-fetch for each subscriber
  const townCache = {};
  const allTowns = [...new Set(Object.values(subscribers).flat())];

  console.log(
    `Fetching data for ${allTowns.length} towns, ${emails.length} subscribers...`
  );

  // Fetch market heat data (sold over ask, quick sales, price reductions)
  console.log("Fetching market heat data...");
  let marketHeat = { soldOverAsk: [], townHeat: [], quickSales: [], priceReductions: [] };
  try {
    marketHeat = await fetchMarketHeat();
    console.log(`Market heat: ${marketHeat.soldOverAsk.length} over-ask, ${marketHeat.quickSales.length} quick sales, ${marketHeat.priceReductions.length} reductions`);
  } catch (err) {
    console.error("Market heat fetch failed:", err.message);
  }

  for (const town of allTowns) {
    try {
      townCache[town] = await fetchTownData(town);
      // Small delay to respect rate limits
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      console.error(`Failed to fetch ${town}:`, err.message);
      townCache[town] = { active: [], sold: [] };
    }
  }

  let sent = 0;
  let errors = 0;

  for (const email of emails) {
    const towns = subscribers[email];
    const townDataMap = {};
    for (const town of towns) {
      if (townCache[town]) townDataMap[town] = townCache[town];
    }

    if (Object.keys(townDataMap).length === 0) continue;

    const html = buildDigestEmail(email, townDataMap, marketHeat);

    try {
      await resend.emails.send({
        from: "Domus Digest <onboarding@resend.dev>",
        to: email,
        subject: `Westchester Market Digest — ${towns.join(", ")}`,
        html,
      });
      sent++;
      console.log(`Sent digest to ${email} (${towns.length} towns)`);
    } catch (err) {
      errors++;
      console.error(`Failed to send to ${email}:`, err.message);
    }
  }

  console.log(`Digest complete: ${sent} sent, ${errors} errors`);
  return { sent, errors };
}

// If run directly as cron job: node server/digest.js
const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith("digest.js") ||
    process.argv[1].endsWith("digest"));

if (isDirectRun) {
  sendDigests()
    .then((result) => {
      console.log("Done:", result);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Digest failed:", err);
      process.exit(1);
    });
}
