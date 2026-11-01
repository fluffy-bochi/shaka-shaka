import React from 'react';

const ms = (fill) => ({ fontFamily: 'Material Symbols Rounded', fontVariationSettings: `'FILL' ${fill}`, fontSize: 23 });
const btn = (color) => ({ flex: 1, background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, fontSize: 10, fontWeight: 700, color, cursor: 'pointer' });

const navItems = (v) => [
  { on: v.goBookshelf, color: v.navBookColor, fill: v.navBookFill, icon: 'auto_stories', label: '本棚' },
  { on: v.goHome, color: v.navHomeColor, fill: v.navHomeFill, icon: 'home', label: 'ホーム' },
  { on: v.goShaka, color: v.navShakaColor, fill: v.navShakaFill, icon: 'blur_on', label: 'シャカ' },
  { on: v.goMypage, color: v.navMypageColor, fill: v.navMypageFill, icon: 'person', label: 'マイページ' },
];

/* Galaxy Z Flip のサブディスプレイ: ナビはアイコンだけで右端に縦（下の帯の上まで）。App が画面の右端に置く */
export function CoverRail({ v }) {
  const c = v.coverNav;
  return (
    <div style={{ position: 'absolute', zIndex: 6, right: 0, top: 0, bottom: c.navH, width: c.railW, display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#fff', borderLeft: '1px solid #efece3', borderRadius: '0 0 0 14px' }}>
      {navItems(v).map(it => <button key={it.icon} onClick={it.on} aria-label={it.label} style={{ ...btn(it.color), flex: '0 1 60px', padding: 0 }}><span style={ms(it.fill)}>{it.icon}</span></button>)}
    </div>
  );
}

export default function Nav({ v }) {
  /* サブディスプレイ: 下の帯は使わない（左下=端末の戻る・ホーム、右下=カメラ）。ナビは CoverRail */
  if (v.coverNav) return <div style={{ flex: '0 0 auto', height: v.coverNav.navH }} />;
  return (
    <div style={{ position: 'relative', zIndex: 6, flex: '0 0 auto', minHeight: 64, paddingBottom: 'env(safe-area-inset-bottom)', display: 'flex', alignItems: 'stretch', background: '#fff', borderTop: '1px solid #efece3' }}>
      {navItems(v).map(it => <button key={it.icon} onClick={it.on} style={btn(it.color)}><span style={ms(it.fill)}>{it.icon}</span>{it.label}</button>)}
    </div>
  );
}
