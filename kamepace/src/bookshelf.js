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

/* 背表紙ジオメトリ（絵文字1個の間隔・ゆらぎ）。
   1列＝10個で満杯（下から縦積みで本の上端に届く）になるよう pitch を本の高さ/10 に合わせる。 */
export const GEO_PORT = { x0: 11, jx: 8, pitch: 16, rot: 13, y0: 4, w: 18, fs: 17 }; // 41x168 → 10個で満杯
export const GEO_LAND = { x0: 16, jx: 12, pitch: 24, rot: 12, y0: 8, w: 28, fs: 26 }; // 66x250 → 10個で満杯

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

/* 1日ぶんの本のデータ（絵文字列＋メタ）を entries から作る。
   sleepMap: dateStr→その日の睡眠回復量（collected の 🌙 を日別集計したもの） */
export function buildDay(entries, dateStr, sleepMap) {
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
    sleep: (sleepMap && sleepMap[dateStr]) || 0,
    total: fatTotal, over: fatTotal > 100, empty: fatTotal === 0 && recSolid.length + recGhost.length === 0,
    list,
  };
}

/* --- 配置（描画は component 側。ここは座標だけ返す） ---
   本＝シャカの山の左端を切り出したイメージ。シャカは約100個で満杯なので、
   1列の本は 1/10 に間引いて表示（実量100 → 10個で満杯）。2列（寝るまえの量）は 1/5（実量100 → 20個で満杯）。 */
const BOOK_RATIO = 10; // 1列 = 実量の1/10
function sampleSeq(seq, n) {
  // 順序を保ったまま n 個に間引く（左端の列を抜き出す感じ）
  if (n <= 0) return [];
  if (seq.length <= n) return seq.slice();
  const out = [];
  for (let i = 0; i < n; i++) out.push(seq[Math.floor(i * seq.length / n)]);
  return out;
}
function shrink(solidArr, ghostArr, ratio) {
  const total = solidArr.length + ghostArr.length;
  const totalN = total > 0 ? Math.max(1, Math.round(total / ratio)) : 0;
  const solidN = solidArr.length > 0 ? Math.max(1, Math.round(solidArr.length / ratio)) : 0;
  const s = Math.min(solidN, totalN);
  return { seq: sampleSeq(solidArr, s).concat(sampleSeq(ghostArr, totalN - s)), done: s };
}
/* 縦の本＝「寝るまえの量」（疲労−回復。睡眠は寝る前なので含めない）の1列版。実量の1/10で10個満杯 */
export function placeMain(day, geo) {
  const netCount = Math.max(0, day.fatSolid.length - day.recSolid.length);
  const n = netCount > 0 ? Math.max(1, Math.round(netCount / BOOK_RATIO)) : 0;
  return tube(sampleSeq(day.fatSolid.slice(0, netCount), n), n, seedOf(day.dateStr) + 1, geo);
}
/* 横「疲労と回復」＝疲労列:記録した疲労の1/10／回復列:記録した回復の1/10（睡眠🌙含む） */
export function placeSplit(day, geo) {
  const half = { x0: 8, jx: 7, pitch: geo.pitch, rot: geo.rot, y0: geo.y0 };
  const f = shrink(day.fatSolid, day.fatGhost, BOOK_RATIO);
  const recAll = day.recSolid.concat(Array(day.sleep || 0).fill('🌙'));
  const rcv = shrink(recAll, day.recGhost, BOOK_RATIO);
  const fh = tube(f.seq, f.done, seedOf(day.dateStr) + 3, half);
  const rh = tube(rcv.seq, rcv.done, seedOf(day.dateStr) + 5, half);
  rh.solid.forEach((p) => { p.x += 34; }); rh.ghost.forEach((p) => { p.x += 34; });
  return { fh, rh };
}
export function placeNet(day) {
  const netCount = Math.max(0, day.fatSolid.length - day.recSolid.length);
  const seq = sampleSeq(day.fatSolid.slice(0, netCount), netCount > 0 ? Math.max(1, Math.round(netCount / (BOOK_RATIO / 2))) : 0);
  const r = rng(seedOf(day.dateStr) + 9);
  // 2列（i%2）×縦10段（floor(i/2)）で 20個＝満杯（実量100）
  return seq.map((e, i) => ({
    e,
    x: Math.round(6 + (i % 2) * 31 + (r() - 0.5) * 5),
    bottom: Math.round(8 + Math.floor(i / 2) * 22 + (r() - 0.5) * 3),
    rot: Math.round((r() - 0.5) * 13),
  }));
}

/* 円グラフ（絵文字のかず）。counts: {glyph:個数}、kinds: {glyph:'rec'|'fat'}。
   疲労系＝ピンクの濃淡・回復系＝緑の濃淡で塗り分ける */
const PINKS = ['#ff5fa2', '#ff8fbe', '#d94b8a', '#ffb3d1', '#b83b70', '#ffd1e2', '#a03062', '#ff9fc8'];
const GREENS = ['#7a9a00', '#a4c520', '#5a7500', '#c4f000', '#8fb840', '#3f5300', '#d9ec9a', '#b5d660'];
export function mkChart(counts, names, kinds) {
  const sorted = Object.entries(counts).map(([e, n]) => ({ e, n })).sort((a, b) => b.n - a.n);
  const total = sorted.reduce((s, i) => s + i.n, 0) || 1;
  // 疲労を先に・回復を後にまとめて並べる（円グラフでピンク→緑の順に見える）
  const fat = sorted.filter((it) => !(kinds && kinds[it.e] === 'rec'));
  const rec = sorted.filter((it) => kinds && kinds[it.e] === 'rec');
  let acc = 0; const stops = []; let fi = 0; let ri = 0;
  const items = fat.concat(rec).map((it) => {
    const isRec = kinds && kinds[it.e] === 'rec';
    const color = isRec ? GREENS[ri++ % GREENS.length] : PINKS[fi++ % PINKS.length];
    const from = acc / total * 360; acc += it.n;
    stops.push(color + ' ' + from.toFixed(1) + 'deg ' + (acc / total * 360).toFixed(1) + 'deg');
    return { e: it.e, n: it.n, name: names[it.e] || 'その他', color };
  });
  return { grad: stops.length ? 'conic-gradient(' + stops.join(',') + ')' : '#f1efe8', items };
}

/* glyph → 表示名（行動名）の対応表を entries から作る */
export function nameMap(entries) {
  const m = { '🌙': '睡眠' };
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
  const counts = {}; const kinds = {};
  [day.fatSolid, day.fatGhost].forEach((arr) => arr.forEach((g) => { counts[g] = (counts[g] || 0) + 1; kinds[g] = 'fat'; }));
  [day.recSolid, day.recGhost].forEach((arr) => arr.forEach((g) => { counts[g] = (counts[g] || 0) + 1; kinds[g] = 'rec'; }));
  if (day.sleep) { counts['🌙'] = (counts['🌙'] || 0) + day.sleep; kinds['🌙'] = 'rec'; }
  return mkChart(counts, names, kinds);
}

/* 月まとめ（TOP5×2・円グラフ・表紙の山） */
export function buildMonth(entries, year, month, names, sleepMap) {
  const last = new Date(year, month, 0).getDate();
  const days = [];
  for (let i = 1; i <= last; i++) days.push(buildDay(entries, year + '-' + pad2(month) + '-' + pad2(i), sleepMap));
  const fatC = {}, recC = {}, solidE = [], ghostE = [];
  days.forEach((d) => {
    d.fatSolid.forEach((g) => { fatC[g] = (fatC[g] || 0) + 1; solidE.push(g); });
    d.fatGhost.forEach((g) => ghostE.push(g));
    d.recSolid.forEach((g) => { recC[g] = (recC[g] || 0) + 1; });
    if (d.sleep) recC['🌙'] = (recC['🌙'] || 0) + d.sleep;
  });
  const top = (o, color) => Object.entries(o).map(([e, n]) => ({ e, n, name: names[e] || 'その他' }))
    .sort((a, b) => b.n - a.n).slice(0, 5).map((r, i) => ({ ...r, rank: i + 1, color }));
  const kinds = {};
  Object.keys(fatC).forEach((g) => { kinds[g] = 'fat'; });
  Object.keys(recC).forEach((g) => { kinds[g] = 'rec'; });
  /* 表紙の山: 上限200個。表示数 = その月に記録した絵文字の総数（疲労＋回復・睡眠含む）÷ 月の日数。
     絵文字の内訳は、その月の実際の割合に合わせて比例配分する */
  const allC = { ...fatC };
  Object.entries(recC).forEach(([g, n]) => { allC[g] = (allC[g] || 0) + n; });
  const totalAll = Object.values(allC).reduce((a, b) => a + b, 0);
  const showN = totalAll > 0 ? Math.min(200, Math.max(1, Math.round(totalAll / last))) : 0;
  // 比例配分（端数は大きい順に配る）
  const ent = Object.entries(allC).map(([g, n]) => { const exact = n / totalAll * showN; return { g, base: Math.floor(exact), fracPart: exact - Math.floor(exact) }; });
  let used = ent.reduce((a, x) => a + x.base, 0);
  ent.sort((a, b) => b.fracPart - a.fracPart);
  for (let i = 0; used < showN && i < ent.length; i++, used++) ent[i].base += 1;
  const seq = [];
  ent.forEach((x) => { for (let i = 0; i < x.base; i++) seq.push(x.g); });
  // 決定論的にシャッフルして混ぜる
  const r = rng(seedOf(year + '-' + month) + 5);
  for (let i = seq.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [seq[i], seq[j]] = [seq[j], seq[i]]; }
  // 200個でちょうど表紙に収まるグリッド（13列×16段・絵文字約10px）
  const pos = (k) => { const row = Math.floor(k / 13), col = k % 13; return { x: Math.round(5 + col * 11.4 + (r() - 0.5) * 3), bottom: Math.round(6 + row * 13 + (r() - 0.5) * 2), rot: Math.round((r() - 0.5) * 14) }; };
  const pile = seq.map((e, i) => ({ e, ...pos(i) }));
  const pileG = [];
  return {
    year, month, ym: year + '-' + pad2(month), label: month + '月',
    fatTop: top(fatC), recTop: top(recC),
    chart: mkChart({ ...fatC, ...recC }, names, kinds),
    pile, pileG,
  };
}

/* データがある年月の一覧（＋今月）を昇順で返す */
export function monthsWithData(entries) {
  const set = new Set(entries.filter((e) => !e.exp && (e.delta || 0) !== 0).map((e) => (e.date || todayStr()).slice(0, 7)));
  set.add(todayStr().slice(0, 7));
  return Array.from(set).sort();
}
