const Airtable = require('airtable');

const base = new Airtable({
  apiKey: process.env.AIRTABLE_PAT
}).base(process.env.AIRTABLE_BASE_ID);

module.exports = async function handler(req, res) {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Missing provider id' });
    }

    const providerRecord = await base('Providers').find(id);

    return res.status(200).json({
      ok: true,
      recordId: providerRecord.id,
      fields: providerRecord.fields
    });
  } catch (error) {
    console.error('provider api error:', error);
    return res.status(500).json({
      error: error.message || 'Unknown server error'
    });
  }
};
