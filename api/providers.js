import Airtable from 'airtable';

const base = new Airtable({
  apiKey: process.env.AIRTABLE_PAT
}).base(process.env.AIRTABLE_BASE_ID);

function getAttachmentUrl(field) {
  if (Array.isArray(field) && field[0] && field[0].url) return field[0].url;
  if (typeof field === 'string') return field;
  return '';
}

function normalizeArray(field) {
  if (Array.isArray(field)) return field;
  if (typeof field === 'string' && field.trim()) {
    return field.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Missing provider id' });
    }

    const providerRecord = await base('Providers').find(id);
    const f = providerRecord.fields;

    let approvedQuotes = [];

    try {
      const quoteRecords = await base('Reviews')
        .select({
          filterByFormula: `AND({Provider Record ID}="${id}", {Approved Quote}=1)`
        })
        .all();

      approvedQuotes = quoteRecords
        .map((record) => ({
          quote:
            record.fields['Approved Quote Text'] ||
            record.fields['Quote'] ||
            '',
          reviewerFirstName:
            record.fields['Reviewer First Name'] ||
            'Wanderwing family'
        }))
        .filter((item) => item.quote);
    } catch (reviewError) {
      console.warn('Could not load approved quotes:', reviewError);
    }

    return res.status(200).json({
      recordId: providerRecord.id,
      providerName: f['Provider Name'] || '',
      shortDescription: f['Short Description'] || '',
      category: f['Category'] || '',
      subcategory: f['Subcategory'] || '',
      city: f['City'] || '',
      state: f['State'] || '',
      website: f['Website'] || '',
      instagram: f['Instagram'] || '',
      facebook: f['Facebook'] || '',
      tiktok: f['TikTok'] || '',
      logo: getAttachmentUrl(f['Logo']),
      averageRating: Number(f['Average Rating Rounded'] || f['Average Rating'] || 0),
      reviewCount: Number(f['Review Count'] || 0),
      badge: f['Badge Override'] || f['Badge'] || '',
      tags: normalizeArray(f['Tags']),
      approvedQuotes
    });
  } catch (error) {
    console.error('Error loading provider:', error);
    return res.status(500).json({ error: 'Failed to load provider' });
  }
}


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
