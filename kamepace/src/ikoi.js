/* いこいさんのセリフ・表情の置き場。
   初期値は serifu.js。開発者の「いこいさん編集」で変えた内容は Firestore の config/ikoi（みんなに反映）に保存され、
   起動時に読み込んで初期値の上に重ねる。開発者モードの端末では、反映前の下書き（localStorage）を優先して表示する。
   セリフは key ごとの配列 [{ t: 文, f: 表情key（なし=文の言葉から自動）}]。 */
import * as S from './serifu';

/* 差し込みつきの文（{…} の部分に行動名などが入る） */
const TPL = {
  TPL_REST_TIP: ['おすすめは{休み方}です。'],
  TPL_HOME_NEXT: ['次は{予定}（{時刻}〜）です。'],
  // 次の予定の中身で言い分ける（wake.js の nextKind）。上から優先
  TPL_NEXT_OVER: ['次は{予定}（{時刻}〜）です。終わるころには、がんばりゲージが80を超えそうです。前後に休憩をはさみましょう。'],
  TPL_NEXT_MIND_HUGE: ['次は{予定}（{時刻}〜）です。心がとても疲れそうな予定ですね。終わったら、気持ちをほどく時間をとってくださいね。'],
  TPL_NEXT_BODY_HUGE: ['次は{予定}（{時刻}〜）です。体がかなり疲れそうです。水分をとって、終わったらしっかり休みましょう。'],
  TPL_NEXT_MIND_BIG: ['次は{予定}（{時刻}〜）です。気をつかいそうな予定ですね。深呼吸してからいきましょう。'],
  TPL_NEXT_BODY_BIG: ['次は{予定}（{時刻}〜）です。体を使う予定ですね。無理のないペースでいきましょう。'],
  TPL_NEXT_REC: ['次は{予定}（{時刻}〜）です。ゆっくり休んでくださいね。'],
  TPL_REVIEW_UP: ['{行動}に力を入れましたね。'],
  TPL_REVIEW_REC: ['{行動}で一番回復しましたね。'],
  TPL_REVIEW_YUTTARI_REC: ['{行動}で休憩できましたか？'],
  TPL_PLAN_HAS: ['今日の予定は{件数}件。{最初の予定}から始まります。'],
  TPL_PLAN_NONE: ['今日は予定が入っていません。'],
  TPL_PLAN_TASKS: ['タスクは{件数}件あります。'],
};

const TYPES = ['yuttari', 'hodohodo', 'michimichi', 'none'];
const TAP_SLOTS = ['morning', 'noon', 'afternoon', 'evening', 'night', 'late'];

/* key → 初期のセリフ（文字列の配列） */
export const DEFAULT_LINES = (() => {
  const d = {
    AFTER_FATIGUE: S.AFTER_FATIGUE, AFTER_RECOVER: S.AFTER_RECOVER,
    HOME_ZONE0: S.HOME_BY_ZONE[0], HOME_ZONE1: S.HOME_BY_ZONE[1],
    REST_INTRO: S.REST_INTRO, REST_TIPS: S.REST_TIPS,
    TAP_OCTOBER: S.TAP_OCTOBER, TAP_CHAT: S.TAP_CHAT, TAP_ANNOY: S.TAP_ANNOY,
    PLAN_CLOSER: S.PLAN_CLOSER,
    ...TPL,
  };
  TAP_SLOTS.forEach(k => { d['TAP_' + k] = S.TAP_TIME[k]; });
  TYPES.forEach(k => { d['REVIEW_BASE_' + k] = S.REVIEW_BASE[k]; d['REVIEW_CLOSER_' + k] = S.REVIEW_CLOSER[k]; });
  Object.keys(S.TAP_DATE).forEach(md => { d['TAP_DATE:' + md] = S.TAP_DATE[md]; });
  return d;
})();

/* 初期の表情（public/wake/ の画像） */
const FACE_LABELS = { normal: 'ふだん', piece: 'ピース', guts: 'ガッツポーズ', ok: 'OK', ng: 'NG', worry: '困り顔', sad: '悲しい顔', angry: '怒った顔', thanks: 'ありがとう', please: 'お願い', banzai: '万歳', clap: '拍手', love: 'うっとり', think: '考える', cold: '寒い' };
export const DEFAULT_FACES = Object.fromEntries(Object.entries(S.NURSE_FACES).map(([k, file]) => [k, { label: FACE_LABELS[k] || k, src: '/wake/' + encodeURIComponent(file) }]));

/* ---- いま使っている内容 ---- */
// data = { lines: { key: [{t,f}] }, faces: { key: { label, src } } }（どちらも初期値との差分だけでもよい）
let published = null, draft = null, devMode = false;
const subs = new Set();
const DRAFT_KEY = 'kame_ikoi_draft', DEV_KEY = 'kame_dev';
try { devMode = localStorage.getItem(DEV_KEY) === '1'; draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch (e) { /* ignore */ }
let cache = null; // { lines: key→[{t,f}], faces, faceOf: Map(text→f) }

function build() {
  const src = (devMode && draft) || published || {};
  const lines = {};
  Object.keys(DEFAULT_LINES).forEach(k => { lines[k] = DEFAULT_LINES[k].map(t => ({ t })); });
  Object.entries(src.lines || {}).forEach(([k, arr]) => { if (Array.isArray(arr)) lines[k] = arr.filter(x => x && typeof x.t === 'string'); });
  const faces = { ...DEFAULT_FACES, ...(src.faces || {}) };
  const faceOf = new Map();
  Object.values(lines).forEach(arr => arr.forEach(x => { if (x.f && x.t) faceOf.set(x.t, x.f); }));
  cache = { lines, faces, faceOf };
}
function changed() { cache = null; subs.forEach(fn => fn()); }
function cur() { if (!cache) build(); return cache; }

export function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
export function setPublished(data) { published = data || null; changed(); }
export function getPublished() { return published; }
export function isDev() { return devMode; }
export function setDev(on) { devMode = !!on; try { localStorage.setItem(DEV_KEY, on ? '1' : '0'); } catch (e) { /* ignore */ } changed(); }
export function getDraft() { return draft; }
export function setDraft(data) { draft = data || null; try { if (draft) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); else localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ } changed(); }
/* みんなに反映されている版（初期値＋config/ikoi）の全セリフ・全表情。反映前の「変更点」を出すのに使う */
export function publishedSnapshot() {
  const lines = {};
  Object.keys(DEFAULT_LINES).forEach(k => { lines[k] = DEFAULT_LINES[k].map(t => ({ t })); });
  Object.entries((published && published.lines) || {}).forEach(([k, arr]) => { if (Array.isArray(arr)) lines[k] = arr.filter(x => x && typeof x.t === 'string'); });
  return { lines, faces: { ...DEFAULT_FACES, ...((published && published.faces) || {}) } };
}
/* 編集のもとにする、いま表示中の全セリフ・全表情 */
export function snapshot() { const c = cur(); return { lines: JSON.parse(JSON.stringify(c.lines)), faces: { ...c.faces } }; }

/* ---- セリフを使う側 ---- */
export function lines(key) { const a = cur().lines[key]; return a ? a.map(x => x.t) : (DEFAULT_LINES[key] || []); }
export function dateKeys() { return Object.keys(cur().lines).filter(k => k.startsWith('TAP_DATE:') && cur().lines[k].length).map(k => k.slice(9)); }
export function fill(tpl, vals) { return (tpl || '').replace(/\{([^}]+)\}/g, (m, k) => (vals[k] != null ? vals[k] : m)); }
export function faces() { return cur().faces; }
export function faceSrc(key) { const f = cur().faces[key] || cur().faces.normal; return f.src; }

/* 文に合う表情の画像。セリフに表情を指定していればそれ（文の先頭に近い部分のもの）、なければ言葉から自動 */
export function faceKeyFor(text) {
  const t = text || '', { faceOf, faces: fs } = cur();
  if (faceOf.has(t) && fs[faceOf.get(t)]) return faceOf.get(t);
  let best = null, at = Infinity;
  faceOf.forEach((f, line) => { if (!fs[f] || line.length < 4) return; const i = t.indexOf(line); if (i >= 0 && i < at) { at = i; best = f; } });
  if (best) return best;
  const rule = S.FACE_RULES.find(([re]) => re.test(t));
  return rule && fs[rule[1]] ? rule[1] : 'normal';
}

/* 表示しているセリフ（いくつかをつないだ文もある）から、元になったセリフを探す。
   差し込みつきの文（{行動} など）は、差し込みの部分を何にでも合うようにして探す。文の前から順に返す */
export function findLines(text) {
  const t = text || '', out = [];
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  Object.entries(cur().lines).forEach(([key, arr]) => arr.forEach((x, idx) => {
    if (!x.t) return;
    let at = -1, len = x.t.length;
    if (x.t.includes('{')) {
      // 差し込みつき: 文全体が合うか確かめ、位置は「差し込みでない部分」で数える（差し込み部分がほかのセリフを飲み込まないように）
      const parts = x.t.split(/\{[^}]+\}/), lit = parts.filter(Boolean).sort((p, q) => q.length - p.length)[0] || '';
      const re = new RegExp(parts.map(esc).join('.+?'));
      if (lit && re.test(t)) { at = t.indexOf(lit); len = lit.length; }
    } else at = t.indexOf(x.t);
    if (at >= 0) out.push({ key, idx, t: x.t, at, len });
  }));
  // 同じ場所に重なるもの（短い方）は外す
  out.sort((a, b) => a.at - b.at || b.len - a.len);
  return out.filter((m, i) => !out.some((o, j) => j !== i && o.at <= m.at && o.at + o.len >= m.at + m.len && o.len > m.len));
}
