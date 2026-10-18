import React from 'react';
import { createPortal } from 'react-dom';
import Emo from '../fluent';

/* 今週の目標に関連する行動: 目標の先頭に出すアイコンを選ぶボタンと、選ぶポップアップ（ホーム・朝の記録・週間レポートで共通） */
const INK = '#1b1b18';

export function GoalActButton({ glyph, onClick, size = 38 }) {
  return (
    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClick} aria-label="関連する行動"
      style={{ flex: '0 0 auto', width: size, height: size, borderRadius: 10, border: glyph ? '1.5px solid #e4e1d8' : '1.5px dashed #c9c5b8', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
      {glyph ? <Emo e={glyph} size={size - 14} /> : <span style={{ fontFamily: 'Material Symbols Rounded', fontSize: size - 18, color: '#a5a39a' }}>add_reaction</span>}
    </button>
  );
}

export function GoalActPicker({ cats, value, onPick, onClose }) {
  const [q, setQ] = React.useState('');
  const host = typeof document !== 'undefined' ? document.querySelector('.app-screen') : null;
  const k = q.trim();
  const list = (cats || []).map(c => ({ ...c, items: k ? c.items.filter(it => it.name.includes(k)) : c.items })).filter(c => c.items.length);
  const body = (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 40, background: 'rgba(27,27,24,.4)', display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', height: '72%', background: '#f7f4ec', borderRadius: '22px 22px 0 0', display: 'flex', flexDirection: 'column', boxShadow: '0 -12px 32px rgba(27,27,24,.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 8px' }}>
          <span style={{ flex: 1, fontSize: 15, fontWeight: 900 }}>関連する行動</span>
          {value && <button onClick={() => { onPick(null); onClose(); }} style={{ border: '1.5px solid #e4e1d8', borderRadius: 999, background: '#fff', color: '#55554e', fontSize: 12, fontWeight: 800, padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>外す</button>}
          <button onClick={onClose} aria-label="閉じる" style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}><span style={{ fontFamily: 'Material Symbols Rounded', fontSize: 24, color: INK }}>close</span></button>
        </div>
        <div style={{ padding: '0 16px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', borderRadius: 12, padding: '0 10px', border: '1.5px solid #e4e1d8' }}>
            <span style={{ fontFamily: 'Material Symbols Rounded', fontSize: 20, color: '#8a8a82' }}>search</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="行動の名前" style={{ flex: 1, minWidth: 0, height: 38, border: 'none', outline: 'none', fontSize: 16, fontWeight: 700, fontFamily: 'inherit', background: 'transparent', color: INK }} />
          </div>
        </div>
        <div className="nos" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 16px 20px' }}>
          {list.map(c => (
            <div key={c.id} style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 800, color: '#55554e', marginBottom: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: c.color }} />{c.name}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {c.items.map(it => {
                  const on = it.id === value;
                  return (
                    <button key={it.id} onClick={() => { onPick(it.id); onClose(); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: on ? '2px solid ' + INK : '1.5px solid #e4e1d8', borderRadius: 999, background: on ? '#fbfdf0' : '#fff', padding: '4px 11px 4px 6px', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: INK, fontFamily: 'inherit' }}>
                      <Emo e={it.glyph} size={20} />{it.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  return host ? createPortal(body, host) : body;
}
