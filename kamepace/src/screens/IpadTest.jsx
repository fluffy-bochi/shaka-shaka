import React from 'react';
import Matter from 'matter-js';
import { appendGlyph } from '../fluent';
import { initShakaSound, attachCollisionSound } from '../sound';

/* iPad のインタラクティブテスト（開発者モードだけ）。自分のシャカの山とは別の箱で、記録も保存もしない。
   キーボードの数字で絵文字を降らせる。R でシャカシャカ（展示ではモニターに映すのでジャイロは使わない）。回復（rec）はプラスの絵文字に当たると1つずつ消しあう（シャカと同じ）。 */
const KEYS = {
  1: { g: '😫', n: 2 },            // つぶやき いちばん疲れている顔
  2: { g: '😟', n: 1 },            // 2番目に疲れている顔
  3: { g: '😐', n: 1 },            // ふつう
  4: { g: '🙂', n: 1, rec: true }, // ちょっといい顔（回復）
  5: { g: '😆', n: 1, rec: true }, // 最高の顔（回復）
  6: { g: '🎨', n: 1 },
  7: { g: '💻', n: 1 },
  8: { g: '🍙', n: 1, rec: true },
  9: { g: '🎤', n: 2 },
  0: { g: '🛏️', n: 2, rec: true },
};
const FILL_UNIT = 125; // シャカと同じ: この個数で箱がいっぱい（memory: emoji-pile-fill-rule）

/* 向き: auto＝端末の向きのまま／portrait＝縦／landscape＝横。iOS は Web から向きを固定できないので、
   選んだ向きと端末の向きが違うときは画面ごと90°回して出す（dir＝回す向き 90 / -90） */
const ORI_KEY = 'kame_ipadtest_ori';
const readOri = () => { try { const o = JSON.parse(localStorage.getItem(ORI_KEY) || 'null'); if (o && o.mode) return o; } catch (e) { /* ignore */ } return { mode: 'auto', dir: 90 }; };

export default function IpadTest({ v }) {
  const boxRef = React.useRef(null);
  const sim = React.useRef(null);
  const [count, setCount] = React.useState(0);
  const [ori, setOri0] = React.useState(readOri);
  const setOri = (o) => { setOri0(o); try { localStorage.setItem(ORI_KEY, JSON.stringify(o)); } catch (e) { /* ignore */ } };
  // 外枠（テスト画面に使える場所）の大きさ。縦長か横長かで回すかを決める
  const outerRef = React.useRef(null);
  const [win, setWin] = React.useState({ w: 0, h: 0 });
  React.useEffect(() => {
    const el = outerRef.current; if (!el) return undefined;
    document.body.classList.add('kame-itest'); // iPad の横向きでもスマホ幅（600px）に絞らず全面に
    const on = () => setWin({ w: Math.round(el.clientWidth), h: Math.round(el.clientHeight) });
    on();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(on) : null;
    if (ro) ro.observe(el); else window.addEventListener('resize', on);
    return () => { document.body.classList.remove('kame-itest'); if (ro) ro.disconnect(); else window.removeEventListener('resize', on); };
  }, []);
  const rotated = (ori.mode === 'portrait' && win.w > win.h) || (ori.mode === 'landscape' && win.h > win.w);
  // 箱の大きさが変わったら（回転・画面の大きさ）物理の箱を作り直す
  const layoutKey = [rotated, win.w, win.h].join(':'); // 回す向き（dir）だけ変えたときは箱の中は同じなので作り直さない

  React.useEffect(() => {
    const box = boxRef.current; if (!box || !win.w) return undefined;
    const W = box.clientWidth, H = box.clientHeight;
    const r = Math.sqrt((W * H) / (FILL_UNIT * Math.PI));
    const engine = Matter.Engine.create({ positionIterations: 8, velocityIterations: 4 });
    engine.gravity.y = 1.4;
    const wall = (x, y, w, h) => Matter.Bodies.rectangle(x, y, w, h, { isStatic: true, friction: 0.4 });
    Matter.World.add(engine.world, [wall(W / 2, H + 50, W * 3, 100), wall(-50, H / 2, 100, H * 4), wall(W + 50, H / 2, 100, H * 4)]);
    const s = { engine, r, W, H, bodies: [], raf: 0, last: 0, acc: 0 };
    initShakaSound(); attachCollisionSound(engine); // ぶつかった音（シャカと同じ）
    sim.current = s;

    const pop = (x, y) => { const fx = document.createElement('div'); fx.className = 'pop-fx'; fx.style.left = x + 'px'; fx.style.top = y + 'px'; box.appendChild(fx); setTimeout(() => fx.remove(), 450); };
    const kill = (b) => { Matter.World.remove(engine.world, b.body); b.dead = true; b.el.style.transition = 'opacity .15s'; b.el.style.opacity = '0'; setTimeout(() => b.el.remove(), 200); };
    const step = (t) => {
      const dt = s.last ? Math.min(50, t - s.last) : 16; s.last = t; s.acc += dt;
      while (s.acc >= 1000 / 60) { Matter.Engine.update(engine, 1000 / 60); s.acc -= 1000 / 60; }
      // 回復: プラスに当たったら両方消える
      const hit2 = (r * 2) * (r * 2);
      for (const n of s.bodies) {
        if (n.dead || !n.rec) continue;
        const p = s.bodies.find(b => !b.dead && !b.rec && (b.body.position.x - n.body.position.x) ** 2 + (b.body.position.y - n.body.position.y) ** 2 < hit2);
        if (p) { pop((p.body.position.x + n.body.position.x) / 2, (p.body.position.y + n.body.position.y) / 2); kill(p); kill(n); }
        else if (Date.now() - n.at > 2500 && n.body.speed < 0.3) kill(n); // 消すものがなければ、着いたら消える
      }
      if (s.bodies.some(b => b.dead)) { s.bodies = s.bodies.filter(b => !b.dead); setCount(s.bodies.filter(b => !b.rec).length); }
      for (const b of s.bodies) {
        const { x, y } = b.body.position;
        b.el.style.transform = `translate(${x - r}px, ${y - r}px) rotate(${b.body.angle}rad)`;
      }
      s.raf = requestAnimationFrame(step);
    };
    s.raf = requestAnimationFrame(step);
    setCount(0);
    return () => { cancelAnimationFrame(s.raf); Matter.World.clear(engine.world); Matter.Engine.clear(engine); box.querySelectorAll('[data-t]').forEach(e => e.remove()); sim.current = null; };
  }, [layoutKey]);

  const drop = React.useCallback((key) => {
    const s = sim.current, box = boxRef.current, k = KEYS[key]; if (!s || !box || !k) return;
    for (let i = 0; i < k.n; i++) {
      const x = s.r + Math.random() * (s.W - s.r * 2);
      const body = Matter.Bodies.circle(x, -s.r * (1.2 + i * 2.2), s.r * 0.92, { restitution: 0.15, friction: 0.3, density: 0.002, angle: (Math.random() - 0.5) * 0.6 });
      if (k.rec) body.collisionFilter = { group: -1, category: 2, mask: 1 }; // 回復どうしは重ならず、山の上に当たったら1つ消す
      Matter.Body.setVelocity(body, { x: (Math.random() - 0.5) * 2, y: 2 });
      const el = document.createElement('div');
      el.dataset.t = '1';
      Object.assign(el.style, { position: 'absolute', left: 0, top: 0, width: s.r * 2 + 'px', height: s.r * 2 + 'px', display: 'flex', alignItems: 'center', justifyContent: 'center', willChange: 'transform', pointerEvents: 'none', fontSize: Math.round(s.r * 1.6) + 'px', transform: `translate(${x - s.r}px, ${-s.r * 3}px)` });
      appendGlyph(el, k.g, Math.round(s.r * 2));
      box.appendChild(el);
      Matter.World.add(s.engine.world, body);
      s.bodies.push({ body, el, rec: !!k.rec, at: Date.now() });
    }
    setCount(s.bodies.filter(b => !b.rec).length);
  }, []);

  /* シャカシャカ: 全部の絵文字を散らす（シャカの🔀と同じ動き。箱が大きいぶん少し強め） */
  const shake = React.useCallback(() => {
    const s = sim.current; if (!s) return;
    const k = 9 * Math.sqrt(Math.max(1, s.r / 24));
    s.bodies.forEach(({ body }) => {
      Matter.Sleeping.set(body, false);
      Matter.Body.setVelocity(body, { x: (Math.random() - 0.5) * 2 * k, y: -Math.random() * k * 0.9 });
      Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.4);
    });
  }, []);

  const clear = () => {
    const s = sim.current; if (!s) return;
    s.bodies.forEach(b => { Matter.World.remove(s.engine.world, b.body); b.el.remove(); });
    s.bodies = []; setCount(0);
  };

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.code === 'KeyR' || e.key === 'r' || e.key === 'R') && !e.repeat) { e.preventDefault(); shake(); return; }
      const m = /^(?:Digit|Numpad)([0-9])$/.exec(e.code || '');
      const key = m ? m[1] : (/^[0-9]$/.test(e.key) ? e.key : null);
      if (key == null) return;
      e.preventDefault();
      drop(key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drop, shake]);

  const pill = (on) => ({ border: 'none', borderRadius: 999, padding: '6px 12px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', background: on ? '#1b1b18' : 'transparent', color: on ? '#fff' : '#55554e', fontFamily: 'inherit' });
  // 回すときは、外枠の中で縦横を入れかえた大きさにして90°回す
  const rootStyle = rotated
    ? { position: 'absolute', left: '50%', top: '50%', width: win.h, height: win.w, transform: `translate(-50%, -50%) rotate(${ori.dir}deg)`, display: 'flex', flexDirection: 'column', background: '#f7f4ec' }
    : { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#f7f4ec' };
  return (
    <div ref={outerRef} style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden', background: '#f7f4ec' }}>
    <div style={rootStyle}>
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 10, padding: '6px 16px' }}>
        <button onClick={v.closeIpadTest} aria-label="閉じる" style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: '#fff', fontSize: 18, cursor: 'pointer' }}>×</button>
        <span style={{ flex: 1, fontSize: 15, fontWeight: 900 }}>インタラクティブテスト</span>
        <div style={{ display: 'flex', background: '#efece3', borderRadius: 999, padding: 2 }}>
          {[['auto', '自動'], ['portrait', '縦'], ['landscape', '横']].map(([k, n]) => <button key={k} onClick={() => setOri({ ...ori, mode: k })} style={pill(ori.mode === k)}>{n}</button>)}
        </div>
        {rotated && <button onClick={() => setOri({ ...ori, dir: -ori.dir })} aria-label="回す向きを逆に" style={{ width: 34, height: 34, borderRadius: '50%', border: '1.5px solid #e4e1d8', background: '#fff', cursor: 'pointer', fontSize: 16, padding: 0 }}>⟲</button>}
        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 13, fontWeight: 700 }}>{count}</span>
        <button onClick={shake} style={{ border: '1.5px solid #e4e1d8', borderRadius: 999, background: '#fff', padding: '7px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>🔀 R</button>
        <button onClick={clear} style={{ border: '1.5px solid #e4e1d8', borderRadius: 999, background: '#fff', padding: '7px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>リセット</button>
      </div>
      <div ref={boxRef} style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden' }} />
      {/* キーボードがないときの数字キー */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', gap: 6, padding: '8px 12px calc(8px + env(safe-area-inset-bottom))', background: '#fff', borderTop: '1px solid #efece3' }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map(k => (
          <button key={k} onClick={() => drop(k)} style={{ flex: 1, height: 52, border: 'none', borderRadius: 12, background: KEYS[k].rec ? '#eef7cc' : '#f1efe8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, cursor: 'pointer', fontFamily: 'inherit' }}>
            <span style={{ fontSize: 18 }}>{KEYS[k].g}</span>
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, fontWeight: 700, color: '#55554e' }}>{k}</span>
          </button>
        ))}
      </div>
    </div>
    </div>
  );
}
