const API_KEY = import.meta.env.VITE_RAPIDAPI_KEY;
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

export function getZipForTown(townName) {
  return ZIP_CODES[townName] || null;
}

export async function fetchListings(townName) {
  const zip = getZipForTown(townName);
  if (!zip) return [];
  if (!API_KEY || API_KEY === "your_rapidapi_key_here") {
    console.warn("VITE_RAPIDAPI_KEY not set — using empty listings");
    return [];
  }

  try {
    const res = await fetch(
      `https://${API_HOST}/for-sale?location=${zip}&offset=0&limit=12`,
      {
        method: "GET",
        headers: {
          "x-rapidapi-key": API_KEY,
          "x-rapidapi-host": API_HOST,
        },
      }
    );
    const data = await res.json();

    if (!res.ok) {
      if (res.status === 403) throw new Error("NOT_SUBSCRIBED");
      throw new Error(data?.message || `API ${res.status}`);
    }

    const listings = data?.listings || [];
    return listings.map(normalizeListing);
  } catch (err) {
    console.error("Listings fetch error:", err);
    throw err;
  }
}

// The API doesn't have a dedicated sold endpoint, so we pull a larger
// batch of for-sale listings and extract those with last_sold_date/price
// as recent comps. This gives real transaction history for the ZIP.
export async function fetchSoldListings(townName) {
  const zip = getZipForTown(townName);
  if (!zip) return [];
  if (!API_KEY || API_KEY === "your_rapidapi_key_here") return [];

  try {
    const res = await fetch(
      `https://${API_HOST}/for-sale?location=${zip}&offset=0&limit=42`,
      {
        method: "GET",
        headers: {
          "x-rapidapi-key": API_KEY,
          "x-rapidapi-host": API_HOST,
        },
      }
    );
    const data = await res.json();

    if (!res.ok) {
      if (res.status === 403) throw new Error("NOT_SUBSCRIBED");
      throw new Error(data?.message || `API ${res.status}`);
    }

    const listings = data?.listings || [];
    return listings
      .filter((p) => p.last_sold_date && p.last_sold_price)
      .sort((a, b) => new Date(b.last_sold_date) - new Date(a.last_sold_date))
      .slice(0, 12)
      .map(normalizeSold);
  } catch (err) {
    console.error("Sold listings fetch error:", err);
    throw err;
  }
}

function normalizeSold(p) {
  const address = p.location?.address || {};
  const desc = p.description || {};
  const listPrice = p.list_price || 0;
  const soldPrice = p.last_sold_price || 0;
  const diff = listPrice && soldPrice ? ((soldPrice - listPrice) / listPrice) * 100 : null;

  return {
    id: p.property_id || p.listing_id,
    address: address.line && address.city
      ? `${address.line}, ${address.city}`
      : "Address unavailable",
    listPrice,
    soldPrice,
    diff,
    soldDate: p.last_sold_date,
    beds: desc.beds || null,
    baths: desc.baths || null,
    sqft: desc.sqft || null,
    daysOnMarket: p.list_date && p.last_sold_date
      ? Math.max(0, Math.floor((new Date(p.last_sold_date) - new Date(p.list_date)) / 86400000))
      : null,
    link: p.href || null,
  };
}

// rdcpix URLs end with a size suffix before .jpg:
// "s" = small/thumbnail, "l" = large, "od" = original
// Replace the trailing size letter to get high-res images
function hiRes(url) {
  if (!url) return null;
  return url.replace(/s\.jpg$/, "od.jpg");
}

function normalizeListing(p) {
  const address = p.location?.address || {};
  const desc = p.description || {};
  const photo = hiRes(p.primary_photo?.href || p.photos?.[0]?.href || null);
  const agent = p.advertisers?.find((a) => a.type === "seller");
  const agentPhone = agent?.phones?.find((ph) => ph.type === "Mobile")
    || agent?.phones?.[0];

  return {
    id: p.property_id || p.listing_id,
    photo,
    address: address.line && address.city
      ? `${address.line}, ${address.city}`
      : "Address unavailable",
    price: p.list_price || 0,
    beds: desc.beds || null,
    baths: desc.baths || null,
    sqft: desc.sqft || null,
    type: desc.type?.replace(/_/g, " ") || null,
    yearBuilt: desc.year_built || null,
    daysOnMarket: p.list_date
      ? Math.max(0, Math.floor((Date.now() - new Date(p.list_date).getTime()) / 86400000))
      : null,
    status: p.status || "for_sale",
    // TODO: Build our own listing detail page instead of linking to realtor.com
    link: p.href || null,
    agent: agent?.name || null,
    agentEmail: agent?.email || null,
    agentPhone: agentPhone?.number || null,
    agentPhoneType: agentPhone?.type || null,
    agentHref: agent?.href || null,
    agentPhoto: agent?.photo?.href || null,
    brokerage: p.branding?.[0]?.name || agent?.office?.name || null,
  };
}
