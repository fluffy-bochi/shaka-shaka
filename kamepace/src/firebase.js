/* Firebase ログイン・Firestore 同期・Google カレンダー/ToDo 取り込み
   （reference/index.html の module script から移植。データ形式は旧本番と同期互換） */
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth, onAuthStateChanged, signOut as fbSignOut,
  GoogleAuthProvider, signInWithPopup,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  linkWithPopup, reauthenticateWithPopup,
} from 'firebase/auth';
import {
  initializeFirestore, persistentLocalCache, doc, getDoc, setDoc,
  collection, query, where, getDocs, Timestamp, writeBatch, deleteDoc, updateDoc,
} from 'firebase/firestore';
import { serialize } from './model';

/* カレンダーアプリ(my-schedule-app)と同じFirebaseプロジェクトに統合（2026-07-15合意の引っ越し）。
   同じアカウント(uid)でログインでき、カレンダーの予定・タスクをFirestoreから直接読める */
const firebaseConfig = {
  apiKey: 'AIzaSyBiyucoP28Cou_Aqqqxz2qnSXU1mcConLA',
  authDomain: 'studio-9921986470-57994.firebaseapp.com',
  projectId: 'studio-9921986470-57994',
  storageBucket: 'studio-9921986470-57994.firebasestorage.app',
  messagingSenderId: '446667309305',
  appId: '1:446667309305:web:8c126317232039788ea228',
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

/* ---- Firestore sync ----
   カレンダーアプリは users/{uid}/ 配下のサブコレクション(events, projectTasks, dailyData…)を使うので、
   かめペースのデータは users/{uid}/apps/kamepace に置いて衝突を避ける */
function userDoc() { return doc(db, 'users', auth.currentUser.uid, 'apps', 'kamepace'); }
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

/* ---- カレンダーアプリ(my-schedule-app)からの取り込み ----
   同じFirebaseプロジェクトなので、Firestoreの users/{uid}/events を直接読む。
   取り込んだ予定は既存の importEvents 経由で「予定」になり、終了時刻で自動記録される */
const tsToDate = (v) => (v && typeof v.toDate === 'function') ? v.toDate() : (v ? new Date(v) : null);
export async function fetchScheduleEvents(dayCount = 2) {
  if (!auth.currentUser) return [];
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + dayCount); // 今日+明日
  const col = collection(db, 'users', auth.currentUser.uid, 'events');
  const q = query(col, where('start', '>=', Timestamp.fromDate(start)), where('start', '<', Timestamp.fromDate(end)));
  const snap = await getDocs(q);
  const out = [];
  snap.forEach((d) => {
    const ev = d.data();
    const s = tsToDate(ev.start), e = tsToDate(ev.end) || s;
    if (!s) return;
    // 睡眠ブロック・時報・予測は取り込まない（記録の対象にならないもの）
    if (ev.blockType === 'sleep' || ev.blockType === 'chime' || ev.isPredicted) return;
    out.push({
      srcId: 'sched:' + d.id,
      title: ev.title || '(無題の予定)',
      date: ymd(s),
      from: hm(s),
      to: hm(e),
    });
  });
  out.sort((a, b) => (a.date + a.from).localeCompare(b.date + b.from));
  return out;
}

/* mylifecore のタスク（projectTasks）: 未完了で日付が紐づいているもの（assignedDate or 締切）を
   今日〜+7日ぶん取り込む。各タスクにその日付(date)を付けるので、かめペース側でも日付ごとに表示される。
   前日以前（期限切れ）は取り込まない。 */
export async function fetchScheduleTasks(days = 8) {
  if (!auth.currentUser) return [];
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const horizon = new Date(start); horizon.setDate(horizon.getDate() + days - 1);
  const t0 = ymd(start), tH = ymd(horizon);
  const col = collection(db, 'users', auth.currentUser.uid, 'projectTasks');
  const snap = await getDocs(query(col, where('completed', '==', false)));
  const out = [];
  snap.forEach((d) => {
    const t = d.data();
    const dl = tsToDate(t.deadline);
    const dlKey = dl ? ymd(dl) : null;
    // 紐づく日付＝assignedDate を優先、無ければ締切。今日〜horizon の範囲のものだけ取り込む。
    const dateKey = (t.assignedDate && t.assignedDate >= t0 && t.assignedDate <= tH) ? t.assignedDate
      : (dlKey && dlKey >= t0 && dlKey <= tH) ? dlKey : null;
    if (dateKey) out.push({ srcId: 'ptask:' + d.id, title: t.title || '(無題のタスク)', date: dateKey });
  });
  return out;
}

/* mylifecore の「毎日のページ」タスク（dailyData/{yyyy-MM-dd}.tasks）を今日〜+7日ぶん読む。
   mylifecore は Googleタスク・終日予定もここに取り込むので、それらも自動で入る */
export async function fetchDailyTasks(days = 8) {
  if (!auth.currentUser) return [];
  const uid = auth.currentUser.uid;
  const out = [];
  const reads = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    const key = ymd(d);
    reads.push(getDoc(doc(db, 'users', uid, 'dailyData', key)).then((snap) => {
      if (!snap.exists()) return;
      const data = snap.data() || {};
      // mylifecore は毎日ページのメインのタスクを taskList に、終日予定由来を tasks に入れる。両方読む。
      const arr = [...(data.taskList || []), ...(data.tasks || [])];
      const seen = new Set();
      arr.forEach((t) => {
        if (!t || !t.title) return;
        const id = t.id || t.title;
        if (seen.has(id)) return; seen.add(id);
        out.push({ srcId: 'daily:' + key + ':' + id, title: t.title, date: key, done: !!t.completed });
      });
    }).catch(() => { /* その日のdocが無い等は無視 */ }));
  }
  await Promise.all(reads);
  return out;
}

/* かめペースでチェックしたら mylifecore の毎日ページ側も完了にする */
export async function completeDailyTask(dateKey, taskId) {
  if (!auth.currentUser) return;
  const ref = doc(db, 'users', auth.currentUser.uid, 'dailyData', dateKey);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data() || {};
  const patch = {};
  // taskList / tasks のどちらに入っていても完了にする（mylifecore はメインを taskList に保存）
  if ((data.taskList || []).some((t) => t.id === taskId)) {
    patch.taskList = data.taskList.map((t) => (t.id === taskId ? { ...t, completed: true } : t));
  }
  if ((data.tasks || []).some((t) => t.id === taskId)) {
    patch.tasks = data.tasks.map((t) => (t.id === taskId ? { ...t, completed: true } : t));
  }
  if (Object.keys(patch).length) await setDoc(ref, patch, { merge: true });
}

/* かめペースでチェックしたら mylifecore 側のタスクも完了にする */
export async function completeScheduleTask(taskId) {
  if (!auth.currentUser) return;
  await setDoc(doc(db, 'users', auth.currentUser.uid, 'projectTasks', taskId),
    { completed: true, completedAt: new Date() }, { merge: true });
}

/* 検証用: カレンダーアプリ形式の予定を1件書き込む（自分のuid配下のみ） */
export async function _seedScheduleEvent(title, startMs, endMs) {
  if (!auth.currentUser) throw new Error('not-signed-in');
  const id = 'kame-test-' + Date.now();
  await setDoc(doc(db, 'users', auth.currentUser.uid, 'events', id), {
    title, start: Timestamp.fromMillis(startMs), end: Timestamp.fromMillis(endMs), category: 'Other',
  });
  return id;
}

/* 検証用: mylifecore形式のタスクを1件書き込む */
export async function _seedScheduleTask(title, assignedDate) {
  if (!auth.currentUser) throw new Error('not-signed-in');
  const id = 'kame-test-task-' + Date.now();
  await setDoc(doc(db, 'users', auth.currentUser.uid, 'projectTasks', id), {
    projectId: 'kame-test', title, completed: false, assignedDate: assignedDate || ymd(new Date()),
  });
  return id;
}

/* 検証用: mylifecoreの毎日ページ形式のタスクを書き込む */
export async function _seedDailyTasks(dateKey, titles, completedIdx = -1) {
  if (!auth.currentUser) throw new Error('not-signed-in');
  const tasks = titles.map((title, i) => ({ id: 'kame-test-' + Date.now() + '-' + i, title, completed: i === completedIdx, indent: 0, order: i }));
  await setDoc(doc(db, 'users', auth.currentUser.uid, 'dailyData', dateKey), { tasks }, { merge: true });
  return tasks.map(t => t.id);
}

// 検証用フック（読み書きは自分のuid配下のみ）
if (typeof window !== 'undefined') window.__kameFb = { _seedScheduleEvent, _seedScheduleTask, _seedDailyTasks, loadUserData, fetchScheduleEvents, fetchScheduleTasks, fetchDailyTasks };

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

/* ---- いこいさんのセリフ・表情（みんな共通）: config/ikoi ----
   { lines: {key:[{t,f}]}, faces: {key:{label, img:true}}, prev: 1つ前の版, updatedAt }。
   追加した表情の画像（dataURL）は1枚ずつ config/ikoiFace_<key> に置く（1ドキュメント1MBの上限を避ける）。
   書き込みは Firestore のルールで開発者だけに許可する */
const ikoiDoc = () => doc(db, 'config', 'ikoi');
async function resolveFaces(faces) {
  const out = {};
  await Promise.all(Object.entries(faces || {}).map(async ([k, f]) => {
    if (!f) return;
    if (f.img) { const s = await getDoc(doc(db, 'config', 'ikoiFace_' + k)); if (s.exists()) out[k] = { label: f.label, src: s.data().src }; }
    else if (f.src) out[k] = { label: f.label, src: f.src };
  }));
  return out;
}
export async function loadIkoi() {
  const snap = await getDoc(ikoiDoc());
  if (!snap.exists()) return null;
  const d = snap.data();
  return { lines: d.lines || {}, faces: await resolveFaces(d.faces), hasPrev: !!d.prev, updatedAt: d.updatedAt || 0 };
}
const cleanLines = (lines) => Object.fromEntries(Object.entries(lines || {}).map(([k, arr]) => [k, (arr || []).map(x => (x.f ? { t: x.t, f: x.f } : { t: x.t }))]));
export async function publishIkoi(data) {
  const faces = {};
  for (const [k, f] of Object.entries(data.faces || {})) {
    if (f.src && f.src.startsWith('data:')) { await setDoc(doc(db, 'config', 'ikoiFace_' + k), { src: f.src }); faces[k] = { label: f.label, img: true }; }
    else if (f.src) faces[k] = { label: f.label, src: f.src };
  }
  const snap = await getDoc(ikoiDoc());
  let prev = null;
  if (snap.exists()) { const { prev: _p, ...cur } = snap.data(); prev = cur; } // eslint-disable-line no-unused-vars
  await setDoc(ikoiDoc(), { lines: cleanLines(data.lines), faces, prev, updatedAt: Date.now(), by: auth.currentUser ? auth.currentUser.uid : '' });
}
/* 1つ前の版に戻す（いまの版は prev に入れるので、もう一度押すと元に戻る） */
export async function revertIkoi() {
  const snap = await getDoc(ikoiDoc());
  if (!snap.exists() || !snap.data().prev) return false;
  const { prev, ...cur } = snap.data();
  await setDoc(ikoiDoc(), { ...prev, prev: cur, updatedAt: Date.now(), by: auth.currentUser ? auth.currentUser.uid : '' });
  return true;
}

/* ---- 研究への協力（参加者コード）: research/{code} と research/{code}/days/{日付} ----
   本人（uid が一致）だけが書ける・研究者（開発者）だけが読める（Firestore のルール） */
const rDoc = (code) => doc(db, 'research', code);
/* 参加する。同じコードを別の人が使っていれば permission-denied になる */
export async function researchJoin(code) {
  const uid = auth.currentUser.uid;
  await setDoc(rDoc(code), { code, uid, active: true, consentAt: Date.now(), updatedAt: Date.now() }, { merge: true });
}
export async function researchPutDays(code, days) {
  const ds = Object.entries(days);
  for (let i = 0; i < ds.length; i += 400) {
    const b = writeBatch(db);
    ds.slice(i, i + 400).forEach(([d, v]) => b.set(doc(db, 'research', code, 'days', d), v));
    b.update(rDoc(code), { updatedAt: Date.now(), active: true });
    await b.commit();
  }
}
export async function researchStop(code) { await updateDoc(rDoc(code), { active: false, updatedAt: Date.now() }); }
/* 送ったデータを全部消す（日ごとのドキュメント→本体） */
export async function researchDelete(code) {
  const snap = await getDocs(collection(db, 'research', code, 'days'));
  for (let i = 0; i < snap.docs.length; i += 400) {
    const b = writeBatch(db);
    snap.docs.slice(i, i + 400).forEach(d => b.delete(d.ref));
    await b.commit();
  }
  await deleteDoc(rDoc(code));
}
/* 研究者用: 全参加者と日ごとの集計 */
export async function researchLoadAll() {
  const ps = await getDocs(collection(db, 'research'));
  return Promise.all(ps.docs.map(async (p) => {
    const ds = await getDocs(collection(db, 'research', p.id, 'days'));
    const days = {}; ds.docs.forEach(d => { days[d.id] = d.data(); });
    const { uid, ...meta } = p.data(); // eslint-disable-line no-unused-vars
    return { code: p.id, ...meta, days };
  }));
}

/* 研究の期間（参加者コードの頭のアルファベットごと）: config/research = { periods: { A: { label, start, end }, ... } }。
   誰でも読める・書けるのは開発者だけ（config のルール） */
export async function loadResearchConfig() {
  const s = await getDoc(doc(db, 'config', 'research'));
  return s.exists() ? s.data() : { periods: {} };
}
export async function saveResearchConfig(cfg) { await setDoc(doc(db, 'config', 'research'), { ...cfg, updatedAt: Date.now() }); }

/* ---- 実験番号でログイン ----
   実験番号（A01 など）を、ログイン用のメールアドレス（a01@exp.hodohodo.app）に置きかえて、メール＋パスワードのログインを使う。
   参加者のアカウントは研究者が先に作っておく（別の Firebase アプリのインスタンスで作るので、研究者のログインはそのまま） */
const CODE_DOMAIN = 'exp.hodohodo.app';
export const codeEmail = (code) => (code || '').trim().toLowerCase() + '@' + CODE_DOMAIN;
export const codeOfEmail = (email) => { const m = /^([a-z][0-9]{2})@exp\.hodohodo\.app$/.exec(email || ''); return m ? m[1].toUpperCase() : null; };
export async function loginCode(code, pass) { await signInWithEmailAndPassword(auth, codeEmail(code), pass); }
export async function createParticipantAccount(code, pass) {
  const sec = getApps().find(a => a.name === 'kame-admin') || initializeApp(firebaseConfig, 'kame-admin');
  const secAuth = getAuth(sec);
  await createUserWithEmailAndPassword(secAuth, codeEmail(code), pass);
  await fbSignOut(secAuth);
}
