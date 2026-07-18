import React from 'react';
import Emo from '../fluent';

const mono = { fontFamily: "'Space Mono',monospace" };
const ndBtn = { width: 30, height: 30, background: 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#55554e', cursor: 'pointer', flex: '0 0 auto', padding: 0 };

/* カレンダーで日付を選ぶボタン。input は1px不可視で置き、タップ時に showPicker で開く */
function CalendarBtn({ value, onChange }) {
  const ref = React.useRef(null);
  const open = () => {
    const el = ref.current; if (!el) return;
    try { if (el.showPicker) { el.showPicker(); return; } } catch (e) { /* fallthrough */ }
    el.focus(); el.click();
  };
  return (
    <button onClick={open} aria-label="カレンダーから選ぶ" style={{ ...ndBtn, position: 'relative' }}>
      <span style={{ fontFamily: 'Material Symbols Rounded', fontSize: 20 }}>calendar_month</span>
      <input ref={ref} type="date" value={value} onChange={onChange} tabIndex={-1}
        style={{ position: 'absolute', left: 0, bottom: 0, width: 1, height: 1, opacity: 0, border: 'none', padding: 0, pointerEvents: 'none' }} />
    </button>
  );
}

export default function Home({ v }) {
  // 時間帯カードのアコーディオン開閉（デフォルトは開）
  const [closedSlots, setClosedSlots] = React.useState({});
  const toggleSlot = (id) => setClosedSlots((s) => ({ ...s, [id]: !s[id] }));
  return (
    <>
      {/* 背景の積もった絵文字（ボカシ） */}
      <div style={{ position: 'absolute', inset: 0, top: 40, bottom: 64, zIndex: 0, filter: 'blur(1.5px)', pointerEvents: 'none' }}>
        {v.pile.map((p, i) => (
          <span key={i} style={{ position: 'absolute', left: p.x, bottom: p.y, fontSize: p.s, transform: `rotate(${p.r2}deg)`, filter: 'drop-shadow(0 4px 6px rgba(27,27,24,.14))' }}><Emo e={p.e} size={p.s * 1.2} /></span>
        ))}
      </div>
      <div className="nos" style={{ position: 'relative', zIndex: 1, flex: 1, overflowY: 'auto', padding: '0 0 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 14px 8px 12px' }}>
          {/* 日付ナビ: ‹ 年月日(曜) › 📅 ＋今日に戻る */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
            <button onClick={v.homePrevDay} aria-label="前の日" style={ndBtn}>
              <span style={{ fontFamily: 'Material Symbols Rounded', fontSize: 22 }}>chevron_left</span>
            </button>
            <div style={{ textAlign: 'center', minWidth: 0, flex: '0 1 auto' }}>
              <div style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.15, whiteSpace: 'nowrap' }}>
                {v.homeDateM}月{v.homeDateD}日<span style={{ fontSize: 12, fontWeight: 700, color: '#8a8a82', marginLeft: 3 }}>（{v.homeDateWd}）</span>
              </div>
              <div style={{ ...mono, fontSize: 9, letterSpacing: '.08em', color: '#8a8a82', marginTop: 1 }}>{v.homeDateY}{v.homeDateLabel ? ' · ' + v.homeDateLabel : ''}</div>
            </div>
            <button onClick={v.homeNextDay} aria-label="次の日" style={ndBtn}>
              <span style={{ fontFamily: 'Material Symbols Rounded', fontSize: 22 }}>chevron_right</span>
            </button>
            {/* カレンダーから任意の日へ（透明inputを重ねるとiOSで隣のボタンのタップを吸うため、ボタン→showPickerで開く） */}
            <CalendarBtn value={v.homeDate} onChange={v.setHomeDate} />
            {/* 今日以外を見ているときだけ「今日」に戻るチップ */}
            {!v.homeIsToday && (
              <button onClick={v.goToday} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, height: 30, background: '#c4f000', border: 'none', borderRadius: 999, padding: '0 11px', fontSize: 12, fontWeight: 800, color: '#2f3a00', cursor: 'pointer', flex: '0 0 auto' }}>
                <span style={{ fontFamily: 'Material Symbols Rounded', fontSize: 15 }}>today</span>今日
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '0 0 auto', marginLeft: 6 }}>
            {/* いまの調子（バフ・デバフ）バッジ */}
            <button onClick={v.openBuffs} style={{ display: 'flex', alignItems: 'center', gap: 3, height: 38, background: 'rgba(255,255,255,.85)', border: 'none', borderRadius: 11, padding: '0 9px', cursor: 'pointer' }}>
              {v.activeBuffGlyphs.length > 0
                ? v.activeBuffGlyphs.slice(0, 3).map((g, i) => <Emo key={i} e={g} size={20} />)
                : <span style={{ fontSize: 15 }}>🎭</span>}
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
            {v.sleepRecText && <span style={{ ...mono, fontSize: 13, fontWeight: 700, color: '#f5994e' }}>{v.sleepRecText}</span>}
          </div>
        </button>
        {/* slots */}
        {v.slots.map(s => (
          <div key={s.id} style={{ background: '#fff', borderRadius: 18, margin: '0 16px 12px', boxShadow: '0 1px 3px rgba(27,27,24,.06)', overflow: 'hidden' }}>
            {/* ヘッダーをタップでアコーディオン開閉 */}
            <div onClick={() => toggleSlot(s.id)} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px 12px', cursor: 'pointer', userSelect: 'none' }}>
              <div style={{ position: 'relative', width: 42, height: 42, flex: '0 0 auto', borderRadius: '50%', background: s.circleBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                {s.emoji}
                {s.hasRecords && <span style={{ position: 'absolute', top: -1, right: -2, width: 17, height: 17, borderRadius: '50%', background: '#c4f000', border: '2.5px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Material Symbols Rounded', fontVariationSettings: "'FILL' 1", fontSize: 10, color: '#2f3a00' }}>check</span>}
              </div>
              <span style={{ fontSize: 15, fontWeight: 800, flex: 1, color: s.nameColor }}>{s.name}</span>
              <span style={{ ...mono, fontSize: 13, fontWeight: 700, color: '#f5994e' }}>{s.sumText}</span>
              <span style={{ fontFamily: 'Material Symbols Rounded', fontSize: 20, color: '#c9c7bf', transform: closedSlots[s.id] ? 'none' : 'rotate(180deg)', transition: 'transform .2s', flex: '0 0 auto' }}>expand_more</span>
            </div>
            {!closedSlots[s.id] && s.hasRecords && (
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
            {!closedSlots[s.id] && (
              <button onClick={s.onAdd} style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 0', border: 'none', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#7a9a00' }}>
                <span style={{ fontFamily: 'Material Symbols Rounded', fontSize: 16 }}>add</span>記録する
              </button>
            )}
          </div>
        ))}
        {/* タスク（mylifecore / Google ToDo）: 夜の下 */}
        {v.homeTasks.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 18, margin: '0 16px 12px', boxShadow: '0 1px 3px rgba(27,27,24,.06)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px 10px' }}>
              <div style={{ width: 42, height: 42, flex: '0 0 auto', borderRadius: '50%', background: '#eef0e6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📝</div>
              <span style={{ fontSize: 15, fontWeight: 800, flex: 1 }}>タスク</span>
              <span style={{ ...mono, fontSize: 11, color: '#9d9b91' }}>{v.homeTasks.filter(t => t.done).length}/{v.homeTasks.length}</span>
            </div>
            <div style={{ borderTop: '1px solid #f1efe8' }}>
              {v.homeTasks.map((t) => (
                <div key={t.srcId} onClick={t.onToggle} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 15px', borderBottom: '1px solid #f1efe8', cursor: 'pointer', userSelect: 'none' }}>
                  <span style={{ width: 22, height: 22, flex: '0 0 auto', borderRadius: '50%', border: t.done ? 'none' : '2px solid #d8d5cb', background: t.done ? '#c4f000' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Material Symbols Rounded', fontVariationSettings: "'FILL' 1", fontSize: 14, color: '#2f3a00' }}>{t.done ? 'check' : ''}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: t.done ? '#b4b2a8' : '#1b1b18', textDecoration: t.done ? 'line-through' : 'none' }}>{t.title}</span>
                  <span style={{ ...mono, fontSize: 9, color: '#b4b2a8', flex: '0 0 auto' }}>{t.srcLabel}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {v.buffOpen && <BuffSheet v={v} />}
      {v.buffCheckOpen && <BuffCheckSheet v={v} />}
    </>
  );
}

/* 翌朝（睡眠記録時）の継続確認: いま続いている調子がまだ続いているか */
function BuffCheckSheet({ v }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 9, background: 'rgba(27,27,24,.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div className="nos" style={{ width: '100%', maxHeight: '88%', overflowY: 'auto', background: '#fff', borderRadius: '22px 22px 0 0', padding: '16px 18px 22px', boxShadow: '0 -12px 40px rgba(27,27,24,.3)' }}>
        <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 900 }}>いまの調子、まだ続いてる？</div>
        <div style={{ fontSize: 11.5, color: '#8a8a82', textAlign: 'center', marginTop: 6, lineHeight: 1.6 }}>おさまったものはオフにします。続いていればそのまま寝てOK</div>
        <div style={{ marginTop: 14 }}>
          {v.buffCheckRows.map(b => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 11, background: '#fff', border: '1px solid #f1efe8', borderRadius: 14, padding: '11px 13px', marginBottom: 8 }}>
              <Emo e={b.glyph} size={26} />
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>{b.name}</span>
              <button onClick={b.onEnd} style={{ border: '1.5px solid #e4e1d8', background: '#fff', borderRadius: 999, padding: '7px 13px', fontSize: 12, fontWeight: 700, color: '#55554e', cursor: 'pointer' }}>おさまった</button>
            </div>
          ))}
        </div>
        <button onClick={v.finishBuffCheck} style={{ width: '100%', marginTop: 8, border: 'none', borderRadius: 14, background: '#c4f000', color: '#2f3a00', fontWeight: 700, fontSize: 16, padding: 16, cursor: 'pointer' }}>これで睡眠の記録へ</button>
      </div>
    </div>
  );
}

/* いまの調子（バフ・デバフ）: 体・心の疲労/回復に一時的な倍率がかかる */
export function BuffSheet({ v }) {
  const section = (kind, label) => (
    <React.Fragment key={kind}>
      <div style={{ ...mono, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a8a82', margin: '14px 2px 6px' }}>{label}</div>
      <div style={{ border: '1px solid #f1efe8', borderRadius: 14, overflow: 'hidden' }}>
        {v.buffChoices.filter(b => b.kind === kind).map((b, i, arr) => (
          <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', borderBottom: i < arr.length - 1 ? '1px solid #f1efe8' : 'none', background: b.on ? '#fbfdf0' : '#fff' }}>
            <Emo e={b.glyph} size={26} />
            <div onClick={b.onEdit || undefined} style={{ flex: 1, minWidth: 0, cursor: b.onEdit ? 'pointer' : 'default' }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{b.name}{b.onEdit && <span style={{ fontFamily: 'Material Symbols Rounded', fontSize: 13, color: '#8a8a82', marginLeft: 5, verticalAlign: 'middle' }}>edit</span>}</div>
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
        {v.activeSymptomBuffs.length > 0 && (
          <React.Fragment>
            <div style={{ ...mono, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a8a82', margin: '14px 2px 6px' }}>体調（記録から自動）</div>
            <div style={{ border: '1px solid #f1efe8', borderRadius: 14, overflow: 'hidden' }}>
              {v.activeSymptomBuffs.map((b, i, arr) => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', borderBottom: i < arr.length - 1 ? '1px solid #f1efe8' : 'none', background: '#fff' }}>
                  <Emo e={b.glyph} size={24} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{b.name}</div>
                    <div style={{ fontSize: 10.5, color: '#9d9b91', marginTop: 1 }}>つらさ：{b.level}</div>
                  </div>
                  <button onClick={b.onRemove} style={{ border: '1.5px solid #e4e1d8', background: '#fff', borderRadius: 999, padding: '7px 12px', fontSize: 11.5, fontWeight: 700, color: '#55554e', cursor: 'pointer' }}>おさまった</button>
                </div>
              ))}
            </div>
          </React.Fragment>
        )}
        {section('debuff', 'デバフ（つらい状態）')}
        {section('buff', 'バフ（いい状態）')}
      </div>
      {v.buffCfgOpen && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(27,27,24,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 18px' }}>
          <div style={{ width: '100%', background: '#fff', borderRadius: 22, padding: '16px 20px 20px', boxShadow: '0 24px 60px rgba(27,27,24,.35)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 15, fontWeight: 900, paddingLeft: 28 }}>
                <Emo e={v.buffCfgGlyph} size={22} />{v.buffCfgPreset}
              </div>
              <button onClick={v.closeBuffCfg} style={{ width: 28, height: 28, background: 'none', border: 'none', fontSize: 18, color: '#55554e', cursor: 'pointer', flex: '0 0 auto' }}>✕</button>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 14, color: '#55554e' }}>タイトル（じぶんの言葉でOK）</div>
            <input value={v.buffCfgTitle} onChange={v.onBuffCfgTitle} placeholder="例：就活しんどい期" style={{ width: '100%', marginTop: 8, background: '#efece3', border: 'none', borderRadius: 12, padding: '12px 14px', fontFamily: "'Zen Kaku Gothic New',sans-serif", fontSize: 15, fontWeight: 700, color: '#1b1b18', boxSizing: 'border-box', outline: 'none' }} />
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 14, color: '#55554e' }}>期間</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 8 }}>
              {v.buffCfgPeriods.map(pp => (
                <button key={pp.key} onClick={pp.onPick} style={{ border: pp.on ? '2px solid #1b1b18' : '1.5px solid #e4e1d8', background: pp.on ? '#fbfdf0' : '#fff', borderRadius: 999, padding: '8px 14px', fontSize: 12.5, fontWeight: pp.on ? 900 : 700, cursor: 'pointer' }}>{pp.label}</button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#b4b2a8', marginTop: 10, lineHeight: 1.6 }}>期間が終わると自動でオフになります（「ずっと」は手動でオフ）</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={v.closeBuffCfg} style={{ flex: 1, border: '2px solid #e4e1d8', borderRadius: 13, background: '#fff', color: '#55554e', fontWeight: 700, fontSize: 14, padding: '14px 0', cursor: 'pointer' }}>キャンセル</button>
              <button onClick={v.saveBuffCfg} style={{ flex: 1.5, border: 'none', borderRadius: 13, background: '#c4f000', color: '#2f3a00', fontWeight: 700, fontSize: 14, padding: '14px 0', cursor: 'pointer' }}>オンにする</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
