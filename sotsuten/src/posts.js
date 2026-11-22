/* スマホからのつぶやき（卒展）。本体と同じ Firebase プロジェクトの Firestore `sotsuten_posts` に置く。
   ログインなし。Firestore ルールで「作るだけ・中身の形を決める・読むのは誰でも」にしている（作業ログ参照）。 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyBiyucoP28Cou_Aqqqxz2qnSXU1mcConLA',
  authDomain: 'studio-9921986470-57994.firebaseapp.com',
  projectId: 'studio-9921986470-57994',
  storageBucket: 'studio-9921986470-57994.firebasestorage.app',
  messagingSenderId: '446667309305',
  appId: '1:446667309305:web:8c126317232039788ea228',
}, 'sotsuten');
const db = getFirestore(app);
const COL = 'sotsuten_posts';
export const TEXT_MAX = 20; // つぶやきは20文字まで（展示の吹き出しは10文字で改行）

/* 顔（1〜5）: 展示の数字キー1〜5と同じ絵文字・数 */
export const FACES = [
  { face: 1, g: '😫', n: 2 },
  { face: 2, g: '😟', n: 1 },
  { face: 3, g: '😐', n: 1 },
  { face: 4, g: '🙂', n: 1, rec: true },
  { face: 5, g: '😆', n: 1, rec: true },
];
/* きもち（本体のつぶやきの「きもち」と同じ）。選んだらその絵文字を落とす。bad=疲れ・good=回復 */
export const MOODS = [
  { id: 'shock', g: '😢', name: 'ショックなこと', bad: true },
  { id: 'sad', g: '😔', name: 'かなしい', bad: true },
  { id: 'angry', g: '😤', name: 'いらいら・怒り', bad: true },
  { id: 'anxious', g: '😰', name: '不安・心配', bad: true },
  { id: 'happy', g: '😊', name: 'うれしい' },
  { id: 'love', g: '🥰', name: 'しあわせ' },
  { id: 'relief', g: '😌', name: 'ほっとした' },
  { id: 'fun', g: '🎉', name: 'たのしかった' },
];

export const NFC_MOOD = 'nfc'; // NFCタグからの投稿のしるし（ルールで弾かれないよう、使っていない mood の欄に入れる）
export const NFC_KEY_LABEL = 'スペースキー'; // 展示で受け取るキー（Interactive.jsx の Space）
export const NFC_WAIT_MS = 5 * 60000; // NFCからの投稿は展示で受け取るまで待たせる。これより古いものは出さない
export function sendPost({ face, mood, text, nfc }) { // mood（きもち）は今は送らない（前の形の投稿も読めるよう残す）
  return addDoc(collection(db, COL), { face, mood: nfc ? NFC_MOOD : (mood || ''), text: (text || '').slice(0, TEXT_MAX), ts: serverTimestamp() });
}

/* since（ミリ秒）より後の投稿を受け取る。cb(id, data, tsMs) は新しい投稿ごと */
export function watchPosts(since, cb, onErr) {
  const q = query(collection(db, COL), where('ts', '>', Timestamp.fromMillis(since)), orderBy('ts'));
  return onSnapshot(q, (snap) => {
    snap.docChanges().forEach(ch => {
      if (ch.type !== 'added') return;
      const d = ch.doc.data();
      if (!d.ts) return; // サーバーの時刻が入る前（自分の書き込み）は飛ばす
      cb(ch.doc.id, d, d.ts.toMillis());
    });
  }, (e) => onErr && onErr(e));
}

/* 受け取りがエラーで切れたら（権限・通信）、少し待ってつなぎ直す。戻り値でやめる */
export function watchPostsKeep(since, cb, onErr) {
  let un = null, t = null, stop = false;
  const start = () => {
    un = watchPosts(since, cb, (e) => {
      onErr && onErr(e);
      if (un) un(); un = null;
      if (!stop) t = setTimeout(start, 5000);
    });
  };
  start();
  return () => { stop = true; clearTimeout(t); if (un) un(); };
}

/* QRコードのしるし（作った時刻入り）。展示が1分ごとに作り直し、スマホは新しいしるしで開いたときだけ投稿できる。
   サーバーで確かめるものではなく、リロード・直リンク・古いリンクでの投稿を防ぐためのもの */
export const TOKEN_FRESH_MS = 3 * 60000; // QRを読んでから開くまでの猶予
const TK = 0x5a17c3;
const sum36 = (str) => (str.split('').reduce((a, c) => a + c.charCodeAt(0) * 7, 0) % 36).toString(36);
export function makeToken() {
  const body = (Math.floor(Date.now() / 1000) ^ TK).toString(36) + Math.random().toString(36).slice(2, 6);
  return body + sum36(body);
}
export function tokenTime(tok) {
  if (!tok || tok.length < 7) return null;
  const body = tok.slice(0, -1);
  if (sum36(body) !== tok.slice(-1)) return null;
  const sec = parseInt(body.slice(0, -4), 36) ^ TK;
  return Number.isFinite(sec) ? sec * 1000 : null;
}

/* 投稿 → 落とす絵文字と数（回復ならマイナス） */
export function postDrop(d) {
  const f = FACES.find(x => x.face === d.face) || FACES[2];
  const m = MOODS.find(x => x.id === d.mood);
  if (m) return { g: m.g, n: 1, rec: !m.bad };
  return { g: f.g, n: f.n, rec: !!f.rec };
}
