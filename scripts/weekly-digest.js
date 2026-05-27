// Weekly market snapshot digest — 8am Sunday via GitHub Actions
// Fetches listings for whitelisted towns, builds per-town sections, sends via Resend.

import { Resend } from "resend";
import {
  DIGEST_TOWN_ORDER,
  DIGEST_FETCH_ZIPS,
  getDisplayTown,
} from "../server/towns.js";

const API_KEY = process.env.RAPIDAPI_KEY;
const API_HOST = "us-real-estate-listings.p.rapidapi.com";
const RESEND_KEY = process.env.RESEND_API_KEY;
const NOTIFY_TO = (process.env.NOTIFY_EMAIL_TO || "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

async function fetchListingsForZip(zip) {
  const res = await fetch(
    `https://${API_HOST}/for-sale?location=${zip}&offset=0&limit=50&sort=newest&status=for_sale,coming_soon`,
    {
      headers: {
        "x-rapidapi-key": API_KEY,
        "x-rapidapi-host": API_HOST,
      },
    }
  );
  if (!res.ok) {
    console.error(`API error for ${zip}: ${res.status}`);
    return [];
  }
  const data = await res.json();
  return data?.listings || [];
}

function getWeekendRange() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 6=Sat
  let saturday, sunday;
  if (day === 0) {
    // Sunday: "this weekend" = today
    saturday = new Date(now);
    saturday.setHours(0, 0, 0, 0);
    sunday = new Date(now);
    sunday.setHours(23, 59, 59, 999);
  } else if (day === 6) {
    saturday = new Date(now);
    saturday.setHours(0, 0, 0, 0);
    sunday = new Date(now);
    sunday.setDate(now.getDate() + 1);
    sunday.setHours(23, 59, 59, 999);
  } else {
    const daysToSat = 6 - day;
    saturday = new Date(now);
    saturday.setDate(now.getDate() + daysToSat);
    saturday.setHours(0, 0, 0, 0);
    sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);
    sunday.setHours(23, 59, 59, 999);
  }
  return { saturday, sunday };
}

function isThisWeekend(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const { saturday, sunday } = getWeekendRange();
  return d >= saturday && d <= sunday;
}

function fmtPrice(n) {
  if (!n) return "N/A";
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  return `$${Math.round(n / 1000)}K`;
}

function fmtTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}

function fmtDay(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

// ── Email HTML builders ────────────────────────────────────────────

function buildTownBlock(section) {
  const { town, activeCount, avgDom, priceRange, newThisWeek, priceChanges, openHouses } = section;
  const hasActivity = newThisWeek.length > 0 || priceChanges.length > 0 || openHouses.length > 0;

  let content = `
    <div style="font-size:13px;color:rgba(255,255,255,0.5);margin-bottom:16px;">
      ${activeCount} active &middot; Avg ${avgDom != null ? avgDom : "&mdash;"} DOM &middot; ${priceRange}
    </div>`;

  if (!hasActivity) {
    content += `<div style="font-size:14px;color:rgba(255,255,255,0.3);font-style:italic;">Quiet week</div>`;
  }

  // New this week
  if (newThisWeek.length > 0) {
    content += `
    <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#C9A96E;margin:16px 0 10px;">
      &#x1F195; New This Week (${newThisWeek.length})
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px;">`;
    for (const l of newThisWeek) {
      const addr = l.location?.address || {};
      const desc = l.description || {};
      const address = addr.line || "Address unavailable";
      const dom = l.list_date
        ? Math.max(0, Math.floor((Date.now() - new Date(l.list_date).getTime()) / 86400000))
        : null;
      const url = l.href || "#";
      content += `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
          <a href="${url}" style="color:#E8E0D5;text-decoration:none;font-size:14px;">${address}</a>
          <div style="font-size:13px;color:rgba(255,255,255,0.5);margin-top:4px;">
            ${fmtPrice(l.list_price)} &middot; ${desc.beds || "&mdash;"} bd &middot; ${desc.baths || "&mdash;"} ba${dom !== null ? ` &middot; ${dom} days` : ""}
          </div>
        </td>
      </tr>`;
    }
    content += `</table>`;
  }

  // Price changes
  if (priceChanges.length > 0) {
    content += `
    <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#C9A96E;margin:16px 0 10px;">
      &#x1F4C9; Price Changes (${priceChanges.length})
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px;">`;
    for (const l of priceChanges) {
      const addr = l.location?.address || {};
      const address = addr.line || "Address unavailable";
      const currentPrice = l.list_price || 0;
      const originalPrice = currentPrice + (l.price_reduced_amount || 0);
      const pctDrop = originalPrice > 0 ? ((originalPrice - currentPrice) / originalPrice) * 100 : 0;
      if (pctDrop > 50) continue; // data error
      const url = l.href || "#";
      content += `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
          <a href="${url}" style="color:#E8E0D5;text-decoration:none;font-size:14px;">${address}</a>
          <div style="font-size:13px;color:rgba(255,255,255,0.5);margin-top:4px;">
            <span style="text-decoration:line-through;color:rgba(255,255,255,0.3);">${fmtPrice(originalPrice)}</span>
            <span style="margin:0 6px;">&rarr;</span>
            <span style="color:#E8E0D5;">${fmtPrice(currentPrice)}</span>
            <span style="color:#C46B5E;margin-left:8px;">(&minus;${pctDrop.toFixed(1)}%)</span>
          </div>
        </td>
      </tr>`;
    }
    content += `</table>`;
  }

  // Open houses
  if (openHouses.length > 0) {
    content += `
    <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#C9A96E;margin:16px 0 10px;">
      &#x1F3E0; Open Houses This Weekend (${openHouses.length})
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px;">`;
    for (const { listing: l, oh } of openHouses) {
      const addr = l.location?.address || {};
      const address = addr.line || "Address unavailable";
      const url = l.href || "#";
      content += `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
          <a href="${url}" style="color:#E8E0D5;text-decoration:none;font-size:14px;">${address}</a>
          <div style="font-size:13px;color:rgba(255,255,255,0.5);margin-top:4px;">
            ${fmtDay(oh.start_date)} &middot; ${fmtTime(oh.start_date)} &ndash; ${fmtTime(oh.end_date)}
          </div>
        </td>
      </tr>`;
    }
    content += `</table>`;
  }

  return `
  <tr>
    <td style="padding:0 0 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tr>
          <td style="padding:24px 28px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;">
            <h2 style="margin:0 0 12px;font-size:22px;font-weight:400;color:#C9A96E;font-family:Georgia,serif;">
              ${town}
            </h2>
            ${content}
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function buildEmailHTML(townSections) {
  const dateStr = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  });

  let townBlocks = "";
  for (const section of townSections) {
    townBlocks += buildTownBlock(section);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#0A0D11;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#0A0D11;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" style="border-collapse:collapse;max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding:0 0 32px;text-align:center;">
              <div style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#C9A96E;margin-bottom:12px;">
                Weekly Market Snapshot
              </div>
              <h1 style="margin:0;font-size:32px;font-weight:400;color:#F5EFE8;font-family:Georgia,serif;">
                Westchester Portal
              </h1>
              <div style="margin-top:8px;font-size:14px;color:rgba(255,255,255,0.35);font-style:italic;">
                ${dateStr} &middot; ${DIGEST_TOWN_ORDER.length} towns
              </div>
              <div style="width:60px;height:1px;background:rgba(201,169,110,0.4);margin:24px auto 0;"></div>
            </td>
          </tr>

          <!-- Town Sections -->
          ${townBlocks}

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0;text-align:center;border-top:1px solid rgba(255,255,255,0.06);">
              <div style="font-size:13px;color:rgba(255,255,255,0.25);font-family:Georgia,serif;">
                Curated by Domus &middot; Westchester Portal
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  if (!API_KEY) { console.error("RAPIDAPI_KEY not set"); process.exit(1); }
  if (!RESEND_KEY) { console.error("RESEND_API_KEY not set"); process.exit(1); }
  if (!NOTIFY_TO.length) { console.error("NOTIFY_EMAIL_TO not set"); process.exit(1); }

  console.log(`Building weekly digest for ${DIGEST_TOWN_ORDER.join(", ")}...`);
  console.log(`Recipients: ${NOTIFY_TO.join(", ")}`);

  // Fetch listings and group by display town
  const townListings = {};
  for (const t of DIGEST_TOWN_ORDER) townListings[t] = [];

  for (const { zip, town: fetchTown } of DIGEST_FETCH_ZIPS) {
    console.log(`Fetching ${fetchTown} (${zip})...`);
    const listings = await fetchListingsForZip(zip);
    console.log(`  ${listings.length} listings`);

    for (const listing of listings) {
      const displayTown = getDisplayTown(listing, fetchTown);
      if (!displayTown) continue;
      if (!townListings[displayTown]) townListings[displayTown] = [];
      townListings[displayTown].push(listing);
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  // Build per-town sections
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const townSections = [];
  for (const town of DIGEST_TOWN_ORDER) {
    const listings = townListings[town] || [];

    // Stats
    const doms = listings
      .map((l) =>
        l.list_date
          ? Math.max(0, Math.floor((Date.now() - new Date(l.list_date).getTime()) / 86400000))
          : null
      )
      .filter((d) => d !== null);
    const avgDom = doms.length > 0 ? Math.round(doms.reduce((s, v) => s + v, 0) / doms.length) : null;
    const prices = listings.map((l) => l.list_price).filter(Boolean);
    const priceRange =
      prices.length > 0
        ? `${fmtPrice(Math.min(...prices))} &ndash; ${fmtPrice(Math.max(...prices))}`
        : "&mdash;";

    // New this week
    const newThisWeek = listings.filter((l) => l.list_date && new Date(l.list_date) >= sevenDaysAgo);

    // Price changes (filter out >50% drops as data errors)
    const priceChanges = listings.filter((l) => {
      if (!l.price_reduced_amount || l.price_reduced_amount <= 0) return false;
      const currentPrice = l.list_price || 0;
      const originalPrice = currentPrice + l.price_reduced_amount;
      const pctDrop = originalPrice > 0 ? ((originalPrice - currentPrice) / originalPrice) * 100 : 0;
      return pctDrop <= 50;
    });

    // Open houses this weekend
    const openHouses = [];
    for (const l of listings) {
      for (const oh of l.open_houses || []) {
        if (isThisWeekend(oh.start_date)) {
          openHouses.push({ listing: l, oh });
        }
      }
    }

    console.log(
      `  ${town}: ${listings.length} active, ${newThisWeek.length} new, ${priceChanges.length} price changes, ${openHouses.length} open houses`
    );

    townSections.push({ town, activeCount: listings.length, avgDom, priceRange, newThisWeek, priceChanges, openHouses });
  }

  // Build and send
  const html = buildEmailHTML(townSections);
  const resend = new Resend(RESEND_KEY);

  try {
    await resend.emails.send({
      from: "Westchester Portal <listings@domusco.com>",
      to: NOTIFY_TO,
      subject: `Weekly Market Snapshot — ${DIGEST_TOWN_ORDER.join(", ")}`,
      html,
    });
    console.log("Digest sent.");
  } catch (err) {
    console.error("Failed to send digest:", err.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Weekly digest failed:", err);
  process.exit(1);
});
