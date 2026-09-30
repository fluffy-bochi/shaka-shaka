/* 起床後記録: がんばりタイプの判定・セリフ・グラフ用データ。
   疲労度は 0〜100（山が100個で満杯）。0〜40=ゆったり / 41〜80=ほどほど / 81〜100=みちみち。
   1日の疲労の推移を滑らかな曲線にして、一番長く居たゾーンをその日のタイプにする。 */
import { hmToTsOn, entryGlyph } from './model';

export const WAKE_TYPES = [
  { id: 'yuttari', name: 'ゆったりタイプ', glyph: '🌿' },
  { id: 'hodohodo', name: 'ほどほどタイプ', glyph: '☀️' },
  { id: 'michimichi', name: 'みちみちタイプ', glyph: '🔥' },
];
export const NO_TYPE = { id: 'none', name: 'まだ記録なし', glyph: '🌱' };

export function zoneOf(f) { return f <= 40 ? 0 : f <= 80 ? 1 : 2; }

function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0); }
function pick(seed, arr) { return arr[hash(seed) % arr.length]; }

/* その日の疲労の推移（10分刻み・移動平均で滑らかに）。朝の残り疲労 startFat から、
   各記録の from→to に疲労ぶんを等分に足し引きして 0〜100 に収める。 */
export function fatigueCurve(entries, dateStr, startFat) {
  const list = (entries || []).filter(e => e.date === dateStr && !e.exp && !e.wakeAdd && e.delta && e.from && e.to);
  const t0 = hmToTsOn(dateStr, '00:00');
  const STEP = 10 * 60000;
  const raw = [];
  for (let i = 0; i <= 144; i++) {
    const t = t0 + i * STEP;
    let lv = startFat || 0;
    list.forEach(e => {
      const a = hmToTsOn(dateStr, e.from), b = hmToTsOn(dateStr, e.to);
      const k = b <= a ? (t >= b ? 1 : 0) : Math.max(0, Math.min(1, (t - a) / (b - a)));
      lv += e.delta * k;
    });
    raw.push(Math.max(0, Math.min(100, lv)));
  }
  // 記録のある時間帯(最初の開始〜最後の終了)だけを対象にする
  if (!list.length) return [];
  const first = Math.min(...list.map(e => hmToTsOn(dateStr, e.from)));
  const last = Math.max(...list.map(e => hmToTsOn(dateStr, e.to)));
  const i0 = Math.max(0, Math.floor((first - t0) / STEP)), i1 = Math.min(144, Math.ceil((last - t0) / STEP));
  const seg = raw.slice(i0, i1 + 1);
  return seg.map((_, i) => {
    let s = 0, n = 0;
    for (let k = -2; k <= 2; k++) { const v = seg[i + k]; if (v != null) { s += v; n++; } }
    return s / n;
  });
}

/* 曲線から、一番長く居たゾーン＝その日のタイプ */
export function typeOfCurve(curve) {
  if (!curve || !curve.length) return NO_TYPE;
  const cnt = [0, 0, 0];
  curve.forEach(v => { cnt[zoneOf(v)]++; });
  let best = 0;
  for (let z = 1; z < 3; z++) if (cnt[z] >= cnt[best]) best = z; // 同数なら高いほう
  return WAKE_TYPES[best];
}

/* 昨日のまとめ: タイプ・一番力を入れた行動・一番回復した行動 */
export function daySummary(entries, dateStr, startFat) {
  const curve = fatigueCurve(entries, dateStr, startFat);
  const list = (entries || []).filter(e => e.date === dateStr && !e.exp && !e.wakeAdd && e.delta && e.title);
  let up = null, rec = null;
  list.forEach(e => {
    if (e.delta > 0 && (!up || e.delta > up.delta)) up = e;
    if (e.delta < 0 && (!rec || e.delta < rec.delta)) rec = e;
  });
  return { type: typeOfCurve(curve), up: up && up.title, rec: rec && rec.title, upGlyph: up && entryGlyph(up), recGlyph: rec && entryGlyph(rec), has: list.length > 0 };
}

const BASE = {
  yuttari: ['昨日はゆったり過ごせましたね。', 'のんびりした一日でしたね。', '疲れをためすぎない、やさしい一日でしたね。'],
  hodohodo: ['昨日はほどよく頑張りましたね。', 'ちょうどいいペースの一日でしたね。', 'ほどほどに動いた一日でしたね。'],
  michimichi: ['昨日はたくさん頑張りましたね！', 'みっちり動いた一日でしたね！', 'フル回転の一日、おつかれさまでした。'],
  none: ['昨日の記録はまだありませんでした。', '昨日はお休みの日でしたか？'],
};
const CLOSER = {
  yuttari: ['今日は少しペースを上げてもよさそうです。', '余力があるので、やりたいことに手を伸ばしてみましょう。'],
  hodohodo: ['今日もこのペースでいきましょう。', '休みも挟みながら、いつも通りで大丈夫です。'],
  michimichi: ['今日はその分ゆったり過ごしてみてはいかがでしょうか？', '今日は回復の時間も多めにとりましょう。'],
  none: ['今日から少しずつ記録していきましょう。'],
};

/* 画面3: 昨日のふりかえりのセリフ */
export function reviewLine(sum, dateStr) {
  const id = sum.type.id;
  const parts = [pick(dateStr + 'b', BASE[id])];
  if (sum.up) parts.push(sum.up + 'に力を入れましたね。');
  if (sum.rec) parts.push(sum.rec + 'で一番回復しましたね。');
  parts.push(pick(dateStr + 'c', CLOSER[id]));
  return parts.join('');
}

/* 画面4: 今日の予定のセリフ */
export function planLine(plans, tasks, sum, dateStr) {
  const parts = [];
  if (plans.length) parts.push('今日の予定は' + plans.length + '件。' + plans[0].title + 'から始まります。');
  else parts.push('今日は予定が入っていません。');
  if (tasks.length) parts.push('タスクは' + tasks.length + '件あります。');
  parts.push(pick(dateStr + 'p', CLOSER[sum.type.id]));
  return parts.join('');
}

/* ホーム上部のコメント: 見ている日のいまの山の量（0〜100）と、次の予定 */
export function homeLine(count, next, dateStr) {
  const z = zoneOf(count);
  const base = [
    ['まだ余裕がありますね。', 'ゆったり進められています。'],
    ['ほどよく疲れがたまってきました。', 'いいペースですね。'],
    ['だいぶ疲れがたまっています。', '無理せず休みをはさみましょう。'],
  ][z];
  const parts = [pick(dateStr + 'h' + count, base)];
  if (next) parts.push('次は' + next.title + '（' + next.from + '〜）です。');
  return parts.join('');
}
