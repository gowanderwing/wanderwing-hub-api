console.log(JSON.stringify(records.map(r => ({
  id: r.id,
  fields: r.fields
})), null, 2));

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
    return field.split(',').map(function (s) {
      return s.trim();
    }).filter(Boolean);
  }
  return [];
}

function normalizeBadge(field) {
  if (Array.isArray(field) && field.length) field = field[0];
  const value = String(field || '').toLowerCase().trim();

  if (value.includes('family')) return 'family';
  if (value.includes('trend')) return 'trending';
  if (value.includes('trust')) return 'trusted';
  if (value.includes('feature')) return 'featured';
  return '';
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const records = await base('Providers')
      .select({
        view: 'Public-Live Hub',
        filterByFormula: "AND(LEN(TRIM({Short Description}&''))>0,LEN(TRIM({Website}&''))>0)",
        sort: [{ field: 'Provider Name', direction: 'asc' }]
      })
      .all();

    const mapped = records.map(function (record) {
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
        averageRating: Number(f['Average Rating Rounded'] || f['Average Rating'] || 0),
        reviewCount: Number(f['Review Count'] || 0),
        badge: normalizeBadge(f['Badge Override'] || f['Badge']),
        tags: normalizeArray(f['Tags'])
      };
    }).filter(function (item) {
      return item.providerName && item.shortDescription && item.website;
    });

    return res.status(200).json({ records: mapped });
  } catch (error) {
    console.error('providers api error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to load providers'
    });
  }
};
