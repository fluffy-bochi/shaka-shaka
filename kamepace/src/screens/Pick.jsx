import React from 'react';
import SlotPill from './SlotPill';
import Emo from '../fluent';

/* 行動選択（記録の入口）: 上に選択中のカード、下にカテゴリ＋行動のリスト。
   カテゴリは選択中にもう一度タップすると開く（開いていれば閉じる）。右の列は 検索 / 全部開閉 / 必須 / お気に入り（必須・お気に入りは見た目のみ）。
   START・予定・記録・リストは、いまは全部「時間を選ぶ画面（確認）」へ進む。 */
const INK = '#1b1b18';
const ms = (size, color, fill = false) => ({ fontFamily: 'Material Symbols Rounded', fontVariationSettings: fill ? "'FILL' 1" : "'FILL' 0", fontSize: size, color, lineHeight: 1 });
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

/* 上のカード */
function Card({ row, cat, v }) {
  const wrap = { position: 'relative', margin: '0 16px', borderRadius: 18, overflow: 'hidden', background: '#fff', minHeight: 230, display: 'flex', flexDirection: 'column', boxShadow: '0 2px 10px rgba(27,27,24,.06)' };
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
  const parts = isAct ? it.prefParts[it.pref] : null;
  const chip = { display: 'inline-flex', alignItems: 'center', gap: 3, height: 26, background: '#efece3', borderRadius: 999, padding: '0 8px', fontSize: 11, fontWeight: 700, color: INK };
  const gray = { border: 'none', borderRadius: 12, background: '#efece3', color: '#55554e', fontSize: 14, fontWeight: 800, padding: '10px 14px', cursor: 'pointer' };
  return (
    <div style={wrap}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: '46%', height: 150, background: cat.color, clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
      <span style={{ position: 'absolute', left: 14, top: 10, fontSize: 13, fontWeight: 800, color: '#fff' }}>{cat.name}</span>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14, padding: '30px 16px 10px 22px', flex: 1 }}>
        <span style={{ flex: '0 0 auto' }}><Emo e={it.glyph} size={92} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: it.name.length > 9 ? 17 : 23, fontWeight: 900, lineHeight: 1.3, wordBreak: 'break-all' }}>{it.name}</div>
          {isAct && (
            <div style={{ display: 'flex', gap: 5, marginTop: 10, flexWrap: 'wrap' }}>
              <span style={{ ...chip, fontSize: 13, fontWeight: 900 }}>必</span>
              <span style={chip}><span style={ms(15, INK, true)}>favorite</span></span>
              <span style={chip}>りれき<span style={ms(15, INK)}>list</span><span style={ms(15, INK)}>calendar_month</span></span>
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
const ROW_H = 56, COPIES = 5;
const Row = React.memo(function Row({ r, i, on, open, onTap }) {
  const color = r.type === 'addcat' ? '#55554e' : r.cat.color;
  return (
    <div onClick={() => onTap(r, i)} style={{ height: ROW_H, display: 'flex', alignItems: 'center', padding: on ? '0 60px 0 62px' : '0 76px', cursor: 'pointer', scrollSnapAlign: 'center', boxSizing: 'border-box' }}>
      {r.type === 'item' ? (
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, background: '#fff', borderRadius: 10, height: on ? 54 : 44, position: 'relative', overflow: 'hidden', paddingRight: 8, boxShadow: on ? '0 4px 14px rgba(27,27,24,.16)' : '0 1px 2px rgba(27,27,24,.05)' }}>
          <span style={{ position: 'absolute', left: 0, top: 0, width: on ? 46 : 38, height: on ? 46 : 38, background: color, clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
          <span style={{ position: 'relative', flex: '0 0 auto', marginLeft: 6 }}><Emo e={r.item.glyph} size={on ? 32 : 26} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: on ? 16.5 : 14.5, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.item.name}</div>
            {on && <FatNums it={r.item} big />}
          </div>
          {!on && <FatNums it={r.item} />}
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, height: on ? 52 : 42, borderRadius: 10, padding: '0 14px', background: color, color: '#fff', boxShadow: on ? '0 4px 14px rgba(27,27,24,.18)' : '0 1px 2px rgba(27,27,24,.08)' }}>
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
  const [idx, setIdx] = React.useState(0); // 真ん中にある行（コピー込みの通し番号）
  const listRef = React.useRef(null);
  const want = React.useRef(mem.sel || null); // 次の描画で真ん中に置きたい行の key
  const gesture = React.useRef({ peak: 0, lastT: 0, lastY: 0, dir: 0 });
  const endT = React.useRef(null);
  const busy = React.useRef(0); // この時刻まではプログラムでスクロール中（スナップの再判定をしない）

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
    if (smooth) busy.current = performance.now() + 700;
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

  // スクロールが止まったら: 端のコピーにいればまんなかのコピーへ戻し（エンドレス）、行かカテゴリにスナップ
  const settle = () => {
    const box = listRef.current; if (!box) return;
    const g = gesture.current;
    let i = centerIdx();
    const mid = Math.floor(COPIES / 2) * N;
    if (i < N || i >= (COPIES - 1) * N) { const ni = mid + (((i % N) + N) % N); box.scrollTop += (ni - i) * ROW_H; i = ni; }
    const anyOpen = cats.some(c => open[c.id]);
    if (performance.now() > busy.current && anyOpen && g.peak > 1.6 && g.dir) {
      // 速くスクロールしたら、進んだ向きの次のカテゴリを中央へ
      let j = i;
      for (let k = 0; k < N; k++) { const r = rows[(((i + g.dir * k) % N) + N) % N]; if (r.type === 'cat') { j = i + g.dir * k; break; } }
      g.peak = 0; g.dir = 0;
      if (j !== i || Math.abs(box.scrollTop - topFor(i)) > 1) { scrollToIdx(j, true); return; }
    }
    g.peak = 0; g.dir = 0;
    if (Math.abs(box.scrollTop - topFor(i)) > 1) { busy.current = performance.now() + 500; box.scrollTo({ top: topFor(i), behavior: 'smooth' }); }
    setIdx(i);
  };
  const onScroll = () => {
    const box = listRef.current; if (!box) return;
    const now = performance.now(), g = gesture.current;
    if (g.lastT) {
      const dt = now - g.lastT, dy = box.scrollTop - g.lastY;
      if (dt > 0 && dt < 100) { const sp = Math.abs(dy) / dt; if (sp > g.peak) g.peak = sp; if (Math.abs(dy) > 2) g.dir = dy > 0 ? 1 : -1; }
    }
    g.lastT = now; g.lastY = box.scrollTop;
    const i = centerIdx(); if (i !== idx) setIdx(i);
    clearTimeout(endT.current);
    endT.current = setTimeout(() => { g.lastT = 0; settle(); }, 140);
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
  const arrow = { position: 'absolute', left: 14, zIndex: 2, width: 36, height: 36, border: 'none', background: 'none', cursor: 'pointer', padding: 0 };

  const all = [];
  for (let c = 0; c < COPIES; c++) rows.forEach((r, i) => all.push({ r, i: c * N + i }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: '#f7f4ec' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '6px 16px 12px' }}>
        <button onClick={v.goHome} aria-label="もどる" style={{ width: 40, height: 40, borderRadius: 8, border: 'none', background: '#e4e1d8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><span style={ms(26, INK, true)}>arrow_back</span></button>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{v.pickDateText}</div>
        <SlotPill v={v} small />
      </div>
      <Card row={selRow} cat={selRow && selRow.cat} v={v} />
      <div style={{ position: 'relative', flex: 1, minHeight: 0, marginTop: 14, background: '#efece3', borderRadius: '22px 22px 0 0', overflow: 'hidden' }}>
        {/* まんなか＝選択中の印 */}
        <span style={{ position: 'absolute', left: 22, top: '50%', transform: 'translateY(-50%)', zIndex: 2, width: 0, height: 0, borderTop: '13px solid transparent', borderBottom: '13px solid transparent', borderLeft: '20px solid ' + INK, pointerEvents: 'none' }} />
        <button onClick={() => move(-1)} aria-label="上へ" style={{ ...arrow, top: 12 }}><span style={ms(34, '#8a8a82')}>keyboard_arrow_up</span></button>
        <button onClick={() => move(1)} aria-label="下へ" style={{ ...arrow, bottom: 12 }}><span style={ms(34, '#8a8a82')}>keyboard_arrow_down</span></button>
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
