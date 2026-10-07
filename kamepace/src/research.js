/* 研究への協力（参加者コードで匿名）: 1日ごとの集計を作る・研究者用の分析と CSV。
   送るのは数値の集計だけ。予定名・自由入力の文は送らない（行動は最初からある行動の名前だけ。自作は「自作」＋短いID）。
   保存先: research/{参加者コード}/days/{日付}（firebase.js） */
import { CATS } from './data';
import { entryEndTs, entryMin, normTitle, shiftDate } from './model';
import { fatigueCurve, typeOfCurve, zoneOf } from './wake';

const pad2 = (n) => String(n).padStart(2, '0');
const hm = (ts) => { const d = new Date(ts); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); };
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36).slice(0, 6); };
const isSample = (e) => e.sample || e._sample;

/* 行動名 → 送ってよい行動のID・名前・カテゴリ（最初からある行動だけ名前を送る） */
function catalog(st) {
  const map = {};
  CATS.forEach(c => c.items.forEach(it => { map[normTitle(it.name)] = { key: it.id, name: it.name, cat: c.id }; }));
  return (title) => map[normTitle(title)] || { key: 'c' + hash(normTitle(title)), name: '自作', cat: 'custom' };
}

/* その日の集計。carry=前の日の終わりの疲労度（朝の記録がない日の起点） */
export function summarizeDay(st, d, carry = null, now = Date.now()) {
  const look = catalog(st);
  const wk = (st.wakeLog || []).find(w => w.date === d) || null;
  const bd = (st.bedLog || []).find(b => b.date === d) || null;
  const done = (e) => !e.planned || (e.dropped || 0) >= Math.abs(e.delta || 0);
  const list = (st.entries || []).filter(e => e.date === d && !e.exp && !e.wakeAdd && !isSample(e) && e.delta && e.from && e.to && done(e));
  // 疲労度の増減の点（朝の記録を起点に、記録が終わった時刻ごと）
  const fat = [];
  let lv = wk && wk.fatigue != null ? wk.fatigue : carry;
  const start = wk ? wk.ts : 0;
  if (wk && wk.fatigue != null) fat.push({ t: hm(wk.ts), v: wk.fatigue });
  list.map(e => ({ e, t: entryEndTs(e) })).filter(x => x.t >= start && x.t <= now && (!bd || x.t <= bd.ts)).sort((a, b) => a.t - b.t).forEach(({ e, t }) => {
    if (lv == null) lv = 0;
    const nv = Math.max(0, Math.min(100, lv + e.delta));
    if (nv !== lv) fat.push({ t: hm(t), v: nv });
    lv = nv;
  });
  if (bd && bd.fatigue != null) { fat.push({ t: hm(bd.ts), v: bd.fatigue }); lv = bd.fatigue; }
  let mx = null, mn = null;
  fat.forEach(p => { if (!mx || p.v > mx.v) mx = p; if (!mn || p.v < mn.v) mn = p; });
  // ゆったり(0〜40)・ほどほど(41〜80)・みちみち(81〜)にいた時間（10分刻みの曲線から）
  const curve = fatigueCurve(list, d, wk && wk.fatigue != null ? wk.fatigue : (carry || 0));
  const zone = { yuttari: 0, hodohodo: 0, michimichi: 0 };
  curve.forEach(v => { zone[['yuttari', 'hodohodo', 'michimichi'][zoneOf(v)]] += 10; });
  // カテゴリ別・行動別
  const cats = {}, acts = {};
  let plus = 0, minus = 0;
  list.forEach(e => {
    const it = look(e.title);
    const m = entryMin(e) || 0;
    cats[it.cat] = cats[it.cat] || { n: 0, min: 0 }; cats[it.cat].n++; cats[it.cat].min += m;
    acts[it.key] = acts[it.key] || { name: it.name, n: 0, min: 0 }; acts[it.key].n++; acts[it.key].min += m;
    if (e.delta > 0) plus += e.delta; else minus += -e.delta;
  });
  // 生活必須行動・やりたいことの設定（その日の時点）
  const freq = {};
  Object.entries(st.actFreq || {}).forEach(([name, f]) => {
    const it = look(name);
    freq[it.key] = { name: it.name, ...(f.req ? { req: { k: f.req.k || (f.req.every === '隔' ? 2 : 1), unit: f.req.unit, n: f.req.n } } : null), ...(f.fav ? { fav: { k: f.fav.k || (f.fav.every === '隔' ? 2 : 1), unit: f.fav.unit, n: f.fav.n } } : null) };
  });
  const rec = (r) => (r ? { t: hm(r.ts), cond: r.cond ?? null, mood: r.mood ?? null, fatigue: r.fatigue ?? null } : null);
  return {
    v: 1, date: d,
    wake: rec(wk), bed: rec(bd),
    fat, fatMax: mx, fatMin: mn, zone, type: typeOfCurve(curve).id,
    rec: list.length, plus, minus, cats, acts, freq,
    end: lv,
  };
}

/* 記録のある日（サンプルを除く）を古い順に。最大 maxDays 日 */
export function researchDates(st, maxDays = 180) {
  const set = new Set();
  (st.entries || []).forEach(e => { if (!isSample(e) && e.date) set.add(e.date); });
  (st.wakeLog || []).forEach(w => w.date && set.add(w.date));
  (st.bedLog || []).forEach(b => b.date && set.add(b.date));
  return [...set].sort().slice(-maxDays);
}
/* 何日分かをまとめて集計（前の日の終わりの疲労度を次の日へ引き継ぐ） */
export function summarizeDays(st, dates) {
  const out = {}; let carry = null, prev = null;
  dates.forEach(d => {
    if (prev && shiftDate(prev, 1) !== d) carry = null; // 間が空いたら引き継がない
    const s = summarizeDay(st, d, carry); out[d] = s; carry = s.end; prev = d;
  });
  return out;
}

/* ---------- 研究者用の分析 ---------- */
export const freqText = (f) => (!f ? '' : f.k === 1 ? '毎' + f.unit + f.n + '回' : f.k + (f.unit === '月' ? 'か月' : f.unit) + 'に' + f.n + '回');
// 1日あたりの目標回数（k日にn回＝n/k、k週にn回＝n/(7k)、kか月にn回＝n/(30.44k)）
export const perDay = (f) => (!f || !f.n || !f.k ? 0 : f.n / (f.k * (f.unit === '日' ? 1 : f.unit === '週' ? 7 : 30.44)));
const mondayOf = (d) => { const x = new Date(d + 'T00:00:00'); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x.getFullYear() + '-' + pad2(x.getMonth() + 1) + '-' + pad2(x.getDate()); };

/* 参加者1人の、行動ごとの実行率（期間全体と週ごと）。両方あるときは生活必須行動の頻度を目標にする */
export function adherence(days) {
  const dates = Object.keys(days).sort();
  if (!dates.length) return [];
  const all = [];
  for (let d = dates[0]; d <= dates[dates.length - 1]; d = shiftDate(d, 1)) all.push(d);
  // 期間中に設定されたことのある行動（最後の設定を使う）
  const cfg = {};
  dates.forEach(d => Object.entries(days[d].freq || {}).forEach(([k, f]) => { cfg[k] = f; }));
  return Object.entries(cfg).map(([key, f]) => {
    const kind = f.req ? 'req' : 'fav', fq = f.req || f.fav, pd = perDay(fq);
    const weeks = {};
    all.forEach(d => {
      const w = mondayOf(d);
      weeks[w] = weeks[w] || { week: w, target: 0, done: 0 };
      weeks[w].target += pd;
      weeks[w].done += (days[d] && days[d].acts && days[d].acts[key] ? days[d].acts[key].n : 0);
    });
    const ws = Object.values(weeks).sort((a, b) => a.week.localeCompare(b.week)).map(w => ({ ...w, target: Math.round(w.target * 10) / 10, rate: w.target ? w.done / w.target : null }));
    const target = ws.reduce((a, w) => a + w.target, 0), done = ws.reduce((a, w) => a + w.done, 0);
    return { key, name: f.name, kind, freq: fq, both: !!(f.req && f.fav), target: Math.round(target * 10) / 10, done, rate: target ? done / target : null, weeks: ws };
  });
}

/* ---------- CSV ---------- */
const esc = (v) => { if (v == null) return ''; const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const toCsv = (head, rows) => '﻿' + [head, ...rows].map(r => r.map(esc).join(',')).join('\n'); // BOM つき（Excel で文字化けしない）
const CAT_NAME = Object.fromEntries([...CATS.map(c => [c.id, c.name]), ['custom', '自作']]);

/* parts = [{ code, days: { date: summary } }] */
export function csvFiles(parts) {
  const days = [], pts = [], acts = [], adh = [], cats = [];
  parts.forEach(({ code, days: ds }) => {
    Object.keys(ds).sort().forEach(d => {
      const s = ds[d], w = s.wake || {}, b = s.bed || {};
      days.push([code, d, w.t, w.cond, w.mood, w.fatigue, b.t, b.cond, b.mood, b.fatigue, s.fatMax && s.fatMax.v, s.fatMax && s.fatMax.t, s.fatMin && s.fatMin.v, s.fatMin && s.fatMin.t, s.zone && s.zone.yuttari, s.zone && s.zone.hodohodo, s.zone && s.zone.michimichi, s.type, s.rec, s.plus, s.minus]);
      (s.fat || []).forEach(p => pts.push([code, d, p.t, p.v]));
      Object.entries(s.acts || {}).forEach(([k, a]) => { const f = (s.freq || {})[k] || {}; acts.push([code, d, k, a.name, a.n, a.min, f.req ? freqText(f.req) : '', f.fav ? freqText(f.fav) : '']); });
      Object.entries(s.cats || {}).forEach(([k, c]) => cats.push([code, d, CAT_NAME[k] || k, c.n, c.min]));
    });
    adherence(ds).forEach(a => a.weeks.forEach(w => adh.push([code, w.week, a.key, a.name, a.kind === 'req' ? '生活必須行動' : 'やりたいこと', freqText(a.freq), w.target, w.done, w.rate == null ? '' : Math.round(w.rate * 1000) / 10])));
  });
  return {
    '日ごと.csv': toCsv(['参加者', '日付', '起床時刻', '起床_体調', '起床_気分', '起床_疲労度', '就寝時刻', '就寝_体調', '就寝_気分', '就寝_疲労度', '疲労度_最高', '最高_時刻', '疲労度_最低', '最低_時刻', 'ゆったり_分', 'ほどほど_分', 'みちみち_分', 'タイプ', '記録数', '疲労_合計', '回復_合計'], days),
    '疲労度の推移.csv': toCsv(['参加者', '日付', '時刻', '疲労度'], pts),
    '行動.csv': toCsv(['参加者', '日付', '行動ID', '行動名', '回数', '分', '生活必須行動の頻度', 'やりたいことの頻度'], acts),
    '週ごとの実行率.csv': toCsv(['参加者', '週の始まり(月)', '行動ID', '行動名', '種類', '頻度', '目標回数', '実施回数', '実行率(%)'], adh),
    'カテゴリ.csv': toCsv(['参加者', '日付', 'カテゴリ', '回数', '分'], cats),
  };
}
export function downloadText(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ---------- デモデータ（研究データ画面の見た目確認用。保存はしない） ----------
   5人×28日。人ごとに疲れやすさ・行動の続けやすさを変える（同じコードなら毎回同じ値） */
const DEMO_ACTS = [
  { key: 'washface', name: '洗顔・歯みがき', cat: 'grooming', min: 10, kind: 'req', f: { k: 1, unit: '日', n: 2 } },
  { key: 'bath', name: '入浴', cat: 'rest', min: 20, kind: 'req', f: { k: 1, unit: '日', n: 1 } },
  { key: 'cleanlaundry', name: '掃除・洗濯', cat: 'house', min: 30, kind: 'req', f: { k: 1, unit: '週', n: 2 } },
  { key: 'stroll', name: '散歩', cat: 'exercise', min: 20, kind: 'fav', f: { k: 2, unit: '日', n: 1 } },
  { key: 'running', name: 'ランニング', cat: 'exercise', min: 30, kind: 'fav', f: { k: 1, unit: '週', n: 2 } },
];
const DEMO_PEOPLE = [
  { code: 'P01', base: 20, swing: 35, keep: 0.92 }, // ゆったり・よく続く
  { code: 'P02', base: 35, swing: 45, keep: 0.75 },
  { code: 'P03', base: 45, swing: 50, keep: 0.6 }, // 疲れやすい
  { code: 'P04', base: 30, swing: 60, keep: 0.85 }, // 波が大きい
  { code: 'P05', base: 50, swing: 40, keep: 0.45 }, // みちみち・続きにくい
];
function rng(seed) { let a = 0; for (let i = 0; i < seed.length; i++) a = Math.imul(a ^ seed.charCodeAt(i), 2654435761); return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function demoParticipants(nDays = 28) {
  const today = new Date();
  const dates = [];
  for (let i = nDays; i >= 1; i--) { const d = new Date(today); d.setDate(d.getDate() - i); dates.push(d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())); }
  return DEMO_PEOPLE.map((p, pi) => {
    const r = rng(p.code), days = {};
    dates.forEach((d, di) => {
      const wd = new Date(d + 'T00:00:00').getDay(), weekend = wd === 0 || wd === 6;
      const wakeMin = 6 * 60 + 30 + Math.floor(r() * 90) + (weekend ? 60 : 0);
      const wf = [0, 25, 50, 75][Math.min(3, Math.floor((p.base / 25) * r() + r()))];
      const t = (m) => pad2(Math.floor(m / 60) % 24) + ':' + pad2(m % 60);
      const fat = [{ t: t(wakeMin), v: wf }];
      let lv = wf, m = wakeMin;
      const n = 6 + Math.floor(r() * 5);
      for (let i = 0; i < n; i++) {
        m += 40 + Math.floor(r() * 110);
        if (m > 23 * 60) break;
        const up = r() < 0.72;
        const dv = up ? Math.round((p.swing / 6) * (0.4 + r() * (weekend ? 0.8 : 1.4))) : -Math.round(4 + r() * 14);
        lv = Math.max(0, Math.min(100, lv + dv));
        fat.push({ t: t(m), v: lv });
      }
      const bedMin = Math.min(23 * 60 + 59, Math.max(m + 30, 22 * 60 + Math.floor(r() * 100)));
      const bf = [25, 50, 75, 100][Math.min(3, Math.floor(lv / 26))];
      fat.push({ t: t(bedMin), v: bf });
      let mx = null, mn = null; fat.forEach(q => { if (!mx || q.v > mx.v) mx = q; if (!mn || q.v < mn.v) mn = q; });
      // ゾーンの時間（点と点の間はその値が続いたとみなす）
      const zone = { yuttari: 0, hodohodo: 0, michimichi: 0 };
      for (let i = 0; i < fat.length - 1; i++) {
        const a = fat[i], b = fat[i + 1], dm = (Number(b.t.slice(0, 2)) * 60 + Number(b.t.slice(3))) - (Number(a.t.slice(0, 2)) * 60 + Number(a.t.slice(3)));
        if (dm <= 0) continue;
        zone[['yuttari', 'hodohodo', 'michimichi'][zoneOf(a.v)]] += dm;
      }
      const type = Object.entries(zone).sort((x, y) => y[1] - x[1])[0][0];
      // 行動（続けやすさ keep、後半ほど少し下がる・週末は家事が増える）
      const acts = {}, cats = {}, freq = {};
      DEMO_ACTS.forEach(a => {
        freq[a.key] = { name: a.name, [a.kind]: a.f };
        const per = perDay(a.f), drift = 1 - (di / nDays) * 0.15 * (1 - p.keep);
        let cnt = 0;
        const tries = Math.ceil(per * 2) + 1;
        for (let k = 0; k < tries; k++) if (r() < Math.min(1, per / tries * 1.15) * p.keep * drift * (a.key === 'cleanlaundry' && weekend ? 2.2 : 1)) cnt++;
        if (cnt) { acts[a.key] = { name: a.name, n: cnt, min: cnt * a.min }; cats[a.cat] = cats[a.cat] || { n: 0, min: 0 }; cats[a.cat].n += cnt; cats[a.cat].min += cnt * a.min; }
      });
      if (!weekend) { cats.school = { n: 2 + Math.floor(r() * 3), min: 180 + Math.floor(r() * 120) }; cats.study = { n: 1 + Math.floor(r() * 2), min: 60 + Math.floor(r() * 90) }; }
      const plus = fat.slice(1, -1).reduce((s, q, i) => s + Math.max(0, q.v - fat[i].v), 0), minus = fat.slice(1, -1).reduce((s, q, i) => s + Math.max(0, fat[i].v - q.v), 0);
      days[d] = {
        v: 1, date: d,
        wake: { t: t(wakeMin), cond: 2 + Math.floor(r() * 4), mood: 2 + Math.floor(r() * 4), fatigue: wf },
        bed: { t: t(bedMin), cond: 1 + Math.floor(r() * 5), mood: 1 + Math.floor(r() * 5), fatigue: bf },
        fat, fatMax: mx, fatMin: mn, zone, type,
        rec: fat.length - 2 + Object.values(acts).reduce((s, x) => s + x.n, 0), plus, minus, cats, acts, freq, end: bf,
      };
    });
    return { code: p.code, active: pi !== 4, demo: true, updatedAt: Date.now() - pi * 3600000, days };
  });
}
