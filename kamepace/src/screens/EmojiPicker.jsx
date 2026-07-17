import React from 'react';
import Emo, { EMOJI_CATALOG } from '../fluent';

/* Fluent 3D 絵文字のピッカー: 日本語キーワードで検索できる。
   カタログに無い絵文字は、そのまま入力欄に貼り付ければ選べる */
export default function EmojiPicker({ value, onPick, lead }) {
  const [q, setQ] = React.useState('');
  const t = q.trim();
  const list = React.useMemo(() => {
    const low = t.toLowerCase();
    if (!low) return EMOJI_CATALOG;
    return EMOJI_CATALOG.filter(e => e.g === t || (e.kw || []).some(k => k.toLowerCase().includes(low)));
  }, [t]);
  // 検索でヒットしないがテキストが入っている（絵文字の直接貼り付け）
  const pasted = t && list.length === 0 && !/^[ -~]+$/.test(t) ? t : null;
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#efece3', borderRadius: 10, padding: '2px 11px', marginTop: 8 }}>
        <span style={{ fontFamily: 'Material Symbols Rounded', fontSize: 17, color: '#8a8a82', flex: '0 0 auto' }}>search</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="さがす（例：ねこ、電車、コーヒー）"
          style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', fontFamily: "'Zen Kaku Gothic New',sans-serif", fontSize: 13.5, color: '#1b1b18', padding: '9px 0' }}
        />
        {!!q && <button onClick={() => setQ('')} style={{ width: 20, height: 20, borderRadius: '50%', border: 'none', background: '#c9c7bf', color: '#fff', fontSize: 10, cursor: 'pointer', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>✕</button>}
      </div>
      <div className="nos" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, maxHeight: 152, overflowY: 'auto' }}>
        {lead}
        {list.map(e => (
          <button key={e.g} onClick={() => onPick(e.g)} style={{ width: 40, height: 40, borderRadius: 10, border: value === e.g ? '2px solid #1b1b18' : '1.5px solid #e4e1d8', background: value === e.g ? '#fbfdf0' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
            <Emo e={e.g} size={24} />
          </button>
        ))}
        {pasted && (
          <button onClick={() => onPick(pasted)} style={{ display: 'flex', alignItems: 'center', gap: 7, border: value === pasted ? '2px solid #1b1b18' : '1.5px solid #e4e1d8', background: '#fff', borderRadius: 10, padding: '8px 12px', fontSize: 18, cursor: 'pointer' }}>
            {pasted}<span style={{ fontSize: 11, fontWeight: 700, color: '#7a9a00' }}>これをつかう</span>
          </button>
        )}
        {t && list.length === 0 && !pasted && (
          <div style={{ fontSize: 11.5, color: '#b4b2a8', padding: '10px 4px', lineHeight: 1.6 }}>見つかりませんでした。絵文字をそのまま貼り付けてもつかえます</div>
        )}
      </div>
    </>
  );
}
