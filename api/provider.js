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

module.exports = async function handler(req, res) {
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
    return res.status(500).json({
      error: error.message || 'Failed to load provider'
    });
  }
};
