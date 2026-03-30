export default async function handler(req, res) {
  const allowedOrigin = "https://www.wanderwing.org";

  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
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
    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;

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
      "Sort Priority",
      "Google Place ID",
      "Google Rating",
      "Google Review Count",
      "Google Reviews URL"
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
      return res.status(airtableRes.status).json({ error: text });
    }

    const airtableData = await airtableRes.json();
    const rawRecords = airtableData.records || [];

    async function fetchGoogleData(placeId) {
      if (!googleApiKey || !placeId) return null;

      const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?fields=id,displayName,rating,userRatingCount,googleMapsUri&key=${encodeURIComponent(googleApiKey)}`;

      const googleRes = await fetch(url);
      if (!googleRes.ok) return null;

      const data = await googleRes.json();
      return {
        googleRating: data.rating ?? null,
        googleReviewCount: data.userRatingCount ?? null,
        googleReviewsUrl: data.googleMapsUri ?? ""
      };
    }

    const records = await Promise.all(
      rawRecords.map(async (record) => {
        const f = record.fields || {};
        const placeId = f["Google Place ID"] || "";
        const googleData = placeId ? await fetchGoogleData(placeId) : null;

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
          ageMin: f["Age Min"] || null,
          ageMax: f["Age Max"] || null,
          publicAgeRange: f["Public Age Range"] || "",
          tags: f["Tags"] || [],
          websiteUrl: f["Website URL"] || "",
          logo: Array.isArray(f["Logo"]) && f["Logo"][0]?.url ? f["Logo"][0].url : "",
          featuredPartner: !!f["Featured Partner"],
          trustedPick: !!f["Trusted Pick"],
          averageRating: f["Average Rating"] || null,
          averageRatingRounded: f["Average Rating Rounded"] || null,
          reviewCount: f["Review Count"] || 0,
          helpfulCount: f["Helpful Count"] || 0,
          approvedQuotes: f["Approved Quotes"] || "",
          displayStatus: f["Display Status"] || "",
          sortPriority: f["Sort Priority"] || 9999,
          googlePlaceId: placeId,
          googleRating: googleData?.googleRating ?? f["Google Rating"] ?? null,
          googleReviewCount: googleData?.googleReviewCount ?? f["Google Review Count"] ?? 0,
          googleReviewsUrl: googleData?.googleReviewsUrl ?? f["Google Reviews URL"] ?? ""
        };
      })
    );

    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
    return res.status(200).json({ records });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Unknown error" });
  }
}
