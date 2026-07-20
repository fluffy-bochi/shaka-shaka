import React from 'react';

const mono = { fontFamily: "'Space Mono',monospace" };

/* ゴミ箱: exp:true の記録。もどす / 完全に削除 */
export default function Trash({ v }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: '#f7f4ec' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 20px 12px' }}>
        <button onClick={v.goMypage} style={{ background: 'none', border: 'none', fontSize: 19, color: '#8a8a82', cursor: 'pointer' }}>‹</button>
        <div style={{ fontSize: 16, fontWeight: 700, flex: 1 }}>🗑 ゴミ箱</div>
        <span style={{ ...mono, fontSize: 12, color: '#8a8a82' }}>{v.trashCount}件</span>
      </div>
      <div className="nos" style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px' }}>
        {v.trashRows.length === 0 && v.trashPlanRows.length === 0 && (
          <div style={{ textAlign: 'center', fontSize: 12.5, color: '#b4b2a8', lineHeight: 1.8, padding: '48px 24px' }}>
            ゴミ箱は空です。<br />きろくの編集画面や予定リストから「ゴミ箱へ」で移動できます。
          </div>
        )}
        {v.trashPlanRows.length > 0 && (
          <div style={{ ...mono, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#b4b2a8', margin: '4px 6px 8px' }}>予定</div>
        )}
        {v.trashPlanRows.map(r => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 11, background: '#fff', borderRadius: 14, padding: '12px 13px', marginBottom: 8, boxShadow: '0 1px 3px rgba(27,27,24,.05)' }}>
            <span style={{ fontSize: 18, flex: '0 0 auto' }}>{r.glyph}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.4 }}>{r.name}</div>
              <div style={{ ...mono, fontSize: 10.5, color: '#b4b2a8', marginTop: 1 }}>{r.meta}</div>
            </div>
            <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: '#c9c7bf', flex: '0 0 auto' }}>{r.fatText}</span>
            <button onClick={r.onRestore} style={{ border: '1.5px solid #c4de52', background: '#fbfdf0', borderRadius: 10, padding: '7px 11px', fontSize: 11.5, fontWeight: 700, color: '#4a5a00', cursor: 'pointer', flex: '0 0 auto' }}>もどす</button>
            <button onClick={r.onPurge} style={{ width: 30, height: 30, border: 'none', background: 'none', fontSize: 16, color: '#c9c7bf', cursor: 'pointer', flex: '0 0 auto' }}>✕</button>
          </div>
        ))}
        {v.trashRows.length > 0 && v.trashPlanRows.length > 0 && (
          <div style={{ ...mono, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#b4b2a8', margin: '10px 6px 8px' }}>きろく</div>
        )}
        {v.trashRows.map(r => (
          <div key={r.i} style={{ display: 'flex', alignItems: 'center', gap: 11, background: '#fff', borderRadius: 14, padding: '12px 13px', marginBottom: 8, boxShadow: '0 1px 3px rgba(27,27,24,.05)' }}>
            <span style={{ fontSize: 18, flex: '0 0 auto' }}>{r.glyph}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.4 }}>{r.name}</div>
              <div style={{ ...mono, fontSize: 10.5, color: '#b4b2a8', marginTop: 1 }}>{r.meta}</div>
            </div>
            <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: '#c9c7bf', flex: '0 0 auto' }}>{r.fatText}</span>
            <button onClick={r.onRestore} style={{ border: '1.5px solid #c4de52', background: '#fbfdf0', borderRadius: 10, padding: '7px 11px', fontSize: 11.5, fontWeight: 700, color: '#4a5a00', cursor: 'pointer', flex: '0 0 auto' }}>もどす</button>
            <button onClick={r.onPurge} style={{ width: 30, height: 30, border: 'none', background: 'none', fontSize: 16, color: '#c9c7bf', cursor: 'pointer', flex: '0 0 auto' }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
