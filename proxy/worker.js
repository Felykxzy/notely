/* Посредник для YouTube. Хранит ключ на сервере и запоминает ответы, чтобы не тратить дневной лимит.
   Секрет YT_KEY добавляется в настройках Worker (Settings → Variables and Secrets), в код ключ не пишется. */
const YT = "https://www.googleapis.com/youtube/v3";
const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET", "content-type": "application/json; charset=utf-8" };
const out = (o, ttl, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { ...CORS, "cache-control": "public, max-age=" + (ttl || 0) } });

export default {
  async fetch(req, env, ctx) {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (req.method !== "GET") return out({ error: { message: "GET only" } }, 0, 405);
    const u = new URL(req.url), path = u.pathname.replace(/\/+$/, "");
    if (!env.YT_KEY) return out({ error: { message: "Нет секрета YT_KEY" } }, 0, 500);
    let api, ttl;
    if (path === "/search") {
      const q = (u.searchParams.get("q") || "").trim().toLowerCase().slice(0, 100);
      if (!q) return out({ items: [] }, 60);
      api = "search"; ttl = 6 * 3600; var key = "s:" + q;
    } else if (path === "/trending") {
      api = "trending"; ttl = 3600; var key = "t:" + (u.searchParams.get("region") || "").toUpperCase().slice(0, 2);
    } else return out({ ok: true, routes: ["/search?q=", "/trending"] }, 60);

    const ck = new Request("https://notely-cache.local/" + encodeURIComponent(key));
    const hit = await caches.default.match(ck);
    if (hit) { const r = new Response(hit.body, hit); Object.entries(CORS).forEach(([k, v]) => r.headers.set(k, v)); return r; }

    const get = async (url) => (await fetch(url)).json();
    let data;
    if (api === "search") {
      const s = await get(`${YT}/search?part=snippet&type=video&videoCategoryId=10&maxResults=20&q=${encodeURIComponent(key.slice(2))}&key=${env.YT_KEY}`);
      if (s.error) return out(s, 0);
      const ids = (s.items || []).map(i => i.id && i.id.videoId).filter(Boolean);
      data = ids.length ? await get(`${YT}/videos?part=snippet,contentDetails&id=${ids.join(",")}&key=${env.YT_KEY}`) : { items: [] };
    } else {
      const rg = key.slice(2);
      data = await get(`${YT}/videos?part=snippet,contentDetails&chart=mostPopular&videoCategoryId=10&maxResults=20${rg ? "&regionCode=" + rg : ""}&key=${env.YT_KEY}`);
    }
    if (data.error) return out(data, 0);
    const res = out({ items: data.items || [] }, ttl);
    ctx.waitUntil(caches.default.put(ck, res.clone()));
    return res;
  }
};
