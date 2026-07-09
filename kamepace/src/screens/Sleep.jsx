import React from 'react';

/* 睡眠記録: 背景はホームと同じ #f7f4ec。数値は出さず、絵文字量とラインだけ（CLAUDE.md §D） */
export default function Sleep({ v }) {
  return (
    <div style={{ position: 'relative', flex: 1, minHeight: 0, background: '#f7f4ec', overflow: 'hidden' }}>
      {/* full-bleed emoji pile */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
        {v.sleepPile.map((p, i) => (
          <span key={i} style={{ position: 'absolute', left: p.x, bottom: p.y, fontSize: p.s, transform: `rotate(${p.r2}deg)`, opacity: p.op, transition: `opacity .7s ease ${p.delay}`, filter: 'drop-shadow(0 4px 6px rgba(27,27,24,.14))' }}>{p.e}</span>
        ))}
      </div>
      {/* falling moons */}
      {v.sleepAnim && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none' }}>
          {v.moons.map((m, i) => (
            <span key={i} style={{ position: 'absolute', left: m.x + '%', top: -40, fontSize: 30, animation: `moonfall 1.1s ease-in ${m.delay} forwards` }}>🌙</span>
          ))}
        </div>
      )}
      {/* drag layer (full screen) */}
      <div onPointerDown={v.onSleepDrag} onPointerMove={v.onSleepDrag} style={{ position: 'absolute', inset: 0, zIndex: 2, touchAction: 'none', cursor: 'ns-resize' }} />
      {/* residual line */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: v.residualPct, zIndex: 3, pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: 9, padding: '0 12px', transition: 'bottom .1s linear' }}>
        <span style={{ flex: 1, height: 2.5, background: '#1b1b18', borderRadius: 2 }} />
        <span style={{ width: 34, height: 34, borderRadius: '50%', background: '#fff', border: '3px solid #1b1b18', boxShadow: '0 3px 10px rgba(27,27,24,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flex: '0 0 auto' }}>↕</span>
      </div>
      {/* header */}
      <div style={{ position: 'relative', zIndex: 4, display: 'flex', alignItems: 'center', gap: 14, padding: '6px 22px 4px' }}>
        <button onClick={v.goHome} style={{ background: 'none', border: 'none', fontSize: 19, color: '#8a8a82', cursor: 'pointer' }}>✕</button>
        <div style={{ fontSize: 16, fontWeight: 700 }}>🛏 睡眠の記録</div>
      </div>
      {/* CTA */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 4, padding: '0 16px 18px' }}>
        <button onClick={v.finishSleep} style={{ width: '100%', border: 'none', borderRadius: 14, background: '#c4f000', color: '#2f3a00', fontWeight: 700, fontSize: 16, padding: 16, cursor: 'pointer', boxShadow: '0 8px 24px rgba(27,27,24,.18)' }}>これくらい 回復した</button>
      </div>
    </div>
  );
}
