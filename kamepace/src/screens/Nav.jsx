import React from 'react';

const ms = (fill) => ({ fontFamily: 'Material Symbols Rounded', fontVariationSettings: `'FILL' ${fill}`, fontSize: 23 });
const btn = (color) => ({ flex: 1, background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, fontSize: 10, fontWeight: 700, color, cursor: 'pointer' });

export default function Nav({ v }) {
  return (
    <div style={{ position: 'relative', zIndex: 6, flex: '0 0 auto', minHeight: 64, paddingBottom: 'env(safe-area-inset-bottom)', display: 'flex', alignItems: 'stretch', background: '#fff', borderTop: '1px solid #efece3' }}>
      <button onClick={v.goBookshelf} style={btn(v.navBookColor)}><span style={ms(v.navBookFill)}>auto_stories</span>本棚</button>
      <button onClick={v.goHome} style={btn(v.navHomeColor)}><span style={ms(v.navHomeFill)}>home</span>ホーム</button>
      <button onClick={v.goShaka} style={btn(v.navShakaColor)}><span style={ms(v.navShakaFill)}>blur_on</span>シャカ</button>
      <button onClick={v.goMypage} style={btn(v.navMypageColor)}><span style={ms(v.navMypageFill)}>person</span>マイページ</button>
    </div>
  );
}
