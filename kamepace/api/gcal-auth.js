/* GET /api/gcal-auth（Authorization: Bearer <Firebase IDトークン>）
   → { url }: Google の同意画面のURL。カレンダーの読み取りだけを、更新用トークンつきでお願いする */
import { env, verifyUser, makeState, siteOrigin, SCOPE } from './_gcal.js';

export default async function handler(req, res) {
  try {
    const { id, secret } = env();
    const uid = await verifyUser(req);
    if (!uid) return res.status(401).json({ error: 'unauthorized' });
    const origin = siteOrigin(req);
    const params = new URLSearchParams({
      client_id: id,
      redirect_uri: origin + '/api/gcal-callback',
      response_type: 'code',
      scope: SCOPE,
      access_type: 'offline',
      prompt: 'consent', // 更新用トークンを毎回もらう
      include_granted_scopes: 'true',
      state: makeState(secret, uid, origin),
    });
    return res.status(200).json({ url: 'https://accounts.google.com/o/oauth2/v2/auth?' + params });
  } catch (e) {
    return res.status(e.status || 500).json({ error: String(e.message || e) });
  }
}
