export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { password, content } = req.body || {};
  const adminPassword = process.env.ADMIN_PASSWORD;
  const githubToken = process.env.GITHUB_TOKEN;

  if (!adminPassword || !githubToken) {
    res.status(500).json({ error: 'Server not configured with ADMIN_PASSWORD and GITHUB_TOKEN.' });
    return;
  }

  if (!password || password !== adminPassword) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (!content) {
    res.status(400).json({ error: 'Missing content payload.' });
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    res.status(400).json({ error: 'Invalid JSON content.' });
    return;
  }

  if (!parsed || typeof parsed !== 'object') {
    res.status(400).json({ error: 'Content must be a JSON object.' });
    return;
  }

  if (!parsed.site || typeof parsed.site !== 'object' || !Array.isArray(parsed.site.nav)) {
    res.status(400).json({ error: 'Content must include a site.nav array.' });
    return;
  }

  if (!parsed.pages || typeof parsed.pages !== 'object' || Array.isArray(parsed.pages)) {
    res.status(400).json({ error: 'Content must include a pages object.' });
    return;
  }

  const owner = 'matttothemooon';
  const repo = 'mainwebsite';
  const path = 'content.json';
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const authHeader = `token ${githubToken}`;

  try {
    const currentResponse = await fetch(apiUrl, {
      headers: {
        Authorization: authHeader,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!currentResponse.ok) {
      const errorBody = await currentResponse.text();
      res.status(currentResponse.status).json({ error: 'Unable to read current content file.', detail: errorBody });
      return;
    }

    const currentData = await currentResponse.json();
    const updateResponse = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        Authorization: authHeader,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Update site content from admin dashboard',
        content: Buffer.from(JSON.stringify(parsed, null, 2)).toString('base64'),
        sha: currentData.sha,
      }),
    });

    if (!updateResponse.ok) {
      const errorBody = await updateResponse.text();
      res.status(updateResponse.status).json({ error: 'Unable to save content file.', detail: errorBody });
      return;
    }

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Unexpected server error.', detail: error.message });
  }
}
