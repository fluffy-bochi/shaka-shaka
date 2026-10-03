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

export default function Pick({ v }) {
  const cats = v.pickCats;
  // 選択と開閉は確認画面から戻っても残す（v.pickMem に覚えておく）
  const mem = v.pickMem;
  const [sel, setSel] = React.useState(() => mem.sel || (cats[0] ? 'cat:' + cats[0].id : null));
  const [open, setOpen] = React.useState(() => mem.open || {});
  React.useEffect(() => { mem.sel = sel; mem.open = open; }, [sel, open]); // eslint-disable-line react-hooks/exhaustive-deps
  const [fil, setFil] = React.useState({});
  const listRef = React.useRef(null);

  // カテゴリ追加・コピーして作る のあとは、そのカテゴリを開いて選ぶ
  React.useEffect(() => {
    if (v.pickCatId && cats.some(c => c.id === v.pickCatId)) { setOpen(o => ({ ...o, [v.pickCatId]: true })); setSel('cat:' + v.pickCatId); }
  }, [v.pickCatId]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = [];
  cats.forEach(c => {
    rows.push({ key: 'cat:' + c.id, type: 'cat', cat: c });
    if (open[c.id]) c.items.forEach(it => rows.push({ key: it.key, type: 'item', cat: c, item: it }));
  });
  rows.push({ key: 'addcat', type: 'addcat' });
  const selRow = rows.find(r => r.key === sel) || rows[0];
  const selIdx = rows.indexOf(selRow);

  // 選択中の行をリストのまんなかに寄せる
  React.useEffect(() => {
    const box = listRef.current; if (!box) return;
    const el = box.querySelector('[data-k="' + (selRow && selRow.key) + '"]'); if (!el) return;
    box.scrollTo({ top: el.offsetTop - box.clientHeight / 2 + el.offsetHeight / 2, behavior: 'smooth' });
  }, [sel, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const tap = (r) => {
    if (r.type === 'addcat') { if (sel === r.key) v.openCatAdd(); else setSel(r.key); return; }
    if (r.type === 'cat') { if (sel === r.key) setOpen(o => ({ ...o, [r.cat.id]: !o[r.cat.id] })); else setSel(r.key); return; }
    if (sel === r.key) r.item.onStart(); else setSel(r.key);
  };
  const move = (d) => { const n = rows[Math.max(0, Math.min(rows.length - 1, selIdx + d))]; if (n) setSel(n.key); };
  const anyClosed = cats.some(c => !open[c.id]);
  const toggleAll = () => {
    if (anyClosed) { const o = {}; cats.forEach(c => { o[c.id] = true; }); setOpen(o); return; }
    setOpen({});
    if (selRow && selRow.type === 'item') setSel('cat:' + selRow.cat.id);
  };
  const side = (on) => ({ width: 36, height: 36, borderRadius: 10, border: 'none', boxShadow: '0 1px 3px rgba(27,27,24,.08)', background: on ? INK : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, marginBottom: 10 });
  const arrow = { position: 'absolute', left: 14, zIndex: 2, width: 36, height: 36, border: 'none', background: 'none', cursor: 'pointer', padding: 0 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: '#f7f4ec' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '6px 16px 14px' }}>
        <button onClick={v.goHome} aria-label="もどる" style={{ width: 40, height: 40, borderRadius: 8, border: 'none', background: '#e4e1d8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><span style={ms(26, INK, true)}>arrow_back</span></button>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{v.pickDateText}</div>
        <SlotPill v={v} small />
      </div>
      <Card row={selRow} cat={selRow && selRow.cat} v={v} />
      <div style={{ position: 'relative', flex: 1, minHeight: 0, marginTop: 14, background: '#efece3', borderRadius: '22px 22px 0 0', containerType: 'size' }}>
        <button onClick={() => move(-1)} aria-label="上へ" style={{ ...arrow, top: 12 }}><span style={ms(34, '#8a8a82')}>keyboard_arrow_up</span></button>
        <button onClick={() => move(1)} aria-label="下へ" style={{ ...arrow, bottom: 12 }}><span style={ms(34, '#8a8a82')}>keyboard_arrow_down</span></button>
        <div style={{ position: 'absolute', right: 14, top: 36, zIndex: 2, display: 'flex', flexDirection: 'column' }}>
          <button onClick={v.openSearch} aria-label="しらべる" style={side(false)}><span style={ms(22, INK)}>search</span></button>
          <button onClick={toggleAll} aria-label={anyClosed ? 'カテゴリを全部開く' : 'カテゴリを全部閉じる'} style={side(false)}><span style={ms(22, INK)}>{anyClosed ? 'unfold_more' : 'unfold_less'}</span></button>
          <button onClick={() => setFil(f => ({ ...f, req: !f.req }))} aria-label="必須" style={side(fil.req)}><span style={{ fontSize: 17, fontWeight: 900, color: fil.req ? '#fff' : INK }}>必</span></button>
          <button onClick={() => setFil(f => ({ ...f, fav: !f.fav }))} aria-label="お気に入り" style={side(fil.fav)}><span style={ms(20, fil.fav ? '#fff' : INK, fil.fav)}>favorite</span></button>
        </div>
        <div ref={listRef} className="nos" style={{ position: 'absolute', inset: 0, overflowY: 'auto' }}>
          {/* 先頭・末尾の行もまんなかまで寄せられるように、上下にリスト領域の半分の余白 */}
          <div style={{ height: 'calc(50cqh - 30px)' }} />
          {rows.map(r => {
            const on = r.key === selRow.key;
            const color = r.type === 'cat' ? r.cat.color : r.type === 'item' ? r.cat.color : '#55554e';
            return (
              <div key={r.key} data-k={r.key} onClick={() => tap(r)} style={{ position: 'relative', display: 'flex', alignItems: 'center', padding: on ? '6px 62px 6px 62px' : '5px 76px 5px 76px', cursor: 'pointer' }}>
                {on && <span style={{ position: 'absolute', left: 22, top: '50%', transform: 'translateY(-50%)', width: 0, height: 0, borderTop: '13px solid transparent', borderBottom: '13px solid transparent', borderLeft: '20px solid ' + INK }} />}
                {r.type === 'item' ? (
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, background: '#fff', borderRadius: 10, height: on ? 60 : 42, position: 'relative', overflow: 'hidden', paddingRight: 8, boxShadow: on ? '0 4px 14px rgba(27,27,24,.16)' : '0 1px 2px rgba(27,27,24,.05)' }}>
                    <span style={{ position: 'absolute', left: 0, top: 0, width: on ? 48 : 38, height: on ? 48 : 38, background: color, clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
                    <span style={{ position: 'relative', flex: '0 0 auto', marginLeft: 6 }}><Emo e={r.item.glyph} size={on ? 34 : 26} /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: on ? 17 : 14.5, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.item.name}</div>
                      {on && <FatNums it={r.item} big />}
                    </div>
                    {!on && <FatNums it={r.item} />}
                  </div>
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, height: on ? 58 : 40, borderRadius: 10, padding: '0 14px', background: r.type === 'cat' && (on || open[r.cat.id]) ? color : r.type === 'addcat' && on ? INK : '#fff', color: (r.type === 'cat' && (on || open[r.cat.id])) || (r.type === 'addcat' && on) ? '#fff' : INK, boxShadow: on ? '0 4px 14px rgba(27,27,24,.16)' : '0 1px 2px rgba(27,27,24,.05)' }}>
                    <span style={{ fontSize: on ? 18 : 13, color: r.type === 'cat' && !on && !open[r.cat.id] ? color : undefined }}>{r.type === 'addcat' ? '＋' : open[r.cat.id] ? '▼' : '▶'}</span>
                    <span style={{ flex: 1, textAlign: 'center', fontSize: on ? 19 : 15.5, fontWeight: 800, paddingRight: 20 }}>{r.type === 'cat' ? r.cat.name : '大カテゴリを追加'}</span>
                  </div>
                )}
              </div>
            );
          })}
          <div style={{ height: 'calc(50cqh - 30px)' }} />
        </div>
      </div>
    </div>
  );
}
