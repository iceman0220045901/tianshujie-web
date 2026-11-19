/* 天书劫 4.0 网页版 —— 分片拼装 Service Worker
 * game.data 共 93.8MB，超过 GitHub 网页单文件 25MB 上限，
 * 切成 24 个 4MB 分片提交，由本 SW 在 fetch 时按序拼回整包。
 */
const PARTS = (function () {
  const a = [];
  for (let i = 1; i <= 24; i++) a.push('game.data.c' + (i < 10 ? '0' + i : '' + i));
  return a;
})();

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

async function buildData() {
  const bufs = [];
  for (const p of PARTS) {
    const r = await fetch(new URL(p, self.registration.scope).href, { cache: 'force-cache' });
    if (!r.ok) throw new Error('part ' + p + ' HTTP ' + r.status);
    bufs.push(await r.arrayBuffer());
  }
  const total = bufs.reduce((a, b) => a + b.byteLength, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const b of bufs) {
    out.set(new Uint8Array(b), off);
    off += b.byteLength;
  }
  return new Response(out, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(total),
      'Cache-Control': 'no-store'
    }
  });
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (!url.pathname.endsWith('/game.data')) return;
  e.respondWith(buildData());
});
