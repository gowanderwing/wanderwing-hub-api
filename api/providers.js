export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME;
  const AIRTABLE_VIEW_NAME = process.env.AIRTABLE_VIEW_NAME;

  if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_NAME || !AIRTABLE_VIEW_NAME) {
    return res.status(500).json({
      error: 'Missing Airtable environment variables'
    });
  }

  const fields = [
    'Provider Name',
    'Short Description',
    'Category',
    'Subcategory',
    'City',
    'State',
    'Status',
    'Sort Priority',
    'Website',
    'Tags',
    'Badge Final',
    'Average Rating Rounded',
    'Review Count',
    'Clicks 14d'
  ];

  const allRecords = [];
  let offset = null;

  try {
    do {
      const params = new URLSearchParams();
      params.append('view', AIRTABLE_VIEW_NAME);
      params.append('filterByFormula', "{Status}='Live'");
      fields.forEach((field) => params.append('fields[]', field));
      params.append('sort[0][field]', 'Sort Priority');
      params.append('sort[0][direction]', 'asc');

      if (offset) {
        params.append('offset', offset);
      }

      const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}?${params.toString()}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${AIRTABLE_PAT}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const text = await response.text();
        return res.status(response.status).json({
          error: 'Airtable request failed',
          details: text,
        });
      }

      const data = await response.json();

      (data.records || []).forEach((record) => {
        const f = record.fields || {};
        allRecords.push({
          id: record.id,
          recordId: record.id,
          providerName: f['Provider Name'] || '',
          shortDescription: f['Short Description'] || '',
          category: f['Category'] || '',
          subcategory: f['Subcategory'] || '',
          city: f['City'] || '',
          state: f['State'] || '',
          status: f['Status'] || '',
          website: f['Website'] || '',
          tags: Array.isArray(f['Tags']) ? f['Tags'] : (f['Tags'] ? [f['Tags']] : []),
          badge: (f['Badge Final'] || '').toLowerCase(),
          averageRating: Number(f['Average Rating Rounded'] || 0),
          reviewCount: Number(f['Review Count'] || 0),
          clicks14d: Number(f['Clicks 14d'] || 0),
          sortPriority: f['Sort Priority'] || 9999
        });
      });

      offset = data.offset || null;
    } while (offset);

    return res.status(200).json({
      success: true,
      count: allRecords.length,
      records: allRecords,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Server error while fetching Airtable',
      details: error.message,
    });
  }
}
