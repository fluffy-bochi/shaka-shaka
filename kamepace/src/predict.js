/* シャカの予測: 今日の予定（planned）が、時刻 T までにどれだけ積もる/消えるか。
   予定の疲労は from→to を疲労度ぶんに等分（planUnitsDue と同じ）。i個目は from+(i+1)*間隔 に積もる。 */
import { entryGlyph, entryStartTs, entryEndTs, planUnitsDue } from './model';

export function predictUnits(entries, dateStr) {
  const pos = [], neg = [];
  (entries || []).forEach((e) => {
    if (e.exp || !e.planned || e.date !== dateStr || !e.delta) return;
    const N = Math.abs(e.delta), a = entryStartTs(e), b = entryEndTs(e);
    const iv = b > a ? (b - a) / N : 0;
    for (let i = e.dropped || 0; i < N; i++) {
      (e.delta > 0 ? pos : neg).push({ g: entryGlyph(e), t: b > a ? a + (i + 1) * iv : b });
    }
  });
  pos.sort((x, y) => x.t - y.t);
  neg.sort((x, y) => x.t - y.t);
  return { pos, neg };
}

/* 時刻 T の時点での山（過去に動かしたとき）: 各記録の from→to の時刻から、T より後に積もる疲労ぶん(hide)を数える。 */
export function pastHide(entries, T) {
  let hide = 0;
  (entries || []).forEach((e) => {
    if ((e.delta || 0) <= 0) return;
    const N = e.delta;
    const solid = e.planned ? Math.min(N, e.dropped || 0) : N;
    hide += solid - Math.min(solid, planUnitsDue(e, T));
  });
  return hide;
}

/* 今日「ためた回復」に入った、消えたプラスの絵文字（消えた時刻つき・新しい順）。
   回復の絵文字がプラスに触れて消えるたびに、[回復, 消えたプラス] の組が同じ ts で記録される。 */
export function consumedToday(collected, dateOf) {
  const byTs = {};
  (collected || []).forEach((c) => { if (!c._sample && c.ts) (byTs[c.ts] = byTs[c.ts] || []).push(c); });
  const out = [];
  Object.keys(byTs).forEach((ts) => {
    if (!dateOf(Number(ts))) return;
    byTs[ts].forEach((c, i) => { if (i % 2 === 1) out.push({ ts: Number(ts), g: c.glyph }); });
  });
  return out.sort((a, b) => b.ts - a.ts);
}
