/* 体調のデバフ（頭痛・発熱・心がつかれ気味など）: 倍率を変えるのではなく、起きているあいだ、そのアイコンが少しずつ降る。
   本当に体調が悪いときは、何もしていなくてもどんどん疲れていくため。
   強さ＝デバフの倍率（体・心の疲れ+／回復−のずれの合計）× 軽い0.5/ふつう1/強い1.6。1時間あたり DRIP_K × 強さ 個。
   例) 頭痛ふつう(体1.2・心1.15) → 0.35×6 ≒ 2.1個/時（起きている14時間で約30個）・発熱つよい → 約5個/時 */
import { hmToTsOn, shiftDate, dateToStr } from './model';

export const DRIP_K = 6;
const LV_SCALE = [0.5, 1, 1.6];
const H = 3600000;

/* そのデバフの強さと、体・心の割合 */
export function dripStrength(en, preset) {
  const m = en.mult || (preset && preset.mult) || {};
  const sc = en.lv == null || en.mult ? 1 : LV_SCALE[en.lv] || 1; // 症状は mult がつらさ別に入っている
  const body = Math.max(0, (m.bodyFat || 1) - 1) + Math.max(0, 1 - (m.bodyRec || 1));
  const mind = Math.max(0, (m.mindFat || 1) - 1) + Math.max(0, 1 - (m.mindRec || 1));
  return { s: (body + mind) * sc, fb: body + mind ? body / (body + mind) : 0.5 };
}

/* 1時間に何個降るか。coef＝体・心の疲れやすさ、cal＝夜の申告で合わせた補正（calib.js の行動ごとの補正） */
export function dripRate(en, preset, coef = {}, cal = 1) {
  const { s, fb } = dripStrength(en, preset);
  const c = (coef.bodyFatCoef || 1) * fb + (coef.mindFatCoef || 1) * (1 - fb);
  return DRIP_K * s * c * cal;
}

/* 寝ていた時間帯 [始, 終] の一覧（a〜b のあいだ）。
   起床記録があれば 就寝時刻〜起床時刻、就寝記録だけなら 8時間、どちらもない夜は 0〜7時 とみなす */
export function sleepSpans(wakeLog, bedLog, a, b) {
  const spans = [];
  const d0 = dateToStr(new Date(a - 86400000)), d1 = dateToStr(new Date(b));
  for (let d = d0; d <= d1; d = shiftDate(d, 1)) {
    const w = (wakeLog || []).find(x => x.date === d && x.ts);
    const pb = (bedLog || []).find(x => x.date === shiftDate(d, -1) && x.ts);
    if (w) {
      const bt = w.bed ? (w.bed >= '12:00' ? hmToTsOn(shiftDate(d, -1), w.bed) : hmToTsOn(d, w.bed)) : (pb ? pb.ts : w.ts - 8 * H);
      spans.push([Math.min(bt, w.ts), w.ts]);
    } else if (!pb) spans.push([hmToTsOn(d, '00:00'), hmToTsOn(d, '07:00')]);
  }
  // 就寝の記録から次の起床まで（起床がまだなら8時間）
  (bedLog || []).forEach(x => {
    if (!x.ts || x.ts > b || x.ts < a - 2 * 86400000) return;
    const w = (wakeLog || []).find(y => y.ts > x.ts && y.ts - x.ts < 16 * H);
    spans.push([x.ts, w ? w.ts : x.ts + 8 * H]);
  });
  return spans;
}

/* a〜b のうち起きていた時間（ミリ秒） */
export function awakeMs(a, b, spans) {
  if (b <= a) return 0;
  const cut = spans.map(([s, e]) => [Math.max(s, a), Math.min(e, b)]).filter(([s, e]) => e > s).sort((x, y) => x[0] - y[0]);
  let slept = 0, end = a;
  cut.forEach(([s, e]) => { const s2 = Math.max(s, end); if (e > s2) { slept += e - s2; end = e; } });
  return Math.max(0, b - a - slept);
}
