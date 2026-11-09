/* GET /api/gcal-callback?code=…&state=… （Google の同意画面から戻ってくる）
   code を更新用トークンに交換し、暗号化してアプリへ返す（URL の # のうしろに入れるので、サーバーのログには残らない）。
   アプリは起動時に #gcal= を読んで、自分のデータ（prefs.gcalLink）に保存する */
import { env, readState, seal, siteOrigin } from './_gcal.js';

export default async function handler(req, res) {
  const origin = siteOrigin(req);
  const back = (frag) => { res.setHeader('Cache-Control', 'no-store'); res.writeHead(302, { Location: origin + '/#' + frag }); res.end(); };
  try {
    const { id, secret } = env();
    const { code, state, error } = req.query || {};
    if (error || !code) return back('gcalErr=' + encodeURIComponent(error === 'access_denied' ? 'cancelled' : (error || 'no_code')));
    const st = readState(secret, state);
    if (!st) return back('gcalErr=state');
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: id, client_secret: secret, code, grant_type: 'authorization_code', redirect_uri: origin + '/api/gcal-callback' }),
    });
    const t = await r.json().catch(() => ({}));
    if (!r.ok || !t.refresh_token) return back('gcalErr=' + encodeURIComponent(t.error || 'no_refresh_token'));
    return back('gcal=' + seal(secret, st.uid, t.refresh_token));
  } catch (e) {
    return back('gcalErr=server');
  }
}
