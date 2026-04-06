const Airtable = require('airtable');

const base = new Airtable({
  apiKey: process.env.AIRTABLE_PAT
}).base(process.env.AIRTABLE_BASE_ID);

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.wanderwing.org');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

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

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const records = await base('Providers')
      .select({
        view: 'Full View',
        sort: [{ field: 'Provider Name', direction: 'asc' }]
      })
      .all();

    const mapped = records.map(record => {
      const f = record.fields || {};

      return {
        recordId: record.id,
        providerName: f['Provider Name'] || '',
        shortDescription: f['Short Description'] || '',
        category: f['Category'] || '',
        subcategory: f['Subcategory'] || '',
        city: f['City'] || '',
        state: f['State'] || '',
        locationType: f['Location Type'] || '',
        website: f['Website'] || '',
        instagram: f['Instagram'] || '',
        facebook: f['Facebook'] || '',
        tiktok: f['TikTok'] || '',
        contactName: f['Contact Name'] || '',
        email: f['Email'] || '',
        phone: f['Phone'] || '',
        logo: getAttachmentUrl(f['Logo']),
        averageRating: Number(f['Average Rating Rounded'] || 0),
        reviewCount: Number(f['Review Count'] || 0),
        badge: f['Badge'] || '',
        tags: normalizeArray(f['Tags'])
      };
    });

    return res.status(200).json({ records: mapped });

  } catch (error) {
    console.error('providers-full api error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to load providers'
    });
  }
};
