import React from 'react';
import { nurseSrc } from '../wake';

/* 起床後記録（ホームの睡眠カードから）: 1 入力 → シャカで🌙 → 2 昨日のふりかえり → 3 今日の予定。
   体調・気分は今は数字の1〜5（あとでイラストに差し替える予定）。背景はホームと同じ #f7f4ec。 */
const mono = { fontFamily: "'Space Mono',monospace" };
const INK = '#1b1b18', LIME = '#c4f000', LIME_INK = '#2f3a00';

const COND = [['1', '最悪'], ['2', '悪い'], ['3', 'ふつう'], ['4', '良い'], ['5', '絶好調']];
const MOOD = [['1', '最悪'], ['2', '悪い'], ['3', 'ふつう'], ['4', '良い'], ['5', '最高']];
const FAT = [[100, '満杯'], [75, 'ぎっしり'], [50, '半分'], [25, '少し'], [0, 'ゼロ']];

const wrap = { position: 'relative', flex: 1, minHeight: 0, background: '#f7f4ec', display: 'flex', flexDirection: 'column', overflow: 'hidden' };
const foot = { flex: '0 0 auto', display: 'flex', gap: 12, padding: '12px 20px calc(18px + env(safe-area-inset-bottom))' };
const btnMain = (on = true) => ({ flex: 1, border: 'none', borderRadius: 16, background: on ? LIME : '#e4e1d8', color: on ? LIME_INK : '#a5a39a', fontWeight: 800, fontSize: 16, padding: '17px 0', cursor: on ? 'pointer' : 'default', boxShadow: on ? '0 6px 18px rgba(122,154,0,.3)' : 'none' });
const btnSub = { flex: '0 0 34%', border: '2px solid #e4e1d8', borderRadius: 16, background: '#fff', color: '#55554e', fontWeight: 700, fontSize: 16, padding: '15px 0', cursor: 'pointer' };

function Head({ v }) {
  return <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, padding: '16px 20px 10px' }}>{v.wakeHeader}</div>;
}

function Rating({ title, opts, value, onPick, labels }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ background: '#fff', borderRadius: 18, margin: '0 20px 12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(27,27,24,.05)' }}>
      <div style={{ padding: '14px 16px 10px' }}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>{title}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
          {opts.map(([val, glyph], i) => {
            const on = value === val;
            return (
              <button key={i} onClick={() => onPick(val)} style={{ width: 52, height: 52, borderRadius: '50%', border: on ? '3px solid ' + INK : '3px solid transparent', background: on ? LIME : '#f1efe8', fontSize: 15, fontWeight: 800, color: INK, cursor: 'pointer', padding: 0, transition: 'background .15s' }}>{glyph}</button>
            );
          })}
        </div>
        {open && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            {labels.map((l, i) => <span key={i} style={{ width: 52, textAlign: 'center', fontSize: 10, color: '#8a8a82', fontWeight: 700 }}>{l}</span>)}
          </div>
        )}
      </div>
      <button onClick={() => setOpen(!open)} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', border: 'none', background: '#8a8a82', color: '#fff', fontSize: 11, fontWeight: 700, padding: '6px 16px', cursor: 'pointer' }}>
        <span style={{ fontSize: 9 }}>{open ? '▼' : '▶'}</span>詳細
      </button>
    </div>
  );
}

/* 睡眠時間: 何時〜何時まで（就寝〜起床）。起床の初期値は入力画面を開いた時刻 */
const toMin = (hm) => { const [h, m] = (hm || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
const timeBox = { border: 'none', background: '#f1efe8', borderRadius: 12, padding: '9px 10px', fontSize: 20, fontWeight: 800, color: INK, fontFamily: "'Space Mono',monospace", width: 118, textAlign: 'center', boxSizing: 'border-box' };
function SleepCard({ d, set }) {
  let dur = toMin(d.up) - toMin(d.bed); if (dur <= 0) dur += 1440; // 日をまたぐ
  return (
    <div style={{ background: '#fff', borderRadius: 18, margin: '0 20px 12px', padding: '14px 16px 14px', boxShadow: '0 2px 10px rgba(27,27,24,.05)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 15, fontWeight: 800 }}>睡眠</span>
        <span style={{ ...mono, fontSize: 13, fontWeight: 700, color: '#55554e' }}>{Math.floor(dur / 60)}時間{dur % 60}分</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <input type="time" value={d.bed || ''} onChange={(e) => set('bed', e.target.value)} aria-label="就寝時刻" style={timeBox} />
        <span style={{ fontSize: 16, fontWeight: 800, color: '#8a8a82' }}>〜</span>
        <input type="time" value={d.up || ''} onChange={(e) => set('up', e.target.value)} aria-label="起床時刻" style={timeBox} />
      </div>
    </div>
  );
}

/* 1: 睡眠・体調・気分・残っている疲労度 */
export function WakeCheck({ v }) {
  const d = v.wakeDraft;
  const ready = d.fat != null;
  return (
    <div style={wrap}>
      <Head v={v} />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingTop: 6 }}>
        <SleepCard d={d} set={v.setWakeDraft} />
        <Rating title="体調" opts={COND.map(([g], i) => [i + 1, g])} labels={COND.map(c => c[1])} value={d.cond} onPick={(x) => v.setWakeDraft('cond', x)} />
        <Rating title="気分" opts={MOOD.map(([g], i) => [i + 1, g])} labels={MOOD.map(c => c[1])} value={d.mood} onPick={(x) => v.setWakeDraft('mood', x)} />
        <Rating title="残っている疲労度" opts={FAT.map(([n]) => [n, String(n)])} labels={FAT.map(c => c[1])} value={d.fat} onPick={(x) => v.setWakeDraft('fat', x)} />
      </div>
      <div style={{ ...foot, justifyContent: 'space-between' }}>
        <button onClick={v.goHome} style={btnSub}>やめる</button>
        <button onClick={ready ? v.finishWake1 : undefined} style={btnMain(ready)}>つぎへ</button>
      </div>
    </div>
  );
}

/* 就寝記録 1: 体調・気分・疲労度（就寝時刻は記録した時刻が翌朝の起床記録に入る） */
export function BedCheck({ v }) {
  const d = v.bedDraft;
  const ready = d.fat != null;
  return (
    <div style={wrap}>
      <Head v={v} />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingTop: 6 }}>
        <Rating title="体調" opts={COND.map(([g], i) => [i + 1, g])} labels={COND.map(c => c[1])} value={d.cond} onPick={(x) => v.setBedDraft('cond', x)} />
        <Rating title="気分" opts={MOOD.map(([g], i) => [i + 1, g])} labels={MOOD.map(c => c[1])} value={d.mood} onPick={(x) => v.setBedDraft('mood', x)} />
        <Rating title="いまの疲労度" opts={FAT.map(([n]) => [n, String(n)])} labels={FAT.map(c => c[1])} value={d.fat} onPick={(x) => v.setBedDraft('fat', x)} />
      </div>
      <div style={{ ...foot, justifyContent: 'space-between' }}>
        <button onClick={v.goHome} style={btnSub}>やめる</button>
        <button onClick={ready ? v.finishBed1 : undefined} style={btnMain(ready)}>つぎへ</button>
      </div>
    </div>
  );
}

/* キャラ＋吹き出し */
export function Speaker({ text, size = 130, onTap, src: srcIn }) {
  const src = srcIn || nurseSrc(text); // セリフに合った表情（いこいさん編集のプレビューでは表情を指定できる）
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, padding: '0 20px' }}>
      <img key={src} src={src} alt="" onClick={onTap} style={{ cursor: onTap ? 'pointer' : undefined, WebkitTapHighlightColor: 'transparent', userSelect: 'none', WebkitUserSelect: 'none', flex: '0 0 auto', width: size, height: size, objectFit: 'contain', objectPosition: 'bottom', mixBlendMode: 'multiply' }} />
      <div key={text} onClick={onTap} style={{ position: 'relative', flex: 1, background: '#fff', borderRadius: 18, padding: '12px 14px', fontSize: 12.5, lineHeight: 1.75, boxShadow: '0 2px 10px rgba(27,27,24,.06)', marginBottom: 14, animation: 'bubbleIn .18s ease-out', cursor: onTap ? 'pointer' : undefined, WebkitTapHighlightColor: 'transparent', userSelect: 'none', WebkitUserSelect: 'none' }}>
        {text}
        <span style={{ position: 'absolute', left: -6, bottom: 14, width: 12, height: 12, background: '#fff', transform: 'rotate(45deg)' }} />
      </div>
    </div>
  );
}

/* なめらかな折れ線（Catmull-Rom → Bezier） */
function smoothPath(pts) {
  if (pts.length < 2) return '';
  let d = 'M' + pts[0][0] + ',' + pts[0][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ' C' + c1[0].toFixed(1) + ',' + c1[1].toFixed(1) + ' ' + c2[0].toFixed(1) + ',' + c2[1].toFixed(1) + ' ' + p2[0].toFixed(1) + ',' + p2[1].toFixed(1);
  }
  return d;
}

const SERIES = [
  { key: 'cond', name: '体調', color: INK, val: (r) => r.cond == null ? null : (r.cond - 1) / 4 },
  { key: 'mood', name: '気分', color: '#ff5fa2', val: (r) => r.mood == null ? null : (r.mood - 1) / 4 },
  { key: 'fatigue', name: '疲労度', color: '#7a9a00', val: (r) => r.fatigue == null ? null : r.fatigue / 100 },
];

/* 推移グラフ。data = { recs: 朝・夜の記録, fat: 疲労度の増減 [{ts, v}] }。横軸は時刻。
   体調・気分は記録の点に丸。疲労度は増減のたびに線を引き、いちばん高い・低いところだけ丸と時刻をつける */
function Chart({ data }) {
  const [hide, setHide] = React.useState({});
  const W = 320, H = 170, PX = 24, PT = 18, PB = 34;
  const recs = (data && data.recs) || [], fat = ((data && data.fat) || []).filter(p => p.v != null);
  const all = [...recs.map(r => r.ts), ...fat.map(p => p.ts)];
  const t0 = all.length ? Math.min(...all) : 0, t1 = all.length ? Math.max(...all) : 0;
  const oneDay = t1 - t0 < 24 * 3600000;
  const X = (ts) => (t1 === t0 ? W / 2 : PX + (ts - t0) / (t1 - t0) * (W - 2 * PX));
  const Y = (t) => PT + (1 - t) * (H - PT - PB);
  const hm = (ts) => { const d = new Date(ts); return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const md = (ts) => { const d = new Date(ts); return (d.getMonth() + 1) + '/' + d.getDate(); };
  // 疲労度の最高・最低（同じ値なら最初のもの）
  let hi = null, lo = null;
  fat.forEach(p => { if (!hi || p.v > hi.v) hi = p; if (!lo || p.v < lo.v) lo = p; });
  const marks = hi && lo && hi !== lo ? [[hi, -9], [lo, 15]] : hi ? [[hi, -9]] : [];
  const fs = SERIES.find(x => x.key === 'fatigue');
  return (
    <div style={{ margin: '0 20px' }}>
      <div style={{ background: '#fff', borderRadius: 18, padding: '6px 0 2px', boxShadow: '0 2px 10px rgba(27,27,24,.05)' }}>
        {!all.length ? (
          <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#a5a39a' }}>まだ記録がありません</div>
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
            {[0, .5, 1].map((t, i) => <line key={i} x1={PX - 8} x2={W - PX + 8} y1={Y(t)} y2={Y(t)} stroke="#efece3" strokeWidth="1" />)}
            {/* 朝・夜の記録の時刻（1日なら時刻だけ、複数日なら日付と時刻） */}
            {recs.map((r, i) => (
              <g key={i}>
                <line x1={X(r.ts)} x2={X(r.ts)} y1={PT} y2={H - PB} stroke="#f3f1ea" strokeWidth="1" />
                <text x={X(r.ts)} y={H - PB + 13} textAnchor="middle" fontSize="8.5" fill="#8a8a82" style={mono}>{oneDay ? hm(r.ts) : md(r.ts)}</text>
                {!oneDay && <text x={X(r.ts)} y={H - PB + 24} textAnchor="middle" fontSize="8.5" fill="#8a8a82" style={mono}>{hm(r.ts)}</text>}
              </g>
            ))}
            {SERIES.filter(x => x.key !== 'fatigue' && !hide[x.key]).map(x => {
              const pts = recs.map(r => [X(r.ts), x.val(r)]).filter(p => p[1] != null).map(p => [p[0], Y(p[1])]);
              return (
                <g key={x.key}>
                  {pts.length > 1 && <path d={smoothPath(pts)} fill="none" stroke={x.color} strokeWidth="2.4" strokeLinecap="round" />}
                  {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="4.2" fill="#fff" stroke={x.color} strokeWidth="2.4" />)}
                </g>
              );
            })}
            {!hide.fatigue && fat.length > 0 && (() => {
              const pts = fat.map(p => [X(p.ts), Y(p.v / 100)]);
              return (
                <g>
                  {/* 増減の点は細かいので、なめらかにすると行きすぎる。折れ線で結ぶ */}
                  {pts.length > 1 && <path d={'M' + pts.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' L')} fill="none" stroke={fs.color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />}
                  {marks.map(([p, dy0], i) => {
                    const cx = X(p.ts), cy = Y(p.v / 100);
                    const dy = dy0 > 0 && cy + dy0 > H - PB - 2 ? -9 : dy0 < 0 && cy + dy0 < 9 ? 15 : dy0; // 下の時刻・上の端と重ならないように
                    const anchor = cx < PX + 20 ? 'start' : cx > W - PX - 20 ? 'end' : 'middle';
                    return (
                      <g key={i}>
                        <circle cx={cx} cy={cy} r="4.2" fill="#fff" stroke={fs.color} strokeWidth="2.4" />
                        <text x={cx} y={cy + dy} textAnchor={anchor} fontSize="8.5" fontWeight="700" fill={fs.color} stroke="#fff" strokeWidth="3" paintOrder="stroke" style={mono}>{(oneDay ? '' : md(p.ts) + ' ') + hm(p.ts)}</text>
                      </g>
                    );
                  })}
                </g>
              );
            })()}
          </svg>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
        {SERIES.map(x => {
          const off = !!hide[x.key];
          return (
            <button key={x.key} onClick={() => setHide({ ...hide, [x.key]: !off })} style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', borderRadius: 999, background: off ? '#e4e1d8' : INK, color: off ? '#a5a39a' : '#fff', fontWeight: 700, fontSize: 12.5, padding: '8px 14px', cursor: 'pointer' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: off ? '#c9c5b8' : x.color, border: '1.5px solid #fff' }} />{x.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* がんばりタイプ（アイコン＋名前） */
function TypeBlock({ sum, label }) {
  return (
    <>
      <div style={{ textAlign: 'center', fontSize: 12.5, color: '#55554e', fontWeight: 700, marginTop: 4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, margin: '8px 0 14px' }}>
        {sum.type.id === 'michimichi'
          ? <img src="/wake/fireball.svg" alt="" style={{ width: 62, height: 62 }} />
          : <div style={{ width: 62, height: 62, borderRadius: '50%', background: INK, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>{sum.type.glyph}</div>}
        <div style={{ fontSize: 24, fontWeight: 900 }}>{sum.type.name}</div>
      </div>
    </>
  );
}

/* 就寝記録 3: 今日のがんばりタイプ・セリフ・推移グラフ（がんばりタイプは就寝時に診断する） */
export function BedReview({ v }) {
  const b = v.bed;
  return (
    <div style={wrap}>
      <Head v={v} />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <TypeBlock sum={b.sum} label="今日のがんばりタイプ" />
        <Speaker text={b.reviewText} />
        <Chart data={v.wakeRecs} />
        <div style={{ height: 8 }} />
      </div>
      <div style={foot}>
        <button onClick={v.backBed} style={btnSub}>もどる</button>
        <button onClick={v.goHome} style={btnMain()}>ホームへ</button>
      </div>
    </div>
  );
}

/* 起床 2: 推移グラフ（タイプ診断は就寝記録で行う） */
export function WakeReview({ v }) {
  const w = v.wake;
  return (
    <div style={wrap}>
      <Head v={v} />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingTop: 10 }}>
        <Chart data={w.chart} />
        <div style={{ height: 8 }} />
      </div>
      <div style={foot}>
        <button onClick={v.backWake('shaka')} style={btnSub}>もどる</button>
        <button onClick={v.goWake3} style={btnMain()}>つぎへ</button>
      </div>
    </div>
  );
}

/* 3: 今日の予定 */
export function WakePlan({ v }) {
  const w = v.wake;
  return (
    <div style={wrap}>
      <Head v={v} />
      <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, margin: '4px 0 10px' }}>今日の予定</div>
      <Speaker text={w.planText} />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: '#efece3', borderRadius: '22px 22px 0 0', padding: '16px 20px 8px' }}>
        {w.plans.length === 0 && w.tasks.length === 0 && <div style={{ textAlign: 'center', fontSize: 12.5, color: '#a5a39a', padding: '30px 0' }}>予定もタスクもありません</div>}
        {w.plans.map((p, i) => (
          <div key={'p' + i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', borderRadius: 14, padding: '11px 14px', marginBottom: 8 }}>
            <span style={{ ...mono, fontSize: 11.5, fontWeight: 700, color: '#55554e', flex: '0 0 auto' }}>{p.from}</span>
            <span style={{ fontSize: 18, flex: '0 0 auto' }}>{p.glyph}</span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
            {p.delta ? <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: '#f5994e', flex: '0 0 auto' }}>{p.delta > 0 ? '+' + p.delta : p.delta}</span> : null}
          </div>
        ))}
        {w.tasks.map((t, i) => (
          <div key={'t' + i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', borderRadius: 14, padding: '11px 14px', marginBottom: 8 }}>
            <span style={{ width: 18, height: 18, borderRadius: 6, border: '2px solid ' + (t.done ? '#7a9a00' : '#c9c5b8'), background: t.done ? LIME : '#fff', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: LIME_INK }}>{t.done ? '✓' : ''}</span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700, color: t.done ? '#a5a39a' : INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
          </div>
        ))}
      </div>
      <div style={{ ...foot, background: '#efece3' }}>
        <button onClick={v.backWake('wake2')} style={btnSub}>もどる</button>
        <button onClick={v.goHome} style={btnMain()}>ホームへ</button>
      </div>
    </div>
  );
}
