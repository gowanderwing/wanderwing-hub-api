export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME;
  const AIRTABLE_VIEW_NAME = process.env.AIRTABLE_VIEW_NAME;

  if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_NAME || !AIRTABLE_VIEW_NAME) {
    return res.status(500).json({
      error: 'Missing Airtable environment variables',
      missing: {
        AIRTABLE_PAT: !AIRTABLE_PAT,
        AIRTABLE_BASE_ID: !AIRTABLE_BASE_ID,
        AIRTABLE_TABLE_NAME: !AIRTABLE_TABLE_NAME,
        AIRTABLE_VIEW_NAME: !AIRTABLE_VIEW_NAME,
      },
    });
  }

  const fields = [
    'Provider Name',
    'Short Description',
    'Category',
    'Subcategory',
    'Website',
    'City',
    'State',
    'Tags',
    'Logo',
    'Status',
    'Sort Priority',
    'Virtual Option',
    'Ages Served'
  ];

  const allRecords = [];
  let offset = null;

  try {
    do {
      const params = new URLSearchParams();

      // Correct Airtable view
      params.append('view', AIRTABLE_VIEW_NAME);

      // Correct live filter
      params.append('filterByFormula', "{Status}='Live'");

      // Only request the fields the page needs
      fields.forEach((field) => params.append('fields[]', field));

      // Stable sorting
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
          debug: {
            baseId: AIRTABLE_BASE_ID,
            tableName: AIRTABLE_TABLE_NAME,
            viewName: AIRTABLE_VIEW_NAME,
            filter: "{Status}='Live'"
          }
        });
      }

      const data = await response.json();

      (data.records || []).forEach((record) => {
        const f = record.fields || {};
        allRecords.push({
          id: record.id,
          providerName: f['Provider Name'] || '',
          shortDescription: f['Short Description'] || '',
          category: f['Category'] || '',
          subcategory: f['Subcategory'] || '',
          website: f['Website'] || '',
          city: f['City'] || '',
          state: f['State'] || '',
          tags: f['Tags'] || [],
          logo: Array.isArray(f['Logo']) && f['Logo'][0] ? f['Logo'][0].url : '',
          status: f['Status'] || '',
          sortPriority: f['Sort Priority'] || 9999,
          virtualOption: f['Virtual Option'] || '',
          agesServed: f['Ages Served'] || '',
        });
      });

      offset = data.offset || null;
    } while (offset);

    return res.status(200).json({
      success: true,
      count: allRecords.length,
      records: allRecords,
      updatedAt: new Date().toISOString(),
      debug: {
        baseId: AIRTABLE_BASE_ID,
        tableName: AIRTABLE_TABLE_NAME,
        viewName: AIRTABLE_VIEW_NAME,
        filter: "{Status}='Live'"
      }
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Server error while fetching Airtable',
      details: error.message,
    });
  }
}
