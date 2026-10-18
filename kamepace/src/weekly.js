/* 週間レポート（月曜〜日曜）。数字はすべて記録から毎回計算する（保存するのは目標の自己評価と「見た」だけ）。
   がんばりタイプは就寝記録と同じ判定（起床〜就寝の疲労の推移で、いちばん長く居たゾーン）。 */
import { RENAMED_ACTS } from './data';
import { shiftDate, strToDate, normTitle, entryStartTs, hmToTsOn, entryGlyph } from './model';
import { fatigueCurve, typeOfCurve, zoneOf, WAKE_TYPES, NO_TYPE } from './wake';
import { lines as L, fill } from './ikoi';

const WD = ['日', '月', '火', '水', '木', '金', '土'];
const md = (d) => { const x = strToDate(d); return (x.getMonth() + 1) + '/' + x.getDate(); };
export const weekLabel = (key) => md(key) + '(月)〜' + md(shiftDate(key, 6)) + '(日)';

const freqK = (f) => (f ? (f.k || (f.every === '隔' ? 2 : 1)) : 1);
const unitLabel = (unit, k) => (unit === '月' ? (k > 1 ? 'か月' : '月') : unit);
export const freqText = (f) => {
  if (!f) return '';
  const k = freqK(f);
  return k === 1 ? '毎' + f.unit + f.n + '回' : k + unitLabel(f.unit, k) + 'に' + f.n + '回';
};

function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0); }
const SER_KEYS = [['avgCond', 'prevCond'], ['avgMood', 'prevMood']];
const pick = (seed, arr) => (arr && arr.length ? arr[hash(seed) % arr.length] : '');

/* st: アプリの state / key: その週の月曜 / o: { wakeOn(d), items（全行動）, today } */
export function buildWeek(st, key, o) {
  const today = o.today;
  const days = [];
  for (let i = 0; i < 7; i++) days.push(shiftDate(key, i));
  const entries = st.entries || [];
  const bedOn = (d) => (st.bedLog || []).find(b => b.date === d) || null;

  /* ① がんばりタイプ・ゾーンの割合（1日ごと）。先週ぶんも、いちばん多かったタイプを比べるのに使う */
  const typeDaysOf = (from) => [0, 1, 2, 3, 4, 5, 6].map(i => {
    const d = shiftDate(from, i), wk = o.wakeOn(d), bd = bedOn(d);
    const future = d > today;
    const curve = future ? [] : fatigueCurve(entries, d, wk ? wk.fatigue : 0, { from: wk ? wk.ts : null, to: bd ? bd.ts : null });
    const zone = { yuttari: 0, hodohodo: 0, michimichi: 0 };
    curve.forEach(v => { zone[['yuttari', 'hodohodo', 'michimichi'][zoneOf(v)]] += 10; });
    const type = curve.length ? typeOfCurve(curve) : NO_TYPE;
    return { d, wd: WD[strToDate(d).getDay()], md: md(d), type, zone, has: curve.length > 0, future, today: d === today };
  });
  const countOf = (tds) => WAKE_TYPES.map(t => ({ ...t, n: tds.filter(x => x.type.id === t.id).length })).filter(t => t.n > 0);
  // いちばん多かったタイプ（同じ日数なら、がんばった方）
  const topOf = (tc) => tc.slice().sort((a, b) => b.n - a.n || WAKE_TYPES.findIndex(t => t.id === b.id) - WAKE_TYPES.findIndex(t => t.id === a.id))[0] || null;
  const typeDays = typeDaysOf(key);
  const typeCount = countOf(typeDays);
  const top = topOf(typeCount), prevTop = topOf(countOf(typeDaysOf(shiftDate(key, -7))));

  /* ② 体調・気分（1〜5）: 起床・就寝・つぶやき。x＝その週の何日目か（5時〜翌5時を1日に） */
  const condPts = (from) => {
    const t0 = hmToTsOn(from, '05:00'), t1 = t0 + 7 * 864e5;
    const pts = [];
    const add = (ts, cond, mood, kind) => { if (ts >= t0 && ts < t1 && (cond != null || mood != null)) pts.push({ x: (ts - t0) / 864e5, cond: cond ?? null, mood: mood ?? null, kind }); };
    for (let i = 0; i < 7; i++) {
      const d = shiftDate(from, i), w = o.wakeOn(d), b = bedOn(d);
      if (w) add(w.ts, w.cond, w.mood, 'wake');
      if (b) add(b.ts, b.cond, b.mood, 'bed');
    }
    entries.filter(e => !e.exp && e.event && (e.cond != null || e.mindCond != null) && e.from && e.date).forEach(e => add(entryStartTs(e), e.cond, e.mindCond, 'tweet'));
    return pts.sort((a, b) => a.x - b.x);
  };
  const avg = (pts, k) => { const a = pts.map(p => p[k]).filter(v => v != null); return a.length ? a.reduce((s, v) => s + v, 0) / a.length : null; };
  const pts = condPts(key), prev = condPts(shiftDate(key, -7));
  const cond = { pts, avgCond: avg(pts, 'cond'), avgMood: avg(pts, 'mood'), prevCond: avg(prev, 'cond'), prevMood: avg(prev, 'mood') };

  /* ③④ 必須・やりたいこと: 登録した頻度に対して、この週にできた回数（できた日に●） */
  const byName = {};
  (o.items || []).forEach(it => { byName[normTitle(it.name)] = it; });
  const keyOfFor = (k, prevNames) => {
    const alias = new Set((prevNames || []).map(normTitle));
    return (t) => { const n = normTitle(RENAMED_ACTS[(t || '').trim()] || t); return alias.has(n) ? k : n; };
  };
  const doneIn = (k, keyOf, a, b) => entries.filter(e => !e.exp && !e.wakeAdd && e.date && e.date >= a && e.date <= b && e.date <= today
    && !(e.planned && !(e.dropped > 0)) && keyOf(e.title) === k);
  const weekEnd = days[6];
  // 1行ぶん: 登録した頻度（なければ回数だけ）に対して、この週にできた回数（できた日に●）
  const rowOf = (k, fq) => {
    const it = byName[k] || {}, keyOf = keyOfFor(k, it.prevNames);
    const list = doneIn(k, keyOf, key, weekEnd);
    const doneDays = new Set(list.map(e => e.date));
    let count = list.length, target = null, scope = 'week';
    if (fq && fq.unit === '月') {
      // 月の頻度: その月の1日〜この週の終わり（今日まで）でできた回数
      scope = 'month';
      const m0 = weekEnd.slice(0, 7) + '-01';
      count = doneIn(k, keyOf, m0, weekEnd).length;
      target = Math.max(1, Math.round(fq.n / freqK(fq)));
    } else if (fq) {
      target = Math.max(1, Math.round(fq.n * (fq.unit === '日' ? 7 / freqK(fq) : 1 / freqK(fq))));
    }
    // 行動の一覧にない名前（サンプル・取り込みなど）は、記録の絵文字を使う
    const lastE = it.glyph ? null : entries.filter(e => !e.exp && keyOf(e.title) === k).slice(-1)[0];
    return { k, name: it.name || (lastE && lastE.title) || k, glyph: it.glyph || (lastE && entryGlyph(lastE)) || '⭐', freq: freqText(fq), count, weekCount: list.length, target, scope, ok: target != null && count >= target, dots: days.map(d => doneDays.has(d)) };
  };
  const freqRows = (kind) => Object.entries(st.actFreq || {}).filter(([, f]) => f && f[kind]).map(([k, f]) => rowOf(k, f[kind]))
    .sort((a, b) => (a.ok === b.ok ? 0 : a.ok ? 1 : -1));
  const req = freqRows('req'), fav = freqRows('fav');

  /* ⑤ 今週の目標 */
  const goalAct = (k) => { const id = (st.weekGoalActs || {})[k]; return id ? (o.items || []).find(it => it.id === id) || null : null; };
  const nextKey = shiftDate(key, 7);
  const gAct = goalAct(key);
  const gFreq = gAct ? (st.actFreq || {})[normTitle(gAct.name)] || {} : {};
  const goal = { text: (st.weekGoals || {})[key] || '', act: gAct, row: gAct ? rowOf(normTitle(gAct.name), gFreq.req || gFreq.fav || null) : null, eval: ((st.weekReports || {})[key] || {}).eval || null };
  const next = { key: nextKey, text: (st.weekGoals || {})[nextKey] || '', act: goalAct(nextKey), isThisWeek: today >= nextKey };

  /* いこいさんのひと言（項目ごと） */
  const say = {};
  const ln = (k, vals) => fill(pick(key + k, L(k)), vals || {});
  // 今週の目標: 関連する行動の回数 → 自己評価（まだなら問いかけ）
  if (goal.text) {
    const g = [];
    if (goal.row) g.push(goal.row.weekCount ? ln('TPL_WEEK_GOAL_ACT', { 行動: goal.row.name, 回数: goal.row.weekCount }) : ln('TPL_WEEK_GOAL_ACT_ZERO', { 行動: goal.row.name }));
    g.push(ln(goal.eval ? 'WEEK_GOAL_' + goal.eval : 'WEEK_GOAL_ASK'));
    say.goal = g.join('');
  }
  // がんばりタイプ: みちみちの次の日に休めたか（ゆったり・ほどほど）。みちみちがなければ先週とくらべる
  const pairs = typeDays.slice(0, 6).map((x, i) => [x, typeDays[i + 1]]).filter(([x, y]) => x.type.id === 'michimichi' && y.has);
  if (pairs.length) {
    const rested = pairs.filter(([, y]) => y.type.id !== 'michimichi').length;
    say.types = ln(rested * 2 >= pairs.length ? 'WEEK_TYPE_RECOVER' : 'WEEK_TYPE_HARD');
  } else if (top && prevTop) say.types = ln('WEEK_CMP_' + prevTop.id + '_' + top.id);
  else say.types = ln('WEEK_BASE_' + (top ? top.id : 'none'), { 日数: top ? top.n : 0 });
  // 体調と心の調子: 先週とくらべて＋しんどかった曜日
  if (pts.length) {
    const ds = SER_KEYS.map(([a, b]) => (cond[a] != null && cond[b] != null ? cond[a] - cond[b] : null)).filter(x => x != null);
    const c = [];
    if (ds.length) { const d = ds.reduce((x, y) => x + y, 0) / ds.length; c.push(ln(d >= 0.3 ? 'WEEK_COND_UP' : d <= -0.3 ? 'WEEK_COND_DOWN' : 'WEEK_COND_FLAT')); }
    let low = null;
    typeDays.forEach((x, i) => {
      const v = pts.filter(p => Math.floor(p.x) === i).flatMap(p => [p.cond, p.mood]).filter(v => v != null);
      const m = v.length ? v.reduce((s, y) => s + y, 0) / v.length : null;
      if (m != null && m <= 2.5 && (!low || m < low.m)) low = { m, wd: x.wd };
    });
    if (low) c.push(ln('TPL_WEEK_COND_LOW', { 曜日: low.wd }));
    if (c.length) say.cond = c.join('');
  }
  // 必須・やりたいこと
  if (req.length) {
    const ok = req.filter(r => r.ok).length;
    say.req = ok === req.length ? ln('WEEK_REQ_ALL') : ok === 0 ? ln('WEEK_REQ_NONE') : ln('TPL_WEEK_REQ', { 件数: req.length, 達成: ok });
  }
  if (fav.length) {
    const n = fav.reduce((s, r) => s + r.weekCount, 0);
    say.fav = n ? ln('TPL_WEEK_FAV', { 回数: n }) : ln('WEEK_FAV_ZERO');
  }
  say.next = ln('WEEK_CLOSER');

  return { key, label: weekLabel(key), days: typeDays, typeCount, cond, req, fav, goal, next, top, prevTop, say, done: today > weekEnd };
}
