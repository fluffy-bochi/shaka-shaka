import React from 'react';

const mono = { fontFamily: "'Space Mono',monospace" };

export default function Shaka({ v }) {
  return (
    <>
      <div id="shakacase" style={{ position: 'absolute', left: 0, right: 0, top: 40, bottom: 64, zIndex: 0, overflow: 'hidden' }} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 20px 0' }}>
        <button onClick={v.goHome} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,.85)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#55554e', cursor: 'pointer' }}>✕</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,.85)', borderRadius: 999, padding: '6px 10px' }}>
          <button onClick={v.prevDay} style={{ background: 'none', border: 'none', fontSize: 14, color: v.prevColor, cursor: 'pointer', padding: '2px 6px' }}>‹</button>
          <span style={{ ...mono, fontSize: 12, fontWeight: 700 }}>{v.shakaDate}</span>
          <button onClick={v.nextDay} style={{ background: 'none', border: 'none', fontSize: 14, color: v.nextColor, cursor: 'pointer', padding: '2px 6px' }}>›</button>
        </div>
        <button onClick={v.shake} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,.85)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, cursor: 'pointer' }}>🔀</button>
      </div>
      {/* ロック画面風の時計（旧本番 backClock 相当） */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '14px 26px 0', pointerEvents: 'none' }}>
        <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 68, lineHeight: 1.02, letterSpacing: '.01em', color: '#1b1b18' }}>{v.clockHm}</div>
      </div>
      <div style={{ flex: 1 }} />
      <button onClick={v.goCollect} style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 90, zIndex: 2, background: '#1b1b18', color: '#fff', border: 'none', borderRadius: 999, padding: '11px 18px', fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#c4f000', color: '#2f3a00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>🏆</span>
        ためた回復を見る
      </button>
    </>
  );
}
