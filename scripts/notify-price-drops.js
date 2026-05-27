// Hourly price-drop notifier for whitelisted towns
// Runs after notify-new-listings.js in the same GitHub Actions workflow.
// Compares current prices against a stored snapshot, emails on significant drops.

import { readFileSync, writeFileSync, existsSync } from "fs";
import { Resend } from "resend";
import {
  DIGEST_FETCH_ZIPS,
  DIGEST_TOWN_ORDER,
  PRICE_DROP_MIN_PCT,
  PRICE_DROP_MIN_ABS,
  getDisplayTown,
} from "../server/towns.js";

const API_KEY = process.env.RAPIDAPI_KEY;
const API_HOST = "us-real-estate-listings.p.rapidapi.com";
const RESEND_KEY = process.env.RESEND_API_KEY;
const NOTIFY_TO = (process.env.NOTIFY_EMAIL_TO || "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

const SNAPSHOT_PATH = new URL("../data/price-snapshot.json", import.meta.url).pathname;

function loadSnapshot() {
  try {
    if (!existsSync(SNAPSHOT_PATH)) return {};
    const raw = readFileSync(SNAPSHOT_PATH, "utf-8").trim();
    if (!raw || raw === "{}") return {};
    const data = JSON.parse(raw);
    return data?.listings || {};
  } catch {
    return {};
  }
}

function saveSnapshot(listings) {
  const data = { updatedAt: new Date().toISOString(), listings };
  writeFileSync(SNAPSHOT_PATH, JSON.stringify(data, null, 2) + "\n");
}

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

function hiResPhoto(listing) {
  const photos = listing.photos || [];
  if (photos.length > 0) {
    const first = photos[0];
    const url = first.href_xlarge || first.href_large || first.href || "";
    if (url) return upscaleUrl(url);
  }
  const url = listing.primary_photo?.href || "";
  return url ? upscaleUrl(url) : "";
}

function upscaleUrl(url) {
  return url
    .replace(/-s\.jpg$/i, "-w1024_h768.jpg")
    .replace(/-m\.jpg$/i, "-w1024_h768.jpg")
    .replace(/-w\d+_h\d+\.jpg$/i, "-w1024_h768.jpg")
    .replace(/-o\.jpg$/i, "-w1024_h768.jpg");
}

function fmtPrice(n) {
  if (!n) return "N/A";
  return "$" + n.toLocaleString("en-US");
}

function isSignificantDrop(oldPrice, newPrice) {
  if (newPrice >= oldPrice) return false;
  const dropAbs = oldPrice - newPrice;
  const dropPct = (dropAbs / oldPrice) * 100;
  const threshold = Math.max((PRICE_DROP_MIN_PCT / 100) * oldPrice, PRICE_DROP_MIN_ABS);
  return dropAbs >= threshold;
}

function buildEmailHTML(listing, town, oldPrice, newPrice) {
  const addr = listing.location?.address || {};
  const desc = listing.description || {};
  const photo = hiResPhoto(listing);
  const beds = desc.beds || "—";
  const baths = desc.baths || "—";
  const sqft = desc.sqft ? desc.sqft.toLocaleString("en-US") : "—";
  const dom = listing.list_date
    ? Math.max(0, Math.floor((Date.now() - new Date(listing.list_date).getTime()) / 86400000))
    : null;
  const listingUrl = listing.href || "#";
  const fullAddr = addr.line && addr.city
    ? `${addr.line}, ${addr.city}, ${addr.state_code} ${addr.postal_code}`
    : "Address unavailable";

  const dropAbs = oldPrice - newPrice;
  const dropPct = ((dropAbs / oldPrice) * 100).toFixed(1);

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
      Price Drop &mdash; ${town}
    </div>

    <div style="font-size:20px;color:#C9A96E;margin-bottom:16px;">
      ${fullAddr}
    </div>

    <div style="margin-bottom:16px;padding:16px 20px;background:rgba(196,107,94,0.08);border:1px solid rgba(196,107,94,0.2);border-radius:8px;">
      <div style="font-size:13px;color:rgba(245,239,232,0.5);margin-bottom:6px;">Price reduced</div>
      <div style="font-size:24px;color:#F5EFE0;">
        <span style="text-decoration:line-through;color:rgba(245,239,232,0.4);">${fmtPrice(oldPrice)}</span>
        <span style="margin:0 10px;color:rgba(245,239,232,0.3);">&rarr;</span>
        <span style="font-weight:700;">${fmtPrice(newPrice)}</span>
      </div>
      <div style="font-size:16px;color:#C46B5E;margin-top:6px;font-weight:600;">
        &minus;${dropPct}% (&minus;${fmtPrice(dropAbs)})
      </div>
    </div>

    <div style="font-size:14px;color:#F5EFE0;margin-bottom:6px;">
      ${beds} Beds &middot; ${baths} Baths &middot; ${sqft} Sqft
    </div>

    ${dom !== null ? `<div style="font-size:13px;color:rgba(245,239,232,0.5);margin-bottom:16px;">${dom} days on market</div>` : ""}

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

async function main() {
  if (!API_KEY) { console.error("RAPIDAPI_KEY not set"); process.exit(1); }
  if (!RESEND_KEY) { console.error("RESEND_API_KEY not set"); process.exit(1); }
  if (!NOTIFY_TO.length) { console.error("NOTIFY_EMAIL_TO not set"); process.exit(1); }

  console.log("Running price-drop notifier...");
  console.log(`Threshold: drops must exceed max(${PRICE_DROP_MIN_PCT}%, $${PRICE_DROP_MIN_ABS.toLocaleString()})`);

  const oldSnapshot = loadSnapshot();
  const isFirstRun = Object.keys(oldSnapshot).length === 0;
  if (isFirstRun) {
    console.log("First run — building initial snapshot, no alerts.");
  }

  const newSnapshot = {};
  const drops = []; // { listing, town, oldPrice, newPrice }

  for (const { zip, town: fetchTown } of DIGEST_FETCH_ZIPS) {
    console.log(`Fetching ${fetchTown} (${zip})...`);
    const listings = await fetchListingsForZip(zip);
    console.log(`  ${listings.length} listings`);

    for (const listing of listings) {
      const displayTown = getDisplayTown(listing, fetchTown);
      if (!displayTown) continue;

      const id = listing.property_id || listing.listing_id;
      if (!id) continue;

      const currentPrice = listing.list_price || 0;
      if (!currentPrice) continue;

      const addr = listing.location?.address || {};
      const address = addr.line || "unknown";

      // Update snapshot
      newSnapshot[id] = { price: currentPrice, address, town: displayTown };

      // Check for drop against old snapshot
      if (!isFirstRun && oldSnapshot[id]) {
        const oldPrice = oldSnapshot[id].price;
        if (isSignificantDrop(oldPrice, currentPrice)) {
          console.log(`  DROP: ${address} (${displayTown}) — ${fmtPrice(oldPrice)} → ${fmtPrice(currentPrice)}`);
          drops.push({ listing, town: displayTown, oldPrice, newPrice: currentPrice });
        }
      }
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  // Save updated snapshot
  saveSnapshot(newSnapshot);
  console.log(`Snapshot saved: ${Object.keys(newSnapshot).length} listings tracked.`);

  if (drops.length === 0) {
    console.log("No significant price drops detected.");
    return;
  }

  // Send emails
  const resend = new Resend(RESEND_KEY);
  let sent = 0;

  for (const { listing, town, oldPrice, newPrice } of drops) {
    const addr = listing.location?.address || {};
    const street = addr.line ? addr.line.split(",")[0].trim() : "Listing";
    const dropPct = (((oldPrice - newPrice) / oldPrice) * 100).toFixed(1);

    try {
      await resend.emails.send({
        from: "Westchester Portal <listings@domusco.com>",
        to: NOTIFY_TO,
        subject: `Price Drop in ${town}: ${street} down ${dropPct}% to ${fmtPrice(newPrice)}`,
        html: buildEmailHTML(listing, town, oldPrice, newPrice),
      });
      sent++;
    } catch (err) {
      console.error(`  Failed to send for ${street}:`, err.message);
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`Done: ${sent} price-drop email(s) sent.`);
}

main().catch((err) => {
  console.error("Price-drop notifier failed:", err);
  process.exit(1);
});
