import React from 'react';
import SlotPill from './SlotPill';
import Emo from '../fluent';

/* 行動選択（記録の入口）: 上に選択中のカード、下にカテゴリ＋行動のリスト。
   カテゴリは選択中にもう一度タップすると開く（開いていれば閉じる）。右の列は 検索 / 全部開閉 / 必須 / お気に入り（必須・お気に入りは見た目のみ）。
   START・予定・記録は「時間を選ぶ画面（確認）」へ進む。「リスト＋」は右のリストのカードに積む（カードとリストは横にスワイプ）。 */
const INK = '#1b1b18';
const ms = (size, color, fill = false) => ({ fontFamily: 'Material Symbols Rounded', fontVariationSettings: fill ? "'FILL' 1" : "'FILL' 0", fontSize: size, color, lineHeight: 1 });
const CARD_H = 212; // 上のカードの高さはカテゴリ・行動・予定で共通（切り替わってもリストの位置が動かないように）
const sg = (n) => (n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '±0');

function FatNums({ it, big }) {
  if (it.kind !== 'act') return it.meta ? <span style={{ fontSize: big ? 11 : 10.5, color: '#8a8a82', fontWeight: 700 }}>{it.meta}</span> : null;
  const lab = { fontSize: big ? 9 : 8.5, color: '#8a8a82', fontWeight: 700, marginRight: 1 };
  const num = { fontSize: big ? 13 : 12.5, fontWeight: 800, color: INK, fontFamily: "'Space Mono',monospace" };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 5, whiteSpace: 'nowrap' }}>
      <span><span style={lab}>体</span><span style={num}>{sg(it.body)}</span></span>
      <span><span style={lab}>心</span><span style={num}>{sg(it.mind)}</span></span>
      <span style={{ fontSize: 9, color: '#8a8a82', fontWeight: 700 }}>/{it.minText}</span>
    </span>
  );
}

/* 生活必須行動・やりたいことの頻度 { k, unit:'日'|'週'|'月', n } ＝「k日（週・か月）に n回」。
   旧形式 { every:'毎'|'隔' } は 毎=1・隔=2 として読む */
const freqK = (f) => (f ? (f.k || (f.every === '隔' ? 2 : 1)) : 1);
const unitLabel = (unit, k) => (unit === '月' ? (k > 1 ? 'か月' : '月') : unit);
const freqText = (f) => {
  if (!f) return '';
  const k = freqK(f);
  return k === 1 ? '毎' + f.unit + f.n + '回' : k + unitLabel(f.unit, k) + 'に' + f.n + '回';
};
// その月の目標回数（k日にn回＝日数÷k×n、k週にn回＝日数÷7÷k×n、kか月にn回＝n÷k）
function monthTarget(f, dim) {
  if (!f || !f.n) return 0;
  const k = freqK(f);
  const per = f.unit === '日' ? dim / k : f.unit === '週' ? dim / 7 / k : 1 / k;
  return Math.max(1, Math.round(f.n * per));
}
/* 時間の入力 [時]:[分]（何時間でも）。value・onChange は合計の分 */
export function HmInput({ value, onChange, size = 16 }) {
  const v = Math.max(0, Math.round(Number(value) || 0)), h = Math.floor(v / 60), m = v % 60;
  const box = { height: 36, boxSizing: 'border-box', border: '1.5px solid #e4e1d8', borderRadius: 9, background: '#fff', textAlign: 'center', fontSize: size, fontWeight: 900, fontFamily: "'Space Mono',monospace", color: INK, padding: 0 };
  const clean = (x) => Math.max(0, parseInt(x, 10) || 0);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      <input type="number" inputMode="numeric" min={0} max={99} value={v ? h : ''} placeholder="0" aria-label="時間" onChange={(e) => onChange(Math.min(99, clean(e.target.value)) * 60 + m)} style={{ ...box, width: 42 }} />
      <span style={{ fontSize: size, fontWeight: 900 }}>:</span>
      <input type="number" inputMode="numeric" min={0} max={59} value={v ? String(m).padStart(2, '0') : ''} placeholder="00" aria-label="分" onChange={(e) => onChange(h * 60 + Math.min(59, clean(e.target.value)))} style={{ ...box, width: 46 }} />
    </span>
  );
}

/* 行動の編集（カードの上に重ねる）: 名前・体・心（その分数ぶん、マイナス＝回復）・分 */
function EditAct({ it, onClose }) {
  const [f, setF] = React.useState(() => ({ ...it.editVals }));
  const num = (key, w = 64) => (
    <input type="number" inputMode="numeric" value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value === '' || e.target.value === '-' ? e.target.value : parseInt(e.target.value, 10) || 0 })}
      style={{ width: w, height: 36, boxSizing: 'border-box', border: '1.5px solid #e4e1d8', borderRadius: 9, textAlign: 'center', fontSize: 16, fontWeight: 900, fontFamily: "'Space Mono',monospace", color: INK, padding: 0 }} />
  );
  const lab = { fontSize: 11, fontWeight: 800, color: '#55554e' };
  const ok = (f.name || '').trim() && Number(f.min) > 0;
  const save = () => { if (!ok) return; it.onEdit({ name: f.name, body: Number(f.body) || 0, mind: Number(f.mind) || 0, min: Number(f.min) }); onClose(); };
  return (
    <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', inset: 0, zIndex: 6, background: '#fff', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 7, overflowY: 'auto', WebkitTapHighlightColor: 'transparent' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 900, flex: 1 }}>行動を編集</span>
        {/* 表示・非表示（非表示にした行動は、右の目のボタンで「非表示の行動」を見ると出てくる） */}
        {it.onToggleHide && <button onClick={() => { it.onToggleHide(); onClose(); }} style={{ border: '1.5px solid #e4e1d8', borderRadius: 999, background: '#fff', color: '#55554e', fontSize: 11.5, fontWeight: 800, padding: '4px 10px 4px 7px', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap', marginRight: 8 }}><span style={ms(16, '#55554e')}>{it.hidden ? 'visibility' : 'visibility_off'}</span>{it.hidden ? '表示する' : '非表示にする'}</button>}
        <button onClick={onClose} aria-label="閉じる" style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}><span style={ms(22, INK)}>close</span></button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ ...lab, flex: '0 0 auto' }}>名前</div>
        <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', height: 38, border: '1.5px solid #e4e1d8', borderRadius: 9, fontSize: 15, fontWeight: 800, padding: '0 10px', fontFamily: 'inherit' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
        <div><div style={lab}>体</div><div style={{ marginTop: 3 }}>{num('body')}</div></div>
        <div><div style={lab}>心</div><div style={{ marginTop: 3 }}>{num('mind')}</div></div>
        <span style={{ fontSize: 14, fontWeight: 800, paddingBottom: 8 }}>/</span>
        <div><div style={lab}>時間（時:分）</div><div style={{ marginTop: 3 }}><HmInput value={f.min} onChange={(n) => setF({ ...f, min: n })} /></div></div>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {it.onReset && <button onClick={() => { it.onReset(); onClose(); }} style={{ border: '1.5px solid #e4e1d8', borderRadius: 12, background: '#fff', color: '#55554e', fontSize: 13, fontWeight: 800, padding: '7px 12px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>元に戻す</button>}
        <span style={{ flex: 1, fontSize: 10.5, color: '#8a8a82', fontWeight: 700 }}>マイナスで回復</span>
        <button onClick={onClose} style={{ border: '1.5px solid #e4e1d8', borderRadius: 12, background: '#fff', color: '#55554e', fontSize: 13, fontWeight: 800, padding: '7px 14px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>キャンセル</button>
        <button onClick={save} style={{ border: 'none', borderRadius: 12, background: ok ? '#c4f000' : '#e4e1d8', color: ok ? '#2f3a00' : '#a5a39a', fontSize: 14, fontWeight: 900, padding: '7px 20px', cursor: ok ? 'pointer' : 'default', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>保存</button>
      </div>
    </div>
  );
}

/* 頻度を決めるポップアップ（カードの上に出す）: [k] 日/週/月 に [n] 回。日/週/月 は きらい/ふつう/すき と同じ形の切り替え */
export function FreqPop({ label, value, onSave, onDelete, onClose }) {
  const [f, setF] = React.useState(() => (value ? { k: freqK(value), unit: value.unit, n: value.n } : { k: 1, unit: '日', n: 1 }));
  const numIn = (key) => (
    <input type="number" inputMode="numeric" min={1} max={99} value={f[key] || ''} onChange={(e) => setF({ ...f, [key]: Math.max(0, Math.min(99, parseInt(e.target.value, 10) || 0)) })}
      style={{ width: 30, height: 28, border: 'none', borderRadius: 8, background: '#efece3', textAlign: 'center', fontSize: 15, fontWeight: 900, fontFamily: "'Space Mono',monospace", color: INK, padding: 0, flex: '0 0 auto' }} />
  );
  const ok = f.k > 0 && f.n > 0;
  return (
    <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', left: 8, right: 8, bottom: 48, zIndex: 5, background: '#fff', borderRadius: 18, padding: '8px 12px 10px', boxShadow: '0 8px 24px rgba(27,27,24,.22)', WebkitTapHighlightColor: 'transparent' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 900 }}>{label}</span>
        <span style={{ flex: 1 }} />
        {/* 削除＝登録を解除（✕は閉じるだけ）。未登録のときは押せない */}
        <button onClick={value ? onDelete : undefined} disabled={!value} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, border: '1.5px solid ' + (value ? '#b4645a' : '#e4e1d8'), background: '#fff', borderRadius: 999, padding: '3px 9px 3px 6px', fontSize: 11.5, fontWeight: 800, color: value ? '#b4645a' : '#c9c7bf', cursor: value ? 'pointer' : 'default', fontFamily: 'inherit' }}><span style={ms(15, value ? '#b4645a' : '#c9c7bf')}>delete</span>削除</button>
        <button onClick={onClose} aria-label="閉じる" style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}><span style={ms(20, INK)}>close</span></button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {numIn('k')}
        <div style={{ display: 'flex', background: '#efece3', borderRadius: 999, padding: 2, flex: '0 0 auto' }}>
          {['日', '週', '月'].map(o => <button key={o} onClick={() => setF({ ...f, unit: o })} style={{ border: 'none', borderRadius: 999, padding: '4px 7px', fontSize: 12, fontWeight: 800, cursor: 'pointer', background: f.unit === o ? INK : 'transparent', color: f.unit === o ? '#fff' : '#55554e', fontFamily: 'inherit' }}>{o}</button>)}
        </div>
        <span style={{ fontSize: 12, fontWeight: 800 }}>に</span>
        {numIn('n')}
        <span style={{ fontSize: 12, fontWeight: 800 }}>回</span>
        <span style={{ flex: 1, minWidth: 0 }} />
        <button onClick={() => ok && onSave({ k: f.k, unit: f.unit, n: f.n })} style={{ border: 'none', borderRadius: 999, background: ok ? INK : '#d8d5cb', color: '#fff', fontSize: 12, fontWeight: 800, padding: '6px 10px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flex: '0 0 auto' }}>登録</button>
      </div>
    </div>
  );
}

/* りれき: 月カレンダー＋その月の 回数（目標に対して）・目標頻度・合計時間・平均時間 */
const fmtMin = (m) => (m < 60 ? m + '分' : Math.floor(m / 60) + '時間' + (m % 60 ? (m % 60) + '分' : ''));
export function History({ it, cat, onClose, closeX }) { // closeX: 右上を↩ではなく×に（実行画面で重ねて出すとき）
  const [off, setOff] = React.useState(0);
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth() + off, 1);
  const y = base.getFullYear(), mo = base.getMonth();
  const ym = y + '-' + String(mo + 1).padStart(2, '0');
  const h = it.history(ym);
  const dim = new Date(y, mo + 1, 0).getDate();
  // 目標: 生活必須行動の頻度 → やりたいことの頻度 → （旧）週n回
  const target = it.freq ? monthTarget(it.freq, dim) : it.goal ? Math.round(it.goal * dim / 7) : 0;
  const lead = (base.getDay() + 6) % 7; // 月曜はじまり
  const weeks = Math.ceil((lead + dim) / 7);
  const cells = [];
  for (let i = 0; i < weeks * 7; i++) cells.push(new Date(y, mo, i - lead + 1));
  const isToday = (d) => d.toDateString() === now.toDateString();
  const cellH = weeks > 5 ? 15 : 18;
  const stat = { flex: 1, minWidth: 0, background: '#f7f4ec', borderRadius: 9, padding: '4px 6px 5px', display: 'flex', flexDirection: 'column', justifyContent: 'center' };
  const lab = { fontSize: 8.5, fontWeight: 700, color: '#8a8a82', lineHeight: 1.2 };
  const val = { fontSize: 13, fontWeight: 900, color: INK, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
  const navBtn = { width: 22, height: 22, border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', padding: '8px 10px 8px', boxSizing: 'border-box' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 54, height: 54, background: cat.color, clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6, height: 30 }}>
        <span style={{ flex: '0 0 auto' }}><Emo e={it.glyph} size={26} /></span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</span>
        <button onClick={() => setOff(off - 1)} aria-label="前の月" style={navBtn}><span style={ms(20, '#8a8a82')}>chevron_left</span></button>
        <span style={{ fontSize: 15, fontWeight: 900, whiteSpace: 'nowrap' }}><span style={{ fontSize: 10, color: '#8a8a82', marginRight: 3 }}>{y}</span>{mo + 1}月</span>
        <button onClick={() => setOff(off + 1)} aria-label="次の月" style={navBtn}><span style={ms(20, '#8a8a82')}>chevron_right</span></button>
        <button onClick={onClose} aria-label={closeX ? '閉じる' : 'もどる'} style={{ ...navBtn, marginLeft: 4 }}><span style={ms(closeX ? 22 : 20, INK)}>{closeX ? 'close' : 'undo'}</span></button>
      </div>
      <div style={{ display: 'flex', gap: 5, margin: '5px 0 6px' }}>
        <div style={{ ...stat, flex: 1.15 }}>
          <span style={lab}>回数</span>
          <span style={val}>{h.count}{target ? <span style={{ fontSize: 10, color: '#8a8a82' }}> / {target}回</span> : '回'}</span>
          {target > 0 && <span style={{ height: 3, borderRadius: 2, background: '#e4e1d8', marginTop: 2, overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: Math.min(100, Math.round(h.count / target * 100)) + '%', background: h.count >= target ? '#7a9a00' : '#c4f000' }} /></span>}
        </div>
        {it.freq ? (
          <div style={stat}>
            <span style={lab}>{it.req ? '必須' : 'やりたい'}</span>
            <span style={{ ...val, fontSize: 11.5 }}>{freqText(it.freq)}</span>
          </div>
        ) : (
          <button onClick={it.onGoal} style={{ ...stat, border: '1.5px dashed ' + (it.goal ? 'transparent' : '#d8d5cb'), cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
            <span style={lab}>目標</span>
            <span style={{ ...val, color: it.goal ? INK : '#a5a39a', fontSize: it.goal ? 13 : 11.5 }}>{it.goal ? '週' + it.goal + '回' : '未設定'}</span>
          </button>
        )}
        <div style={stat}><span style={lab}>合計</span><span style={{ ...val, fontSize: h.totalMin >= 60 ? 11 : 13 }}>{fmtMin(h.totalMin)}</span></div>
        <div style={stat}><span style={lab}>平均</span><span style={{ ...val, fontSize: h.avgMin >= 60 ? 11 : 13 }}>{h.avgMin ? fmtMin(h.avgMin) : '—'}</span></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, fontSize: 8.5, fontWeight: 700, textAlign: 'center', color: '#8a8a82', marginBottom: 2 }}>
        {['月', '火', '水', '木', '金', '土', '日'].map((w, i) => <span key={w} style={{ color: i === 5 ? '#5b8fd4' : i === 6 ? '#d9534f' : undefined }}>{w}</span>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((d, i) => {
          const inMo = d.getMonth() === mo, n = inMo ? (h.days[d.getDate()] || 0) : 0, dw = d.getDay();
          return (
            <div key={i} style={{ position: 'relative', height: cellH, borderRadius: 5, background: inMo ? '#f7f4ec' : 'transparent', boxShadow: isToday(d) ? 'inset 0 0 0 1.5px ' + INK : 'none', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 3 }}>
              <span style={{ position: 'absolute', left: 3, top: 1, fontSize: 8, fontWeight: 700, color: !inMo ? '#c9c5b8' : dw === 6 ? '#5b8fd4' : dw === 0 ? '#d9534f' : '#55554e' }}>{d.getDate()}</span>
              {n > 0 && <Emo e={it.glyph} size={cellH - 6} />}
              {n > 1 && <span style={{ position: 'absolute', right: 1, bottom: 0, fontSize: 7.5, fontWeight: 900, color: INK }}>×{n}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* 上のカード */
function Card({ row, cat, v, hist, setHist }) {
  // りれきを開く/閉じるときは、カードを裏返す（横に90度まわして中身を入れ替え、反対側から戻す）
  const ref = React.useRef(null);
  const [pop, setPop] = React.useState(null); // 頻度のポップアップ（'req'＝生活必須行動 / 'fav'＝やりたいこと）
  const [editing, setEditing] = React.useState(false); // 行動・カテゴリの編集
  const flip = (b) => {
    const el = ref.current;
    if (!el || !el.animate) { setHist(b); return; }
    const d = b ? 90 : -90, P = 'perspective(900px) ';
    const a1 = el.animate([{ transform: P + 'rotateY(0deg)' }, { transform: P + `rotateY(${d}deg)` }], { duration: 170, easing: 'ease-in', fill: 'forwards' });
    a1.onfinish = () => {
      setHist(b);
      requestAnimationFrame(() => {
        const n = ref.current;
        if (!n) return;
        const a2 = n.animate([{ transform: P + `rotateY(${-d}deg)` }, { transform: P + 'rotateY(0deg)' }], { duration: 170, easing: 'ease-out' });
        a2.onfinish = () => a1.cancel();
      });
    };
  };
  const wrap = { position: 'relative', width: '100%', borderRadius: 18, overflow: 'hidden', background: '#fff', height: CARD_H, flex: '0 0 auto', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 10px rgba(27,27,24,.06)' };
  if (!row) return <div style={wrap} />;
  if (row.type === 'cat' || row.type === 'addcat') {
    const color = row.type === 'cat' ? cat.color : '#55554e';
    const ink = row.type === 'cat' ? (cat.ink || '#fff') : '#fff';
    return (
      <div style={{ ...wrap, background: color, justifyContent: 'center' }}>
        <span style={{ position: 'absolute', left: 16, top: 12, fontSize: 13, fontWeight: 800, color: ink }}>{row.type === 'cat' ? 'カテゴリ' : '追加'}</span>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22 }}>
          {row.type === 'cat' ? <Emo e={cat.glyph} size={64} /> : <span style={ms(56, '#fff')}>add</span>}
          <span style={{ fontSize: 24, fontWeight: 900, color: ink }}>{row.type === 'cat' ? cat.name : '大カテゴリを追加'}</span>
        </div>
        {row.type === 'cat' && cat.hidden && <span style={{ position: 'absolute', left: 16, bottom: 12, fontSize: 12, fontWeight: 800, color: ink, opacity: 0.85 }}>非表示中</span>}
        {/* 右上の「編集」: カテゴリの表示・非表示 */}
        {row.type === 'cat' && cat.onToggleHide && <button onClick={() => setEditing(true)} style={{ position: 'absolute', top: 8, right: 10, zIndex: 2, border: 'none', borderRadius: 999, background: 'rgba(255,255,255,.92)', color: INK, fontSize: 11.5, fontWeight: 800, padding: '3px 11px', cursor: 'pointer', fontFamily: 'inherit' }}>編集</button>}
        {row.type === 'cat' && editing && (
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', inset: 0, zIndex: 6, background: '#fff', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 900, flex: 1, color: INK }}>カテゴリを編集</span>
              <button onClick={() => setEditing(false)} aria-label="閉じる" style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}><span style={ms(22, INK)}>close</span></button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Emo e={cat.glyph} size={44} /><span style={{ fontSize: 20, fontWeight: 900, color: INK }}>{cat.name}</span></div>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditing(false)} style={{ border: '1.5px solid #e4e1d8', borderRadius: 12, background: '#fff', color: '#55554e', fontSize: 13, fontWeight: 800, padding: '10px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>キャンセル</button>
              <button onClick={() => { cat.onToggleHide(); setEditing(false); }} style={{ border: 'none', borderRadius: 12, background: INK, color: '#fff', fontSize: 13.5, fontWeight: 900, padding: '10px 16px', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={ms(17, '#fff')}>{cat.hidden ? 'visibility' : 'visibility_off'}</span>{cat.hidden ? '表示する' : '非表示にする'}</button>
            </div>
          </div>
        )}
      </div>
    );
  }
  const it = row.item;
  const isAct = it.kind === 'act';
  if (isAct && hist) return <div ref={ref} style={wrap}><History it={it} cat={cat} onClose={() => flip(false)} /></div>;
  const parts = isAct ? it.prefParts[it.pref] : null;
  const chip = { display: 'inline-flex', alignItems: 'center', gap: 3, height: 26, background: '#efece3', borderRadius: 999, padding: '0 8px', fontSize: 11, fontWeight: 700, color: INK };
  const gray = { border: 'none', borderRadius: 10, background: '#efece3', color: '#55554e', fontSize: 13.5, fontWeight: 800, padding: '6px 14px', cursor: 'pointer' };
  return (
    <div ref={ref} style={wrap}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: '46%', height: 150, background: cat.color, clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
      <span style={{ position: 'absolute', left: 14, top: 10, fontSize: 13, fontWeight: 800, color: cat.ink || '#fff' }}>{cat.name}</span>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14, padding: '26px 16px 4px 20px', flex: 1, minHeight: 0 }}>
        <span style={{ flex: '0 0 auto' }}><Emo e={it.glyph} size={72} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: it.name.length > 9 ? 17 : 23, fontWeight: 900, lineHeight: 1.3, wordBreak: 'break-all', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{it.name}</div>
          {isAct && (
            <div style={{ display: 'flex', gap: 5, marginTop: 10, flexWrap: 'wrap' }}>
              <button onClick={() => setPop(pop === 'req' ? null : 'req')} aria-label="生活必須行動" style={{ ...chip, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 900, background: it.req ? INK : chip.background, color: it.req ? '#fff' : INK }}>必</button>
              <button onClick={() => setPop(pop === 'fav' ? null : 'fav')} aria-label="やりたいこと" style={{ ...chip, border: 'none', cursor: 'pointer', background: it.fav ? INK : chip.background }}><span style={ms(15, it.fav ? '#fff' : INK, true)}>favorite</span></button>
              <button onClick={() => flip(true)} style={{ ...chip, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>りれき<span style={ms(15, INK)}>list</span><span style={ms(15, INK)}>calendar_month</span></button>
            </div>
          )}
          {it.kind === 'plan' && it.meta && <div style={{ fontSize: 12, color: '#55554e', fontWeight: 700, marginTop: 8 }}>{it.meta}</div>}
          {it.kind === 'mood' && <div style={{ fontSize: 12, color: '#55554e', fontWeight: 700, marginTop: 8 }}>{it.meta}</div>}
        </div>
      </div>
      {isAct && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 14px 2px' }}>
          <div style={{ display: 'flex', background: '#efece3', borderRadius: 999, padding: 3, flex: '0 0 auto' }}>
            {[['dislike', 'きらい'], ['normal', 'ふつう'], ['like', 'すき']].map(([k, t]) => (
              <button key={k} onClick={() => it.onPref(k)} style={{ border: 'none', borderRadius: 999, padding: '5px 10px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', background: it.pref === k ? INK : 'transparent', color: it.pref === k ? '#fff' : '#55554e' }}>{t}</button>
            ))}
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 7, color: INK, whiteSpace: 'nowrap' }}>
            {[['合計', parts.total], ['体', parts.body], ['心', parts.mind]].map(([l, n]) => (
              <span key={l}><span style={{ fontSize: 8.5, fontWeight: 700, marginRight: 1, verticalAlign: 'super', color: '#8a8a82' }}>{l}</span><span style={{ fontSize: 15, fontWeight: 900, fontFamily: "'Space Mono',monospace" }}>{sg(n)}</span></span>
            ))}
            <span style={{ fontSize: 9, fontWeight: 700, color: '#8a8a82' }}>/{parts.minText}</span>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px 12px' }}>
        {it.kind === 'act' && <>
          <button onClick={it.onStart} style={gray}>予定</button>
          <button onClick={it.onStart} style={gray}>記録</button>
          <button onClick={it.onList} style={{ flex: 1, border: '1.5px solid #e4e1d8', borderRadius: 10, background: '#fff', color: INK, fontSize: 13.5, fontWeight: 800, padding: '5px 0', cursor: 'pointer' }}>リスト ＋</button>
        </>}
        {it.onTrash && <button onClick={it.onTrash} aria-label="ゴミ箱へ" style={{ ...gray, padding: '4px 10px' }}><span style={ms(18, '#b4645a')}>delete</span></button>}
        <button onClick={it.onRun || it.onStart} style={{ flex: it.kind === 'act' ? 1.1 : 1, border: 'none', borderRadius: 10, background: '#c4f000', color: '#2f3a00', fontSize: 14.5, fontWeight: 900, padding: '6px 0', cursor: 'pointer', letterSpacing: '.04em', boxShadow: '0 3px 10px rgba(122,154,0,.3)' }}>{it.kind === 'act' ? 'START' : 'ひらく'}</button>
      </div>
      {/* 右上の「編集」 */}
      {isAct && it.onEdit && <button onClick={() => { setPop(null); setEditing(true); }} style={{ position: 'absolute', top: 8, right: 10, zIndex: 2, border: '1.5px solid #e4e1d8', borderRadius: 999, background: '#fff', color: INK, fontSize: 11.5, fontWeight: 800, padding: '3px 11px', cursor: 'pointer', fontFamily: 'inherit' }}>編集</button>}
      {isAct && editing && <EditAct it={it} onClose={() => setEditing(false)} />}
      {isAct && pop && (
        <FreqPop key={pop} label={pop === 'req' ? '生活必須行動' : 'やりたいこと'} value={it[pop]}
          onSave={(f) => { it.onFreq(pop, f); setPop(null); }} onDelete={() => { it.onFreq(pop, null); setPop(null); }} onClose={() => setPop(null)} />
      )}
    </div>
  );
}

/* リストのカード（行動カードの右）: 名前（テンプレ名）・積んだ行動（並べ替え・削除）・予定／記録／START */
function ListCard({ v, onPick }) {
  const L = v.pickList;
  const empty = !L.rows.length, named = !!(L.name || '').trim();
  // 名前は入力してから「決定」で変える
  const [draft, setDraft] = React.useState(L.name || '');
  React.useEffect(() => { setDraft(L.name || ''); }, [L.name]);
  const dirty = draft !== (L.name || '');
  const gray = { border: 'none', borderRadius: 12, background: '#e4e1d8', color: '#55554e', fontSize: 14, fontWeight: 800, padding: '10px 14px', cursor: empty ? 'default' : 'pointer', opacity: empty ? 0.5 : 1 };
  const arrowBtn = (on) => ({ width: 26, height: 26, border: 'none', background: 'none', padding: 0, cursor: on ? 'pointer' : 'default', opacity: on ? 1 : 0.2, display: 'flex', alignItems: 'center', justifyContent: 'center' });
  const lab = { fontSize: 8.5, color: '#8a8a82', fontWeight: 700, marginRight: 1 };
  const num = { fontSize: 12, fontWeight: 800, color: INK, fontFamily: "'Space Mono',monospace" };
  return (
    // iOSのタップの青いハイライトは、並べ替えで行が動いたあとの場所に出て「別の行を押した」ように見えるので出さない（子要素にも継承される）
    <div style={{ position: 'relative', width: '100%', borderRadius: 18, overflow: 'hidden', background: '#fff', height: CARD_H, WebkitTapHighlightColor: 'transparent', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 10px rgba(27,27,24,.06)' }}>
      {/* 名前（テンプレでなくてもつけられる） */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px 6px' }}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && dirty) v.setListName({ target: { value: draft } }); }} placeholder="リストの名前" style={{ flex: 1, minWidth: 0, height: 32, border: 'none', borderRadius: 9, background: '#f3f0e8', padding: '0 10px', fontSize: 14, fontWeight: 800, color: INK, fontFamily: 'inherit', outline: 'none' }} />
        <button onClick={dirty ? () => v.setListName({ target: { value: draft } }) : undefined} style={{ height: 32, flex: '0 0 auto', border: 'none', borderRadius: 9, background: dirty ? INK : '#f3f0e8', color: dirty ? '#fff' : '#a5a39a', fontSize: 12.5, fontWeight: 800, padding: '0 11px', cursor: dirty ? 'pointer' : 'default', fontFamily: 'inherit' }}>決定</button>
        {!L.runMode && <button onClick={v.saveListTemplate} aria-label="テンプレに保存" disabled={empty} style={{ width: 32, height: 32, flex: '0 0 auto', border: 'none', borderRadius: 9, background: '#f3f0e8', cursor: empty ? 'default' : 'pointer', opacity: empty || !named ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><span style={ms(20, INK, !!L.tplKey)}>bookmark</span></button>}
      </div>
      <div className="nos" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 12px' }}>
        {empty && <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#a5a39a' }}>リストは空です</div>}
        {L.rows.map((r, i) => (
          <div key={r.uid} style={{ display: 'flex', alignItems: 'center', gap: 2, height: 40, background: '#f3f0e8', borderRadius: 10, padding: '0 4px 0 6px', marginBottom: 6, minWidth: 0 }}>
            {/* 左側（絵文字・名前・数値）をタップすると、その行動のカードを出す。右の矢印・×は押しても出さない */}
            <div onClick={() => onPick && onPick(r)} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6, height: '100%', cursor: 'pointer' }}>
              <span style={{ flex: '0 0 auto' }}><Emo e={r.glyph} size={26} /></span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
              <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, whiteSpace: 'nowrap', flex: '0 0 auto' }}>
                <span><span style={lab}>体</span><span style={num}>{sg(r.body)}</span></span>
                <span><span style={lab}>心</span><span style={num}>{sg(r.mind)}</span></span>
                <span style={{ fontSize: 9, color: '#8a8a82', fontWeight: 700 }}>/{r.minText}</span>
              </span>
            </div>
            <button onClick={r.onUp} aria-label="上へ" style={arrowBtn(i > 0)}><span style={ms(20, INK)}>arrow_upward</span></button>
            <button onClick={r.onDown} aria-label="下へ" style={arrowBtn(i < L.rows.length - 1)}><span style={ms(20, INK)}>arrow_downward</span></button>
            <button onClick={r.onRemove} aria-label="リストから外す" style={arrowBtn(true)}><span style={ms(19, '#b4645a')}>delete</span></button>
          </div>
        ))}
      </div>
      {L.runMode ? (
        // 実行中のリストを出しているとき: 実行画面へ戻るだけ
        <div style={{ padding: '8px 14px 14px' }}>
          <button onClick={v.goRun} style={{ width: '100%', border: 'none', borderRadius: 12, background: '#c4f000', color: '#2f3a00', fontSize: 15, fontWeight: 900, padding: '11px 0', cursor: 'pointer', boxShadow: '0 4px 12px rgba(122,154,0,.3)' }}>実行に戻る</button>
        </div>
      ) :
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px 14px' }}>
        <button onClick={empty ? undefined : v.listToConfirm} style={gray}>予定</button>
        <button onClick={empty ? undefined : v.listToConfirm} style={gray}>記録</button>
        <span style={{ flex: 1 }} />
        <button onClick={empty ? undefined : v.startListRun} style={{ flex: '0 0 44%', border: 'none', borderRadius: 12, background: empty ? '#e4e1d8' : '#c4f000', color: empty ? '#a5a39a' : '#2f3a00', fontSize: 15, fontWeight: 900, padding: '11px 0', cursor: empty ? 'default' : 'pointer', letterSpacing: '.04em', boxShadow: empty ? 'none' : '0 4px 12px rgba(122,154,0,.3)' }}>START</button>
      </div>}
    </div>
  );
}

/* リストの1行（高さは行動 ROW_H・カテゴリ CAT_H で固定。選択中は横に広げて目立たせるだけで高さは変えない＝スクロール位置から選択行を計算できる）
   カテゴリは細くして、閉じた状態でスクロールせずに一覧できるようにする */
const ROW_H = 60, CAT_H = 32, CAT_H_DARK = 32, COPIES = 5;
// dark(枠): カテゴリは白地＋黒字＋カテゴリ色の枠、左にカテゴリ色の四角（▶）
const hOfFor = (dark) => (r) => (r.type === 'item' ? ROW_H : dark ? CAT_H_DARK : CAT_H);
let hOf = hOfFor(false);
const Row = React.memo(function Row({ r, i, on, open, onTap, listAdd, dark }) {
  const color = r.type === 'addcat' ? '#55554e' : r.cat.color;
  return (
    <div onClick={() => onTap(r, i)} style={{ position: 'relative', height: hOf(r), display: 'flex', alignItems: 'center', padding: on ? '0 54px 0 30px' : '0 60px 0 42px', cursor: 'pointer', scrollSnapAlign: 'center', boxSizing: 'border-box' }}>
      {r.type === 'item' ? (
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, background: '#fff', borderRadius: 10, height: on ? 58 : 48, position: 'relative', overflow: 'hidden', paddingRight: 8, boxShadow: on ? '0 4px 14px rgba(27,27,24,.16)' : '0 1px 2px rgba(27,27,24,.05)' }}>
          <span style={{ position: 'absolute', left: 0, top: 0, width: on ? 48 : 40, height: on ? 48 : 40, background: color, clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
          <span style={{ position: 'relative', flex: '0 0 auto', marginLeft: 6 }}><Emo e={r.item.glyph} size={on ? 32 : 26} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: on ? 16.5 : 14.5, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.item.name}</div>
            {on && <FatNums it={r.item} big />}
          </div>
          {/* リストのカードを見ているときは、選択中の行動からそのままリストに足せる */}
          {listAdd && r.item.onList && (
            <button onClick={(e) => { e.stopPropagation(); r.item.onList(); }} style={{ flex: '0 0 auto', border: '1.5px solid ' + INK, borderRadius: 999, background: '#fff', color: INK, fontSize: 11, fontWeight: 800, padding: '3px 9px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>リスト ＋</button>
          )}
          {!on && <FatNums it={r.item} />}
        </div>
      ) : dark ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', height: on ? 30 : 26, borderRadius: 7, background: '#fff', border: '2px solid ' + color, overflow: 'hidden', boxSizing: 'border-box', boxShadow: on ? '0 4px 14px rgba(27,27,24,.18)' : '0 1px 2px rgba(27,27,24,.08)' }}>
          <span style={{ flex: on ? '0 0 34px' : '0 0 30px', alignSelf: 'stretch', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: on ? 11 : 9.5, color: r.type === 'addcat' ? '#fff' : (r.cat.ink || INK) }}>{r.type === 'addcat' ? '＋' : open ? '▼' : '▶'}</span>
          <span style={{ flex: 1, textAlign: 'center', fontSize: on ? 14.5 : 13, fontWeight: 800, color: INK, paddingRight: on ? 34 : 30, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.type === 'cat' ? r.cat.name : '大カテゴリを追加'}</span>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, height: on ? 30 : 26, borderRadius: 8, padding: '0 12px', background: color, color: r.type === 'cat' ? (r.cat.ink || '#fff') : '#fff', boxShadow: on ? '0 4px 14px rgba(27,27,24,.18)' : '0 1px 2px rgba(27,27,24,.08)' }}>
          <span style={{ fontSize: on ? 11 : 9.5 }}>{r.type === 'addcat' ? '＋' : open ? '▼' : '▶'}</span>
          <span style={{ flex: 1, textAlign: 'center', fontSize: on ? 14.5 : 13, fontWeight: 800, paddingRight: 20, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.type === 'cat' ? r.cat.name : '大カテゴリを追加'}</span>
        </div>
      )}
    </div>
  );
});

export default function Pick({ v }) {
  const cats = v.pickCats;
  // 選択と開閉は確認画面から戻っても残す（v.pickMem に覚えておく）
  const mem = v.pickMem;
  const [open, setOpen] = React.useState(() => mem.open || {});
  const [fil, setFil] = React.useState({});
  const [hist, setHistS] = React.useState(() => !!mem.hist); // りれき表示中は、選択が変わってもりれきのまま
  const setHist = (b) => { mem.hist = b; setHistS(b); };
  const [idx, setIdx] = React.useState(0); // 真ん中にある行（コピー込みの通し番号）
  const listRef = React.useRef(null);
  const want = React.useRef(mem.sel || null); // 次の描画で真ん中に置きたい行の key
  const endT = React.useRef(null);

  const dark = true; // カテゴリ行は常に「白地＋色の枠と左の四角」（色はマイページのやさしい／カラフル）
  hOf = hOfFor(dark);
  const rows = React.useMemo(() => {
    const out = [];
    // 右の「必」「♡」で絞り込み中は、生活必須行動・やりたいことの行動だけを（カテゴリを開かなくても）出す
    const filtering = fil.req || fil.fav;
    cats.forEach(c => {
      if (filtering) {
        const hit = c.items.filter(it => it.kind === 'act' && ((fil.req && it.req) || (fil.fav && it.fav)));
        if (!hit.length) return;
        out.push({ key: 'cat:' + c.id, type: 'cat', cat: c });
        hit.forEach(it => out.push({ key: it.key, type: 'item', cat: c, item: it }));
        return;
      }
      out.push({ key: 'cat:' + c.id, type: 'cat', cat: c });
      if (open[c.id]) c.items.forEach(it => out.push({ key: it.key, type: 'item', cat: c, item: it }));
    });
    if (!filtering && !v.pickShowHidden) out.push({ key: 'addcat', type: 'addcat' });
    if (!out.length) out.push({ key: 'addcat', type: 'addcat' });
    return out;
  }, [cats, open, fil, dark]);
  const N = rows.length;
  const selRow = rows[((idx % N) + N) % N];

  React.useEffect(() => { mem.sel = selRow && selRow.key; mem.open = open; }, [selRow, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // 行ごとの上端位置（1コピーぶん）。行の高さが種類で違うので累積で持つ
  const off = React.useMemo(() => { const o = [0]; rows.forEach(r => o.push(o[o.length - 1] + hOf(r))); return o; }, [rows]);
  const P = off[N]; // 1コピーの高さ
  const topOf = (i) => Math.floor(i / N) * P + off[((i % N) + N) % N];
  const topFor = (i) => { const box = listRef.current; return topOf(i) + hOf(rows[((i % N) + N) % N]) / 2 - (box ? box.clientHeight / 2 : 0); };
  const centerIdx = () => {
    const box = listRef.current; if (!box || !P) return 0;
    const y = box.scrollTop + box.clientHeight / 2, c = Math.floor(y / P), yy = y - c * P;
    let j = 0; while (j < N - 1 && off[j + 1] <= yy) j++;
    return c * N + j;
  };
  const scrollToIdx = (i, smooth) => {
    const box = listRef.current; if (!box) return;
    box.scrollTo({ top: topFor(i), behavior: smooth ? 'smooth' : 'auto' });
    setIdx(i);
  };

  // 開閉・初回: 指定の行（なければ今の行）をまんなかのコピーで中央に置く
  React.useLayoutEffect(() => {
    const k = want.current || mem.sel; // mem.sel はまだ開閉前の選択（この後の effect で更新される）
    want.current = null;
    let i = rows.findIndex(r => r.key === k); if (i < 0) i = 0;
    scrollToIdx(Math.floor(COPIES / 2) * N + i, false);
  }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  // カテゴリ追加・コピーして作る のあとは、そのカテゴリを開いて中央に
  React.useEffect(() => {
    if (v.pickCatId && cats.some(c => c.id === v.pickCatId)) { want.current = 'cat:' + v.pickCatId; setOpen(o => ({ ...o, [v.pickCatId]: true })); }
  }, [v.pickCatId]); // eslint-disable-line react-hooks/exhaustive-deps

  // スクロールが止まったら: 端のコピーにいればまんなかのコピーへ戻し（エンドレス）、行にぴったり合わせる
  const settle = () => {
    const box = listRef.current; if (!box) return;
    let i = centerIdx();
    const mid = Math.floor(COPIES / 2) * N;
    if (i < N || i >= (COPIES - 1) * N) { const ni = mid + (((i % N) + N) % N); box.scrollTop += ((ni - i) / N) * P; i = ni; }
    if (Math.abs(box.scrollTop - topFor(i)) > 1) box.scrollTo({ top: topFor(i), behavior: 'smooth' });
    setIdx(i);
  };
  const onScroll = () => {
    const i = centerIdx(); if (i !== idx) setIdx(i);
    clearTimeout(endT.current);
    endT.current = setTimeout(settle, 140);
  };

  const tap = (r, i) => {
    if (i !== idx) { scrollToIdx(i, true); return; }
    if (r.type === 'addcat') { v.openCatAdd(); return; }
    if (r.type === 'cat') { want.current = r.key; setOpen(o => ({ ...o, [r.cat.id]: !o[r.cat.id] })); return; }
    r.item.onStart();
  };
  const tapRef = React.useRef(tap); tapRef.current = tap;
  const onTap = React.useCallback((r, i) => tapRef.current(r, i), []);
  const move = (d) => scrollToIdx(idx + d, true);
  const anyClosed = cats.some(c => !open[c.id]);
  const toggleAll = () => {
    if (anyClosed) { const o = {}; cats.forEach(c => { o[c.id] = true; }); setOpen(o); return; }
    if (selRow && selRow.type === 'item') want.current = 'cat:' + selRow.cat.id;
    setOpen({});
  };
  const side = (on) => ({ width: 36, height: 36, borderRadius: 10, border: 'none', boxShadow: '0 1px 3px rgba(27,27,24,.08)', background: on ? INK : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, marginBottom: 10 });
  const arrow = { position: 'absolute', left: 8, zIndex: 2, width: 26, height: 26, border: 'none', background: 'none', cursor: 'pointer', padding: 0 };

  /* 上のカード: 左に行動カード、右にリストのカードの2枚（ループしない）。となりのカードの端が少しのぞく */
  const PAGES = ['A', 'L'];
  const pagerRef = React.useRef(null);
  const [page, setPage] = React.useState(() => (mem.page === 1 ? 1 : 0));
  const onList = PAGES[page] === 'L'; // いまリストのカードを見ているか
  const pageEls = () => (pagerRef.current ? [...pagerRef.current.querySelectorAll('[data-page]')] : []);
  const leftFor = (i) => { const el = pagerRef.current, p = pageEls()[i]; return el && p ? p.offsetLeft - (el.clientWidth - p.offsetWidth) / 2 : 0; };
  const goPage = (i, smooth) => { const el = pagerRef.current; if (!el) return; el.scrollTo({ left: leftFor(i), behavior: smooth ? 'smooth' : 'auto' }); setPage(i); mem.page = i; };
  const nearest = () => {
    const el = pagerRef.current; if (!el) return 0;
    const c = el.scrollLeft + el.clientWidth / 2; let best = 0, bd = Infinity;
    pageEls().forEach((p, i) => { const d = Math.abs(p.offsetLeft + p.offsetWidth / 2 - c); if (d < bd) { bd = d; best = i; } });
    return best;
  };
  const onPager = () => { const i = nearest(); if (i !== page) { setPage(i); mem.page = i; } };
  React.useLayoutEffect(() => { goPage(page, false); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // リストに積んだ・予定を開いたら、リストのカードへ（開いた直後は動かさない）
  const lastTick = React.useRef(v.pickList ? v.pickList.tick : 0);
  React.useEffect(() => {
    const t = v.pickList ? v.pickList.tick : 0;
    if (t === lastTick.current) return;
    lastTick.current = t;
    if (page !== 1) goPage(1, true);
  }, [v.pickList && v.pickList.tick]); // eslint-disable-line react-hooks/exhaustive-deps
  // リストの行をタップ: その行動のカードを出し、下のリストでもその行動を選ぶ
  const pickFromList = (r) => {
    let key = r.itemId ? 'act:' + r.itemId : null;
    if (!key) { const hit = cats.flatMap(c => c.items).find(it => it.kind === 'act' && it.name === r.name); if (hit) key = hit.key; }
    goPage(0, true);
    if (!key) return;
    const c = cats.find(cc => cc.items.some(it => it.key === key)); if (!c) return;
    mem.sel = key;
    if (!open[c.id]) { want.current = key; setOpen(o => ({ ...o, [c.id]: true })); return; }
    const i = rows.findIndex(x => x.key === key);
    if (i >= 0) scrollToIdx(Math.floor(COPIES / 2) * N + i, true);
  };

  const all = [];
  for (let c = 0; c < COPIES; c++) rows.forEach((r, i) => all.push({ r, i: c * N + i }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: '#f7f4ec' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '6px 16px 12px' }}>
        <button onClick={v.goHome} aria-label="もどる" style={{ width: 40, height: 40, borderRadius: 8, border: 'none', background: '#e4e1d8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><span style={ms(26, INK, true)}>arrow_back</span></button>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{v.pickDateText}</div>
        <SlotPill v={v} small />
      </div>
      {/* 左に行動カード、右にリストのカード（横にスワイプ。となりのカードの端がのぞく）。
          端の余白は padding だと右端が scrollWidth に入らないので、前後のすき間の要素で作る */}
      <div ref={pagerRef} onScroll={onPager} className="nos" style={{ position: 'relative', display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', flex: '0 0 auto', overscrollBehaviorX: 'contain' }}>
        <div style={{ flex: '0 0 26px' }} />
        {PAGES.map((t, i) => (
          <div key={i} data-page={i} style={{ flex: '0 0 calc(100% - 52px)', minWidth: 0, marginLeft: i ? 10 : 0, scrollSnapAlign: 'center', scrollSnapStop: 'always' }}>
            {t === 'A'
              ? <Card key={'a' + i + (selRow ? selRow.key : '')} row={selRow} cat={selRow && selRow.cat} v={v} hist={hist} setHist={setHist} />
              : (v.pickList ? <ListCard v={v} onPick={pickFromList} /> : null)}
          </div>
        ))}
        <div style={{ flex: '0 0 26px' }} />
      </div>
      <div style={{ position: 'relative', flex: 1, minHeight: 0, marginTop: 10, background: '#f7f4ec', overflow: 'hidden' }}>
        {/* まんなか＝選択中の印 */}
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 2, width: 0, height: 0, borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderLeft: '12px solid ' + INK, pointerEvents: 'none' }} />
        <button onClick={() => move(-1)} aria-label="上へ" style={{ ...arrow, top: 12 }}><span style={ms(24, '#8a8a82')}>keyboard_arrow_up</span></button>
        <button onClick={() => move(1)} aria-label="下へ" style={{ ...arrow, bottom: 12 }}><span style={ms(24, '#8a8a82')}>keyboard_arrow_down</span></button>
        <div style={{ position: 'absolute', right: 14, top: 36, zIndex: 2, display: 'flex', flexDirection: 'column' }}>
          <button onClick={v.openSearch} aria-label="しらべる" style={side(false)}><span style={ms(22, INK)}>search</span></button>
          <button onClick={toggleAll} aria-label={anyClosed ? 'カテゴリを全部開く' : 'カテゴリを全部閉じる'} style={side(false)}><span style={ms(22, INK)}>{anyClosed ? 'unfold_more' : 'unfold_less'}</span></button>
          <button onClick={() => setFil(f => ({ ...f, req: !f.req }))} aria-label="必須" style={side(fil.req)}><span style={{ fontSize: 17, fontWeight: 900, color: fil.req ? '#fff' : INK }}>必</span></button>
          <button onClick={() => setFil(f => ({ ...f, fav: !f.fav }))} aria-label="お気に入り" style={side(fil.fav)}><span style={ms(20, fil.fav ? '#fff' : INK, fil.fav)}>favorite</span></button>
          {/* 表示中の行動 ⇄ 非表示の行動 の切り替え（非表示にする／戻すのは、カードの「編集」から） */}
          <button onClick={v.togglePickHidden} aria-label={v.pickShowHidden ? '表示中の行動を見る' : '非表示の行動を見る'} style={side(v.pickShowHidden)}><span style={ms(20, v.pickShowHidden ? '#fff' : INK)}>{v.pickShowHidden ? 'visibility_off' : 'visibility'}</span></button>
        </div>
        <div ref={listRef} onScroll={onScroll} className="nos" style={{ position: 'absolute', inset: 0, overflowY: 'auto', scrollSnapType: 'y mandatory', overscrollBehavior: 'contain' }}>
          {all.map(({ r, i }) => (
            <Row key={i} r={r} i={i} on={i === idx} dark={dark} open={r.type === 'cat' && !!open[r.cat.id]} onTap={onTap} listAdd={(onList || v.runAdd) && i === idx} />
          ))}
        </div>
      </div>
    </div>
  );
}
