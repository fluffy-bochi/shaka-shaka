import React from 'react';
import SlotPill from './SlotPill';
import Emo from '../fluent';

/* 行動選択（記録の入口）: 上に選択中のカード、下にカテゴリ＋行動のリスト。
   カテゴリは選択中にもう一度タップすると開く（開いていれば閉じる）。右の列は 検索 / 全部開閉 / 必須 / お気に入り（必須・お気に入りは見た目のみ）。
   START・予定・記録・リストは、いまは全部「時間を選ぶ画面（確認）」へ進む。 */
const INK = '#1b1b18';
const ms = (size, color, fill = false) => ({ fontFamily: 'Material Symbols Rounded', fontVariationSettings: fill ? "'FILL' 1" : "'FILL' 0", fontSize: size, color, lineHeight: 1 });
const CARD_H = 252; // 上のカードの高さはカテゴリ・行動・予定で共通（切り替わってもリストの位置が動かないように）
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

/* りれき: 月カレンダー＋その月の 回数（目標に対して）・目標頻度・合計時間・平均時間 */
const fmtMin = (m) => (m < 60 ? m + '分' : Math.floor(m / 60) + '時間' + (m % 60 ? (m % 60) + '分' : ''));
function History({ it, cat, onClose }) {
  const [off, setOff] = React.useState(0);
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth() + off, 1);
  const y = base.getFullYear(), mo = base.getMonth();
  const ym = y + '-' + String(mo + 1).padStart(2, '0');
  const h = it.history(ym);
  const dim = new Date(y, mo + 1, 0).getDate();
  const target = it.goal ? Math.round(it.goal * dim / 7) : 0; // 週n回 → この月の目標回数
  const lead = (base.getDay() + 6) % 7; // 月曜はじまり
  const weeks = Math.ceil((lead + dim) / 7);
  const cells = [];
  for (let i = 0; i < weeks * 7; i++) cells.push(new Date(y, mo, i - lead + 1));
  const isToday = (d) => d.toDateString() === now.toDateString();
  const cellH = weeks > 5 ? 21 : 26;
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
        <button onClick={onClose} aria-label="もどる" style={{ ...navBtn, marginLeft: 4 }}><span style={ms(20, INK)}>undo</span></button>
      </div>
      <div style={{ display: 'flex', gap: 5, margin: '5px 0 6px' }}>
        <div style={{ ...stat, flex: 1.15 }}>
          <span style={lab}>回数</span>
          <span style={val}>{h.count}{target ? <span style={{ fontSize: 10, color: '#8a8a82' }}> / {target}回</span> : '回'}</span>
          {target > 0 && <span style={{ height: 3, borderRadius: 2, background: '#e4e1d8', marginTop: 2, overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: Math.min(100, Math.round(h.count / target * 100)) + '%', background: h.count >= target ? '#7a9a00' : '#c4f000' }} /></span>}
        </div>
        <button onClick={it.onGoal} style={{ ...stat, border: '1.5px dashed ' + (it.goal ? 'transparent' : '#d8d5cb'), cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
          <span style={lab}>目標</span>
          <span style={{ ...val, color: it.goal ? INK : '#a5a39a', fontSize: it.goal ? 13 : 11.5 }}>{it.goal ? '週' + it.goal + '回' : '未設定'}</span>
        </button>
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
  const wrap = { position: 'relative', margin: '0 16px', borderRadius: 18, overflow: 'hidden', background: '#fff', height: CARD_H, flex: '0 0 auto', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 10px rgba(27,27,24,.06)' };
  if (!row) return <div style={wrap} />;
  if (row.type === 'cat' || row.type === 'addcat') {
    const color = row.type === 'cat' ? cat.color : '#55554e';
    return (
      <div style={{ ...wrap, background: color, justifyContent: 'center' }}>
        <span style={{ position: 'absolute', left: 16, top: 12, fontSize: 13, fontWeight: 800, color: '#fff' }}>{row.type === 'cat' ? 'カテゴリ' : '追加'}</span>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22 }}>
          {row.type === 'cat' ? <Emo e={cat.glyph} size={64} /> : <span style={ms(56, '#fff')}>add</span>}
          <span style={{ fontSize: 24, fontWeight: 900, color: '#fff' }}>{row.type === 'cat' ? cat.name : '大カテゴリを追加'}</span>
        </div>
      </div>
    );
  }
  const it = row.item;
  const isAct = it.kind === 'act';
  if (isAct && hist) return <div ref={ref} style={wrap}><History it={it} cat={cat} onClose={() => flip(false)} /></div>;
  const parts = isAct ? it.prefParts[it.pref] : null;
  const chip = { display: 'inline-flex', alignItems: 'center', gap: 3, height: 26, background: '#efece3', borderRadius: 999, padding: '0 8px', fontSize: 11, fontWeight: 700, color: INK };
  const gray = { border: 'none', borderRadius: 12, background: '#efece3', color: '#55554e', fontSize: 14, fontWeight: 800, padding: '10px 14px', cursor: 'pointer' };
  return (
    <div ref={ref} style={wrap}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: '46%', height: 150, background: cat.color, clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
      <span style={{ position: 'absolute', left: 14, top: 10, fontSize: 13, fontWeight: 800, color: '#fff' }}>{cat.name}</span>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14, padding: '30px 16px 10px 22px', flex: 1, minHeight: 0 }}>
        <span style={{ flex: '0 0 auto' }}><Emo e={it.glyph} size={92} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: it.name.length > 9 ? 17 : 23, fontWeight: 900, lineHeight: 1.3, wordBreak: 'break-all', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{it.name}</div>
          {isAct && (
            <div style={{ display: 'flex', gap: 5, marginTop: 10, flexWrap: 'wrap' }}>
              <span style={{ ...chip, fontSize: 13, fontWeight: 900 }}>必</span>
              <span style={chip}><span style={ms(15, INK, true)}>favorite</span></span>
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px 14px' }}>
        {it.kind === 'act' && <>
          <button onClick={it.onStart} style={gray}>予定</button>
          <button onClick={it.onStart} style={gray}>記録</button>
          <button onClick={it.onStart} style={{ flex: 1, border: '1.5px solid #e4e1d8', borderRadius: 12, background: '#fff', color: INK, fontSize: 14, fontWeight: 800, padding: '9px 0', cursor: 'pointer' }}>リスト ＋</button>
        </>}
        {it.onTrash && <button onClick={it.onTrash} aria-label="ゴミ箱へ" style={{ ...gray, padding: '8px 10px' }}><span style={ms(18, '#b4645a')}>delete</span></button>}
        <button onClick={it.onStart} style={{ flex: it.kind === 'act' ? 1.1 : 1, border: 'none', borderRadius: 12, background: '#c4f000', color: '#2f3a00', fontSize: 15, fontWeight: 900, padding: '11px 0', cursor: 'pointer', letterSpacing: '.04em', boxShadow: '0 4px 12px rgba(122,154,0,.3)' }}>{it.kind === 'act' ? 'START' : 'ひらく'}</button>
      </div>
    </div>
  );
}

/* リストの1行（高さは全行共通の ROW_H。選択中は横に広げて目立たせるだけで高さは変えない＝スクロール位置から選択行を計算できる） */
const ROW_H = 60, COPIES = 5;
const Row = React.memo(function Row({ r, i, on, open, onTap }) {
  const color = r.type === 'addcat' ? '#55554e' : r.cat.color;
  return (
    <div onClick={() => onTap(r, i)} style={{ height: ROW_H, display: 'flex', alignItems: 'center', padding: on ? '0 54px 0 30px' : '0 60px 0 42px', cursor: 'pointer', scrollSnapAlign: 'center', boxSizing: 'border-box' }}>
      {r.type === 'item' ? (
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, background: '#fff', borderRadius: 10, height: on ? 58 : 48, position: 'relative', overflow: 'hidden', paddingRight: 8, boxShadow: on ? '0 4px 14px rgba(27,27,24,.16)' : '0 1px 2px rgba(27,27,24,.05)' }}>
          <span style={{ position: 'absolute', left: 0, top: 0, width: on ? 48 : 40, height: on ? 48 : 40, background: color, clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
          <span style={{ position: 'relative', flex: '0 0 auto', marginLeft: 6 }}><Emo e={r.item.glyph} size={on ? 32 : 26} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: on ? 16.5 : 14.5, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.item.name}</div>
            {on && <FatNums it={r.item} big />}
          </div>
          {!on && <FatNums it={r.item} />}
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, height: on ? 58 : 48, borderRadius: 10, padding: '0 14px', background: color, color: '#fff', boxShadow: on ? '0 4px 14px rgba(27,27,24,.18)' : '0 1px 2px rgba(27,27,24,.08)' }}>
          <span style={{ fontSize: on ? 16 : 13 }}>{r.type === 'addcat' ? '＋' : open ? '▼' : '▶'}</span>
          <span style={{ flex: 1, textAlign: 'center', fontSize: on ? 18.5 : 15.5, fontWeight: 800, paddingRight: 20 }}>{r.type === 'cat' ? r.cat.name : '大カテゴリを追加'}</span>
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

  const rows = React.useMemo(() => {
    const out = [];
    cats.forEach(c => {
      out.push({ key: 'cat:' + c.id, type: 'cat', cat: c });
      if (open[c.id]) c.items.forEach(it => out.push({ key: it.key, type: 'item', cat: c, item: it }));
    });
    out.push({ key: 'addcat', type: 'addcat' });
    return out;
  }, [cats, open]);
  const N = rows.length;
  const selRow = rows[((idx % N) + N) % N];

  React.useEffect(() => { mem.sel = selRow && selRow.key; mem.open = open; }, [selRow, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const topFor = (i) => { const box = listRef.current; return i * ROW_H + ROW_H / 2 - (box ? box.clientHeight / 2 : 0); };
  const centerIdx = () => { const box = listRef.current; return box ? Math.floor((box.scrollTop + box.clientHeight / 2) / ROW_H) : 0; };
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
    if (i < N || i >= (COPIES - 1) * N) { const ni = mid + (((i % N) + N) % N); box.scrollTop += (ni - i) * ROW_H; i = ni; }
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

  const all = [];
  for (let c = 0; c < COPIES; c++) rows.forEach((r, i) => all.push({ r, i: c * N + i }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: '#f7f4ec' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '6px 16px 12px' }}>
        <button onClick={v.goHome} aria-label="もどる" style={{ width: 40, height: 40, borderRadius: 8, border: 'none', background: '#e4e1d8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><span style={ms(26, INK, true)}>arrow_back</span></button>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{v.pickDateText}</div>
        <SlotPill v={v} small />
      </div>
      <Card key={selRow && selRow.key} row={selRow} cat={selRow && selRow.cat} v={v} hist={hist} setHist={setHist} />
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
        </div>
        <div ref={listRef} onScroll={onScroll} className="nos" style={{ position: 'absolute', inset: 0, overflowY: 'auto', scrollSnapType: 'y mandatory', overscrollBehavior: 'contain' }}>
          {all.map(({ r, i }) => (
            <Row key={i} r={r} i={i} on={i === idx} open={r.type === 'cat' && !!open[r.cat.id]} onTap={onTap} />
          ))}
        </div>
      </div>
    </div>
  );
}
