import React from 'react';
import Emo from '../fluent';

const mono = { fontFamily: "'Space Mono',monospace" };

export default function Home({ v }) {
  return (
    <>
      {/* 背景の積もった絵文字（ボカシ） */}
      <div style={{ position: 'absolute', inset: 0, top: 40, bottom: 64, zIndex: 0, filter: 'blur(1.5px)', pointerEvents: 'none' }}>
        {v.pile.map((p, i) => (
          <span key={i} style={{ position: 'absolute', left: p.x, bottom: p.y, fontSize: p.s, transform: `rotate(${p.r2}deg)`, filter: 'drop-shadow(0 4px 6px rgba(27,27,24,.14))' }}><Emo e={p.e} size={p.s * 1.2} /></span>
        ))}
      </div>
      <div className="nos" style={{ position: 'relative', zIndex: 1, flex: 1, overflowY: 'auto', padding: '0 0 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 18px 8px 16px' }}>
          <div>
            <div style={{ ...mono, fontSize: 9, letterSpacing: '.12em', color: '#8a8a82' }}>{v.homeDateCaps}</div>
            <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.25, marginTop: 1 }}>今日のログ</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* いまの調子（バフ・デバフ）バッジ */}
            <button onClick={v.openBuffs} style={{ display: 'flex', alignItems: 'center', gap: 3, height: 38, background: 'rgba(255,255,255,.85)', border: 'none', borderRadius: 11, padding: '0 10px', cursor: 'pointer' }}>
              {v.activeBuffGlyphs.length > 0
                ? v.activeBuffGlyphs.slice(0, 3).map((g, i) => <Emo key={i} e={g} size={20} />)
                : <span style={{ fontSize: 11, fontWeight: 700, color: '#8a8a82' }}>🎭 調子</span>}
            </button>
            <button onClick={v.goMypage} style={{ width: 38, height: 38, background: 'rgba(255,255,255,.85)', border: 'none', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Material Symbols Rounded', fontSize: 20, color: '#55554e', cursor: 'pointer' }}>person</button>
          </div>
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
                  <div key={gi} onClick={g.onTap} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '9px 15px', borderBottom: '1px solid #f1efe8', cursor: 'pointer' }}>
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
      {v.buffOpen && <BuffSheet v={v} />}
    </>
  );
}

/* いまの調子（バフ・デバフ）: 体・心の疲労/回復に一時的な倍率がかかる */
function BuffSheet({ v }) {
  const section = (kind, label) => (
    <React.Fragment key={kind}>
      <div style={{ ...mono, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a8a82', margin: '14px 2px 6px' }}>{label}</div>
      <div style={{ border: '1px solid #f1efe8', borderRadius: 14, overflow: 'hidden' }}>
        {v.buffChoices.filter(b => b.kind === kind).map((b, i, arr) => (
          <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', borderBottom: i < arr.length - 1 ? '1px solid #f1efe8' : 'none', background: b.on ? '#fbfdf0' : '#fff' }}>
            <Emo e={b.glyph} size={26} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{b.name}</div>
              <div style={{ fontSize: 10.5, color: '#9d9b91', marginTop: 1 }}>{b.desc}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                {b.effects.map((e, ei) => (
                  <span key={ei} style={{ ...mono, fontSize: 9, background: b.kind === 'debuff' ? '#ffe3ef' : '#eef7cc', color: b.kind === 'debuff' ? '#a33e6d' : '#5a7500', borderRadius: 5, padding: '2px 6px' }}>{e}</span>
                ))}
              </div>
            </div>
            <button onClick={b.onToggle} style={{ width: 44, height: 26, borderRadius: 999, border: 'none', background: b.on ? '#c4f000' : '#e4e1d8', position: 'relative', cursor: 'pointer', flex: '0 0 auto' }}>
              <span style={{ position: 'absolute', top: 3, left: b.on ? 22 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.25)' }} />
            </button>
          </div>
        ))}
      </div>
    </React.Fragment>
  );
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 8, background: 'rgba(27,27,24,.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div className="nos" style={{ width: '100%', maxHeight: '88%', overflowY: 'auto', background: '#fff', borderRadius: '22px 22px 0 0', padding: '16px 18px 22px', boxShadow: '0 -12px 40px rgba(27,27,24,.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 900, paddingLeft: 28 }}>いまの調子</div>
          <button onClick={v.closeBuffs} style={{ width: 28, height: 28, background: 'none', border: 'none', fontSize: 18, color: '#55554e', cursor: 'pointer', flex: '0 0 auto' }}>✕</button>
        </div>
        <div style={{ fontSize: 11.5, color: '#8a8a82', textAlign: 'center', marginTop: 6, lineHeight: 1.6 }}>オンにしている間、これからの記録の疲労・回復にかかります</div>
        {section('debuff', 'デバフ（つらい状態）')}
        {section('buff', 'バフ（いい状態）')}
      </div>
    </div>
  );
}
