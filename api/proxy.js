const MANGADEX_API = 'https://api.mangadex.org';

export default async function handler(req, res) {
  const { url, api } = req.query;

  // Mode 1: proxy a full URL (images, at-home CDN)
  if (url) {
    let parsed;
    try { parsed = new URL(url); } catch {
      return res.status(400).json({ error: 'Invalid URL' });
    }
    const host = parsed.hostname;
    const allowed =
      host.endsWith('.mangadex.org') ||
      host.endsWith('.mangadex.network');
    if (!allowed) return res.status(403).json({ error: 'Domain not allowed' });

    try {
      const upstream = await fetch(parsed.href, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Referer': 'https://mangadex.org/',
        },
        redirect: 'follow',
      });
      if (!upstream.ok) return res.status(upstream.status).json({ error: `Upstream ${upstream.status}` });

      const ct = upstream.headers.get('Content-Type') || 'image/jpeg';
      res.setHeader('Content-Type', ct);
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(Buffer.from(await upstream.arrayBuffer()));
    } catch (err) {
      return res.status(502).json({ error: err.message });
    }
  }

  // Mode 2: proxy a MangaDex API call
  if (api) {
    try {
      const upstream = await fetch(`${MANGADEX_API}${api}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      });
      if (!upstream.ok) return res.status(upstream.status).json({ error: `API ${upstream.status}` });

      const json = await upstream.json();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.json(json);
    } catch (err) {
      return res.status(502).json({ error: err.message });
    }
  }

  return res.status(400).json({ error: 'Missing ?url= or ?api= parameter' });
}
