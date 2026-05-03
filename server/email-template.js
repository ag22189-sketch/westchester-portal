const fmtPrice = (n) => {
  if (!n) return "N/A";
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  return `$${(n / 1000).toFixed(0)}K`;
};

const fmtDate = () => {
  return new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

function townSection(townName, data) {
  const { active, sold } = data;
  const activeCount = active.length;
  const avgDOM =
    active.filter((l) => l.daysOnMarket != null).length > 0
      ? Math.round(
          active
            .filter((l) => l.daysOnMarket != null)
            .reduce((s, l) => s + l.daysOnMarket, 0) /
            active.filter((l) => l.daysOnMarket != null).length
        )
      : null;

  const validSold = sold.filter(
    (s) => !s.isNewConstruction && s.appreciation != null
  );
  const avgAppreciation =
    validSold.length > 0
      ? Math.round(
          validSold.reduce((s, v) => s + v.appreciation, 0) / validSold.length
        )
      : null;

  const priceRange =
    active.length > 0
      ? `${fmtPrice(Math.min(...active.map((l) => l.price).filter(Boolean)))} - ${fmtPrice(Math.max(...active.map((l) => l.price).filter(Boolean)))}`
      : "No active listings";

  const recentSales = sold.slice(0, 3);

  return `
    <tr>
      <td style="padding: 0 0 32px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <td style="padding: 24px 28px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;">
              <!-- Town Name -->
              <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 400; color: #F5EFE8; font-family: Georgia, serif;">
                ${townName}
              </h2>

              <!-- Stats Row -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 14px 16px; background: rgba(201,169,110,0.08); border: 1px solid rgba(201,169,110,0.15); border-radius: 8px; width: 33%; text-align: center;">
                    <div style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #C9A96E; margin-bottom: 4px; font-family: Georgia, serif;">Active</div>
                    <div style="font-size: 26px; color: #F5EFE8; font-weight: 300; font-family: Georgia, serif;">${activeCount}</div>
                    <div style="font-size: 11px; color: rgba(255,255,255,0.3); font-family: Georgia, serif;">listings</div>
                  </td>
                  <td style="width: 8px;"></td>
                  <td style="padding: 14px 16px; background: rgba(201,169,110,0.08); border: 1px solid rgba(201,169,110,0.15); border-radius: 8px; width: 33%; text-align: center;">
                    <div style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #C9A96E; margin-bottom: 4px; font-family: Georgia, serif;">Avg DOM</div>
                    <div style="font-size: 26px; color: #F5EFE8; font-weight: 300; font-family: Georgia, serif;">${avgDOM != null ? avgDOM : "--"}</div>
                    <div style="font-size: 11px; color: rgba(255,255,255,0.3); font-family: Georgia, serif;">days on market</div>
                  </td>
                  <td style="width: 8px;"></td>
                  <td style="padding: 14px 16px; background: rgba(201,169,110,0.08); border: 1px solid rgba(201,169,110,0.15); border-radius: 8px; width: 33%; text-align: center;">
                    <div style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #C9A96E; margin-bottom: 4px; font-family: Georgia, serif;">Trend</div>
                    <div style="font-size: 26px; font-weight: 300; font-family: Georgia, serif; color: ${avgAppreciation != null ? (avgAppreciation >= 0 ? "#7A9E7E" : "#C46B5E") : "#F5EFE8"};">
                      ${avgAppreciation != null ? `${avgAppreciation >= 0 ? "+" : ""}${avgAppreciation}%` : "--"}
                    </div>
                    <div style="font-size: 11px; color: rgba(255,255,255,0.3); font-family: Georgia, serif;">avg appreciation</div>
                  </td>
                </tr>
              </table>

              <!-- Price Range -->
              <div style="font-size: 13px; color: rgba(255,255,255,0.4); margin-bottom: 16px; font-family: Georgia, serif;">
                Price range: <span style="color: #C9A96E;">${priceRange}</span>
              </div>

              ${
                recentSales.length > 0
                  ? `
              <!-- Recent Sales -->
              <div style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.3); margin-bottom: 10px; font-family: Georgia, serif;">Recent Sales History</div>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                ${recentSales
                  .map(
                    (s) => `
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <div style="font-size: 14px; color: #E8E0D5; font-family: Georgia, serif;">${s.address}</div>
                    <div style="margin-top: 4px;">
                      <span style="font-size: 13px; color: rgba(255,255,255,0.4); font-family: Georgia, serif;">
                        ${fmtPrice(s.lastSalePrice)} &rarr; ${fmtPrice(s.currentListPrice)}
                      </span>
                      ${
                        s.appreciation != null && !s.isNewConstruction
                          ? `<span style="font-size: 13px; color: ${s.appreciation >= 0 ? "#7A9E7E" : "#C46B5E"}; margin-left: 8px; font-family: Georgia, serif;">
                          ${s.appreciation >= 0 ? "+" : ""}${Math.round(s.appreciation)}%
                        </span>`
                          : ""
                      }
                    </div>
                  </td>
                </tr>`
                  )
                  .join("")}
              </table>`
                  : ""
              }
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

export function buildDigestEmail(email, townDataMap) {
  const townNames = Object.keys(townDataMap);

  const divider = `<tr><td style="padding: 0 0 32px; text-align: center;">
    <div style="width: 80px; height: 1px; background: rgba(201,169,110,0.35); margin: 0 auto;"></div>
  </td></tr>`;

  const townSections = townNames
    .map((name) => townSection(name, townDataMap[name]))
    .join(divider);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Westchester Market Digest</title>
</head>
<body style="margin: 0; padding: 0; background: #0A0D11; font-family: Georgia, 'Times New Roman', serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; background: #0A0D11;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" style="border-collapse: collapse; max-width: 600px; width: 100%;">

          <!-- Header -->
          <tr>
            <td style="padding: 0 0 40px; text-align: center;">
              <div style="font-size: 11px; letter-spacing: 4px; text-transform: uppercase; color: #C9A96E; margin-bottom: 12px;">
                Weekly Market Intelligence
              </div>
              <h1 style="margin: 0; font-size: 32px; font-weight: 400; color: #F5EFE8; font-family: Georgia, serif;">
                Westchester Digest
              </h1>
              <div style="margin-top: 8px; font-size: 14px; color: rgba(255,255,255,0.35); font-style: italic;">
                ${fmtDate()} &middot; ${townNames.length} town${townNames.length !== 1 ? "s" : ""} tracked
              </div>
              <div style="width: 60px; height: 1px; background: rgba(201,169,110,0.4); margin: 24px auto 0;"></div>
            </td>
          </tr>

          <!-- Town Sections -->
          ${townSections}

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 0 0; text-align: center; border-top: 1px solid rgba(255,255,255,0.06);">
              <div style="font-size: 13px; color: rgba(255,255,255,0.25); font-family: Georgia, serif; margin-bottom: 8px;">
                Curated by Domus &middot; Westchester County Real Estate Intelligence
              </div>
              <div style="font-size: 12px; color: rgba(255,255,255,0.15); font-family: Georgia, serif;">
                Data sourced from active MLS listings &middot; Updated weekly
              </div>
              <div style="margin-top: 16px;">
                <a href="${process.env.PORTAL_URL || "https://westchester-portal.onrender.com"}/unsubscribe?email=${encodeURIComponent(email)}"
                   style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: rgba(255,255,255,0.2); text-decoration: none; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 1px; font-family: Georgia, serif;">
                  Unsubscribe
                </a>
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
