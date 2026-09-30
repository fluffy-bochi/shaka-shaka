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

/* 時刻 T の時点での山（過去に動かしたとき）: T より後に積もる疲労ぶん(hide)は山から外し、
   T より後に消える回復ぶん(restore)は、まだ消えていない状態に戻す。 */
export function pastAfter(entries, T) {
  let hide = 0, restore = 0;
  (entries || []).forEach((e) => {
    if (!e.delta) return;
    const N = Math.abs(e.delta);
    const solid = e.planned ? Math.min(N, e.dropped || 0) : N;
    const after = solid - Math.min(solid, planUnitsDue(e, T));
    if (e.delta > 0) hide += after; else restore += after;
  });
  return { hide, restore };
}
