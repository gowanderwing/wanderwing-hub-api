const Airtable = require('airtable');

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

function normalizeBadge(field) {
  if (Array.isArray(field) && field.length) {
    const value = String(field[0]).toLowerCase().trim();
    if (value.includes('family')) return 'family';
    if (value.includes('trend')) return 'trending';
    if (value.includes('trust')) return 'trusted';
    return value;
  }

  if (typeof field === 'string' && field.trim()) {
    const value = field.toLowerCase().trim();
    if (value.includes('family')) return 'family';
    if (value.includes('trend')) return 'trending';
    if (value.includes('trust')) return 'trusted';
    return value;
  }

  return '';
}

module.exports = async function handler(req, res) {
  try {
    const records = await base('Providers')
      .select({
        sort: [{ field: 'Provider Name', direction: 'asc' }]
      })
      .all();

    const mapped = records.map((record) => {
      const f = record.fields;

      return {
        recordId: record.id,
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
        badge: normalizeBadge(f['Badge Override'] || f['Badge']),
        tags: normalizeArray(f['Tags'])
      };
    });

    return res.status(200).json({ records: mapped });
  } catch (error) {
    console.error('providers api error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to load providers'
    });
  }
};
