/* POST /api/gcal-events（Authorization: Bearer <Firebase IDトークン>）
   本文 { link: 暗号化した更新用トークン, from: ISO, to: ISO }
   → { items: [{ id, title, start, end }] }（時間のある予定だけ・取り消しは除く）
   更新用トークンが使えなくなっていたら 401 { needsReauth: true } */
import { env, verifyUser, unseal } from './_gcal.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  try {
    const { id, secret } = env();
    const uid = await verifyUser(req);
    if (!uid) return res.status(401).json({ error: 'unauthorized' });
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const rt = unseal(secret, uid, body.link);
    if (!rt) return res.status(401).json({ error: 'bad_link', needsReauth: true });
    const from = new Date(body.from), to = new Date(body.to);
    if (isNaN(from) || isNaN(to) || to - from > 40 * 86400000) return res.status(400).json({ error: 'range' });

    const tr = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: id, client_secret: secret, refresh_token: rt, grant_type: 'refresh_token' }),
    });
    const tk = await tr.json().catch(() => ({}));
    if (!tr.ok || !tk.access_token) return res.status(401).json({ error: tk.error || 'refresh_failed', needsReauth: tk.error === 'invalid_grant' });

    const items = [];
    let pageToken = '';
    for (let i = 0; i < 10; i++) {
      const q = new URLSearchParams({ timeMin: from.toISOString(), timeMax: to.toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '250' });
      if (pageToken) q.set('pageToken', pageToken);
      const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?' + q, { headers: { Authorization: 'Bearer ' + tk.access_token } });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return res.status(502).json({ error: (d.error && d.error.message) || 'calendar_failed' });
      (d.items || []).forEach(ev => {
        if (ev.status === 'cancelled' || !ev.start || !ev.start.dateTime || !ev.end || !ev.end.dateTime) return; // 終日の予定は入れない
        items.push({ id: ev.id, title: ev.summary || '', start: ev.start.dateTime, end: ev.end.dateTime });
      });
      pageToken = d.nextPageToken || '';
      if (!pageToken) break;
    }
    return res.status(200).json({ items });
  } catch (e) {
    return res.status(e.status || 500).json({ error: String(e.message || e) });
  }
}
