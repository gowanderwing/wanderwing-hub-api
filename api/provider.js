export default function handler(req, res) {
  res.status(200).json({ ok: true, route: 'provider' });
}
export default function handler(req, res) {
  const { id } = req.query;
  res.status(200).json({ ok: true, id: id || null });
}
import Airtable from 'airtable';

const base = new Airtable({
  apiKey: process.env.AIRTABLE_PAT
}).base(process.env.AIRTABLE_BASE_ID);

export default async function handler(req, res) {
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
    return res.status(500).json({
      error: error.message
    });
  }
}
