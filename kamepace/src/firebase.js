/* Firebase ログイン・Firestore 同期・Google カレンダー/ToDo 取り込み
   （reference/index.html の module script から移植。データ形式は旧本番と同期互換） */
import { initializeApp } from 'firebase/app';
import {
  getAuth, onAuthStateChanged, signOut as fbSignOut,
  GoogleAuthProvider, signInWithPopup,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  linkWithPopup, reauthenticateWithPopup,
} from 'firebase/auth';
import {
  initializeFirestore, persistentLocalCache, doc, getDoc, setDoc,
} from 'firebase/firestore';
import { serialize } from './model';

const firebaseConfig = {
  apiKey: 'AIzaSyDY69_fbIy9rcWUSj6tLc5kMq6bb3nlYzI',
  authDomain: 'do-our-best-in-moderation-tool.firebaseapp.com',
  projectId: 'do-our-best-in-moderation-tool',
  storageBucket: 'do-our-best-in-moderation-tool.firebasestorage.app',
  messagingSenderId: '323614318907',
  appId: '1:323614318907:web:5ee2ead7150a7d3743d71e',
  measurementId: 'G-J0ETSC15KT',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// オフラインでも直近データを表示できるようローカルキャッシュを有効化
const db = initializeFirestore(app, { localCache: persistentLocalCache() });
const googleProvider = new GoogleAuthProvider();
// カレンダー/ToDo取り込み用（読み取り権限つき）。ログインとは分けて、連携時だけ許可を求める
const calendarProvider = new GoogleAuthProvider();
calendarProvider.addScope('https://www.googleapis.com/auth/calendar.readonly');
calendarProvider.addScope('https://www.googleapis.com/auth/tasks.readonly');
let googleAccessToken = null;

export function jpError(code) {
  switch (code) {
    case 'auth/invalid-email': return 'メールアドレスの形式が正しくありません。';
    case 'auth/missing-password': return 'パスワードを入力してください。';
    case 'auth/weak-password': return 'パスワードは6文字以上にしてください。';
    case 'auth/email-already-in-use': return 'このメールアドレスは既に登録済みです。「ログイン」を試してください。';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found': return 'メールアドレスまたはパスワードが違います。';
    case 'auth/popup-closed-by-user': return 'ログイン画面が閉じられました。';
    case 'auth/popup-blocked': return 'ポップアップがブロックされました。ブラウザの設定をご確認ください。';
    case 'auth/credential-already-in-use': return 'このログイン方法は既に別のアカウントで使われています。';
    case 'auth/account-exists-with-different-credential':
      return 'このメールは別のログイン方法で登録済みです。先にその方法でログインし、設定から連携してください。';
    case 'auth/network-request-failed': return '通信エラーです。接続を確認してください。';
    default: return 'エラーが発生しました（' + code + '）。';
  }
}

export function watchAuth(cb) { return onAuthStateChanged(auth, cb); }
export async function loginGoogle() { await signInWithPopup(auth, googleProvider); }
export async function loginEmail(email, pass) { await signInWithEmailAndPassword(auth, email, pass); }
export async function signupEmail(email, pass) { await createUserWithEmailAndPassword(auth, email, pass); }
export async function logout() { googleAccessToken = null; await fbSignOut(auth); }

/* ---- Firestore sync ---- */
function userDoc() { return doc(db, 'users', auth.currentUser.uid); }
let saveTimer = null;
export function cloudSave(st) {
  if (!auth.currentUser) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    // ユーザーごと（users/{uid}）に「日にち→予定・行動／task」の親子構造で保存
    setDoc(userDoc(), serialize(st)).catch(err => console.warn('[kamepace] save failed', err));
  }, 600);
}

export async function loadUserData() {
  const snap = await getDoc(userDoc());
  return snap.exists() ? snap.data() : null;
}

/* ---- Google Calendar / Tasks import ---- */
function pad2m(n) { return String(n).padStart(2, '0'); }
function hm(d) { return pad2m(d.getHours()) + ':' + pad2m(d.getMinutes()); }
function ymd(d) { return d.getFullYear() + '-' + pad2m(d.getMonth() + 1) + '-' + pad2m(d.getDate()); }
function sameDay(a, b) { return ymd(a) === ymd(b); }

async function ensureGoogleToken() {
  if (googleAccessToken) return googleAccessToken;
  const u = auth.currentUser;
  if (!u) return null;
  const hasGoogle = u.providerData.some(p => p.providerId === 'google.com');
  // Googleログイン済みなら再認証、メール/パスワードのみなら連携してトークン取得
  const result = hasGoogle
    ? await reauthenticateWithPopup(u, calendarProvider)
    : await linkWithPopup(u, calendarProvider);
  const cred = GoogleAuthProvider.credentialFromResult(result);
  googleAccessToken = (cred && cred.accessToken) || null;
  return googleAccessToken;
}

async function fetchCalendarToday(token) {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
    + '?timeMin=' + encodeURIComponent(start.toISOString())
    + '&timeMax=' + encodeURIComponent(end.toISOString())
    + '&singleEvents=true&orderBy=startTime';
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  if (!res.ok) throw new Error('calendar ' + res.status);
  const data = await res.json();
  return (data.items || [])
    .filter(ev => ev.status !== 'cancelled')
    .map(ev => {
      const allDay = !(ev.start && ev.start.dateTime);
      const s = ev.start && (ev.start.dateTime || (ev.start.date ? ev.start.date + 'T00:00:00' : null));
      const e = ev.end && (ev.end.dateTime || (ev.end.date ? ev.end.date + 'T00:00:00' : null));
      const sd = s ? new Date(s) : new Date();
      const ed = e ? new Date(e) : sd;
      return {
        srcId: 'cal:' + ev.id,
        title: ev.summary || '(無題の予定)',
        date: ymd(sd),
        from: allDay ? '00:00' : hm(sd),
        to: allDay ? '23:59' : hm(ed),
      };
    });
}

async function fetchTasksToday(token) {
  const url = 'https://tasks.googleapis.com/tasks/v1/lists/@default/tasks?showCompleted=false&maxResults=100';
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  if (!res.ok) throw new Error('tasks ' + res.status);
  const data = await res.json();
  const now = new Date();
  return (data.items || [])
    .filter(t => t.due && sameDay(new Date(t.due), now)) // 今日が期限のToDo
    .map(t => ({
      srcId: 'task:' + t.id,
      title: t.title || '(無題のToDo)',
      date: ymd(now),
      from: '00:00',
      to: '23:59', // 時刻が無いので終日扱い → 1日の終わりに自動記録
    }));
}

/* 取り込み実行。{cal, tasks} の生アイテムを返す（entriesへの反映は呼び出し側） */
export async function fetchGoogleData() {
  const token = await ensureGoogleToken();
  if (!token) throw new Error('no-token');
  const [cal, tasks] = await Promise.all([
    fetchCalendarToday(token).catch(e => { console.warn('[kamepace] calendar', e); return []; }),
    fetchTasksToday(token).catch(e => { console.warn('[kamepace] tasks', e); return []; }),
  ]);
  return { cal, tasks };
}
