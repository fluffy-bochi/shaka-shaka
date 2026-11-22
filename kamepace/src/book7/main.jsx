import React from 'react';
import { createRoot } from 'react-dom/client';
import Matter from 'matter-js';
import { CATS } from '../data';
import Emo, { appendGlyph } from '../fluent';

/* 卒展の「透明な本」用: 7日分のシャカの画面を並べて、絵文字を降らせて中身を決める（ローカル専用・本番には出さない）。
   - 左の一覧で絵文字を選び、日の箱を押すとそこに降る。「消す」にして押す（または右クリック）と1個ずつ消える
   - 絵文字の大きさはアプリと同じ：その箱に125個で満杯（FILL_UNIT）。描く大きさは半径×1.9
   - 置いたものは端末に覚える（localStorage book7_v1）。CSV で必要数と配置（mm）を書き出す */
const KEY = 'book7_v1';
const DAYS = ['月', '火', '水', '木', '金', '土', '日'];
const FILL = 125;
const { Engine, Bodies, Composite, Body } = Matter;
const BODY_OPTS = { restitution: 0.12, friction: 0.4, frictionStatic: 0.6, frictionAir: 0.012, density: 0.01, slop: 0.01, sleepThreshold: 30 };

// 相談で出した「理想の1週間」案（積む絵文字のみ）
const PLAN = [
  { '🧼': 1, '🪥': 1, '💄': 2, '👕': 1, '🚃': 5, '📖': 11, '🎨': 15, '🔬': 14, '📝': 18, '🍳': 5, '🍽': 2 },
  { '🧼': 1, '🪥': 1, '💄': 2, '👕': 1, '🚃': 5, '📖': 11, '🎨': 15, '🙋': 13, '🧾': 11, '🍽': 15, '🍳': 5 },
  { '🧼': 1, '🪥': 1, '💄': 2, '👕': 1, '🚃': 5, '📖': 11, '🎨': 45, '📝': 18, '🏃': 10 },
  { '🧼': 1, '🪥': 1, '💄': 2, '👕': 1, '🚃': 5, '📖': 11, '🎨': 45, '📝': 18, '🙋': 13, '🧾': 11, '🍽': 15, '🧺': 5, '🍳': 5 },
  { '🧼': 1, '🪥': 1, '💄': 2, '👕': 1, '🚃': 5, '🔬': 15, '📝': 18, '🍳': 5, '🍽': 2 },
  { '🧼': 1, '🪥': 1, '👕': 1, '🧺': 5, '🛒': 6, '🏃': 10, '🍳': 5, '🍽': 2 },
  { '🧼': 1, '🪥': 1, '🍳': 5, '🍽': 2 },
];

// 絵文字 → 行動名（同じ絵文字の行動はまとめて「・」でつなぐ）と 1時間あたりの疲れ
const NAMES = {}, FH = {};
CATS.forEach(c => c.items.forEach(it => {
  (NAMES[it.glyph] = NAMES[it.glyph] || []).includes(it.name) || NAMES[it.glyph].push(it.name);
  if (FH[it.glyph] == null) FH[it.glyph] = it.fh;
}));
const nameOf = (g) => (NAMES[g] || []).join('・');

const loadSaved = () => {
  try {
    const x = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (x && Array.isArray(x.days) && x.days.length === 7) return x;
  } catch (e) { /* ignore */ }
  return { page: { w: 90, h: 160 }, days: DAYS.map(() => []) };
};

/* ---- 1日ぶんの箱（物理はかんたんに：床と左右の壁だけ。上は空いていて、あふれた分は箱の外に積もって見えない） ---- */
class DayBox {
  constructor(el, W, H, onChange) {
    this.el = el; this.W = W; this.H = H; this.onChange = onChange;
    this.r = Math.max(4, Math.sqrt(W * H / (FILL * Math.PI)));
    this.engine = Engine.create({ enableSleeping: true });
    const t = 200, top = -H * 12, wallH = H - top;
    Composite.add(this.engine.world, [
      Bodies.rectangle(W / 2, H + t / 2, W + t * 2, t, { isStatic: true }),
      Bodies.rectangle(-t / 2, top + wallH / 2, t, wallH, { isStatic: true }),
      Bodies.rectangle(W + t / 2, top + wallH / 2, t, wallH, { isStatic: true }),
    ]);
    this.items = [];
  }
  add(g, x, y, a = 0) {
    const r = this.r;
    const body = Bodies.circle(Math.max(r, Math.min(this.W - r, x)), y, r, BODY_OPTS);
    Body.setAngle(body, a);
    Composite.add(this.engine.world, body);
    const d = document.createElement('div');
    d.className = 'b7-emo';
    d.title = (nameOf(g) || g) + '（右クリックで消す）';
    d.style.width = d.style.height = Math.round(r * 1.9) + 'px';
    d.style.marginLeft = d.style.marginTop = -Math.round(r * 0.95) + 'px';
    appendGlyph(d, g, Math.round(r * 1.9));
    this.el.appendChild(d);
    const it = { g, body, d };
    d._b7 = it;
    this.items.push(it);
    this.place(it);
    return it;
  }
  remove(it) {
    const i = this.items.indexOf(it); if (i < 0) return;
    this.items.splice(i, 1);
    Composite.remove(this.engine.world, it.body);
    it.d.remove();
    // 上に乗っていたものが落ちるように起こす
    this.items.forEach(o => Matter.Sleeping.set(o.body, false));
  }
  clear() { [...this.items].forEach(it => { Composite.remove(this.engine.world, it.body); it.d.remove(); }); this.items = []; }
  drop(g, n, cx) {
    const r = this.r;
    for (let i = 0; i < n; i++) {
      const x = cx == null ? r + Math.random() * (this.W - 2 * r) : cx + (Math.random() - 0.5) * r * Math.min(8, 2 + n * 0.4);
      this.add(g, x, -r * 1.2 - i * r * 1.3 - Math.random() * r, Math.random() * 6.28);
    }
  }
  place(it) { const p = it.body.position; it.d.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${it.body.angle}rad)`; }
  step() {
    Engine.update(this.engine, 1000 / 60);
    for (const it of this.items) if (!it.body.isSleeping) this.place(it);
  }
  // 箱の幅を1とした位置で書き出す（箱の大きさが変わっても形を保つ）
  dump() { return this.items.map(it => ({ g: it.g, x: +(it.body.position.x / this.W).toFixed(4), y: +(it.body.position.y / this.W).toFixed(4), a: +it.body.angle.toFixed(3) })); }
  destroy() { this.clear(); Engine.clear(this.engine); }
}

function useBoxSize(page) {
  const calc = () => {
    const availW = window.innerWidth - 300 - 24 * 2 - 12 * 6;
    let w = availW / 7, h = w * page.h / page.w;
    const maxH = window.innerHeight - 150;
    if (h > maxH) { h = maxH; w = h * page.w / page.h; }
    return { w: Math.floor(w), h: Math.floor(h) };
  };
  const [sz, setSz] = React.useState(calc);
  React.useEffect(() => {
    let t; const on = () => { clearTimeout(t); t = setTimeout(() => setSz(calc()), 250); };
    window.addEventListener('resize', on); setSz(calc());
    return () => { window.removeEventListener('resize', on); clearTimeout(t); };
  }, [page.w, page.h]); // eslint-disable-line react-hooks/exhaustive-deps
  return sz;
}

const download = (name, rows) => {
  const csv = '﻿' + rows.map(r => r.map(v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};

const chip = (on) => ({ border: '1px solid ' + (on ? '#1b1b18' : '#d8d5cb'), background: on ? '#1b1b18' : '#fff', color: on ? '#fff' : '#1b1b18', borderRadius: 999, padding: '6px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' });

function App() {
  const saved = React.useRef(loadSaved());
  const [page, setPage] = React.useState(saved.current.page);
  const [sel, setSel] = React.useState('🎨');
  const [num, setNum] = React.useState(1);
  const [mins, setMins] = React.useState('');
  const [mode, setMode] = React.useState('add'); // add | del
  const [extra, setExtra] = React.useState('');
  const [ver, setVer] = React.useState(0);
  const sz = useBoxSize(page);
  const boxEls = React.useRef([]);
  const boxes = React.useRef([]);
  const modeRef = React.useRef(mode); modeRef.current = mode;
  const selRef = React.useRef(); selRef.current = { g: sel, n: Math.max(1, Math.min(200, +num || 1)) };
  const bump = () => setVer(v => v + 1);

  const save = () => {
    if (!boxes.current.length) return;
    saved.current = { page, days: boxes.current.map(b => b.dump()) };
    try { localStorage.setItem(KEY, JSON.stringify(saved.current)); } catch (e) { /* ignore */ }
  };

  // 箱を作る（大きさが変わったら、いまの配置を保ったまま作り直す）
  React.useEffect(() => {
    const prev = boxes.current.length ? boxes.current.map(b => b.dump()) : saved.current.days;
    boxes.current.forEach(b => b.destroy());
    boxes.current = DAYS.map((_, i) => {
      const b = new DayBox(boxEls.current[i], sz.w, sz.h);
      (prev[i] || []).forEach(p => b.add(p.g, p.x * sz.w, p.y * sz.w, p.a || 0));
      return b;
    });
    bump();
    let raf;
    const loop = () => { boxes.current.forEach(b => b.step()); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    const iv = setInterval(save, 1000);
    return () => { cancelAnimationFrame(raf); clearInterval(iv); save(); };
  }, [sz.w, sz.h]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => { save(); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const onBoxDown = (i) => (e) => {
    const b = boxes.current[i]; if (!b) return;
    const hit = e.target.closest && e.target.closest('.b7-emo');
    if (e.button === 2) return; // 右クリックは contextmenu で
    if (modeRef.current === 'del') { if (hit && hit._b7) { b.remove(hit._b7); bump(); } return; }
    const rect = boxEls.current[i].getBoundingClientRect();
    b.drop(selRef.current.g, selRef.current.n, e.clientX - rect.left);
    bump();
  };
  const onCtx = (i) => (e) => {
    e.preventDefault();
    const hit = e.target.closest && e.target.closest('.b7-emo');
    if (hit && hit._b7) { boxes.current[i].remove(hit._b7); bump(); }
  };

  // 集計: 絵文字 × 曜日
  const counts = boxes.current.map(b => { const m = {}; b.items.forEach(it => { m[it.g] = (m[it.g] || 0) + 1; }); return m; });
  const glyphs = [...new Set(counts.flatMap(m => Object.keys(m)))];
  const total = (g) => counts.reduce((a, m) => a + (m[g] || 0), 0);
  glyphs.sort((a, b) => total(b) - total(a));
  const dayTotal = counts.map(m => Object.values(m).reduce((a, b) => a + b, 0));
  const all = dayTotal.reduce((a, b) => a + b, 0);
  void ver;

  const csvCounts = () => download('透明な本_必要数.csv', [
    ['絵文字', '行動', ...DAYS, '合計'],
    ...glyphs.map(g => [g, nameOf(g), ...counts.map(m => m[g] || 0), total(g)]),
    ['合計', '', ...dayTotal, all],
    ['満杯(125)に対する割合', '', ...dayTotal.map(n => Math.round(n / FILL * 100) + '%'), ''],
  ]);
  const csvPlace = () => {
    const rows = [['曜日', '絵文字', '行動', '中心x(mm)', '中心y(mm・上から)', '直径(mm)', '回転(度)', 'ページ内']];
    boxes.current.forEach((b, i) => {
      const k = page.w / b.W, dia = +(b.r * 1.9 * k).toFixed(1);
      b.items.forEach(it => {
        const x = it.body.position.x * k, y = it.body.position.y * k;
        rows.push([DAYS[i], it.g, nameOf(it.g), x.toFixed(1), y.toFixed(1), dia, Math.round((it.body.angle * 180 / Math.PI) % 360), y + dia / 2 < 0 ? 'はみ出し' : (y - dia / 2 < 0 ? '一部はみ出し' : '中')]);
      });
    });
    download('透明な本_配置.csv', rows);
  };
  const loadPlan = () => {
    if (!window.confirm('いまの7日分を消して「理想の1週間」案を入れますか？')) return;
    boxes.current.forEach((b, i) => {
      b.clear();
      const list = Object.entries(PLAN[i]).flatMap(([g, n]) => Array(n).fill(g));
      for (let k = list.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [list[k], list[j]] = [list[j], list[k]]; }
      list.forEach((g, k) => b.add(g, b.r + Math.random() * (b.W - 2 * b.r), -b.r - k * b.r * 0.5, Math.random() * 6.28));
    });
    bump();
  };
  const clearDay = (i) => { boxes.current[i].clear(); bump(); };
  const clearAll = () => { if (window.confirm('7日分を全部消しますか？')) { boxes.current.forEach(b => b.clear()); bump(); } };

  const fhSel = FH[sel];
  const fromMin = (m) => { setMins(m); if (fhSel != null && +m > 0) setNum(Math.max(1, Math.round(Math.abs(fhSel) * +m / 60))); };
  const mm = (b) => (b ? (b.r * 1.9 * page.w / b.W).toFixed(1) : '');

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <style>{`
        .b7-emo { position: absolute; left: 0; top: 0; will-change: transform; display: flex; align-items: center; justify-content: center; line-height: 1; }
        .b7-box.del .b7-emo { cursor: pointer; }
        .b7-box.del .b7-emo:hover { filter: drop-shadow(0 0 3px #e0402a) brightness(1.1); opacity: .6; }
        .b7-pal button:hover { background: #f1eee5; }
      `}</style>
      {/* 左: 絵文字を選ぶ */}
      <div className="b7-pal" style={{ width: 300, flex: '0 0 300px', background: '#fff', borderRight: '1px solid #dcd8cc', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #ece9e0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: '#f7f4ec', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Emo e={sel} size={40} /></div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nameOf(sel) || sel}</div>
              {fhSel != null && <div style={{ fontSize: 12, color: '#8a8a82' }}>{fhSel > 0 ? '+' : '−'}{Math.abs(fhSel)} / 1時間</div>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 13 }}>
            <input type="number" min="1" max="200" value={num} onChange={e => { setNum(e.target.value); setMins(''); }} style={{ width: 60, padding: '5px 6px', fontSize: 14 }} />個
            {fhSel != null && <><span style={{ color: '#8a8a82', marginLeft: 6 }}>＝</span><input type="number" min="1" placeholder="分" value={mins} onChange={e => fromMin(e.target.value)} style={{ width: 60, padding: '5px 6px', fontSize: 14 }} />分</>}
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
            {[1, 5, 10, 20].map(n => <button key={n} onClick={() => { setNum(n); setMins(''); }} style={chip(+num === n)}>{n}</button>)}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 10px 20px' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', margin: '8px 4px' }}>
            <input value={extra} onChange={e => setExtra(e.target.value)} placeholder="ほかの絵文字" style={{ flex: 1, padding: '5px 8px', fontSize: 14 }} />
            <button onClick={() => { const g = [...extra.trim()].join(''); if (g) setSel(g); }} style={chip(false)}>使う</button>
          </div>
          {CATS.map(c => (
            <div key={c.id}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#8a8a82', margin: '12px 4px 4px' }}>{c.name}</div>
              {c.items.map(it => (
                <button key={it.id} onClick={() => setSel(it.glyph)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', border: 'none', background: sel === it.glyph ? '#eef7c8' : 'transparent', borderRadius: 8, padding: '4px 6px', cursor: 'pointer', textAlign: 'left' }}>
                  <Emo e={it.glyph} size={24} />
                  <span style={{ flex: 1, fontSize: 13 }}>{it.name}</span>
                  <span style={{ fontSize: 11, color: it.fh < 0 ? '#3f8f6a' : '#8a8a82', fontFamily: "'Space Mono',monospace" }}>{it.fh > 0 ? '+' : '−'}{Math.abs(it.fh)}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 右: 7日分 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '14px 24px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <button onClick={() => setMode('add')} style={chip(mode === 'add')}>降らせる</button>
          <button onClick={() => setMode('del')} style={chip(mode === 'del')}>消す</button>
          <span style={{ width: 12 }} />
          <span style={{ fontSize: 13 }}>ページ</span>
          <input type="number" value={page.w} onChange={e => setPage(p => ({ ...p, w: Math.max(10, +e.target.value || 10) }))} style={{ width: 58, padding: '4px 6px' }} />×
          <input type="number" value={page.h} onChange={e => setPage(p => ({ ...p, h: Math.max(10, +e.target.value || 10) }))} style={{ width: 58, padding: '4px 6px' }} /><span style={{ fontSize: 13 }}>mm</span>
          <span style={{ fontSize: 12, color: '#8a8a82' }}>絵文字の直径 {mm(boxes.current[0])}mm</span>
          <span style={{ flex: 1 }} />
          <button onClick={loadPlan} style={chip(false)}>案を入れる</button>
          <button onClick={clearAll} style={chip(false)}>全部消す</button>
          <button onClick={csvCounts} style={{ ...chip(false), background: '#c4f000', borderColor: '#c4f000' }}>必要数CSV</button>
          <button onClick={csvPlace} style={chip(false)}>配置CSV</button>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          {DAYS.map((d, i) => (
            <div key={d} style={{ width: sz.w }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                <b style={{ fontSize: 16 }}>{d}</b>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 13 }}>{dayTotal[i] || 0}</span>
                <span style={{ fontSize: 11, color: dayTotal[i] > FILL ? '#e0402a' : '#8a8a82' }}>{Math.round((dayTotal[i] || 0) / FILL * 100)}%</span>
                <span style={{ flex: 1 }} />
                <button onClick={() => clearDay(i)} title="この日を空にする" style={{ border: 'none', background: 'none', color: '#8a8a82', fontSize: 11, cursor: 'pointer', padding: 0 }}>空に</button>
              </div>
              <div ref={el => { boxEls.current[i] = el; }} className={'b7-box' + (mode === 'del' ? ' del' : '')} onPointerDown={onBoxDown(i)} onContextMenu={onCtx(i)}
                style={{ position: 'relative', width: sz.w, height: sz.h, background: '#fbfaf5', border: '1px solid #cfcabb', borderRadius: 6, overflow: 'hidden', cursor: mode === 'add' ? 'copy' : 'default', userSelect: 'none', touchAction: 'none' }} />
            </div>
          ))}
        </div>

        {/* 必要な数 */}
        <div style={{ marginTop: 24, background: '#fff', borderRadius: 10, padding: '12px 16px', display: 'inline-block', minWidth: 520 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>必要な数 <span style={{ fontWeight: 500, fontSize: 13, color: '#8a8a82' }}>全部で {all} 個・{glyphs.length} 種類</span></div>
          <table style={{ borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>{['', '行動', ...DAYS, '合計'].map(h => <th key={h} style={{ padding: '3px 8px', textAlign: h === '行動' ? 'left' : 'right', color: '#8a8a82', fontWeight: 700 }}>{h}</th>)}</tr></thead>
            <tbody>
              {glyphs.map(g => (
                <tr key={g} style={{ borderTop: '1px solid #f0ede4' }}>
                  <td style={{ padding: '2px 8px' }}><Emo e={g} size={22} /></td>
                  <td style={{ padding: '2px 8px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nameOf(g)}</td>
                  {counts.map((m, i) => <td key={i} style={{ padding: '2px 8px', textAlign: 'right', fontFamily: "'Space Mono',monospace", color: m[g] ? '#1b1b18' : '#d0ccc0' }}>{m[g] || 0}</td>)}
                  <td style={{ padding: '2px 8px', textAlign: 'right', fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>{total(g)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid #1b1b18' }}>
                <td /><td style={{ padding: '4px 8px', fontWeight: 700 }}>合計</td>
                {dayTotal.map((n, i) => <td key={i} style={{ padding: '4px 8px', textAlign: 'right', fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>{n}</td>)}
                <td style={{ padding: '4px 8px', textAlign: 'right', fontFamily: "'Space Mono',monospace", fontWeight: 900 }}>{all}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
