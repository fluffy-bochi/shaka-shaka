/* ほどふぉ単体の Googleカレンダー連携（Vercel のサーバー側で使う共通の部品）。
   mylifecore のサーバーを通さずに、ほどふぉが自分で Google の更新用トークン（refresh token）を持って予定を読む。
   - 本人確認: Firebase の IDトークンを Google の公開鍵で検証（Firebase の管理用の鍵はいらない）
   - 更新用トークンは、サーバーの秘密（GOOGLE_CLIENT_SECRET から作る鍵）で暗号化し、本人の uid とセットにしてアプリ側に保存してもらう。
     サーバーには何も保存しない。暗号化した中身は、ほかの人のログインでは開けない（uid が合わないと使わない）。
   必要な環境変数: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET（mylifecore と同じもの）
   Google Cloud の OAuth クライアントに、リダイレクトURI `https://<このサイト>/api/gcal-callback` を登録すること。 */
import crypto from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export const PROJECT_ID = 'studio-9921986470-57994';
export const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));

export function env() {
  const id = process.env.GOOGLE_CLIENT_ID, secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret) throw Object.assign(new Error('missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET'), { status: 500 });
  return { id, secret };
}

/* Authorization: Bearer <Firebase IDトークン> → 本人の uid（だめなら null） */
export async function verifyUser(req) {
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
  if (!m) return null;
  try {
    const { payload } = await jwtVerify(m[1], JWKS, { issuer: 'https://securetoken.google.com/' + PROJECT_ID, audience: PROJECT_ID });
    return typeof payload.sub === 'string' && payload.sub ? payload.sub : null;
  } catch (e) {
    return null;
  }
}

// 鍵: シークレットから用途ごとに作る（署名用と暗号用を分ける）
const key = (secret, use) => crypto.createHash('sha256').update('kamepace-gcal:' + use + ':' + secret).digest();

/* OAuth の state: uid と時刻と戻り先に署名（10分で切れる） */
export function makeState(secret, uid, origin) {
  const body = Buffer.from(JSON.stringify({ uid, ts: Date.now(), origin })).toString('base64url');
  const sig = crypto.createHmac('sha256', key(secret, 'state')).update(body).digest('base64url');
  return body + '.' + sig;
}
export function readState(secret, state) {
  const [body, sig] = String(state || '').split('.');
  if (!body || !sig) return null;
  const want = crypto.createHmac('sha256', key(secret, 'state')).update(body).digest('base64url');
  if (want.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(want), Buffer.from(sig))) return null;
  try {
    const v = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (!v.uid || Date.now() - v.ts > 10 * 60 * 1000) return null;
    return v;
  } catch (e) { return null; }
}

/* 更新用トークンを uid とセットで暗号化（AES-256-GCM） */
export function seal(secret, uid, refreshToken) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(secret, 'seal'), iv);
  const enc = Buffer.concat([c.update(JSON.stringify({ uid, rt: refreshToken }), 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), enc].map(b => b.toString('base64url')).join('.');
}
/* 開けて uid が合えば更新用トークン、だめなら null */
export function unseal(secret, uid, sealed) {
  try {
    const [iv, tag, enc] = String(sealed || '').split('.').map(s => Buffer.from(s, 'base64url'));
    const d = crypto.createDecipheriv('aes-256-gcm', key(secret, 'seal'), iv);
    d.setAuthTag(tag);
    const v = JSON.parse(Buffer.concat([d.update(enc), d.final()]).toString('utf8'));
    return v && v.uid === uid && v.rt ? v.rt : null;
  } catch (e) { return null; }
}

/* 戻り先: このサイト自身（ヘッダーから） */
export function siteOrigin(req) {
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  return proto + '://' + req.headers.host;
}
