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
    return res.status(200).json({
      ok: true,
      hasPat: !!process.env.AIRTABLE_PAT,
      hasBaseId: !!process.env.AIRTABLE_BASE_ID
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}
