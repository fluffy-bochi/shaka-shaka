import React from 'react';
import Emo from '../fluent';
import { FreqPop, History } from './Pick';

/* タスク実行（START）: いまの行動を大きく、開始時刻・いまの時刻と、経過／予定の時間のバー、▶／⏸。
   下のシートに実行するリスト（行をタップでその行動に切り替え・↑↓で並べ替え・編集で外す）。右上の「記録」で終えて確認画面へ。 */
const INK = '#1b1b18', SUB = '#55554e', MUTED = '#8a8a82', LIME = '#c4f000', LIME_INK = '#2f3a00';
const mono = { fontFamily: "'Space Mono',monospace" };
const ms = (size, color, fill = false) => ({ fontFamily: 'Material Symbols Rounded', fontVariationSettings: fill ? "'FILL' 1" : "'FILL' 0", fontSize: size, color, lineHeight: 1 });
const sg = (n) => (n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '±0');
const hm = (ts) => { const d = new Date(ts); return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); };
const mmss = (t) => { const s = Math.max(0, Math.floor(t / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

export default function Run({ v }) {
  const r = v.run;
  const [, tick] = React.useState(0);
  const [edit, setEdit] = React.useState(false);
  const [pop, setPop] = React.useState(null); // 頻度のポップアップ（'req' / 'fav'）
  const [hist, setHist] = React.useState(false); // りれき
  React.useEffect(() => { const t = setInterval(() => tick(x => x + 1), 1000); return () => clearInterval(t); }, []);
  const c = r.cur, now = Date.now();
  const over = c.ms > c.planMs, ratio = Math.min(1, c.ms / c.planMs);
  const chip = (on) => ({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 28, height: 26, borderRadius: 999, padding: '0 8px', background: on ? INK : '#efece3', color: on ? '#fff' : INK, fontSize: 13, fontWeight: 900 });
  const arrowBtn = (on) => ({ width: 26, height: 26, border: 'none', background: 'none', padding: 0, cursor: on ? 'pointer' : 'default', opacity: on ? 1 : 0.2, display: 'flex', alignItems: 'center', justifyContent: 'center' });
  const lab = { fontSize: 8.5, color: MUTED, fontWeight: 700, marginRight: 1 };
  const num = { fontSize: 12, fontWeight: 800, color: INK, ...mono };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: '#f7f4ec', WebkitTapHighlightColor: 'transparent' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '6px 16px 0' }}>
        <button onClick={v.exitRun} aria-label="もどる" style={{ width: 40, height: 40, borderRadius: 8, border: 'none', background: '#e4e1d8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><span style={ms(26, INK, true)}>arrow_back</span></button>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{(() => { const d = new Date(now); return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日　' + hm(now); })()}</div>
        <button onClick={v.runFinish} style={{ border: '2px solid ' + INK, borderRadius: 999, background: '#fff', color: INK, fontSize: 17, fontWeight: 900, padding: '7px 20px', cursor: 'pointer', fontFamily: 'inherit' }}>記録</button>
      </div>
      {/* いまの行動 */}
      <div style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'center', padding: '8px 0 2px' }}><Emo e={c.glyph} size={170} /></div>
      <div style={{ position: 'relative', padding: '0 30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 24, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: SUB, marginTop: 2 }}>{c.cat}</div>
          </div>
          {/* 必・♡・りれき（行動カードと同じ） */}
          <button onClick={() => setPop(pop === 'req' ? null : 'req')} aria-label="生活必須行動" style={{ ...chip(!!c.req), border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>必</button>
          <button onClick={() => setPop(pop === 'fav' ? null : 'fav')} aria-label="やりたいこと" style={{ ...chip(!!c.fav), border: 'none', cursor: 'pointer' }}><span style={ms(15, c.fav ? '#fff' : INK, true)}>favorite</span></button>
          <button onClick={() => { setPop(null); setHist(true); }} style={{ ...chip(false), border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 800, gap: 2 }}>りれき<span style={ms(15, INK)}>calendar_month</span></button>
        </div>
        {pop && (
          <div style={{ position: 'absolute', left: 22, right: 22, top: 0, height: 0 }}>
            {/* FreqPop は下から48pxの位置に出るので、名前・チップの行のすぐ下に来るよう高さで調整 */}
            <div style={{ position: 'absolute', left: 0, right: 0, top: 52 }}>
              <div style={{ position: 'relative', height: 120 }}>
                <FreqPop key={pop} label={pop === 'req' ? '生活必須行動' : 'やりたいこと'} value={c[pop]}
                  onSave={(f) => { c.onFreq(pop, f); setPop(null); }} onDelete={() => { c.onFreq(pop, null); setPop(null); }} onClose={() => setPop(null)} />
              </div>
            </div>
          </div>
        )}
        {/* 開始・いまの時刻／経過・予定の時間 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 10.5, fontWeight: 700, color: SUB, ...mono }}>
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
        <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0 14px' }}>
          <button onClick={v.runToggle} aria-label={r.running ? '一時停止' : '再開'} style={{ width: 62, height: 62, borderRadius: '50%', border: 'none', background: r.running ? INK : LIME, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, boxShadow: '0 6px 16px rgba(27,27,24,.2)' }}>
            <span style={ms(40, r.running ? '#fff' : LIME_INK, true)}>{r.running ? 'pause' : 'play_arrow'}</span>
          </button>
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
      {/* 実行するリスト */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '22px 22px 0 0', boxShadow: '0 -2px 14px rgba(27,27,24,.08)' }}>
        <div style={{ width: 120, height: 4, borderRadius: 2, background: '#e4e1d8', margin: '10px auto 6px' }} />
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 14px 8px' }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 18, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
          <button onClick={() => setEdit(!edit)} style={{ border: 'none', borderRadius: 999, background: edit ? LIME : INK, color: edit ? LIME_INK : '#fff', fontSize: 12.5, fontWeight: 800, padding: '6px 16px', cursor: 'pointer', fontFamily: 'inherit' }}>{edit ? '完了' : '編集'}</button>
        </div>
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
              <button onClick={x.onUp} aria-label="上へ" style={arrowBtn(i > 0)}><span style={ms(20, INK)}>arrow_upward</span></button>
              <button onClick={x.onDown} aria-label="下へ" style={arrowBtn(i < r.rows.length - 1)}><span style={ms(20, INK)}>arrow_downward</span></button>
              {edit && <button onClick={x.onRemove} aria-label="リストから外す" style={arrowBtn(!x.on && r.rows.length > 1)}><span style={ms(18, '#b4645a')}>close</span></button>}
            </div>
          ))}
          <button onClick={v.goRunAdd} aria-label="行動を追加" style={{ width: '100%', height: 40, border: '1.5px dashed #c9c7bf', borderRadius: 10, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><span style={ms(24, SUB)}>add</span></button>
        </div>
      </div>
    </div>
  );
}
