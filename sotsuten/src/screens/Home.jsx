import React from 'react';
import Emo from '../fluent';
import { Speaker } from './Speaker';

const mono = { fontFamily: "'Space Mono',monospace" };
const ndBtn = { width: 30, height: 30, background: 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#55554e', cursor: 'pointer', flex: '0 0 auto', padding: 0 };

// 時間帯・タスクの区切り（黒）
// 「タスクを追加」「記録を追加」の行（タスクと同じ見た目）
const addRow = { display: 'flex', width: '100%', alignItems: 'center', gap: 10, minHeight: 46, border: 'none', borderTop: '1px solid #bab5a7', borderBottom: '1px solid #bab5a7', background: '#f7f4ec', padding: '6px 16px 6px 72px', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#8a8a82', fontFamily: 'inherit', position: 'relative' };
const addIcon = { position: 'absolute', left: 28, top: '50%', marginTop: -12, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Material Symbols Rounded', fontSize: 22, color: '#55554e' };
const divRow = { display: 'flex', alignItems: 'center', gap: 8, height: 22, margin: '4px 0 2px' };
const divLine = { width: 45, height: 2, background: '#1b1b18' };
const divText = { fontSize: 12, fontWeight: 800, color: '#1b1b18', textShadow: '0 0 3px #f7f4ec, 0 0 6px #f7f4ec' };
const fab = { width: 60, height: 60, borderRadius: '50%', border: 'none', background: '#fcfaf3', boxShadow: '0 4px 14px rgba(27,27,24,.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 };

/* タイムラインの投稿1件: アイコン／見出し・時刻／本文／右に疲労の合計・…。中の行動は細い行で。
   起床・就寝は体と心の調子（前回との差を矢印）。終わったものは薄く */
export function Post({ p }) {
  const fade = p.past ? 0.55 : 1;
  return (
    <div onClick={p.onTap} style={{ position: 'relative', background: p.noBorder ? 'transparent' : '#f7f4ec', borderTop: p.noBorder ? 'none' : '1px solid #bab5a7', padding: '4px 20px 10px 72px', cursor: 'pointer', userSelect: 'none' }}>
      <div style={{ opacity: fade }}>
        <span style={{ position: 'absolute', left: 28, top: 8 }}><Emo e={p.glyph} size={24} /></span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, lineHeight: '20px', paddingRight: 34, whiteSpace: 'nowrap', overflow: 'hidden' }}>
          {p.head && <span style={{ fontSize: 10.5, color: '#545454', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{p.head}</span>}
          {p.time && <span style={{ fontSize: 10.5, color: '#545454', flex: '0 0 auto' }}>{p.time}</span>}
          {p.planned && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: '#fff', background: '#a5a39a', borderRadius: 4, padding: '0 5px', lineHeight: '15px' }}>予定</span>}
          {/* コメントがないときは、疲労の合計を見出しの行の右に */}
          {!p.main && !p.empty && p.sumText && <span style={{ ...mono, marginLeft: 'auto', fontSize: 13.5, fontWeight: 700, color: '#1b1b18', flex: '0 0 auto', paddingLeft: 8 }}>{p.sumText}</span>}
        </div>
        {(p.main || p.empty) && <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 2 }}>
          <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: p.isNote ? 400 : 600, color: p.empty ? '#8a8a82' : '#1b1b18', lineHeight: 1.45, wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{p.empty ? '記録する' : (p.main || (p.cond ? '' : ''))}</div>
          {p.sumText && <span style={{ ...mono, fontSize: 13.5, fontWeight: 700, color: '#1b1b18', whiteSpace: 'nowrap' }}>{p.sumText}</span>}
        </div>}
        {p.frameHint && <div style={{ fontSize: 10.5, color: '#9d9b91', marginTop: 2 }}>{p.frameHint}</div>}
        {p.cond && (p.cond.body != null || p.cond.mind != null || p.cond.temp != null) && (
          <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 13, color: '#1b1b18' }}>
            {p.cond.body != null && <span>💪{p.cond.body}<b style={{ marginLeft: 2 }}>{p.cond.bodyArrow}</b></span>}
            {p.cond.mind != null && <span>♡{p.cond.mind}<b style={{ marginLeft: 2 }}>{p.cond.mindArrow}</b></span>}
            {p.cond.temp != null && <span>🌡{p.cond.temp}℃</span>}
          </div>
        )}
        {p.items && p.items.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 8 }}>
            {p.items.map((it, k) => (
              <div key={k} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 5, height: 22, background: '#fcfaf3', borderRadius: 5, overflow: 'hidden', paddingRight: 8 }}>
                <span style={{ position: 'absolute', left: 0, top: 0, width: 16, height: 16, background: it.color, clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
                <span style={{ position: 'relative', marginLeft: 3, display: 'inline-flex' }}><Emo e={it.glyph} size={17} /></span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.name}</span>
                {it.req && <span style={{ fontSize: 10, fontWeight: 900 }}>必</span>}
                {it.fav && <span style={{ fontFamily: 'Material Symbols Rounded', fontVariationSettings: "'FILL' 1", fontSize: 12 }}>favorite</span>}
                <span style={{ ...mono, fontSize: 10.5, fontWeight: 700, minWidth: 26, textAlign: 'right' }}>{it.sumText}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {p.onMenu && <button onClick={(e) => { e.stopPropagation(); p.onMenu(); }} aria-label="メニュー" style={{ position: 'absolute', right: 16, top: 2, width: 30, height: 22, border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontSize: 16, letterSpacing: 1, color: '#b4b2a8', lineHeight: 1 }}>•••</button>}
    </div>
  );
}

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

/* 今週の目標（展示では表示だけ） */
function WeekGoalRow({ v }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '-2px 16px 4px', height: 24, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden' }}>
      <span style={{ flex: '0 0 auto', fontSize: 10.5, fontWeight: 800, lineHeight: '18px', color: '#2f3a00', background: '#c4f000', borderRadius: 6, padding: '0 6px' }}>今週の目標</span>
      {v.homeWeekGoalGlyph && <Emo e={v.homeWeekGoalGlyph} size={18} />}
      <span style={{ flex: 1, minWidth: 0, fontWeight: 700, color: v.homeWeekGoal ? '#1b1b18' : '#a5a39a', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.homeWeekGoal || 'まだ決めていません'}</span>
    </div>
  );
}

export default function Home({ v }) {
  // 時間帯カードのアコーディオン開閉（デフォルトは開）
  const [closedSlots, setClosedSlots] = React.useState({});
  const toggleSlot = (id) => setClosedSlots((s) => ({ ...s, [id]: !s[id] }));
  // 今日を開いたときは、いまの時間帯のカードを真ん中に（大きくて入りきらないときは上をそろえる）
  const listRef = React.useRef(null);
  React.useLayoutEffect(() => {
    const box = listRef.current; if (!box || !v.homeNowSlot) return;
    const el = box.querySelector('[data-slot="' + v.homeNowSlot + '"]'); if (!el) return;
    // 区切り（朝・午前…）を画面の上から1/3あたりに置いて、その時間帯の投稿が真ん中に来るように
    box.scrollTop = Math.max(0, el.offsetTop - box.clientHeight / 3);
  }, [v.homeDate, v.homeNowSlot]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      {/* 背景はいこいさんの背景と同じ地色（シャカの絵文字は出さない） */}
      <div style={{ position: 'absolute', inset: 0, background: '#f7f4ec', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* 上部1/3: 人＋コメント（固定）。行動は下でスクロール */}
      <div style={{ flex: '0 0 auto', background: '#f7f4ec', paddingTop: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 14px 8px 12px' }}>
          {/* 日付ナビ: ‹ 年月日(曜) › 📅 ＋今日に戻る。山が高いときは白文字 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0, color: false ? '#fff' : '#1b1b18', textShadow: false ? '0 1px 6px rgba(27,27,24,.4)' : 'none' }}>
            <button onClick={v.homePrevDay} aria-label="前の日" style={{ ...ndBtn, color: false ? '#fff' : '#55554e' }}>
              <span style={{ fontFamily: 'Material Symbols Rounded', fontSize: 22 }}>chevron_left</span>
            </button>
            <div style={{ textAlign: 'center', minWidth: 0, flex: '0 1 auto' }}>
              <div style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.15, whiteSpace: 'nowrap' }}>
                {v.homeDateM}月{v.homeDateD}日<span style={{ fontSize: 12, fontWeight: 700, color: false ? 'rgba(255,255,255,.9)' : '#8a8a82', marginLeft: 3 }}>（{v.homeDateWd}）</span>
              </div>
              <div style={{ ...mono, fontSize: 9, letterSpacing: '.08em', color: false ? 'rgba(255,255,255,.85)' : '#8a8a82', marginTop: 1 }}>{v.homeDateY}{v.homeDateLabel ? ' · ' + v.homeDateLabel : ''}</div>
            </div>
            <button onClick={v.homeNextDay} aria-label="次の日" style={{ ...ndBtn, color: false ? '#fff' : '#55554e' }}>
              <span style={{ fontFamily: 'Material Symbols Rounded', fontSize: 22 }}>chevron_right</span>
            </button>
            {/* その日の時期のひとこと（提出まであと◯日・展示◯日目/◯日間 など。exhibit.js exhibitDayLabel） */}
            {v.exhibitDay && <span style={{ flex: '0 0 auto', marginLeft: 6, fontSize: 13, fontWeight: 700, color: '#55554e', whiteSpace: 'nowrap' }}>{v.exhibitDay}</span>}
            {/* 今日以外を見ているときだけ「今日」に戻るチップ */}
            {!v.homeIsToday && (
              <button onClick={v.goToday} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, height: 30, background: '#c4f000', border: 'none', borderRadius: 999, padding: '0 11px', fontSize: 12, fontWeight: 800, color: '#2f3a00', cursor: 'pointer', flex: '0 0 auto' }}>
                <span style={{ fontFamily: 'Material Symbols Rounded', fontSize: 15 }}>today</span>今日
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '0 0 auto', marginLeft: 6 }}>
            <button onClick={v.goMypage} style={{ width: 38, height: 38, background: 'rgba(255,255,255,.85)', border: 'none', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Material Symbols Rounded', fontSize: 20, color: '#55554e', cursor: 'pointer' }}>person</button>
          </div>
        </div>
        <WeekGoalRow v={v} />
        {/* Z Flip を縦に折っている時は下半分をタイムラインに使う（いこいさんは出さない）。サブディスプレイでは小さめ */}
        {!v.foldSplit && <Speaker text={v.homeComment} size={280} onTap={v.tapCharacter} /> /* 卒展はやるきーぬを大きく（本体は140） */}
      </div>
      <div ref={listRef} className="nos" style={{ position: 'relative', flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 0 160px' }}>
        {/* タイムライン（Figma「home」）: 時間帯の区切り＋投稿 */}
        {v.homeFeed.map(p => p.divider ? (
          <div key={p.key} data-slot={p.slot} style={divRow}>
            <span style={divLine} />
            <span style={divText}>{p.name}</span>
          </div>
        ) : p.addRec ? (
          <button key={p.key} onClick={p.onAdd} style={addRow}>
            <span style={addIcon}>add</span>記録を追加
          </button>
        ) : <Post key={p.key} p={p} />)}
      </div>
      </div>
      {/* 右下: きもち・できごと・体調（💬）／記録（＋） */}
      <div style={{ position: 'absolute', right: 20 + (v.shakaRight || 0), bottom: 24, zIndex: 3, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button onClick={v.openMood} aria-label="きもち・できごと・体調" style={fab}><span style={{ fontFamily: 'Material Symbols Rounded', fontVariationSettings: "'FILL' 1", fontSize: 32, color: '#1b1b18' }}>chat_bubble</span></button>
        <button onClick={v.openRecordNow} aria-label="記録する" style={fab}><span style={{ fontFamily: 'Material Symbols Rounded', fontSize: 38, color: '#1b1b18', fontWeight: 300 }}>add</span></button>
      </div>
    </>
  );
}

