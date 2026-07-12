export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url parameter' });

  try {
    const parsed = new URL(url);
    const allowed = ['uploads.mangadex.org', 'mangadex.network'];
    if (!allowed.some((d) => parsed.hostname.endsWith(d))) {
      return res.status(403).json({ error: 'Domain not allowed' });
    }

    const upstream = await fetch(parsed.href, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Upstream ${upstream.status}` });
    }

    res.setHeader('Content-Type', upstream.headers.get('Content-Type') || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const buffer = await upstream.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export const config = {
  api: { responseContentType: false },
};
