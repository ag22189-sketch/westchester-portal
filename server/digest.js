// Weekly digest job — fetches listing data and sends emails via Resend
// Called by: node server/digest.js (Render cron) or GET /api/send-digest?key=SECRET

import "dotenv/config";
import { Resend } from "resend";
import { getSubscribers } from "./db.js";
import { buildDigestEmail } from "./email-template.js";

const API_KEY = process.env.VITE_RAPIDAPI_KEY;
const API_HOST = "us-real-estate-listings.p.rapidapi.com";

const ZIP_CODES = {
  Irvington: "10533",
  "Hastings-on-Hudson": "10706",
  "Dobbs Ferry": "10522",
  Tarrytown: "10591",
  "Sleepy Hollow": "10591",
  Ardsley: "10502",
  Chappaqua: "10514",
  Bedford: "10506",
  Katonah: "10536",
  Bronxville: "10708",
  Scarsdale: "10583",
  Larchmont: "10538",
  Rye: "10580",
  Pleasantville: "10570",
  Pelham: "10803",
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

    const html = buildDigestEmail(email, townDataMap);

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
