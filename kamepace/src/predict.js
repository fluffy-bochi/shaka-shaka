/* シャカの予測: 今日の予定（planned）が、時刻 T までにどれだけ積もる/消えるか。
   予定の疲労は from→to を疲労度ぶんに等分（planUnitsDue と同じ）。i個目は from+(i+1)*間隔 に積もる。 */
import { entryGlyph, entryStartTs, entryEndTs } from './model';

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
