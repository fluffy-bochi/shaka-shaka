import React from 'react';
import { nurseSrc } from '../wake';

/* いこいさん＋ふきだし（本体 screens/Wake.jsx の Speaker から編集ボタンを除いたもの） */
export function Speaker({ text, size = 130, onTap }) {
  const src = nurseSrc(text);
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 10, padding: '0 20px' }}>
      <img key={src} src={src} alt="" onClick={onTap} style={{ cursor: onTap ? 'pointer' : undefined, WebkitTapHighlightColor: 'transparent', userSelect: 'none', WebkitUserSelect: 'none', flex: '0 0 auto', width: size, height: size, objectFit: 'contain', objectPosition: 'bottom', mixBlendMode: 'multiply' }} />
      <div key={text} onClick={onTap} style={{ position: 'relative', flex: 1, background: '#fff', borderRadius: 18, padding: '12px 14px', fontSize: 12.5, lineHeight: 1.75, boxShadow: '0 2px 10px rgba(27,27,24,.06)', marginBottom: 14, animation: 'bubbleIn .18s ease-out', cursor: onTap ? 'pointer' : undefined, userSelect: 'none', WebkitUserSelect: 'none' }}>
        {text}
        <span style={{ position: 'absolute', left: -6, bottom: 14, width: 12, height: 12, background: '#fff', transform: 'rotate(45deg)' }} />
      </div>
    </div>
  );
}
