/* ほどほどふぉーと: ホーム画面に追加（インストール）できるようにするための最小のサービスワーカー。
   キャッシュはしない（いつも最新を読む）。ページを開くときだけ受け持ち、通信できないときは短いお知らせを出す */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(() => new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:sans-serif;background:#f7f4ec;color:#1b1b18;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><p>オフラインです。通信できるところで開きなおしてください。</p>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } })));
});
