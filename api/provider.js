export default function handler(req, res) {
  res.status(200).json({ ok: true, route: 'provider' });
}
export default function handler(req, res) {
  const { id } = req.query;
  res.status(200).json({ ok: true, id: id || null });
}
