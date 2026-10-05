import React from 'react';

/* シャカの予測バー（雨雲レーダー風）: 右端の「予測」タブで開き、時刻スライダーを動かすと
   その時刻までに積もる予定ぶんが灰色で山に足される。左端は起床時刻（記入がなければ8時）、右端は寝る時刻（未作成のあいだは23:00）。 */
const PLAY_SEC_1X = 15; // 1倍速で軸の端から端まで進む秒数
const MARK = 6; // 記録の印の太さ（つまみ20pxより小さい）
const INK = '#1b1b18', LIME = '#c4f000', LIME_INK = '#2f3a00';
const hm = (ts) => { const d = new Date(ts); return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); };
const tabShape = (left) => ({ position: 'absolute', top: 0, bottom: 0, [left ? 'left' : 'right']: 0, width: 29, background: INK, color: '#fff', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, lineHeight: 1.15, clipPath: left ? 'polygon(0 12%, 100% 0, 100% 100%, 0 88%)' : 'polygon(0 0, 100% 12%, 100% 88%, 0 100%)' });

export default function PredictBar({ v }) {
  const p = v.predict;
  const trackRef = React.useRef(null);
  const [closing, setClosing] = React.useState(false);
  // 自動再生: 1倍速=軸の端から端まで15秒。▶をもう一度押すたび 2倍→3倍→1倍。■で停止。バーに触れたらその時刻で止める
  const [play, setPlay] = React.useState({ on: false, speed: 1 });
  const playRef = React.useRef(play); playRef.current = play;
  const pRef = React.useRef(p); pRef.current = p;
  React.useEffect(() => {
    if (!play.on) return undefined;
    let raf, last = performance.now(), acc = 0, t = pRef.current.t;
    const tick = (nowMs) => {
      const dt = nowMs - last; last = nowMs;
      const pp = pRef.current, span = pp.end - pp.start;
      t += dt * (span / PLAY_SEC_1X / 1000) * playRef.current.speed;
      if (t >= pp.end) { v.setPredictT(pp.end); setPlay({ on: false, speed: 1 }); return; }
      acc += dt;
      if (acc >= 40) { acc = 0; v.setPredictT(t); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [play.on]); // eslint-disable-line react-hooks/exhaustive-deps
  const isOpen = !!(p && p.open);
  React.useEffect(() => { if (!isOpen) { setClosing(false); setPlay({ on: false, speed: 1 }); } }, [isOpen]);
  const onPlay = () => {
    if (!play.on) {
      if (p.t >= p.end - 1000) v.setPredictT(p.start); // 最後まで来ていたら最初から
      setPlay({ on: true, speed: 1 });
    } else setPlay({ on: true, speed: play.speed % 3 + 1 });
  };
  // 閉じる時も、タブが右へ戻るモーション（0.1秒）のあとで実際に閉じる
  const doClose = () => { if (closing) return; setClosing(true); setTimeout(v.closePredict, 100); };
  if (!p) return null;
  const name = p.past ? '記録' : '予測'; // 過去の日は「記録」
  if (!p.open) {
    return <button onClick={v.openPredict} aria-label={name} style={{ ...tabShape(false), clipPath: 'polygon(0 12%, 100% 0, 100% 100%, 0 88%)', top: 'auto', bottom: 120, height: 100, zIndex: 4 }}><span style={{ writingMode: 'vertical-rl', letterSpacing: '.1em' }}>{name}</span></button>;
  }
  const span = p.end - p.start;
  const frac = (t) => Math.max(0, Math.min(1, (t - p.start) / span));
  const setFromX = (e) => {
    const r = trackRef.current.getBoundingClientRect();
    v.setPredictT(p.start + Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * span);
  };
  const onDown = (e) => { setPlay({ on: false, speed: 1 }); e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId); setFromX(e); };
  const onMove = (e) => { if (e.buttons) setFromX(e); };
  const d = new Date(p.t);
  const label = d.getHours() + '時' + String(d.getMinutes()).padStart(2, '0') + '分（' + (Math.abs(p.t - p.now) <= 30000 ? '現在' : p.t < p.now ? '記録' : '予測') + '）';
  const noon = new Date(p.start); noon.setHours(12, 0, 0, 0);
  const marks = [[p.start, hm(p.start)], ...(noon.getTime() > p.start && noon.getTime() < p.end ? [[noon.getTime(), '12:00']] : []), [p.end, hm(p.end).replace(/^(\d+):(\d+)$/, '$1:$2')]];
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 120, height: 100, zIndex: 4, animation: closing ? 'predClose .1s ease-in forwards' : 'predOpen .2s ease-out' }}>
      <button onClick={doClose} aria-label={name + 'を閉じる'} style={{ ...tabShape(false) }}>▶</button>
      <button onClick={doClose} aria-label={name + 'を閉じる'} style={tabShape(true)}><span style={{ writingMode: 'vertical-rl', letterSpacing: '.1em' }}>{name}</span></button>
      <div style={{ position: 'absolute', left: 29, right: 29, top: 0, bottom: 0, background: 'rgba(0,0,0,.2)', padding: '0 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1, minWidth: 0, height: 38, background: 'rgba(255,255,255,.94)', border: '1.5px solid ' + INK, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>{label}</div>
          <button onClick={onPlay} aria-label="再生" style={{ position: 'relative', flex: '0 0 auto', width: 38, height: 38, borderRadius: 10, border: '1.5px solid ' + INK, background: play.on ? LIME : '#fff', color: INK, cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1 }}>▶{play.on && play.speed > 1 && <span style={{ position: 'absolute', right: 3, bottom: 1, fontSize: 9, fontWeight: 800, fontFamily: "'Space Mono',monospace" }}>×{play.speed}</span>}</button>
          <button onClick={() => setPlay({ on: false, speed: 1 })} aria-label="停止" style={{ flex: '0 0 auto', width: 38, height: 38, borderRadius: 10, border: '1.5px solid ' + INK, background: '#fff', color: INK, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><span style={{ width: 4, height: 14, borderRadius: 2, background: INK }} /><span style={{ width: 4, height: 14, borderRadius: 2, background: INK }} /></button>
        </div>
        <div ref={trackRef} onPointerDown={onDown} onPointerMove={onMove} style={{ position: 'relative', height: 44, touchAction: 'none', cursor: 'ew-resize' }}>
          <div style={{ position: 'absolute', left: `${frac(p.t) * 100}%`, top: 0, height: 20, width: 2, background: '#c9c7bf', transform: 'translateX(-1px)' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, top: 29, height: 2, background: INK, borderRadius: 1 }} />
          {/* 記録・予定のある時間: 短ければ点（丸）、長ければ、その時間の幅の棒（両端が半円）。つまみと重なったらライム */}
          {(p.marks || []).map((m, i) => {
            const a = frac(m.a), b = frac(m.b), tw = (trackRef.current && trackRef.current.clientWidth) || 250;
            const half = Math.max(MARK / 2, (b - a) * tw / 2), c = (a + b) / 2 * tw, px = frac(p.t) * tw;
            const hit = c + half >= px - 10 && c - half <= px + 10; // つまみ（半径10px）と重なる
            return <div key={i} style={{ position: 'absolute', top: 30 - MARK / 2, height: MARK, left: `${(a + b) / 2 * 100}%`, width: `max(${MARK}px, ${(b - a) * 100}%)`, transform: 'translateX(-50%)', borderRadius: MARK / 2, background: hit ? LIME : INK }} />;
          })}
          <div style={{ position: 'absolute', left: `${frac(p.t) * 100}%`, top: 20, width: 20, height: 20, borderRadius: '50%', background: LIME, border: '2.5px solid ' + LIME_INK, boxSizing: 'border-box', transform: 'translateX(-50%)', boxShadow: '0 2px 8px rgba(27,27,24,.3)' }} />
          {marks.map(([t, l], i) => <span key={i} style={{ position: 'absolute', top: 44, left: `${frac(t) * 100}%`, transform: i === 0 ? 'none' : i === marks.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)', fontSize: 9.5, color: '#55554e', fontFamily: "'Space Mono',monospace", whiteSpace: 'nowrap' }}>{l}</span>)}
        </div>
      </div>
    </div>
  );
}
