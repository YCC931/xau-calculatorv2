// Netlify Function: proxies the Forex Factory (Fair Economy) weekly calendar
// server-side, so the browser never has to make a cross-origin request to
// nfs.faireconomy.media directly (which blocks browser CORS).
// Also caches the result in memory for a few minutes to stay well under
// Forex Factory's ~2 requests / 5 minutes per-source rate limit.

let cache = null;
let cacheTime = 0;
const CACHE_MS = 10 * 60 * 1000; // 10 minutes

export default async () => {
  const now = Date.now();

  if (cache && (now - cacheTime) < CACHE_MS) {
    return new Response(JSON.stringify(cache), {
      headers: { "content-type": "application/json", "cache-control": "public, max-age=300" }
    });
  }

  try {
    const res = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json");
    if (!res.ok) throw new Error("upstream error " + res.status);
    const data = await res.json();
    cache = data;
    cacheTime = now;
    return new Response(JSON.stringify(data), {
      headers: { "content-type": "application/json", "cache-control": "public, max-age=300" }
    });
  } catch (err) {
    // If upstream fails but we have an old cache, serve stale data rather than nothing.
    if (cache) {
      return new Response(JSON.stringify(cache), {
        headers: { "content-type": "application/json", "cache-control": "public, max-age=60" }
      });
    }
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 502,
      headers: { "content-type": "application/json" }
    });
  }
};
