// lib/auth.js
// Admin requests must send  Authorization: Bearer <ADMIN_SECRET>
// Set ADMIN_SECRET in Vercel project env vars.

function requireAdmin(req, res) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

  if (!process.env.ADMIN_SECRET) {
    res.status(500).json({ error: 'ADMIN_SECRET not configured on server' });
    return false;
  }
  if (token !== process.env.ADMIN_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

module.exports = { requireAdmin };
