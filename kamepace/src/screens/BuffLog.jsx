import React from 'react';
import Emo from '../fluent';

const mono = { fontFamily: "'Space Mono',monospace" };

/* 調子の記録: いま有効なバフ・デバフ＋これまでの履歴 */
export default function BuffLog({ v }) {
  const row = (r) => (
    <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 11, background: '#fff', borderRadius: 14, padding: '12px 13px', marginBottom: 8, boxShadow: '0 1px 3px rgba(27,27,24,.05)' }}>
      <Emo e={r.glyph} size={26} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.4 }}>{r.name}</div>
        <div style={{ ...mono, fontSize: 10.5, color: '#9d9b91', marginTop: 1 }}>{r.period}</div>
      </div>
      <span style={{ ...mono, fontSize: 9.5, background: r.kind === 'debuff' ? '#ffe3ef' : '#eef7cc', color: r.kind === 'debuff' ? '#a33e6d' : '#5a7500', borderRadius: 5, padding: '3px 8px', flex: '0 0 auto' }}>{r.kind === 'debuff' ? 'デバフ' : 'バフ'}</span>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: '#f7f4ec' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 20px 12px' }}>
        <button onClick={v.goMypage} style={{ background: 'none', border: 'none', fontSize: 19, color: '#8a8a82', cursor: 'pointer' }}>‹</button>
        <div style={{ fontSize: 16, fontWeight: 700, flex: 1 }}>🎭 調子の記録</div>
      </div>
      <div className="nos" style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px' }}>
        <div style={{ ...mono, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a8a82', margin: '4px 2px 8px' }}>いま有効</div>
        {v.buffLogActive.length === 0
          ? <div style={{ fontSize: 12, color: '#b4b2a8', padding: '2px 4px 8px' }}>いまオンにしている調子はありません。ホーム右上の🎭から設定できます。</div>
          : v.buffLogActive.map(row)}
        <div style={{ ...mono, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a8a82', margin: '16px 2px 8px' }}>これまでの記録</div>
        {v.buffLogPast.length === 0
          ? <div style={{ fontSize: 12, color: '#b4b2a8', padding: '2px 4px' }}>まだ履歴はありません。オフにしたり期間が終わると、ここに残ります。</div>
          : v.buffLogPast.map(row)}
      </div>
    </div>
  );
}
