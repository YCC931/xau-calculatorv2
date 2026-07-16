// Vercel Serverless Function: proxies the Forex Factory (Fair Economy) weekly
// calendar server-side, so the browser never has to make a cross-origin
// request to nfs.faireconomy.media directly (which blocks browser CORS).
// Also caches the result in memory for a few minutes to stay well under
// Forex Factory's ~2 requests / 5 minutes per-source rate limit.

let cache = null;
let cacheTime = 0;
const CACHE_MS = 10 * 60 * 1000; // 10 minutes

export default async function handler(req, res) {
  const now = Date.now();

  if (cache && (now - cacheTime) < CACHE_MS) {
    res.setHeader('cache-control', 'public, max-age=300');
    return res.status(200).json(cache);
  }

  try {
    const upstream = await fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.json');
    if (!upstream.ok) throw new Error('upstream error ' + upstream.status);
    const data = await upstream.json();
    cache = data;
    cacheTime = now;
    res.setHeader('cache-control', 'public, max-age=300');
    return res.status(200).json(data);
  } catch (err) {
    if (cache) {
      res.setHeader('cache-control', 'public, max-age=60');
      return res.status(200).json(cache);
    }
    return res.status(502).json({ error: String(err) });
  }
}
