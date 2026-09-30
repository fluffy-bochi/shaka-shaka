import React from 'react';

/* シャカの予測バー（雨雲レーダー風）: 右端の「予測」タブで開き、時刻スライダーを動かすと
   その時刻までに積もる予定ぶんが灰色で山に足される。左端は起床時刻（記入がなければ8時）、右端は寝る時刻（未作成のあいだは23:00）。 */
const INK = '#1b1b18', LIME = '#c4f000', LIME_INK = '#2f3a00';
const hm = (ts) => { const d = new Date(ts); return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); };
const tabShape = (left) => ({ position: 'absolute', top: 0, bottom: 0, [left ? 'left' : 'right']: 0, width: 29, background: INK, color: '#fff', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, lineHeight: 1.15, clipPath: left ? 'polygon(0 12%, 100% 0, 100% 100%, 0 88%)' : 'polygon(0 0, 100% 12%, 100% 88%, 0 100%)' });

export default function PredictBar({ v }) {
  const p = v.predict;
  const trackRef = React.useRef(null);
  const [closing, setClosing] = React.useState(false);
  const isOpen = !!(p && p.open);
  React.useEffect(() => { if (!isOpen) setClosing(false); }, [isOpen]);
  // 閉じる時も、タブが右へ戻るモーション（0.1秒）のあとで実際に閉じる
  const doClose = () => { if (closing) return; setClosing(true); setTimeout(v.closePredict, 100); };
  if (!p) return null;
  if (!p.open) {
    return <button onClick={v.openPredict} aria-label="予測" style={{ ...tabShape(false), clipPath: 'polygon(0 12%, 100% 0, 100% 100%, 0 88%)', top: 'auto', bottom: 120, height: 100, zIndex: 4 }}><span style={{ writingMode: 'vertical-rl', letterSpacing: '.1em' }}>予測</span></button>;
  }
  const span = p.end - p.start;
  const frac = (t) => Math.max(0, Math.min(1, (t - p.start) / span));
  const setFromX = (e) => {
    const r = trackRef.current.getBoundingClientRect();
    v.setPredictT(p.start + Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * span);
  };
  const onDown = (e) => { e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId); setFromX(e); };
  const onMove = (e) => { if (e.buttons) setFromX(e); };
  const d = new Date(p.t);
  const label = d.getHours() + '時' + String(d.getMinutes()).padStart(2, '0') + '分（' + (Math.abs(p.t - p.now) <= 30000 ? '現在' : p.t < p.now ? '過去' : '予測') + '）';
  const noon = new Date(p.start); noon.setHours(12, 0, 0, 0);
  const marks = [[p.start, hm(p.start)], ...(noon.getTime() > p.start && noon.getTime() < p.end ? [[noon.getTime(), '12:00']] : []), [p.end, hm(p.end).replace(/^(\d+):(\d+)$/, '$1:$2')]];
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 120, height: 100, zIndex: 4, animation: closing ? 'predClose .1s ease-in forwards' : 'predOpen .2s ease-out' }}>
      <button onClick={doClose} aria-label="予測を閉じる" style={{ ...tabShape(false) }}>▶</button>
      <button onClick={doClose} aria-label="予測を閉じる" style={tabShape(true)}><span style={{ writingMode: 'vertical-rl', letterSpacing: '.1em' }}>予測</span></button>
      <div style={{ position: 'absolute', left: 29, right: 29, top: 0, bottom: 0, background: 'rgba(0,0,0,.2)', padding: '0 12px' }}>
        <div style={{ height: 38, background: 'rgba(255,255,255,.94)', border: '1.5px solid ' + INK, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>{label}</div>
        <div ref={trackRef} onPointerDown={onDown} onPointerMove={onMove} style={{ position: 'relative', height: 44, touchAction: 'none', cursor: 'ew-resize' }}>
          <div style={{ position: 'absolute', left: `${frac(p.t) * 100}%`, top: 0, height: 20, width: 2, background: '#c9c7bf', transform: 'translateX(-1px)' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, top: 28, height: 4, background: LIME, borderRadius: 2 }} />
          {/* 記録・予定のある時間: 短ければ点（丸）、長ければ、その時間の幅の棒（両端が半円） */}
          {(p.marks || []).map((m, i) => { const a = frac(m.a), b = frac(m.b); return <div key={i} style={{ position: 'absolute', top: 25, height: 10, left: `${(a + b) / 2 * 100}%`, width: `max(10px, ${(b - a) * 100}%)`, transform: 'translateX(-50%)', borderRadius: 5, background: 'rgba(27,27,24,.5)' }} />; })}
          <div style={{ position: 'absolute', left: `${frac(p.now) * 100}%`, top: 24, height: 10, width: 2, background: INK, transform: 'translateX(-1px)' }} />
          <div style={{ position: 'absolute', left: `${frac(p.t) * 100}%`, top: 20, width: 20, height: 20, borderRadius: '50%', background: LIME, border: '2.5px solid ' + LIME_INK, boxSizing: 'border-box', transform: 'translateX(-50%)', boxShadow: '0 2px 8px rgba(27,27,24,.3)' }} />
          {marks.map(([t, l], i) => <span key={i} style={{ position: 'absolute', top: 44, left: `${frac(t) * 100}%`, transform: i === 0 ? 'none' : i === marks.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)', fontSize: 9.5, color: '#55554e', fontFamily: "'Space Mono',monospace", whiteSpace: 'nowrap' }}>{l}</span>)}
        </div>
      </div>
    </div>
  );
}
