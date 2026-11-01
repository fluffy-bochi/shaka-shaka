import React from 'react';

const ms = (fill) => ({ fontFamily: 'Material Symbols Rounded', fontVariationSettings: `'FILL' ${fill}`, fontSize: 23 });
const btn = (color) => ({ flex: 1, background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, fontSize: 10, fontWeight: 700, color, cursor: 'pointer' });

export default function Nav({ v }) {
  const items = [
    { on: v.goBookshelf, color: v.navBookColor, fill: v.navBookFill, icon: 'auto_stories', label: '本棚' },
    { on: v.goHome, color: v.navHomeColor, fill: v.navHomeFill, icon: 'home', label: 'ホーム' },
    { on: v.goShaka, color: v.navShakaColor, fill: v.navShakaFill, icon: 'blur_on', label: 'シャカ' },
    { on: v.goMypage, color: v.navMypageColor, fill: v.navMypageFill, icon: 'person', label: 'マイページ' },
  ];
  /* Galaxy Z Flip のサブディスプレイ: カメラのない側の下（ぴょこっと出ている所）にアイコンだけ。反対側はカメラで見えない */
  const c = v.coverNav;
  if (c) {
    return (
      <div style={{ position: 'relative', zIndex: 6, flex: '0 0 auto', height: c.navH, display: 'flex', justifyContent: c.navSide === 'right' ? 'flex-end' : 'flex-start', background: v.screenBg }}>
        <div style={{ width: c.navW + '%', display: 'flex', alignItems: 'stretch', background: '#fff', borderTop: '1px solid #efece3', borderRadius: c.navSide === 'right' ? '14px 0 0 0' : '0 14px 0 0' }}>
          {items.map(it => <button key={it.icon} onClick={it.on} aria-label={it.label} style={{ ...btn(it.color), padding: 0 }}><span style={ms(it.fill)}>{it.icon}</span></button>)}
        </div>
      </div>
    );
  }
  return (
    <div style={{ position: 'relative', zIndex: 6, flex: '0 0 auto', minHeight: 64, paddingBottom: 'env(safe-area-inset-bottom)', display: 'flex', alignItems: 'stretch', background: '#fff', borderTop: '1px solid #efece3' }}>
      {items.map(it => <button key={it.icon} onClick={it.on} style={btn(it.color)}><span style={ms(it.fill)}>{it.icon}</span>{it.label}</button>)}
    </div>
  );
}
