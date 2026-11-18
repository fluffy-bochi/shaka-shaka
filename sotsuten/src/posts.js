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

export function sendPost({ face, mood, text }) { // mood（きもち）は今は送らない（前の形の投稿も読めるよう残す）
  return addDoc(collection(db, COL), { face, mood: mood || '', text: (text || '').slice(0, TEXT_MAX), ts: serverTimestamp() });
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

/* 投稿 → 落とす絵文字と数（回復ならマイナス） */
export function postDrop(d) {
  const f = FACES.find(x => x.face === d.face) || FACES[2];
  const m = MOODS.find(x => x.id === d.mood);
  if (m) return { g: m.g, n: 1, rec: !m.bad };
  return { g: f.g, n: f.n, rec: !!f.rec };
}
