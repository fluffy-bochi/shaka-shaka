import React from 'react';
import Emo from '../fluent';

const mono = { fontFamily: "'Space Mono',monospace" };
const ndBtn = { width: 30, height: 30, background: 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#55554e', cursor: 'pointer', flex: '0 0 auto', padding: 0 };

/* 記録の行: タップで編集、長押し（約450ms）でメニュー（編集・ゴミ箱へ）。
   マウス長押し・タッチ長押し・右クリックに対応。長押しが出たらタップは無効化する。 */
function RecordRow({ g, children, style }) {
  const timer = React.useRef(null);
  const fired = React.useRef(false);
  const start = () => {
    fired.current = false;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { fired.current = true; g.onLongPress && g.onLongPress(); }, 450);
  };
  const cancel = () => { clearTimeout(timer.current); };
  const onClick = () => { if (fired.current) { fired.current = false; return; } g.onTap && g.onTap(); };
  return (
    <div
      onClick={onClick}
      onMouseDown={start} onMouseUp={cancel} onMouseLeave={cancel}
      onTouchStart={start} onTouchEnd={cancel} onTouchMove={cancel}
      onContextMenu={(e) => { e.preventDefault(); clearTimeout(timer.current); fired.current = true; g.onLongPress && g.onLongPress(); }}
      style={style}
    >
      {children}
    </div>
  );
}

/* カレンダーで日付を選ぶボタン。input は1px不可視で置き、タップ時に showPicker で開く */
function CalendarBtn({ value, onChange, white }) {
  const ref = React.useRef(null);
  const open = () => {
    const el = ref.current; if (!el) return;
    try { if (el.showPicker) { el.showPicker(); return; } } catch (e) { /* fallthrough */ }
    el.focus(); el.click();
  };
  return (
    <button onClick={open} aria-label="カレンダーから選ぶ" style={{ ...ndBtn, position: 'relative', color: white ? '#fff' : '#55554e' }}>
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
      <div style={{ position: 'absolute', inset: 0, top: 0, bottom: 64, zIndex: 0, filter: 'blur(1.5px)', pointerEvents: 'none' }}>
        {v.pile.map((p, i) => (
          <span key={i} style={{ position: 'absolute', left: p.x, bottom: p.y, fontSize: p.s, transform: `rotate(${p.r2}deg)` }}><Emo e={p.e} size={p.s * 1.2} /></span>
        ))}
      </div>
      <div className="nos" style={{ position: 'relative', zIndex: 1, flex: 1, overflowY: 'auto', padding: '0 0 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 14px 8px 12px' }}>
          {/* 日付ナビ: ‹ 年月日(曜) › 📅 ＋今日に戻る。山が高いときは白文字 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0, color: v.pileHigh ? '#fff' : '#1b1b18', textShadow: v.pileHigh ? '0 1px 6px rgba(27,27,24,.4)' : 'none' }}>
            <button onClick={v.homePrevDay} aria-label="前の日" style={{ ...ndBtn, color: v.pileHigh ? '#fff' : '#55554e' }}>
              <span style={{ fontFamily: 'Material Symbols Rounded', fontSize: 22 }}>chevron_left</span>
            </button>
            <div style={{ textAlign: 'center', minWidth: 0, flex: '0 1 auto' }}>
              <div style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.15, whiteSpace: 'nowrap' }}>
                {v.homeDateM}月{v.homeDateD}日<span style={{ fontSize: 12, fontWeight: 700, color: v.pileHigh ? 'rgba(255,255,255,.9)' : '#8a8a82', marginLeft: 3 }}>（{v.homeDateWd}）</span>
              </div>
              <div style={{ ...mono, fontSize: 9, letterSpacing: '.08em', color: v.pileHigh ? 'rgba(255,255,255,.85)' : '#8a8a82', marginTop: 1 }}>{v.homeDateY}{v.homeDateLabel ? ' · ' + v.homeDateLabel : ''}</div>
            </div>
            <button onClick={v.homeNextDay} aria-label="次の日" style={{ ...ndBtn, color: v.pileHigh ? '#fff' : '#55554e' }}>
              <span style={{ fontFamily: 'Material Symbols Rounded', fontSize: 22 }}>chevron_right</span>
            </button>
            {/* カレンダーから任意の日へ（透明inputを重ねるとiOSで隣のボタンのタップを吸うため、ボタン→showPickerで開く） */}
            <CalendarBtn value={v.homeDate} onChange={v.setHomeDate} white={v.pileHigh} />
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
                  <RecordRow key={gi} g={g} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '9px 15px', borderBottom: '1px solid #f1efe8', cursor: 'pointer', userSelect: 'none', WebkitTouchCallout: 'none' }}>
                    <span style={{ fontSize: 15, flex: '0 0 auto', marginTop: 1 }}>{g.glyph}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1b1b18', lineHeight: 1.4 }}>
                        {g.planned && <span style={{ display: 'inline-block', ...mono, fontSize: 9, fontWeight: 700, letterSpacing: '.04em', color: '#fff', background: '#a5a39a', borderRadius: 5, padding: '1px 6px', marginRight: 6, verticalAlign: 'middle' }}>予定</span>}
                        {g.title}
                      </div>
                      {g.hasSub && <div style={{ ...mono, fontSize: 10, color: '#b4b2a8', marginTop: 1 }}>{g.subText}</div>}
                    </div>
                    <span style={{ ...mono, fontSize: 13, fontWeight: 700, color: g.fatColor, flex: '0 0 auto', whiteSpace: 'nowrap', marginTop: 1 }}>{g.fatText}</span>
                  </RecordRow>
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
        {/* タスク（mylifecore / Google ToDo / かめペースで手動追加）: 時間軸の下。
            チェックするとその時間帯に「行動」として記録される（紐づけた行動 or タスク名で推測） */}
        <div style={{ background: '#fff', borderRadius: 18, margin: '0 16px 12px', boxShadow: '0 1px 3px rgba(27,27,24,.06)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px 10px' }}>
            <div style={{ width: 42, height: 42, flex: '0 0 auto', borderRadius: '50%', background: '#eef0e6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📝</div>
            <span style={{ fontSize: 15, fontWeight: 800, flex: 1 }}>タスク</span>
            {v.homeTasks.length > 0 && <span style={{ ...mono, fontSize: 11, color: '#9d9b91' }}>{v.homeTasks.filter(t => t.done).length}/{v.homeTasks.length}</span>}
          </div>
          {v.homeTasks.length > 0 && (
            <div style={{ borderTop: '1px solid #f1efe8' }}>
              {v.homeTasks.map((t) => (
                <div key={t.srcId} onClick={t.onToggle} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 15px', borderBottom: '1px solid #f1efe8', cursor: 'pointer', userSelect: 'none' }}>
                  <span style={{ width: 22, height: 22, flex: '0 0 auto', borderRadius: '50%', border: t.done ? 'none' : '2px solid #d8d5cb', background: t.done ? '#c4f000' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Material Symbols Rounded', fontVariationSettings: "'FILL' 1", fontSize: 14, color: '#2f3a00' }}>{t.done ? 'check' : ''}</span>
                  {t.glyph && <span style={{ flex: '0 0 auto', display: 'inline-flex' }}><Emo e={t.glyph} size={17} /></span>}
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: t.done ? '#b4b2a8' : '#1b1b18', textDecoration: t.done ? 'line-through' : 'none' }}>{t.title}</span>
                  {t.srcLabel && <span style={{ ...mono, fontSize: 9, color: '#b4b2a8', flex: '0 0 auto' }}>{t.srcLabel}</span>}
                  <button onClick={(e) => { e.stopPropagation(); t.onEdit(); }} style={{ flex: '0 0 auto', width: 26, height: 26, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'Material Symbols Rounded', fontSize: 16, color: '#c9c7bf', padding: 0 }}>edit</button>
                  <button onClick={(e) => { e.stopPropagation(); t.onDelete(); }} aria-label="タスクを消す" style={{ flex: '0 0 auto', width: 26, height: 26, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'Material Symbols Rounded', fontSize: 16, color: '#d8b4ba', padding: 0 }}>delete</button>
                </div>
              ))}
            </div>
          )}
          <button onClick={v.onAddTask} style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 0', border: 'none', borderTop: '1px solid #f1efe8', background: '#fff', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: '#7a9a00' }}>
            <span style={{ fontFamily: 'Material Symbols Rounded', fontSize: 16 }}>add</span>タスクを追加
          </button>
        </div>
      </div>
      {v.buffOpen && <BuffSheet v={v} />}
      {v.buffCheckOpen && <BuffCheckSheet v={v} />}
      {v.taskEditOpen && <TaskEditPopup v={v} />}
      {v.recMenuOpen && <RecordMenu v={v} />}
    </>
  );
}

/* 記録を長押ししたときのメニュー（編集する / ゴミ箱へ移動） */
function RecordMenu({ v }) {
  return (
    <div onClick={v.closeRecMenu} style={{ position: 'absolute', inset: 0, zIndex: 9, background: 'rgba(27,27,24,.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', background: '#fff', borderRadius: '22px 22px 0 0', padding: '10px 14px calc(14px + env(safe-area-inset-bottom))', boxShadow: '0 -12px 40px rgba(27,27,24,.3)' }}>
        <div style={{ width: 38, height: 4, borderRadius: 999, background: '#e4e1d8', margin: '2px auto 12px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '2px 6px 12px' }}>
          <span style={{ fontSize: 22, flex: '0 0 auto' }}>{v.recMenuGlyph}</span>
          <div style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 800, lineHeight: 1.35 }}>{v.recMenuTitle}</div>
        </div>
        <button onClick={v.recMenuEdit} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 11, border: 'none', background: '#f7f4ec', borderRadius: 13, padding: '13px 14px', fontSize: 14, fontWeight: 700, color: '#1b1b18', cursor: 'pointer', marginBottom: 8 }}>
          <span style={{ fontFamily: 'Material Symbols Rounded', fontSize: 20, color: '#55554e' }}>edit</span>編集する
        </button>
        <button onClick={v.recMenuTrash} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 11, border: 'none', background: '#fdeef0', borderRadius: 13, padding: '13px 14px', fontSize: 14, fontWeight: 700, color: '#c0395e', cursor: 'pointer' }}>
          <span style={{ fontFamily: 'Material Symbols Rounded', fontSize: 20, color: '#c0395e' }}>delete</span>ゴミ箱へ移動{v.recMenuIsPlan ? '（予定ごと）' : ''}
        </button>
        <button onClick={v.closeRecMenu} style={{ width: '100%', marginTop: 10, border: 'none', background: 'none', padding: '12px 0', fontSize: 13.5, fontWeight: 700, color: '#8a8a82', cursor: 'pointer' }}>キャンセル</button>
      </div>
    </div>
  );
}

/* タスクの編集: 名前の変更＋行動との紐づけ（チェック時にその行動として記録される） */
function TaskEditPopup({ v }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 9, background: 'rgba(27,27,24,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 18px' }}>
      <div style={{ width: '100%', background: '#fff', borderRadius: 22, padding: '16px 20px 20px', boxShadow: '0 24px 60px rgba(27,27,24,.35)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 900, paddingLeft: 28 }}>{v.taskEditIsNew ? 'タスクを追加' : 'タスクを編集'}</div>
          <button onClick={v.closeTaskEdit} style={{ width: 28, height: 28, background: 'none', border: 'none', fontSize: 18, color: '#55554e', cursor: 'pointer', flex: '0 0 auto' }}>✕</button>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, marginTop: 14, color: '#55554e' }}>タスク名</div>
        <input value={v.taskEditTitle} onChange={v.onTaskEditTitle} autoFocus={v.taskEditIsNew} placeholder="例：レポート提出、皿洗い" style={{ width: '100%', marginTop: 8, background: '#efece3', border: 'none', borderRadius: 12, padding: '12px 14px', fontFamily: "'Zen Kaku Gothic New',sans-serif", fontSize: 15, fontWeight: 700, color: '#1b1b18', boxSizing: 'border-box', outline: 'none' }} />
        <div style={{ fontSize: 12, fontWeight: 700, marginTop: 14, color: '#55554e' }}>行動と紐づけ<span style={{ fontSize: 10.5, color: '#9d9b91', marginLeft: 6 }}>チェックしたらこの行動として記録</span></div>
        {v.taskEditLinkName ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, background: '#fbfdf0', border: '2px solid #c4de52', borderRadius: 12, padding: '10px 12px' }}>
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>{v.taskEditLinkName}</span>
            <button onClick={v.clearTaskLink} style={{ border: '1.5px solid #e4e1d8', background: '#fff', borderRadius: 999, padding: '6px 10px', fontSize: 11, fontWeight: 700, color: '#55554e', cursor: 'pointer' }}>はずす</button>
          </div>
        ) : (
          <>
            <input value={v.taskEditKw} onChange={v.onTaskEditKw} placeholder="行動をけんさく（例：皿洗い）" style={{ width: '100%', marginTop: 8, background: '#efece3', border: 'none', borderRadius: 12, padding: '11px 14px', fontFamily: "'Zen Kaku Gothic New',sans-serif", fontSize: 14, color: '#1b1b18', boxSizing: 'border-box', outline: 'none' }} />
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 6, maxHeight: 180, overflowY: 'auto' }} className="nos">
              {v.taskEditResults.map((r, i) => (
                <button key={i} onClick={r.onPick} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 4px', border: 'none', borderBottom: '1px solid #f1efe8', background: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ display: 'inline-flex' }}><Emo e={r.glyph} size={18} /></span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#1b1b18' }}>{r.name}</span>
                  <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: '#f5994e' }}>{r.fatText}</span>
                </button>
              ))}
            </div>
          </>
        )}
        <button onClick={v.saveTaskEdit} style={{ width: '100%', marginTop: 16, border: 'none', borderRadius: 13, background: '#c4f000', color: '#2f3a00', fontWeight: 700, fontSize: 15, padding: 14, cursor: 'pointer' }}>{v.taskEditIsNew ? '追加する' : 'ほぞんする'}</button>
        {!v.taskEditIsNew && (
          <button onClick={v.deleteTaskEdit} style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, border: '1.5px solid #e4e1d8', borderRadius: 12, background: '#fff', color: '#b4645a', fontWeight: 700, fontSize: 13, padding: '11px 0', cursor: 'pointer' }}>
            <span style={{ fontFamily: 'Material Symbols Rounded', fontSize: 18 }}>delete</span>このタスクを消す
          </button>
        )}
      </div>
    </div>
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
          <div key={b.id} style={{ borderBottom: i < arr.length - 1 ? '1px solid #f1efe8' : 'none', background: b.on ? '#fbfdf0' : '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px' }}>
              <Emo e={b.glyph} size={26} />
              <div onClick={b.onEdit || undefined} style={{ flex: 1, minWidth: 0, cursor: b.onEdit ? 'pointer' : 'default' }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{b.name}{b.count > 1 && <span style={{ ...mono, fontSize: 10, fontWeight: 700, color: b.kind === 'debuff' ? '#a33e6d' : '#5a7500', marginLeft: 5 }}>×{b.count}</span>}{b.onEdit && <span style={{ fontFamily: 'Material Symbols Rounded', fontSize: 13, color: '#8a8a82', marginLeft: 5, verticalAlign: 'middle' }}>edit</span>}</div>
                <div style={{ fontSize: 10.5, color: '#9d9b91', marginTop: 1 }}>{b.desc}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {b.effects.map((e, ei) => (
                    <span key={ei} style={{ ...mono, fontSize: 9, background: b.kind === 'debuff' ? '#ffe3ef' : '#eef7cc', color: b.kind === 'debuff' ? '#a33e6d' : '#5a7500', borderRadius: 5, padding: '2px 6px' }}>{e}</span>
                  ))}
                </div>
              </div>
              {b.on && <button onClick={b.onAdd} title="同じものをもう1つ" style={{ width: 26, height: 26, borderRadius: '50%', border: '1.5px solid #d8d5cb', background: '#fff', fontSize: 15, color: '#7a9a00', cursor: 'pointer', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>＋</button>}
              <button onClick={b.onToggle} style={{ width: 44, height: 26, borderRadius: 999, border: 'none', background: b.on ? '#c4f000' : '#e4e1d8', position: 'relative', cursor: 'pointer', flex: '0 0 auto' }}>
                <span style={{ position: 'absolute', top: 3, left: b.on ? 22 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.25)' }} />
              </button>
            </div>
            {/* 2個目以降のインスタンス（重複ぶん） */}
            {(b.instances || []).map((ins) => (
              <div key={ins.iid} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 13px 7px 50px', borderTop: '1px dashed #eee9dc' }}>
                <div onClick={ins.onEdit} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700 }}>{ins.title}</span>
                  <span style={{ ...mono, fontSize: 10, color: '#9d9b91', marginLeft: 6 }}>{ins.period}</span>
                </div>
                <button onClick={ins.onRemove} style={{ border: 'none', background: 'none', fontSize: 15, color: '#c9c7bf', cursor: 'pointer', flex: '0 0 auto' }}>✕</button>
              </div>
            ))}
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
