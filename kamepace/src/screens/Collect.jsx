import React from 'react';

/* ためた回復: 回復で消した絵文字が縦長スクロール世界に積もる */
export default function Collect({ v }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: '#f7f4ec' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 20px 10px' }}>
        <button onClick={v.goShaka} style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 700, color: '#55554e', cursor: 'pointer' }}>← もどる</button>
        <div style={{ fontSize: 15, fontWeight: 900, flex: 1 }}>ためた回復</div>
        <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 20 }}>{v.collectedTotal}</span>
      </div>
      <div id="collectscroll" className="nos" style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        <div id="collectstack" style={{ position: 'relative', width: '100%' }} />
      </div>
    </div>
  );
}
