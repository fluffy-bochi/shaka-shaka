import React from 'react';

/* 記録の全サブ画面ヘッダー右上の時間帯プルダウン（あすけん「間食」ピル準拠） */
export default function SlotPill({ v, small }) {
  return (
    <div style={{ position: 'relative', flex: '0 0 auto' }}>
      <button onClick={v.toggleSlotMenu} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1.5px solid #e4e1d8', borderRadius: 999, padding: small ? '6px 9px 6px 11px' : '7px 10px 7px 13px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(27,27,24,.06)' }}>
        <span style={{ fontSize: small ? 14 : 15 }}>{v.recordSlotEmoji}</span>
        <span style={{ fontSize: small ? 12.5 : 13, fontWeight: 700, color: '#1b1b18' }}>{v.recordSlotName}</span>
        <span style={{ fontFamily: 'Material Symbols Rounded', fontSize: small ? 17 : 18, color: '#8a8a82' }}>expand_more</span>
      </button>
      {v.slotMenuOpen && (
        <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 14, background: '#fff', border: '1px solid #efece3', borderRadius: 14, boxShadow: '0 12px 28px rgba(27,27,24,.2)', padding: 6, minWidth: 138 }}>
          {v.slotOptions.map(o => (
            <button key={o.id} onClick={o.onPick} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 9, background: o.bg, border: 'none', borderRadius: 10, padding: '9px 11px', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ fontSize: 16 }}>{o.emoji}</span>
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: '#1b1b18' }}>{o.name}</span>
              {o.active && <span style={{ fontFamily: 'Material Symbols Rounded', fontSize: 17, color: '#7a9a00' }}>check</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
