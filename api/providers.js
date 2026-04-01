export default async function handler(req, res) {
  const allowedOrigins = [
    "https://www.wanderwing.org",
    "https://wanderwing.org"
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const token = process.env.AIRTABLE_TOKEN;
    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableName = process.env.AIRTABLE_TABLE_NAME;
    const viewName = process.env.AIRTABLE_VIEW_NAME;

    if (!token || !baseId || !tableName || !viewName) {
      return res.status(500).json({ error: "Missing Airtable environment variables." });
    }

    const fields = [
      "Display Name",
      "Category",
      "Subcategory",
      "Short Description",
      "City",
      "State",
      "Location Type",
      "Public Location",
      "Age Min",
      "Age Max",
      "Public Age Range",
      "Tags",
      "Website URL",
      "Logo",
      "Featured Partner",
      "Trusted Pick",
      "Average Rating",
      "Average Rating Rounded",
      "Review Count",
      "Helpful Count",
      "Approved Quotes",
      "Display Status",
      "Sort Priority"
    ];

    const params = new URLSearchParams();
    params.set("view", viewName);

    for (const field of fields) {
      params.append("fields[]", field);
    }

    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?${params.toString()}`;

    const airtableRes = await fetch(airtableUrl, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!airtableRes.ok) {
      const text = await airtableRes.text();
      return res.status(airtableRes.status).json({
        error: "Airtable request failed",
        details: text
      });
    }

    const airtableData = await airtableRes.json();
    const rawRecords = Array.isArray(airtableData.records) ? airtableData.records : [];

    const records = rawRecords.map((record) => {
      const f = record.fields || {};

      return {
        id: record.id,
        displayName: f["Display Name"] || "",
        category: f["Category"] || "",
        subcategory: f["Subcategory"] || "",
        shortDescription: f["Short Description"] || "",
        city: f["City"] || "",
        state: f["State"] || "",
        locationType: f["Location Type"] || "",
        publicLocation: f["Public Location"] || "",
        ageMin: f["Age Min"] ?? null,
        ageMax: f["Age Max"] ?? null,
        publicAgeRange: f["Public Age Range"] || "",
        tags: Array.isArray(f["Tags"]) ? f["Tags"] : [],
        websiteUrl: f["Website URL"] || "",
        logo: Array.isArray(f["Logo"]) && f["Logo"][0]?.url ? f["Logo"][0].url : "",
        featuredPartner: Boolean(f["Featured Partner"]),
        trustedPick: Boolean(f["Trusted Pick"]),
        averageRating: f["Average Rating"] ?? null,
        averageRatingRounded: f["Average Rating Rounded"] ?? null,
        reviewCount: f["Review Count"] ?? 0,
        helpfulCount: f["Helpful Count"] ?? 0,
        approvedQuotes: f["Approved Quotes"] || "",
        displayStatus: f["Display Status"] || "",
        sortPriority: f["Sort Priority"] ?? 9999
      };
    });

    const filtered = records.filter((r) => {
      return (
        String(r.displayStatus || "").toLowerCase() === "live" &&
        String(r.displayName || "").trim() &&
        String(r.shortDescription || "").trim() &&
        String(r.websiteUrl || "").trim()
      );
    });

    filtered.sort((a, b) => {
      const aPriority = Number(a.sortPriority) || 9999;
      const bPriority = Number(b.sortPriority) || 9999;
      return aPriority - bPriority;
    });

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json({ records: filtered });
  } catch (error) {
    return res.status(500).json({
      error: "Server error",
      details: error?.message || String(error)
    });
  }
}
