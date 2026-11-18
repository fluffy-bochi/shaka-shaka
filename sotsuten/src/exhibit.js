/* 卒展用のデータ: 過去の日はサンプルのペルソナ（デザイン学部2年・本体の sample.js）、
   今日は来場者が数字キーで降らせた絵文字を記録として持つ。保存はしない（リセット・再読み込みで消える）。
   ホームのタイムラインは本体 App.jsx の homePosts() を、ここで使うぶんだけ移したもの。 */
import { buildAcademicYear, academicYearOf } from './sample';
import { SLOTS, slotOfEntry, slotForNow } from './data';
import { todayStr, shiftDate, pad2, hmToTsOn, entryStartTs, entryEndTs, entryGlyph, entryMin, dateToStr } from './model';

/* 数字キー → 今日の記録。顔（1〜5）はつぶやき（きもち）、6〜0は行動 */
export const KEY_REC = {
  1: { title: 'きもち', tweet: true, mind: 1 },
  2: { title: 'きもち', tweet: true, mind: 2 },
  3: { title: 'きもち', tweet: true, mind: 3 },
  4: { title: 'きもち', tweet: true, mind: 4 },
  5: { title: 'きもち', tweet: true, mind: 5 },
  6: { title: '制作' },
  7: { title: 'パソコン作業' },
  8: { title: '食事' },
  9: { title: '発表' },
  0: { title: '仮眠' },
};
export const GROUP_GAP_MS = 3 * 60000; // 前に押してからこの時間がたったら、ホームで別の塊（投稿）にする

const nowHm = (ts) => {
  const t = todayStr(), ms = (ts || Date.now()) - hmToTsOn(t, '00:00');
  const m = Math.max(0, Math.floor(ms / 60000));
  return pad2(Math.floor(m / 60)) + ':' + pad2(m % 60);
};

/* 来場者の記録に1回ぶん足す。続けて押したぶんは1つの塊（gid）にまとめ、塊の中の同じキーは数を足す。
   前に押してから GROUP_GAP_MS あいたら新しい塊 */
export function addPress(list, key, glyph, n, rec) {
  const k = KEY_REC[key]; if (!k) return list;
  const d = (rec ? -1 : 1) * n, hm = nowHm(), now = Date.now();
  const keys = list.filter(e => e.key !== 'post'); // スマホの投稿は数字キーの塊に入れない
  const lastAt = keys.reduce((a, e) => Math.max(a, e.at || 0), 0);
  const last = keys[keys.length - 1];
  const gid = last && now - lastAt < GROUP_GAP_MS ? last.gid : 'g' + now;
  const i = list.findIndex(e => e.gid === gid && e.key === key);
  if (i >= 0) {
    const e = list[i];
    return [...list.slice(0, i), { ...e, delta: e.delta + d, to: hm, at: now }, ...list.slice(i + 1)];
  }
  return [...list, {
    key, gid, at: now, date: todayStr(), from: hm, to: hm, title: k.title, glyph, delta: d,
    exp: false, ...(k.tweet ? { event: true, moodLabel: 'きもち', mindCond: k.mind } : {}),
  }];
}

/* スマホからのつぶやき1件を記録に（1件ずつ別の投稿。本文はコメントとして出る） */
export function addPost(list, id, d, ts, drop) {
  if (list.some(e => e.gid === 'p' + id)) return list;
  return [...list, {
    key: 'post', gid: 'p' + id, at: ts, date: todayStr(), from: nowHm(ts), to: '', title: 'つぶやき', moodLabel: 'つぶやき',
    glyph: drop.g, delta: (drop.rec ? -1 : 1) * drop.n, note: d.text || '', event: true, mindCond: d.face, exp: false,
  }];
}

/* サンプル（今日より前だけ）。表示に使う学年ぶんを作ってまとめる */
const cache = {};
export function sampleFor(dateStrs) {
  const today = todayStr();
  const out = { entries: [], diary: {}, fav: {}, collected: [], balance: {}, wake: {} };
  const ays = new Set(dateStrs.map(academicYearOf));
  [...ays].sort().forEach(ay => {
    if (!cache[ay]) cache[ay] = buildAcademicYear(ay, { cycleOn: false });
    const s = cache[ay];
    s.entries.forEach(e => { if (e.date < today) out.entries.push(e); });
    Object.entries(s.diary || {}).forEach(([d, v]) => { if (d < today) out.diary[d] = v; });
    Object.entries(s.fav || {}).forEach(([d, v]) => { if (d < today) out.fav[d] = v; });
    (s.collected || []).forEach(c => { if (c.ts && dateToStr(new Date(c.ts)) < today) out.collected.push(c); });
    Object.entries(s.balanceByDay || {}).forEach(([d, v]) => { if (d < today) out.balance[d] = v; });
    Object.entries(s.wakeByDay || {}).forEach(([d, w]) => { if (d < today) out.wake[d] = { date: d, ts: hmToTsOn(d, '00:00') + w.min * 60000, cond: w.cond, mood: w.mood }; });
  });
  return out;
}

export const slotNow = () => {
  const h = Math.floor((Date.now() - hmToTsOn(todayStr(), '00:00')) / 3600000);
  return h >= 24 ? 'yoru' : slotForNow();
};

/* ホームのタイムライン（本体 homePosts の表示部分）。タップ・メニューは展示では何もしない */
export function homeRows(entries, wakeLog, collected, d) {
  const today = todayStr();
  const noop = () => {};
  const rows = entries.map((e, i) => ({ e, i })).filter(({ e }) => e.date === d && !e.exp && !e.wakeAdd);
  const groups = {}, order = [];
  rows.forEach(({ e, i }) => {
    const k = e.gid || (e.plan ? 'plan:' + e.plan : 'one:' + i);
    if (!groups[k]) { groups[k] = []; order.push(k); }
    groups[k].push({ e, i });
  });
  const condRecs = [
    ...wakeLog.map(w => ({ ts: w.ts, cond: w.cond, mood: w.mood })),
    ...entries.filter(e => !e.exp && e.event && (e.cond != null || e.mindCond != null) && e.from).map(e => ({ ts: entryStartTs(e), cond: e.cond, mood: e.mindCond })),
  ].filter(x => x.ts).sort((a, b) => a.ts - b.ts);
  const arrow0 = (cur, prev) => (cur == null || prev == null ? '' : cur > prev ? '↑' : cur < prev ? '↓' : '→');
  const condOf = (rec) => {
    const before = condRecs.filter(x => x.ts < rec.ts);
    const pc = [...before].reverse().find(x => x.cond != null), pm = [...before].reverse().find(x => x.mood != null);
    return { body: rec.cond, mind: rec.mood, temp: rec.temp, bodyArrow: arrow0(rec.cond, pc && pc.cond), mindArrow: arrow0(rec.mood, pm && pm.mood) };
  };
  const sg = (n) => (n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '±0');
  const hmText = (hm) => (hm || '').replace(/^0(\d)/, '$1');
  const posts = order.map(k => {
    const list = groups[k].sort((a, b) => (a.e.from || '').localeCompare(b.e.from || ''));
    const es = list.map(x => x.e);
    const first = es[0];
    const cnt = {}; es.forEach(e => { cnt[e.title] = (cnt[e.title] || 0) + 1; });
    let top = es[0]; es.forEach(e => { if (cnt[e.title] > cnt[top.title]) top = e; });
    const durOf = {}; es.forEach(e => { durOf[e.title] = (durOf[e.title] || 0) + (entryMin(e) || 0); });
    let longest = es[0]; es.forEach(e => { if (durOf[e.title] > durOf[longest.title]) longest = e; });
    // まとめた塊は、いちばん数の多かった記録を見出し・アイコンに（同じなら先に押したもの）
    let big = es[0]; es.forEach(e => { if (Math.abs(e.delta || 0) > Math.abs(big.delta || 0)) big = e; });
    if (es.length > 1) { top = big; longest = big; }
    const label = (es.find(e => e.postTitle) || {}).postTitle || (es.length > 1 ? top.title : first.moodLabel || first.plan || top.title);
    const note = (es.find(e => e.note) || {}).note || '';
    const from = first.from || '';
    const lastEnd = es.filter(e => e.to).sort((a, b) => entryEndTs(b) - entryEndTs(a))[0];
    const to = lastEnd ? lastEnd.to : '';
    const sum = es.reduce((a, e) => a + (e.delta || 0), 0);
    const isTweet = es.length === 1 && first.event;
    return {
      cond: null, // 卒展では気分（♡）は出さない
      key: k, sortHm: from, slot: slotOfEntry(first),
      glyph: entryGlyph(longest), head: label, time: hmText(from) + (!isTweet && to && to !== from ? '〜' + hmText(to) : ''), main: note, isNote: !!note,
      sumText: isTweet && !sum ? '' : sg(sum), planned: false,
      items: es.length > 1 ? es.map(e => ({ glyph: entryGlyph(e), name: e.title, sumText: sg(e.delta || 0), color: '#d8d5cb' })) : [],
      onTap: noop, onMenu: noop,
    };
  });
  // 起床後・就寝前の記録は展示では出さない
  const nowSlot = d === today ? slotNow() : null;
  posts.forEach(p => { p.past = !!nowSlot && p.kind !== 'bed' && p.slot !== nowSlot; });
  posts.sort((a, b) => (a.sortHm || '').localeCompare(b.sortHm || ''));
  const out = [];
  SLOTS.forEach(sl => {
    out.push({ divider: true, key: 'div:' + sl.id, slot: sl.id, name: sl.name });
    posts.filter(p => p.slot === sl.id).forEach(p => out.push(p));
    out.push({ addRec: true, key: 'add:' + sl.id, slot: sl.id, onAdd: noop });
  });
  return out;
}

export const WD = ['日', '月', '火', '水', '木', '金', '土'];

/* その日の時期に合わせた日付の横のひとこと（卒業研究の締め切り一覧より）。
   〜12/8 提出 → 〜12/23 発表（公開審査会1日目） → 〜1/12 修正締切 → 〜2/13 展示開始まで → 学内展（仮 2/14〜2/21）は何日目。どれでもない日は '' */
export const EXHIBIT = { from: '2027-02-14', to: '2027-02-21' };
const STAGES = [
  { until: '2026-12-08', name: '提出' },
  { until: '2026-12-23', name: '発表' },
  { until: '2027-01-12', name: '修正締切' },
];
const dayDiff = (a, b) => Math.round((new Date(b + 'T00:00') - new Date(a + 'T00:00')) / 86400000);
export function exhibitDayLabel(d) {
  if (d >= EXHIBIT.from && d <= EXHIBIT.to) {
    const total = dayDiff(EXHIBIT.from, EXHIBIT.to) + 1;
    return d === EXHIBIT.to ? '展示最終日/' + total + '日間' : '展示' + (dayDiff(EXHIBIT.from, d) + 1) + '日目/' + total + '日間';
  }
  const st = STAGES.find(x => d <= x.until);
  if (!st) return d < EXHIBIT.from ? '展示開始まであと' + dayDiff(d, EXHIBIT.from) + '日' : ''; // 修正締切の次の日〜展示の前日
  const n = dayDiff(d, st.until);
  return n === 0 ? '今日が' + st.name : st.name + 'まであと' + n + '日';
}

export { todayStr, shiftDate };
