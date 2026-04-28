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

async function logProviderClick(recordId, providerName, req) {
  try {
    await base('Provider Click Events').create([
      {
        fields: {
          Provider: [recordId],
          'Provider Name': providerName || '',
          'Event Type': 'profile_view',
          Source: 'provider_profile',
          URL: req.headers.referer || '',
          'User Agent': req.headers['user-agent'] || '',
          Timestamp: new Date().toISOString()
        }
      }
    ]);
  } catch (clickError) {
    console.warn(
      'Provider Click Events logging failed, continuing:',
      clickError.message || clickError
    );
  }
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const recordId = String(req.query.id || '').trim();

    if (!recordId) {
      return res.status(400).json({
        error: 'Missing required id parameter'
      });
    }

    const records = await base('Providers')
      .select({
        view: 'Full View',
        filterByFormula: `RECORD_ID()="${recordId}"`
      })
      .all();

    if (!records.length) {
      return res.status(404).json({
        error: 'Provider not found'
      });
    }

    const record = records[0];
    const f = record.fields || {};

    const provider = {
      recordId: record.id,
      providerName: f['Provider Name'] || '',
      shortDescription: f['Short Description'] || '',
      fullDescription: f['Full Description'] || '',
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

    await logProviderClick(record.id, provider.providerName, req);

    return res.status(200).json(provider);
  } catch (error) {
    console.error('provider api error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to load provider'
    });
  }
};
