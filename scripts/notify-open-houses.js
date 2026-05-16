// Open house notifier — weekly digest + hourly monitor
// Runs via GitHub Actions cron — uses RapidAPI + Resend.

import { readFileSync, writeFileSync, existsSync } from "fs";
import { Resend } from "resend";

const API_KEY = process.env.RAPIDAPI_KEY;
const API_HOST = "us-real-estate-listings.p.rapidapi.com";
const RESEND_KEY = process.env.RESEND_API_KEY;
const NOTIFY_TO = (process.env.NOTIFY_EMAIL_TO || "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

// Mode: "digest" for weekly Wednesday email, "monitor" for hourly new-OH alerts
const MODE = process.argv[2] || "monitor";

// Towns in ranked order: Pelham #1, Bronxville #2, Scarsdale #3, then alphabetical
const TOWNS = [
  { zip: "10803", town: "Pelham" },
  { zip: "10708", town: "Bronxville" },
  { zip: "10583", town: "Scarsdale" },
  { zip: "10502", town: "Ardsley" },
  { zip: "10506", town: "Bedford" },
  { zip: "10514", town: "Chappaqua" },
  { zip: "10522", town: "Dobbs Ferry" },
  { zip: "10706", town: "Hastings-on-Hudson" },
  { zip: "10533", town: "Irvington" },
  { zip: "10536", town: "Katonah" },
  { zip: "10538", town: "Larchmont" },
  { zip: "10552", town: "Mount Vernon" },
  { zip: "10570", town: "Pleasantville" },
  { zip: "10580", town: "Rye" },
  { zip: "10591", town: "Sleepy Hollow" },
  { zip: "10591", town: "Tarrytown" },
  { zip: "10707", town: "Tuckahoe" },
];

const SEEN_PATH = new URL("../data/seen-open-houses.json", import.meta.url).pathname;

function loadSeen() {
  try {
    if (!existsSync(SEEN_PATH)) return [];
    const raw = readFileSync(SEEN_PATH, "utf-8").trim();
    if (!raw || raw === "[]") return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveSeen(ids) {
  writeFileSync(SEEN_PATH, JSON.stringify(ids, null, 2) + "\n");
}

async function fetchOpenHousesForZip(zip) {
  // The API exposes open houses via the for-sale endpoint with open_house filter
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
  const listings = data?.listings || [];
  // Filter to listings that have open house data
  return listings.filter((l) => l.open_houses && l.open_houses.length > 0);
}

function fmtPrice(n) {
  if (!n) return "Price N/A";
  return "$" + n.toLocaleString("en-US");
}

function fmtDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function fmtTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function getOpenHouseId(listing, oh) {
  const id = listing.property_id || listing.listing_id;
  const start = oh.start_date || "";
  return `${id}_${start}`;
}

function isThisWeekend(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  // Find upcoming Saturday
  const dayOfWeek = now.getDay();
  const daysToSat = (6 - dayOfWeek + 7) % 7 || 7;
  const saturday = new Date(now);
  saturday.setDate(now.getDate() + daysToSat);
  saturday.setHours(0, 0, 0, 0);
  const sunday = new Date(saturday);
  sunday.setDate(saturday.getDate() + 1);
  sunday.setHours(23, 59, 59, 999);
  return d >= saturday && d <= sunday;
}

function buildAlertEmailHTML(listing, oh, town) {
  const addr = listing.location?.address || {};
  const desc = listing.description || {};
  const price = listing.list_price || 0;
  const photo = listing.primary_photo?.href || listing.photos?.[0]?.href || "";
  const fullAddr = addr.line && addr.city
    ? `${addr.line}, ${addr.city}, ${addr.state_code} ${addr.postal_code}`
    : "Address unavailable";
  const beds = desc.beds || "—";
  const baths = desc.baths || "—";
  const sqft = desc.sqft ? desc.sqft.toLocaleString("en-US") : "—";
  const listingUrl = listing.href || "#";
  const ohDate = fmtDate(oh.start_date);
  const ohStart = fmtTime(oh.start_date);
  const ohEnd = fmtTime(oh.end_date);

  const photoBlock = photo
    ? `<img src="${photo}" alt="${fullAddr}" style="width:100%;border-radius:8px 8px 0 0;display:block;" />`
    : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0a0d11;font-family:Georgia,serif;">
<div style="max-width:560px;margin:0 auto;background:#0F1318;border:1px solid rgba(201,169,110,0.25);border-radius:8px;overflow:hidden;">

  ${photoBlock}

  <div style="padding:24px 28px 28px;">
    <div style="font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:#C9A96E;margin-bottom:12px;">
      Open House Added — ${town}
    </div>

    <div style="font-size:20px;color:#C9A96E;margin-bottom:6px;">
      ${fullAddr}
    </div>

    <div style="font-size:28px;font-weight:700;color:#C9A96E;margin-bottom:16px;">
      ${fmtPrice(price)}
    </div>

    <div style="font-size:14px;color:#F5EFE0;margin-bottom:6px;">
      ${beds} Beds &middot; ${baths} Baths &middot; ${sqft} Sqft
    </div>

    <div style="font-size:14px;color:#F5EFE0;margin-bottom:16px;padding:12px 16px;background:rgba(201,169,110,0.08);border-radius:6px;border:1px solid rgba(201,169,110,0.15);">
      🏠 <strong style="color:#C9A96E;">${ohDate}</strong> &middot; ${ohStart} – ${ohEnd}
    </div>

    <a href="${listingUrl}" target="_blank" rel="noopener noreferrer"
      style="display:inline-block;padding:12px 28px;background:rgba(201,169,110,0.15);
        border:1px solid rgba(201,169,110,0.3);border-radius:24px;color:#C9A96E;
        text-decoration:none;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;
        font-family:Georgia,serif;">
      View Listing
    </a>
  </div>
</div>
</body>
</html>`;
}

function buildDigestEmailHTML(grouped) {
  let townBlocks = "";
  for (const { town, openHouses } of grouped) {
    if (openHouses.length === 0) continue;
    let rows = "";
    for (const { listing, oh } of openHouses) {
      const addr = listing.location?.address || {};
      const fullAddr = addr.line || "Address unavailable";
      const price = fmtPrice(listing.list_price);
      const ohStart = fmtTime(oh.start_date);
      const ohEnd = fmtTime(oh.end_date);
      const ohDay = fmtDate(oh.start_date);
      const desc = listing.description || {};
      const beds = desc.beds || "—";
      const baths = desc.baths || "—";
      const listingUrl = listing.href || "#";

      rows += `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid rgba(201,169,110,0.1);">
          <a href="${listingUrl}" style="color:#C9A96E;text-decoration:none;font-size:15px;font-weight:600;">${fullAddr}</a>
          <div style="font-size:13px;color:#F5EFE0;margin-top:4px;">${price} &middot; ${beds} Beds &middot; ${baths} Baths</div>
          <div style="font-size:12px;color:rgba(245,239,232,0.5);margin-top:3px;">${ohDay} &middot; ${ohStart} – ${ohEnd}</div>
        </td>
      </tr>`;
    }

    townBlocks += `
    <div style="margin-bottom:28px;">
      <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#C9A96E;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid rgba(201,169,110,0.2);">
        ${town} (${openHouses.length})
      </div>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
    </div>`;
  }

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0a0d11;font-family:Georgia,serif;">
<div style="max-width:600px;margin:0 auto;background:#0F1318;border:1px solid rgba(201,169,110,0.25);border-radius:8px;overflow:hidden;">
  <div style="padding:32px 28px;">
    <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(201,169,110,0.6);margin-bottom:8px;">
      Westchester Portal
    </div>
    <div style="font-size:24px;color:#C9A96E;margin-bottom:6px;font-weight:700;">
      This Weekend's Open Houses
    </div>
    <div style="font-size:13px;color:rgba(245,239,232,0.5);margin-bottom:28px;">
      17 Westchester Towns &middot; Curated for you
    </div>

    ${townBlocks}

    <div style="margin-top:24px;padding-top:16px;border-top:1px solid rgba(201,169,110,0.1);
      font-size:11px;color:rgba(245,239,232,0.3);line-height:1.5;">
      You're receiving this weekly digest because you're tracking 17 Westchester towns.
    </div>
  </div>
</div>
</body>
</html>`;
}

async function runDigest() {
  console.log("Running weekly open house digest...");
  const grouped = [];

  for (const { zip, town } of TOWNS) {
    console.log(`Fetching ${town} (${zip})...`);
    const listings = await fetchOpenHousesForZip(zip);
    const weekendOHs = [];

    for (const listing of listings) {
      for (const oh of listing.open_houses || []) {
        if (isThisWeekend(oh.start_date)) {
          weekendOHs.push({ listing, oh });
        }
      }
    }

    console.log(`  ${weekendOHs.length} weekend open houses`);
    grouped.push({ town, openHouses: weekendOHs });
    await new Promise((r) => setTimeout(r, 500));
  }

  const total = grouped.reduce((sum, g) => sum + g.openHouses.length, 0);
  if (total === 0) {
    console.log("No weekend open houses found. Skipping email.");
    return;
  }

  const resend = new Resend(RESEND_KEY);
  try {
    await resend.emails.send({
      from: "Westchester Portal <listings@domusco.com>",
      to: NOTIFY_TO,
      subject: `This Weekend's Open Houses — 17 Westchester Towns`,
      html: buildDigestEmailHTML(grouped),
    });
    console.log(`Digest sent: ${total} open houses across ${grouped.filter((g) => g.openHouses.length > 0).length} towns.`);
  } catch (err) {
    console.error("Failed to send digest:", err.message);
    process.exit(1);
  }
}

async function runMonitor() {
  console.log("Running hourly open house monitor...");
  const seenSet = new Set(loadSeen());
  const allCurrentIds = [];
  const resend = new Resend(RESEND_KEY);
  let sent = 0;

  for (const { zip, town } of TOWNS) {
    console.log(`Fetching ${town} (${zip})...`);
    const listings = await fetchOpenHousesForZip(zip);
    console.log(`  ${listings.length} listings with open houses`);

    for (const listing of listings) {
      for (const oh of listing.open_houses || []) {
        const ohId = getOpenHouseId(listing, oh);
        allCurrentIds.push(ohId);

        if (seenSet.has(ohId)) continue;

        const addr = listing.location?.address || {};
        const street = addr.line ? addr.line.split(",")[0].trim() : "New Listing";
        console.log(`  NEW OH: ${street}, ${town}`);

        try {
          await resend.emails.send({
            from: "Westchester Portal <listings@domusco.com>",
            to: NOTIFY_TO,
            subject: `New Open House Added: ${street}, ${town}`,
            html: buildAlertEmailHTML(listing, oh, town),
          });
          sent++;
        } catch (err) {
          console.error(`  Failed to send for ${ohId}:`, err.message);
        }

        await new Promise((r) => setTimeout(r, 300));
      }
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  saveSeen(allCurrentIds);
  console.log(`Done: ${sent} new open house email(s) sent.`);
}

async function main() {
  if (!API_KEY) { console.error("RAPIDAPI_KEY not set"); process.exit(1); }
  if (!RESEND_KEY) { console.error("RESEND_API_KEY not set"); process.exit(1); }
  if (!NOTIFY_TO.length) { console.error("NOTIFY_EMAIL_TO not set"); process.exit(1); }

  if (MODE === "digest") {
    await runDigest();
  } else {
    await runMonitor();
  }
}

main().catch((err) => {
  console.error("Open house notifier failed:", err);
  process.exit(1);
});
