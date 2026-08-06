// api/links.js
// GET /api/links -> [{ id, label, url, order }, ...]  (enabled links only)

const { getLinks } = require('../lib/storage');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const links = await getLinks();
  const visible = links
    .filter((l) => l.enabled !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map(({ id, label, url, order }) => ({ id, label, url, order }));

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
  res.status(200).json(visible);
};
