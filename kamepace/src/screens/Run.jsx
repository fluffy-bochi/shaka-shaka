import React from 'react';
import Emo from '../fluent';
import { FreqPop, History, HmInput } from './Pick';

/* タスク実行（START）: いまの行動を大きく、開始時刻・いまの時刻と、経過／予定の時間のバー。
   ▶／⏸の左に 必・♡、右に りれき。その下に 全体／実施中 の アラーム（時刻）・タイマー（時間）を切り替えて設定。
   いちばん下にリスト（タップで開く・閉じる。行をタップでその行動に切り替え・編集で↑↓と×・＋で追加）。右上の「記録」で終えて確認画面へ。 */
const INK = '#1b1b18', SUB = '#55554e', MUTED = '#8a8a82', LIME = '#c4f000', LIME_INK = '#2f3a00';
const mono = { fontFamily: "'Space Mono',monospace" };
const ms = (size, color, fill = false) => ({ fontFamily: 'Material Symbols Rounded', fontVariationSettings: fill ? "'FILL' 1" : "'FILL' 0", fontSize: size, color, lineHeight: 1 });
const sg = (n) => (n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '±0');
const hm = (ts) => { const d = new Date(ts); return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); };
// 経過・予定の時間: 1時間未満は 分:秒、1時間以上は 時:分:秒
const mmss = (t) => { const s = Math.max(0, Math.floor(t / 1000)), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, ss = String(s % 60).padStart(2, '0'); return h ? h + ':' + String(m).padStart(2, '0') + ':' + ss : m + ':' + ss; };

/* アラーム／タイマーの1行: [全体｜実施中] [アラーム|タイマー] ……… [時刻 or 分] */
function AlarmRow({ label, a, onMode, onAt, onMin, top }) {
  const seg = (on) => ({ border: 'none', borderRadius: 999, padding: '4px 8px', fontSize: 11, fontWeight: 800, cursor: 'pointer', background: on ? INK : 'transparent', color: on ? '#fff' : SUB, fontFamily: 'inherit', whiteSpace: 'nowrap' });
  const box = { width: 104, height: 36, boxSizing: 'border-box', border: '1.5px solid #e4e1d8', borderRadius: 8, background: '#fff', fontSize: 18, fontWeight: 800, textAlign: 'center', color: INK, fontFamily: "'Space Mono',monospace", padding: '0 6px' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 4px', borderTop: top ? '1px solid ' + INK : 'none', borderBottom: '1px solid ' + INK }}>
      <span style={{ fontSize: 14, fontWeight: 800, minWidth: 44, whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ display: 'flex', background: '#efece3', borderRadius: 999, padding: 2 }}>
        <button onClick={() => onMode('alarm')} style={seg(a.mode === 'alarm')}>アラーム</button>
        <button onClick={() => onMode('timer')} style={seg(a.mode === 'timer')}>タイマー</button>
      </div>
      <span style={{ flex: 1 }} />
      {a.mode === 'alarm'
        ? <input type="time" value={a.at} onChange={(e) => onAt(e.target.value)} style={box} />
        : <HmInput value={a.min} onChange={onMin} size={17} />}
    </div>
  );
}

export default function Run({ v }) {
  const r = v.run;
  const [, tick] = React.useState(0);
  const [edit, setEdit] = React.useState(false);
  const [pop, setPop] = React.useState(null); // 頻度のポップアップ（'req' / 'fav'）
  const [hist, setHist] = React.useState(false); // りれき
  const [listOpen, setListOpen] = React.useState(false); // 下のリストを開いているか
  const [delAsk, setDelAsk] = React.useState(false); // 削除の確認
  React.useEffect(() => { const t = setInterval(() => tick(x => x + 1), 1000); return () => clearInterval(t); }, []);
  if (!r) return null;
  const c = r.cur, now = Date.now();
  const over = c.ms > c.planMs, ratio = Math.min(1, c.ms / c.planMs);
  const chip = (on) => ({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 30, height: 28, borderRadius: 999, padding: '0 9px', background: on ? INK : '#efece3', color: on ? '#fff' : INK, fontSize: 13, fontWeight: 900, border: 'none', cursor: 'pointer', fontFamily: 'inherit' });
  const arrowBtn = (on) => ({ width: 26, height: 26, border: 'none', background: 'none', padding: 0, cursor: on ? 'pointer' : 'default', opacity: on ? 1 : 0.2, display: 'flex', alignItems: 'center', justifyContent: 'center' });
  const lab = { fontSize: 8.5, color: MUTED, fontWeight: 700, marginRight: 1 };
  const num = { fontSize: 12, fontWeight: 800, color: INK, ...mono };
  const SHEET_CLOSED = 58;
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: '#f7f4ec', WebkitTapHighlightColor: 'transparent', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '6px 16px 0' }}>
        <button onClick={v.exitRun} aria-label="もどる" style={{ width: 40, height: 40, borderRadius: 8, border: 'none', background: '#e4e1d8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><span style={ms(26, INK, true)}>arrow_back</span></button>
        <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(() => { const d = new Date(now); return (d.getMonth() + 1) + '月' + d.getDate() + '日　' + hm(now); })()}</div>
        {/* 削除＝記録せずに実行をやめる（確認つき） */}
        <button onClick={() => setDelAsk(true)} style={{ border: '2px solid #e8c9c4', borderRadius: 999, background: '#fff', color: '#b4645a', fontSize: 15, fontWeight: 900, padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>削除</button>
        <button onClick={v.runFinish} style={{ border: '2px solid ' + INK, borderRadius: 999, background: '#fff', color: INK, fontSize: 17, fontWeight: 900, padding: '7px 20px', cursor: 'pointer', fontFamily: 'inherit' }}>記録</button>
      </div>
      {delAsk && (
        <div onClick={() => setDelAsk(false)} style={{ position: 'absolute', inset: 0, zIndex: 14, background: 'rgba(27,27,24,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', background: '#fff', borderRadius: 20, padding: '20px 18px 16px', textAlign: 'center', boxShadow: '0 20px 50px rgba(27,27,24,.3)' }}>
            <div style={{ fontSize: 15.5, fontWeight: 900 }}>実行中のタスクを削除しますか？</div>
            <div style={{ fontSize: 12.5, color: SUB, marginTop: 6 }}>記録はされません</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => setDelAsk(false)} style={{ flex: 1, border: '2px solid #e4e1d8', borderRadius: 13, background: '#fff', color: SUB, fontWeight: 800, fontSize: 14, padding: '12px 0', cursor: 'pointer' }}>やめる</button>
              <button onClick={v.runDiscard} style={{ flex: 1.3, border: 'none', borderRadius: 13, background: '#b4645a', color: '#fff', fontWeight: 900, fontSize: 14, padding: '12px 0', cursor: 'pointer' }}>削除する</button>
            </div>
          </div>
        </div>
      )}
      <div className="nos" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: SHEET_CLOSED + 10 }}>
        {/* いまの行動 */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 0' }}><Emo e={c.glyph} size={150} /></div>
        <div style={{ position: 'relative', padding: '0 30px' }}>
          <div style={{ fontSize: 24, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: SUB, marginTop: 2 }}>{c.cat}</div>
          {/* 開始・いまの時刻／経過・予定の時間 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 10.5, fontWeight: 700, color: SUB, ...mono }}>
            <span>{c.startAt ? hm(c.startAt) : '—'}</span><span>{hm(now)}</span>
          </div>
          <div style={{ position: 'relative', height: 14, display: 'flex', alignItems: 'center' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 2, background: '#d8d5cb' }} />
            <div style={{ position: 'absolute', left: 0, width: ratio * 100 + '%', height: 4, borderRadius: 2, background: over ? '#7a9a00' : INK }} />
            <div style={{ position: 'absolute', left: `calc(${ratio * 100}% - 6px)`, width: 12, height: 12, borderRadius: '50%', background: over ? '#7a9a00' : INK }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, fontWeight: 700, ...mono }}>
            <span style={{ color: over ? '#7a9a00' : SUB }}>{mmss(c.ms)}</span><span style={{ color: SUB }}>{mmss(c.planMs)}</span>
          </div>
          {/* 必・♡ ｜ ▶ ｜ りれき */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', margin: '10px 0 36px' }}>{/* 下のアラームとの間はFigmaくらいあける */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setPop(pop === 'req' ? null : 'req')} aria-label="生活必須行動" style={chip(!!c.req)}>必</button>
              <button onClick={() => setPop(pop === 'fav' ? null : 'fav')} aria-label="やりたいこと" style={chip(!!c.fav)}><span style={ms(15, c.fav ? '#fff' : INK, true)}>favorite</span></button>
            </div>
            <button onClick={v.runToggle} aria-label={r.running ? '一時停止' : '再開'} style={{ width: 60, height: 60, borderRadius: '50%', border: 'none', background: r.running ? INK : LIME, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, boxShadow: '0 6px 16px rgba(27,27,24,.2)' }}>
              <span style={ms(38, r.running ? '#fff' : LIME_INK, true)}>{r.running ? 'pause' : 'play_arrow'}</span>
            </button>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => { setPop(null); setHist(true); }} style={{ ...chip(false), fontSize: 11.5, fontWeight: 800, gap: 3, padding: '0 12px' }}>りれき<span style={ms(16, INK)}>calendar_month</span></button>
            </div>
          </div>
          {pop && (
            <div style={{ position: 'relative', height: 120, margin: '-6px -8px 0' }}>
              <FreqPop key={pop} label={pop === 'req' ? '生活必須行動' : 'やりたいこと'} value={c[pop]}
                onSave={(f) => { c.onFreq(pop, f); setPop(null); }} onDelete={() => { c.onFreq(pop, null); setPop(null); }} onClose={() => setPop(null)} />
            </div>
          )}
          {/* 全体／実施中 の アラーム・タイマー */}
          <AlarmRow label="全体" a={r.alarm.all} top onMode={(m) => v.setRunAlarm('all', { mode: m })} onAt={(t) => v.setRunAlarm('all', { at: t })} onMin={(n) => v.setRunAlarm('all', { min: n })} />
          <AlarmRow label="実施中" a={r.alarm.cur} onMode={(m) => v.setRunAlarm('cur', { mode: m })} onAt={(t) => v.setRunAlarm('cur', { at: t })} onMin={(n) => v.setRunAlarm('cur', { min: n || 1 })} />
        </div>
      </div>
      {/* りれき（月カレンダー）: カードの形で上に重ねる */}
      {hist && (
        <div onClick={() => setHist(false)} style={{ position: 'absolute', inset: 0, zIndex: 12, background: 'rgba(27,27,24,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', height: 270, background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 12px 32px rgba(27,27,24,.25)' }}>
            <History it={c} cat={{ color: c.color }} onClose={() => setHist(false)} />
          </div>
        </div>
      )}
      {/* リスト（下から開く・閉じる） */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 6, height: listOpen ? '40%' : SHEET_CLOSED /* 開いたとき: Figma「タスク実行/START」と同じくらい（画面の約4割） */, transition: 'height .25s ease', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '22px 22px 0 0', boxShadow: '0 -2px 14px rgba(27,27,24,.1)' }}>
        <div onClick={() => setListOpen(!listOpen)} style={{ flex: '0 0 auto', cursor: 'pointer', padding: '8px 14px 8px' }}>
          <div style={{ width: 120, height: 4, borderRadius: 2, background: '#e4e1d8', margin: '0 auto 8px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 900 }}>リスト</span>
            {r.name && <span style={{ flex: '0 1 auto', minWidth: 0, fontSize: 13, fontWeight: 800, color: SUB, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>}
            <span style={{ ...mono, fontSize: 11, color: MUTED }}>{r.rows.length}</span>
            <span style={{ flex: 1 }} />
            {listOpen && <button onClick={(e) => { e.stopPropagation(); setEdit(!edit); }} style={{ border: 'none', borderRadius: 999, background: edit ? LIME : INK, color: edit ? LIME_INK : '#fff', fontSize: 12.5, fontWeight: 800, padding: '6px 16px', cursor: 'pointer', fontFamily: 'inherit' }}>{edit ? '完了' : '編集'}</button>}
            <span style={ms(24, SUB)}>{listOpen ? 'expand_more' : 'expand_less'}</span>
          </div>
        </div>
        {listOpen && (
          <div className="nos" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 12px 12px' }}>
            {r.rows.map((x, i) => (
              <div key={x.uid} style={{ display: 'flex', alignItems: 'center', gap: 2, height: 44, background: x.on ? '#fff' : '#f3f0e8', borderRadius: 10, padding: '0 4px 0 6px', marginBottom: 6, boxShadow: x.on ? 'inset 0 0 0 2px ' + INK : 'none' }}>
                <div onClick={x.onTap} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6, height: '100%', cursor: 'pointer' }}>
                  <span style={{ flex: '0 0 auto' }}><Emo e={x.glyph} size={28} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.name}</div>
                    {x.ms > 0 && <div style={{ fontSize: 9.5, fontWeight: 700, color: x.on && r.running ? '#7a9a00' : MUTED, ...mono }}>{(x.on && r.running ? '実行中 ' : '') + mmss(x.ms)}</div>}
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, whiteSpace: 'nowrap', flex: '0 0 auto' }}>
                    <span><span style={lab}>体</span><span style={num}>{sg(x.body)}</span></span>
                    <span><span style={lab}>心</span><span style={num}>{sg(x.mind)}</span></span>
                    <span style={{ fontSize: 9, color: MUTED, fontWeight: 700 }}>/{x.minText}</span>
                  </span>
                </div>
                {/* 並べ替えの矢印と×は「編集」を押したときだけ */}
                {edit && <button onClick={x.onUp} aria-label="上へ" style={arrowBtn(i > 0)}><span style={ms(20, INK)}>arrow_upward</span></button>}
                {edit && <button onClick={x.onDown} aria-label="下へ" style={arrowBtn(i < r.rows.length - 1)}><span style={ms(20, INK)}>arrow_downward</span></button>}
                {edit && <button onClick={x.onRemove} aria-label="リストから外す" style={arrowBtn(!x.on && r.rows.length > 1)}><span style={ms(19, '#b4645a')}>delete</span></button>}
              </div>
            ))}
            <button onClick={v.goRunAdd} aria-label="行動を追加" style={{ width: '100%', height: 40, border: '1.5px dashed #c9c7bf', borderRadius: 10, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><span style={ms(24, SUB)}>add</span></button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ホーム・行動選択画面の下に出す「実施中」のバー（実行画面のリストの行と同じ形）。押すと実行画面へ、右の⏸/▶で止める・再開 */
export function MiniRun({ v }) {
  const r = v.run;
  const [, tick] = React.useState(0);
  React.useEffect(() => { const t = setInterval(() => tick(x => x + 1), 1000); return () => clearInterval(t); }, []);
  if (!r) return null;
  const c = r.cur, ratio = Math.min(1, c.ms / c.planMs), over = c.ms > c.planMs;
  return (
    <div onClick={v.goRun} style={{ position: 'relative', flex: '0 0 auto', height: 60, margin: '0 8px 6px', background: '#fff', borderRadius: 12, overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px 0 10px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(27,27,24,.14)', WebkitTapHighlightColor: 'transparent', zIndex: 3 }}>
      <span style={{ position: 'absolute', left: 0, top: 0, width: 47, height: 47, background: c.color, clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
      <span style={{ position: 'relative', flex: '0 0 auto' }}><Emo e={c.glyph} size={36} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
        <div style={{ fontSize: 10, fontWeight: 700, color: over ? '#7a9a00' : MUTED, ...mono }}>{mmss(c.ms)} / {mmss(c.planMs)}</div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); v.runToggle(); }} aria-label={r.running ? '一時停止' : '再開'} style={{ width: 44, height: 44, border: 'none', borderRadius: 12, background: r.running ? '#efece3' : LIME, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flex: '0 0 auto' }}>
        <span style={ms(30, r.running ? INK : LIME_INK, true)}>{r.running ? 'pause' : 'play_arrow'}</span>
      </button>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, background: '#e4e1d8' }}>
        <div style={{ height: '100%', width: ratio * 100 + '%', background: over ? '#7a9a00' : INK }} />
      </div>
    </div>
  );
}
