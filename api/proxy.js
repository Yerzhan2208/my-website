export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url parameter' });

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  const host = parsed.hostname;
  const allowed =
    host.endsWith('.mangadex.org') ||
    host.endsWith('.mangadex.network') ||
    host === 'uploads.mangadex.org';
  if (!allowed) {
    return res.status(403).json({ error: 'Domain not allowed' });
  }

  try {
    const upstream = await fetch(parsed.href, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://mangadex.org/',
      },
      redirect: 'follow',
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Upstream ${upstream.status}` });
    }

    const contentType = upstream.headers.get('Content-Type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const arrayBuf = await upstream.arrayBuffer();
    return res.send(Buffer.from(arrayBuf));
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
