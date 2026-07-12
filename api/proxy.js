const ALLOWED_HOSTS = [
  'ytimgf.fast4speed.rsvp',
  'wp.youtube-anime.com',
];

function getReferer(host) {
  if (host.endsWith('fast4speed.rsvp')) return 'https://youtu-chan.com/';
  if (host.endsWith('youtube-anime.com')) return 'https://allmanga.to/';
  return 'https://allmanga.to/';
}

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing ?url= parameter' });
  }

  let parsed;
  try { parsed = new URL(url); } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  const host = parsed.hostname;
  const allowed = ALLOWED_HOSTS.some(
    (h) => host === h || host.endsWith('.' + h)
  );
  if (!allowed) return res.status(403).json({ error: `Domain not allowed: ${host}` });

  try {
    const upstream = await fetch(parsed.href, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Referer': getReferer(host),
        'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
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
