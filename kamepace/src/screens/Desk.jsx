import React from 'react';

/* PC の横画面（机）: 画面（本棚・行動選択・実行中・ホーム・シャカ）を横に並べる。
   - 画面を長押し（0.6秒）→ ドラッグで並べかえ。左のサイドバーに落とすと、しまう（サイドバーのアイコンを押すと戻る）
   - 画面と画面のあいだの線をドラッグで、幅を変える
   並び・しまったもの・幅は端末に覚える（kame_desk_layout）。
   長押しで自分のメニューを出す行（ホームの記録・行動選択の行）は data-ownlong をつけてあり、そちらを優先する */
const KEY = 'kame_desk_layout';
const DEF = { order: ['book', 'record', 'run', 'home', 'shaka'], hidden: [], w: {} };
const MIN_W = 240;
const load = () => {
  try {
    const x = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!x || !Array.isArray(x.order)) return DEF;
    const order = [...x.order.filter(k => DEF.order.includes(k)), ...DEF.order.filter(k => !x.order.includes(k))];
    return { order, hidden: (x.hidden || []).filter(k => DEF.order.includes(k)), w: x.w || {} };
  } catch (e) { return DEF; }
};
const save = (L) => { try { localStorage.setItem(KEY, JSON.stringify(L)); } catch (e) { /* ignore */ } };
const ms = (size, color) => ({ fontFamily: 'Material Symbols Rounded', fontSize: size, color, lineHeight: 1 });

export default function Desk({ cols, railTop, runAlarm }) {
  const [L, setL0] = React.useState(load);
  const setL = (f) => setL0(prev => { const n = typeof f === 'function' ? f(prev) : f; save(n); return n; });
  const [drag, setDrag] = React.useState(null); // { key, x, y, at: 差しこむ位置 | 'rail' }
  const colRefs = React.useRef({}), railRef = React.useRef(null), lp = React.useRef(null);
  const byKey = Object.fromEntries(cols.map(c => [c.key, c]));
  const visible = L.order.filter(k => byKey[k] && byKey[k].avail && !L.hidden.includes(k));
  const stowed = L.order.filter(k => byKey[k] && byKey[k].avail && L.hidden.includes(k));
  const wOf = (k) => L.w[k] || 1;

  /* ---- 長押しでドラッグ ---- */
  const where = (x, y, key) => {
    const rr = railRef.current && railRef.current.getBoundingClientRect();
    if (rr && x < rr.right + 8) return 'rail';
    const ks = visible.filter(k => k !== key);
    let at = ks.length;
    for (let i = 0; i < ks.length; i++) { const el = colRefs.current[ks[i]]; if (!el) continue; const r = el.getBoundingClientRect(); if (x < r.left + r.width / 2) { at = i; break; } }
    return at;
  };
  const startDrag = (key, x, y) => {
    try { if (navigator.vibrate) navigator.vibrate(15); } catch (e) { /* ignore */ }
    document.body.classList.add('kame-desk-dragging');
    const st = { key, x, y, at: where(x, y, key) };
    setDrag(st);
    const move = (e) => { st.x = e.clientX; st.y = e.clientY; st.at = where(e.clientX, e.clientY, key); setDrag({ ...st }); };
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      document.body.classList.remove('kame-desk-dragging');
      // 長押しのあとの click は押したことにしない
      const stop = (e) => { e.stopPropagation(); e.preventDefault(); };
      window.addEventListener('click', stop, { capture: true, once: true }); setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 300);
      setDrag(null);
      if (st.at === 'rail') { setL(p => ({ ...p, hidden: [...p.hidden.filter(k => k !== key), key] })); return; }
      setL(p => {
        // 見えている画面の並びの中で key を at に入れ、見えていない画面は今の場所のまま
        const vis = p.order.filter(k => byKey[k] && byKey[k].avail && !p.hidden.includes(k) && k !== key);
        vis.splice(Math.max(0, Math.min(vis.length, st.at)), 0, key);
        let vi = 0;
        const order = p.order.map(k => ((byKey[k] && byKey[k].avail && !p.hidden.includes(k)) || k === key ? vis[vi++] : k));
        return { ...p, order };
      });
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  };
  const lpDown = (key) => (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const t = e.target;
    if (t.closest && t.closest('[data-ownlong], input, textarea, select, .desk-gutter')) return;
    const x0 = e.clientX, y0 = e.clientY;
    const cancel = () => { if (!lp.current) return; clearTimeout(lp.current.t); window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', cancel); window.removeEventListener('pointercancel', cancel); lp.current = null; };
    const mv = (ev) => { if (Math.hypot(ev.clientX - x0, ev.clientY - y0) > 8) cancel(); };
    if (lp.current) cancel();
    lp.current = { t: setTimeout(() => { cancel(); startDrag(key, x0, y0); }, 600) };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', cancel); window.addEventListener('pointercancel', cancel);
  };

  /* ---- 幅を変える（あいだの線をドラッグ）: となりあう2つの画面の幅の割合を変える ---- */
  const resizeDown = (a, b) => (e) => {
    e.preventDefault();
    const ea = colRefs.current[a], eb = colRefs.current[b]; if (!ea || !eb) return;
    const x0 = e.clientX, wa = ea.getBoundingClientRect().width, wb = eb.getBoundingClientRect().width, fa = wOf(a), fb = wOf(b);
    document.body.classList.add('kame-desk-resizing');
    const move = (ev) => {
      const dx = Math.max(MIN_W - wa, Math.min(wb - MIN_W, ev.clientX - x0));
      const na = wa + dx, nb = wb - dx, sum = fa + fb;
      setL(p => ({ ...p, w: { ...p.w, [a]: sum * na / (na + nb), [b]: sum * nb / (na + nb) } }));
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); document.body.classList.remove('kame-desk-resizing'); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };

  const runShown = visible.includes('run');
  return (
    <div className="desk-row">
      <div ref={railRef} className={'desk-rail' + (drag && drag.at === 'rail' ? ' drop' : '')}>
        {railTop}
        {stowed.length > 0 && <div className="desk-rail-sep" />}
        {stowed.map(k => (
          <button key={k} className="desk-stowed" title={byKey[k].label + 'を出す'} onClick={() => setL(p => ({ ...p, hidden: p.hidden.filter(x => x !== k) }))}>
            <span style={ms(22, '#1b1b18')}>{byKey[k].icon}</span>
            <span className="desk-stowed-l">{byKey[k].label}</span>
          </button>
        ))}
        {drag && <div className="desk-rail-hint"><span style={ms(20, '#55554e')}>inventory_2</span>しまう</div>}
      </div>
      {visible.map((k, i) => (
        <React.Fragment key={k}>
          {i > 0 && <div className="desk-gutter" onPointerDown={resizeDown(visible[i - 1], k)} />}
          {drag && drag.at === visible.filter(x => x !== drag.key).indexOf(k) && k !== drag.key && <div className="desk-drop" />}
          <div ref={el => { colRefs.current[k] = el; }} className={'desk-col desk-' + k + (drag && drag.key === k ? ' lifted' : '')} style={{ flex: wOf(k) + ' 1 0', ...(byKey[k].style || null) }} onPointerDownCapture={lpDown(k)}>
            {byKey[k].node}
            {k === 'run' && runAlarm}
          </div>
        </React.Fragment>
      ))}
      {drag && drag.at !== 'rail' && drag.at >= visible.filter(x => x !== drag.key).length && <div className="desk-drop" />}
      {/* 実行中の画面をしまっているときは、タイマーの知らせは画面全体に */}
      {!runShown && runAlarm}
      {drag && (
        <div className="desk-ghost" style={{ transform: `translate(${drag.x + 14}px, ${drag.y + 10}px)` }}>
          <span style={ms(20, '#fff')}>{byKey[drag.key].icon}</span>{byKey[drag.key].label}
        </div>
      )}
    </div>
  );
}
