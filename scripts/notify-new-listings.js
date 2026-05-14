// Hourly new-listing notifier for watched ZIPs
// Runs via GitHub Actions cron — uses RapidAPI + Resend, no new services.

import { readFileSync, writeFileSync, existsSync } from "fs";
import { Resend } from "resend";

const API_KEY = process.env.RAPIDAPI_KEY;
const API_HOST = "us-real-estate-listings.p.rapidapi.com";
const RESEND_KEY = process.env.RESEND_API_KEY;
const NOTIFY_TO = (process.env.NOTIFY_EMAIL_TO || "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

const WATCH_ZIPS = [
  { zip: "10708", town: "Bronxville" },
  { zip: "10803", town: "Pelham" },
  { zip: "10533", town: "Irvington" },
];

const SEEN_PATH = new URL("../data/seen-listings.json", import.meta.url).pathname;

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

async function fetchListingsForZip(zip) {
  const res = await fetch(
    `https://${API_HOST}/for-sale?location=${zip}&offset=0&limit=20`,
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

function fmtPrice(n) {
  if (!n) return "Price N/A";
  return "$" + n.toLocaleString("en-US");
}

function streetFromAddress(line) {
  if (!line) return "New Listing";
  return line.split(",")[0].trim();
}

function buildEmailHTML(listing, town) {
  const addr = listing.location?.address || {};
  const desc = listing.description || {};
  const price = listing.list_price || 0;
  const photo = listing.primary_photo?.href || listing.photos?.[0]?.href || "";
  const beds = desc.beds || "—";
  const baths = desc.baths || "—";
  const sqft = desc.sqft ? desc.sqft.toLocaleString("en-US") : "—";
  const dom = listing.list_date
    ? Math.max(0, Math.floor((Date.now() - new Date(listing.list_date).getTime()) / 86400000))
    : null;
  const agent = listing.advertisers?.find((a) => a.type === "seller");
  const agentName = agent?.name || "—";
  const brokerage = listing.branding?.[0]?.name || agent?.office?.name || "—";
  const listingUrl = listing.href || "#";
  const fullAddr = addr.line && addr.city
    ? `${addr.line}, ${addr.city}, ${addr.state_code} ${addr.postal_code}`
    : "Address unavailable";

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
      New in ${town}
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

    ${dom !== null ? `<div style="font-size:13px;color:rgba(245,239,232,0.5);margin-bottom:16px;">${dom} days on market</div>` : ""}

    <div style="border-top:1px solid rgba(201,169,110,0.15);padding-top:14px;margin-bottom:16px;">
      <div style="font-size:13px;color:rgba(245,239,232,0.6);">
        ${agentName} &middot; ${brokerage}
      </div>
    </div>

    <a href="${listingUrl}" target="_blank" rel="noopener noreferrer"
      style="display:inline-block;padding:12px 28px;background:rgba(201,169,110,0.15);
        border:1px solid rgba(201,169,110,0.3);border-radius:24px;color:#C9A96E;
        text-decoration:none;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;
        font-family:Georgia,serif;">
      View Listing
    </a>

    <div style="margin-top:24px;padding-top:16px;border-top:1px solid rgba(201,169,110,0.1);
      font-size:11px;color:rgba(245,239,232,0.3);line-height:1.5;">
      You're getting this because you're tracking Bronxville, Pelham, and Irvington.
    </div>
  </div>
</div>
</body>
</html>`;
}

async function main() {
  if (!API_KEY) { console.error("RAPIDAPI_KEY not set"); process.exit(1); }
  if (!RESEND_KEY) { console.error("RESEND_API_KEY not set"); process.exit(1); }
  if (!NOTIFY_TO.length) { console.error("NOTIFY_EMAIL_TO not set"); process.exit(1); }

  const seenSet = new Set(loadSeen());
  const isFirstRun = seenSet.size === 0;
  const allCurrentIds = [];
  const resend = new Resend(RESEND_KEY);
  let sent = 0;

  for (const { zip, town } of WATCH_ZIPS) {
    console.log(`Fetching ${town} (${zip})...`);
    const listings = await fetchListingsForZip(zip);
    console.log(`  ${listings.length} listings found`);

    for (const listing of listings) {
      const id = listing.property_id || listing.listing_id;
      if (!id) continue;
      allCurrentIds.push(id);

      if (seenSet.has(id)) continue;

      // First run: just record, don't email
      if (isFirstRun) continue;

      const addr = listing.location?.address || {};
      const street = streetFromAddress(addr.line);
      const price = fmtPrice(listing.list_price);

      console.log(`  NEW: ${street} — ${price}`);

      try {
        await resend.emails.send({
          from: "Westchester Portal <onboarding@resend.dev>",
          to: NOTIFY_TO,
          subject: `New in ${town}: ${price} on ${street}`,
          html: buildEmailHTML(listing, town),
        });
        sent++;
      } catch (err) {
        console.error(`  Failed to send for ${id}:`, err.message);
      }

      // Small delay between sends
      await new Promise((r) => setTimeout(r, 300));
    }

    // Rate-limit between ZIP fetches
    await new Promise((r) => setTimeout(r, 500));
  }

  saveSeen(allCurrentIds);

  if (isFirstRun) {
    console.log(`First run — saved ${allCurrentIds.length} listings, no emails sent.`);
  } else {
    console.log(`Done: ${sent} new listing email(s) sent.`);
  }
}

main().catch((err) => {
  console.error("Notifier failed:", err);
  process.exit(1);
});
