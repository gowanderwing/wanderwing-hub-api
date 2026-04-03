module.exports = async function handler(req, res) {
  return res.status(200).json({ ok: true, route: 'provider-commonjs-test' });
};
