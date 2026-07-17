/* 本棚タイムライン用のデータ導出＋配置ジオメトリ。
   既存の entries(from→to)/tasks を無改造で使い、日ごとの絵文字列・時間帯・円グラフ・月まとめを構成する。
   仕様: design_handoff_bookshelf/指示書.md（#1a 縦・#3a 横）。 */
import { SLOTS, slotOfEntry } from './data';
import { entryGlyph, sortEntries, strToDate, todayStr, pad2 } from './model';

const WD = ['日', '月', '火', '水', '木', '金', '土'];
export const PALETTE = ['#c4f000', '#ff5fa2', '#e8842c', '#7a9a00', '#f0c24b', '#a08cd0', '#6fb8a0', '#c9c5b8'];

/* 決定論的な擬似乱数（日付シードで毎回同じ配置になる） */
function rng(seed) { let s = ((seed % 233280) + 233280) % 233280; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
function seedOf(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; }

export function isoWeek(d) {
  const t = new Date(d); t.setHours(0, 0, 0, 0);
  t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
  const w1 = new Date(t.getFullYear(), 0, 4);
  return 1 + Math.round(((t - w1) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7);
}

/* 背表紙ジオメトリ（絵文字1個の間隔・ゆらぎ）。モック #1a/#3a の値。 */
export const GEO_PORT = { x0: 11, jx: 10, pitch: 13, rot: 13, y0: 5, w: 18, fs: 17 }; // 41x168
export const GEO_LAND = { x0: 16, jx: 15, pitch: 21, rot: 12, y0: 8, w: 28, fs: 26 }; // 66x250

function tube(seq, done, seed, geo) {
  const r = rng(seed), solid = [], ghost = [];
  seq.forEach((e, i) => {
    const p = {
      e,
      x: Math.round(geo.x0 + (r() - 0.5) * geo.jx),
      bottom: Math.round(geo.y0 + i * geo.pitch + (r() - 0.5) * 2),
      rot: Math.round((r() - 0.5) * geo.rot),
    };
    (i < done ? solid : ghost).push(p);
  });
  return { solid, ghost };
}

/* 予定/未消化のぶんはグレー（ghost）。過去の予定は完了扱い、今日は落ちた分(dropped)だけ実体。 */
function solidCount(e, isPast) {
  const N = Math.abs(e.delta || 0);
  if (e.planned) return isPast ? N : Math.min(N, e.dropped || 0);
  return N;
}

/* 1日ぶんの本のデータ（絵文字列＋メタ）を entries から作る */
export function buildDay(entries, dateStr) {
  const today = todayStr();
  const isPast = dateStr < today, isToday = dateStr === today, isFuture = dateStr > today;
  const list = sortEntries(entries).filter((e) => e.date === dateStr && !e.exp);
  const fatSolid = [], fatGhost = [], recSolid = [], recGhost = [];
  list.forEach((e) => {
    const N = Math.abs(e.delta || 0); if (!N) return;
    const g = entryGlyph(e);
    const s = solidCount(e, isPast);
    const isRec = (e.delta || 0) < 0;
    for (let i = 0; i < N; i++) {
      const solid = i < s;
      (isRec ? (solid ? recSolid : recGhost) : (solid ? fatSolid : fatGhost)).push(g);
    }
  });
  const dt = strToDate(dateStr);
  const fatTotal = fatSolid.length + fatGhost.length;
  return {
    dateStr, dt, d: dt.getDate(), label: (dt.getMonth() + 1) + '/' + dt.getDate(), wd: WD[dt.getDay()],
    dow: (dt.getDay() + 6) % 7, isMon: dt.getDay() === 1, wk: 'week' + isoWeek(dt),
    year: dt.getFullYear(), month: dt.getMonth() + 1, ym: dateStr.slice(0, 7),
    monthLabel: (dt.getMonth() + 1) + '月', first: dt.getDate() === 1,
    today: isToday, future: isFuture, past: isPast,
    fatSolid, fatGhost, recSolid, recGhost,
    total: fatTotal, over: fatTotal > 10, empty: fatTotal === 0 && recSolid.length + recGhost.length === 0,
    list,
  };
}

/* --- 配置（描画は component 側。ここは座標だけ返す） --- */
export function placeMain(day, geo) {
  return tube(day.fatSolid.concat(day.fatGhost), day.fatSolid.length, seedOf(day.dateStr) + 1, geo);
}
export function placeSplit(day, geo) {
  const half = { x0: 8, jx: 7, pitch: Math.round(geo.pitch * 0.85), rot: geo.rot, y0: geo.y0 };
  const fh = tube(day.fatSolid.concat(day.fatGhost), day.fatSolid.length, seedOf(day.dateStr) + 3, half);
  const rh = tube(day.recSolid.concat(day.recGhost), day.recSolid.length, seedOf(day.dateStr) + 5, half);
  rh.solid.forEach((p) => { p.x += 34; }); rh.ghost.forEach((p) => { p.x += 34; });
  return { fh, rh };
}
export function placeNet(day) {
  const netCount = Math.max(0, day.fatSolid.length - day.recSolid.length);
  const seq = day.fatSolid.slice(0, netCount);
  const r = rng(seedOf(day.dateStr) + 9);
  return seq.map((e, i) => ({
    e,
    x: Math.round(6 + (i % 2) * 31 + (r() - 0.5) * 5),
    bottom: Math.round(8 + Math.floor(i / 2) * 17 + (r() - 0.5) * 3),
    rot: Math.round((r() - 0.5) * 13),
  }));
}

/* 円グラフ（絵文字のかず）。counts: {glyph:個数} */
export function mkChart(counts, names) {
  const sorted = Object.entries(counts).map(([e, n]) => ({ e, n })).sort((a, b) => b.n - a.n);
  const total = sorted.reduce((s, i) => s + i.n, 0) || 1;
  let acc = 0; const stops = [];
  const items = sorted.map((it, i) => {
    const color = PALETTE[i % PALETTE.length];
    const from = acc / total * 360; acc += it.n;
    stops.push(color + ' ' + from.toFixed(1) + 'deg ' + (acc / total * 360).toFixed(1) + 'deg');
    return { e: it.e, n: it.n, name: names[it.e] || 'その他', color };
  });
  return { grad: stops.length ? 'conic-gradient(' + stops.join(',') + ')' : '#f1efe8', items };
}

/* glyph → 表示名（行動名）の対応表を entries から作る */
export function nameMap(entries) {
  const m = {};
  entries.forEach((e) => { const g = entryGlyph(e); if (!m[g]) m[g] = e.act || e.title || 'その他'; });
  return m;
}

/* その日の時間帯タイムライン（🌅朝/☀️午前/🌤午後/🌙夜） */
export function daySlots(day, slotHours) {
  const hours = slotHours || undefined;
  const buckets = { asa: [], am: [], pm: [], yoru: [] };
  day.list.forEach((e) => {
    const N = Math.abs(e.delta || 0); if (!N) return;
    const isRec = (e.delta || 0) < 0;
    const ghost = day.future || (day.today && e.planned && (e.dropped || 0) < N);
    (buckets[slotOfEntry(e, hours)] || buckets.yoru).push({
      glyph: entryGlyph(e), name: e.title || e.act || 'その他',
      f: (isRec ? '−' : '+') + N, rec: isRec, ghost,
    });
  });
  return SLOTS.map((sl) => ({ name: sl.name, icon: sl.emoji, rows: buckets[sl.id] }))
    .filter((sl) => sl.rows.length > 0);
}

/* その日の円グラフ（疲労＋回復のすべての絵文字を個数で集計） */
export function dayChart(day, names) {
  const counts = {};
  [day.fatSolid, day.fatGhost, day.recSolid, day.recGhost].forEach((arr) => arr.forEach((g) => { counts[g] = (counts[g] || 0) + 1; }));
  return mkChart(counts, names);
}

/* 月まとめ（TOP5×2・円グラフ・表紙の山） */
export function buildMonth(entries, year, month, names) {
  const last = new Date(year, month, 0).getDate();
  const days = [];
  for (let i = 1; i <= last; i++) days.push(buildDay(entries, year + '-' + pad2(month) + '-' + pad2(i)));
  const fatC = {}, recC = {}, solidE = [], ghostE = [];
  days.forEach((d) => {
    d.fatSolid.forEach((g) => { fatC[g] = (fatC[g] || 0) + 1; solidE.push(g); });
    d.fatGhost.forEach((g) => ghostE.push(g));
    d.recSolid.forEach((g) => { recC[g] = (recC[g] || 0) + 1; });
  });
  const top = (o, color) => Object.entries(o).map(([e, n]) => ({ e, n, name: names[e] || 'その他' }))
    .sort((a, b) => b.n - a.n).slice(0, 5).map((r, i) => ({ ...r, rank: i + 1, color }));
  const r = rng(seedOf(year + '-' + month) + 5);
  const pos = (k) => { const row = Math.floor(k / 11), col = k % 11; return { x: Math.round(7 + col * 14 + (r() - 0.5) * 4), bottom: Math.round(6 + row * 12 + (r() - 0.5) * 2), rot: Math.round((r() - 0.5) * 14) }; };
  const pile = solidE.slice(0, 230).map((e, i) => ({ e, ...pos(i) }));
  const pileG = ghostE.slice(0, Math.max(0, 230 - pile.length)).map((e, i) => ({ e, ...pos(pile.length + i) }));
  return {
    year, month, ym: year + '-' + pad2(month), label: month + '月',
    fatTop: top(fatC), recTop: top(recC),
    chart: mkChart({ ...fatC, ...recC }, names),
    pile, pileG,
  };
}

/* データがある年月の一覧（＋今月）を昇順で返す */
export function monthsWithData(entries) {
  const set = new Set(entries.filter((e) => !e.exp && (e.delta || 0) !== 0).map((e) => (e.date || todayStr()).slice(0, 7)));
  set.add(todayStr().slice(0, 7));
  return Array.from(set).sort();
}
