/* 夜の疲労度の申告で、その人の体感に少しずつ合わせる（キャリブレーション）。
   毎晩: ずれ＝申告した疲労度 − 現在地（アプリが計算した山の量）と、その日の内訳（体・心の疲労、回復、行動ごとの量）を残す。
   ずれ方の形で原因を見分ける:
     ・体／心を使った量に比例してずれる → 体／心の疲れやすさ（全体の係数）
     ・回復が多い日ほどずれる           → 回復しやすさ
     ・ある行動がある日だけずれる       → その行動の重さ（行動ごとの補正）
   全部をいっしょに当てはめ（リッジ回帰）、全体の係数は本人の設定（anchor）、行動ごとの補正は 1 に引きとめる。
   行動ごとの補正は 5晩以上・同じ向きにずれたときだけ。1晩に動かすのは推定の15%まで。
   毎日同じ生活で見分けられないときは、引きとめで動かない（どちらでも予測は同じなので困らない）。 */

export const CALIB_STEP = 0.15;       // 1晩に推定へ近づける割合
export const CALIB_DAYS = 21;         // 当てはめに使う直近の晩の数
export const CALIB_MIN_DAYS = 3;      // 全体の係数を動かしはじめる晩の数
export const ACT_MIN_DAYS = 5;        // 行動ごとの補正に要る、その行動があった晩の数
export const ACT_AGREE = 0.7;         // そのうち同じ向きにずれていた割合
export const ACT_MIN_EFFECT = 2;      // 行動ごとの補正で、その行動のある晩の疲労度が最低これだけ変わること（点）
const ACT_MAX_SHARE = 0.85;           // ほぼ毎晩ある行動は全体の係数と見分けられないので補正しない
const ACT_MAX = 12;                   // 一度に見る行動の数（量の多い順）
export const COEF_MIN = 0.5, COEF_MAX = 2;
const W_SEEN = 0.5;  // 現在地を見てから選んだ晩（数字が引っぱられやすい）
const W_BUFF = 0.6;  // 体調のバフ・デバフがあった晩

const clamp = (v) => Math.min(COEF_MAX, Math.max(COEF_MIN, v));
const r3 = (v) => Math.round(v * 1000) / 1000;

/* その日の内訳。B/M/R＝実際に積んだ体・心の疲労と回復（現在地の計算と同じ値）。
   Bb/Mb/Rb/acts＝係数・行動ごとの補正を外した「もとの量」（acts は行動ごと・符号つき）。
   split(e)={body,mind}（比）、div(e)={fat:体心の係数の混ぜ, rec:回復の係数, w:行動ごとの補正}、keyOf(e)=行動のキー */
export function dayParts(entries, split, div, keyOf) {
  let B = 0, M = 0, R = 0, Bb = 0, Mb = 0, Rb = 0;
  const acts = {};
  entries.forEach(e => {
    const v = e.planned ? Math.sign(e.delta || 0) * (e.dropped || 0) : (e.delta || 0);
    if (!v) return;
    const dv = div(e) || {}, w = dv.w || 1;
    let base;
    if (v > 0) {
      const s = split(e), t = s.body + s.mind || 1, fb = s.body / t, fm = s.mind / t;
      const cb = dv.bf || 1, cm = dv.mf || 1;
      base = v / ((cb * fb + cm * fm) * w);
      B += v * fb; M += v * fm; Bb += base * fb; Mb += base * fm;
    } else {
      base = v / ((dv.rec || 1) * w); // 負
      R += -v; Rb += -base;
    }
    const k = keyOf(e);
    if (k) acts[k] = (acts[k] || 0) + base;
  });
  return { B, M, R, Bb, Mb, Rb, acts };
}

/* n元の連立方程式（ガウスの消去法・部分ピボット） */
function solve(A, b) {
  const n = b.length, m = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    [m[c], m[p]] = [m[p], m[c]];
    if (Math.abs(m[c][c]) < 1e-9) return null;
    for (let r = 0; r < n; r++) if (r !== c) { const f = m[r][c] / m[c][c]; for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k]; }
  }
  return m.map((row, i) => row[n] / row[i]);
}

/* 当てはめに使える晩か: 山や申告が端（0や100）に張りついた晩は、本当の量がわからないので使わない */
export const usable = (r) => r && r.reported != null && r.predicted != null && r.Bb != null
  && r.predicted > 0 && r.predicted < 100 && r.reported > 0 && r.reported < 100;

/* 直近の晩から、全体の係数（体の疲れ・心の疲れ・回復）と行動ごとの補正を推定し、いまの値から STEP ぶんだけ近づけた値を返す。
   cur/anchor = { bodyFatCoef, mindFatCoef, bodyRecCoef, mindRecCoef }（anchor＝本人が設定した値。引きとめ先）, actCal = { 行動: 倍率 } */
export function calibrate(log, cur, actCal, anchor) {
  const days = (log || []).filter(usable).slice(-CALIB_DAYS);
  if (days.length < CALIB_MIN_DAYS) return null;
  const an = anchor || cur;
  const recOf = (c) => ((c.bodyRecCoef || 1) + (c.mindRecCoef || 1)) / 2;
  const recNow = recOf(cur);
  const now = [cur.bodyFatCoef || 1, cur.mindFatCoef || 1, recNow];
  const prior = [an.bodyFatCoef || 1, an.mindFatCoef || 1, recOf(an)];
  // 見る行動: ACT_MIN_DAYS 晩以上あって、ほぼ毎晩ではないもの（量の多い順に ACT_MAX 個）
  const cnt = {}, mass = {};
  days.forEach(d => Object.entries(d.acts || {}).forEach(([k, v]) => { if (!v) return; cnt[k] = (cnt[k] || 0) + 1; mass[k] = (mass[k] || 0) + v * v; }));
  const keys = Object.keys(cnt).filter(k => cnt[k] >= ACT_MIN_DAYS && cnt[k] / days.length < ACT_MAX_SHARE)
    .sort((a, b) => mass[b] - mass[a]).slice(0, ACT_MAX);
  // 1晩ごと: y＝申告 − 起点（現在地 −（体＋心−回復））＝ Cb·体 + Cm·心 − Cr·回復 + Σ(W_a−1)·行動a（どれももとの量）
  const rows = days.map(d => ({
    d,
    x: [d.Bb, d.Mb, -d.Rb, ...keys.map(k => (d.acts || {})[k] || 0)],
    y: d.reported - (d.predicted - (d.B + d.M - d.R)),
    w: (d.seen ? W_SEEN : 1) * (d.buff ? W_BUFF : 1),
  }));
  const n = 3 + keys.length;
  const A = Array.from({ length: n }, () => new Array(n).fill(0)), bv = new Array(n).fill(0);
  rows.forEach(({ x, y, w }) => { for (let i = 0; i < n; i++) { bv[i] += w * x[i] * y; for (let j = 0; j < n; j++) A[i][j] += w * x[i] * x[j]; } });
  // 引きとめ: 全体は2晩ぶん、行動はその行動があった晩の4晩ぶんの重み（シミュレーションで調整）
  const pv = [...prior, ...keys.map(() => 0)];
  for (let i = 0; i < n; i++) {
    const on = i < 3 ? rows.length : cnt[keys[i - 3]];
    const lam = (i < 3 ? 2 : 4) * (A[i][i] / on) + 1;
    A[i][i] += lam; bv[i] += lam * pv[i];
  }
  const est = solve(A, bv);
  if (!est) return null;
  const next = now.map((v, i) => clamp(v + CALIB_STEP * (est[i] - v)));
  // 行動ごと: その行動を除いた残りのずれが、その行動のある晩に同じ向きにそろっているときだけ動かす
  const outAct = { ...(actCal || {}) }, actMoves = {};
  keys.forEach((k, j) => {
    const g = est[3 + j];
    const on = rows.filter(r => r.x[3 + j]);
    const agree = on.filter(r => {
      const fit = r.x.reduce((s, xi, i) => s + (i === 3 + j ? 0 : est[i] * xi), 0);
      return Math.sign(r.y - fit) === Math.sign(g * r.x[3 + j]);
    }).length / on.length;
    // 効き目が小さすぎる（その行動のある晩に ACT_MIN_EFFECT 点も変わらない）ときは、毎晩のブレとみなして動かさない
    const effect = Math.abs(g) * on.reduce((s, r) => s + Math.abs(r.x[3 + j]), 0) / on.length;
    if (agree < ACT_AGREE || effect < ACT_MIN_EFFECT) return;
    const cw = outAct[k] || 1;
    const v = r3(clamp(cw + CALIB_STEP * ((1 + g) - cw)));
    if (Math.abs(v - cw) > 1e-4) { outAct[k] = v; actMoves[k] = v; }
  });
  const recRatio = next[2] / recNow;
  return {
    coefs: { bodyFatCoef: r3(next[0]), mindFatCoef: r3(next[1]), bodyRecCoef: r3(clamp((cur.bodyRecCoef || 1) * recRatio)), mindRecCoef: r3(clamp((cur.mindRecCoef || 1) * recRatio)) },
    actCal: outAct, actMoves, est, keys, n: rows.length,
  };
}
