import React from 'react';

const mono = { fontFamily: "'Space Mono',monospace" };

export default function Home({ v }) {
  return (
    <>
      {/* 背景の積もった絵文字（ボカシ） */}
      <div style={{ position: 'absolute', inset: 0, top: 40, bottom: 64, zIndex: 0, filter: 'blur(1.5px)', pointerEvents: 'none' }}>
        {v.pile.map((p, i) => (
          <span key={i} style={{ position: 'absolute', left: p.x, bottom: p.y, fontSize: p.s, transform: `rotate(${p.r2}deg)`, filter: 'drop-shadow(0 4px 6px rgba(27,27,24,.14))' }}>{p.e}</span>
        ))}
      </div>
      <div className="nos" style={{ position: 'relative', zIndex: 1, flex: 1, overflowY: 'auto', padding: '0 0 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 18px 8px 16px' }}>
          <div>
            <div style={{ ...mono, fontSize: 9, letterSpacing: '.12em', color: '#8a8a82' }}>{v.homeDateCaps}</div>
            <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.25, marginTop: 1 }}>今日のログ</div>
          </div>
          <button onClick={v.goMypage} style={{ width: 38, height: 38, background: 'rgba(255,255,255,.85)', border: 'none', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Material Symbols Rounded', fontSize: 20, color: '#55554e', cursor: 'pointer' }}>person</button>
        </div>
        {/* sleep card */}
        <button onClick={v.goSleep} style={{ display: 'block', textAlign: 'left', background: '#fff', border: 'none', borderRadius: 16, padding: '13px 14px', margin: '0 16px 10px', boxShadow: '0 1px 3px rgba(27,27,24,.05)', cursor: 'pointer', width: 'calc(100% - 32px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 15 }}>🛏</span>
            <span style={{ fontSize: 13, fontWeight: 700, flex: 1, textAlign: 'left' }}>睡眠</span>
            <span style={{ ...mono, fontSize: 10, color: '#8a8a82' }}>のこりをなぞって記録</span>
          </div>
        </button>
        {/* slots */}
        {v.slots.map(s => (
          <div key={s.id} style={{ background: '#fff', borderRadius: 18, margin: '0 16px 12px', boxShadow: '0 1px 3px rgba(27,27,24,.06)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px 12px' }}>
              <div style={{ position: 'relative', width: 42, height: 42, flex: '0 0 auto', borderRadius: '50%', background: s.circleBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                {s.emoji}
                {s.hasRecords && <span style={{ position: 'absolute', top: -1, right: -2, width: 17, height: 17, borderRadius: '50%', background: '#c4f000', border: '2.5px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Material Symbols Rounded', fontVariationSettings: "'FILL' 1", fontSize: 10, color: '#2f3a00' }}>check</span>}
              </div>
              <span style={{ fontSize: 15, fontWeight: 800, flex: 1, color: s.nameColor }}>{s.name}</span>
              <span style={{ ...mono, fontSize: 13, fontWeight: 700, color: '#f5994e' }}>{s.sumText}</span>
            </div>
            {s.hasRecords && (
              <div style={{ borderTop: '1px solid #f1efe8' }}>
                {s.groups.map((g, gi) => (
                  <div key={gi} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '9px 15px', borderBottom: '1px solid #f1efe8' }}>
                    <span style={{ fontSize: 15, flex: '0 0 auto', marginTop: 1 }}>{g.glyph}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1b1b18', lineHeight: 1.4 }}>
                        {g.planned && <span style={{ display: 'inline-block', ...mono, fontSize: 9, fontWeight: 700, letterSpacing: '.04em', color: '#fff', background: '#a5a39a', borderRadius: 5, padding: '1px 6px', marginRight: 6, verticalAlign: 'middle' }}>予定</span>}
                        {g.title}
                      </div>
                      {g.hasSub && <div style={{ ...mono, fontSize: 10, color: '#b4b2a8', marginTop: 1 }}>{g.subText}</div>}
                    </div>
                    <span style={{ ...mono, fontSize: 13, fontWeight: 700, color: g.fatColor, flex: '0 0 auto', whiteSpace: 'nowrap', marginTop: 1 }}>{g.fatText}</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={s.onAdd} style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 0', border: 'none', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#7a9a00' }}>
              <span style={{ fontFamily: 'Material Symbols Rounded', fontSize: 16 }}>add</span>記録する
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
