import React from 'react';
import Matter from 'matter-js';
import { appendGlyph } from './fluent';
import { initShakaSound, attachCollisionSound } from './sound';
import Home from './screens/Home';
import Bookshelf from './screens/Bookshelf';
import { addPress, sampleFor, homeRows, slotNow, todayStr, shiftDate, WD, exhibitDayLabel } from './exhibit';
import { homeLine } from './wake';
import { strToDate } from './model';

/* 卒展用インタラクティブ（ほどほどふぉーと本体の IpadTest.jsx から移した単独版）。記録も保存もしない。
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
/* 本体のシャカと同じ「硬い」物理: 跳ねない・よく噛む・沈まない・止まったら眠る */
const BODY_OPTS = { restitution: 0.12, friction: 0.4, frictionStatic: 0.6, frictionAir: 0.012, density: 0.01, slop: 0.01, sleepThreshold: 30 };
const FILL_UNIT = 125; // シャカと同じ: この個数で箱がいっぱい（memory: emoji-pile-fill-rule）

/* 向き: auto＝端末の向きのまま／portrait＝縦／landscape＝横。iOS は Web から向きを固定できないので、
   選んだ向きと端末の向きが違うときは画面ごと90°回して出す。flip＝⟲で逆さに（回さないときは180°・回すときは -90°）。
   モニターや iPad の置き方（上下逆の縦など）に合わせる */
const ORI_KEY = 'kame_ipadtest_ori';
const readOri = () => {
  try {
    const o = JSON.parse(localStorage.getItem(ORI_KEY) || 'null');
    if (o && o.mode) return { mode: o.mode, flip: o.flip != null ? !!o.flip : o.dir === -90, pc: !!o.pc }; // 前の形（dir 90/-90）も読む
  } catch (e) { /* ignore */ }
  return { mode: 'auto', flip: false, pc: false };
};
/* PC モード: 本番の iPad の縦横比（縦 3:4）の箱を画面の真ん中に。上の余白にボタン類、下の余白にフッター */
const IPAD_RATIO = 4 / 3;
const PC_MIN_TOP = 120, PC_MIN_BOT = 64;
const IPAD_CSS_W = 820; // 本番の iPad（縦）の CSS 幅。PC モードのホーム・本棚はこの幅に見えるように拡大する
const ms = (fill, size) => ({ fontFamily: 'Material Symbols Rounded', fontVariationSettings: `'FILL' ${fill}`, fontSize: size, lineHeight: 1 });
const toggleFull = () => {
  try {
    if (document.fullscreenElement) document.exitFullscreen();
    else (document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen).call(document.documentElement);
  } catch (e) { /* ignore */ }
};

export default function Interactive() {
  const boxRef = React.useRef(null);
  const sim = React.useRef(null);
  const [count0, setCount] = React.useState(0);
  const [tab, setTab] = React.useState('gauge'); // フッターの選択（B=本棚・H=ホーム・G=ゲージ。本番は iPad のハードキーで操作）
  // 来場者が数字キーで入れた今日の記録（保存しない）。過去の日はサンプルのペルソナ
  const [mine, setMine] = React.useState([]);
  const [lastRec, setLastRec] = React.useState(null);
  const [homeDate, setHomeDate] = React.useState(null); // null＝今日
  const [bookFav, setBookFav] = React.useState({});
  const [bookDiary, setBookDiary] = React.useState({});
  const [ori, setOri0] = React.useState(readOri);
  const setOri = (o) => { setOri0(o); try { localStorage.setItem(ORI_KEY, JSON.stringify(o)); } catch (e) { /* ignore */ } };
  // 外枠（テスト画面に使える場所）の大きさ。縦長か横長かで回すかを決める
  const outerRef = React.useRef(null);
  const [win, setWin] = React.useState({ w: 0, h: 0 });
  React.useEffect(() => {
    const el = outerRef.current; if (!el) return undefined;
    const on = () => setWin({ w: Math.round(el.clientWidth), h: Math.round(el.clientHeight) });
    on();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(on) : null;
    if (ro) ro.observe(el); else window.addEventListener('resize', on);
    return () => { if (ro) ro.disconnect(); else window.removeEventListener('resize', on); };
  }, []);
  const rotated = (ori.mode === 'portrait' && win.w > win.h) || (ori.mode === 'landscape' && win.h > win.w);
  // 箱の大きさが変わったら（回転・画面の大きさ）物理の箱を作り直す
  // 回した後の画面（フレーム）の大きさ。PC モードではその中に iPad の比の箱
  const FW = rotated ? win.h : win.w, FH = rotated ? win.w : win.h;
  const pc = ori.pc;
  let bw = FW, bh = FH;
  if (pc) {
    const avH = Math.max(0, FH - PC_MIN_TOP - PC_MIN_BOT); // ボタンとフッターの場所は必ず残す（足りないときは箱を同じ比で小さく）
    if (FH >= FW) { bw = Math.min(FW, avH / IPAD_RATIO); bh = bw * IPAD_RATIO; }
    else { bh = Math.min(avH, FW / IPAD_RATIO); bw = bh * IPAD_RATIO; }
    bw = Math.floor(bw); bh = Math.floor(bh);
  }
  const mTop = pc ? Math.max(PC_MIN_TOP, Math.floor((FH - bh) / 2)) : 0, mBot = pc ? FH - bh - mTop : 0;
  const layoutKey = [rotated, win.w, win.h, pc].join(':'); // 逆さ（flip）だけ変えたときは箱の中は同じなので作り直さない
  const angle = rotated ? (ori.flip ? -90 : 90) : (ori.flip ? 180 : 0);

  React.useEffect(() => {
    const box = boxRef.current; if (!box || !win.w) return undefined;
    const W = box.clientWidth, H = box.clientHeight;
    const r = Math.sqrt((W * H) / (FILL_UNIT * Math.PI));
    const engine = Matter.Engine.create({ positionIterations: 8, velocityIterations: 4 });
    engine.enableSleeping = true; // 止まった絵文字は眠らせて、たくさん積んでもモゴモゴ動き続けないように（本体のシャカと同じ）
    engine.gravity.y = 1.4;
    const wall = (x, y, w, h) => Matter.Bodies.rectangle(x, y, w, h, { isStatic: true, friction: 0.4 });
    Matter.World.add(engine.world, [wall(W / 2, H + 50, W * 3, 100), wall(-50, H / 2, 100, H * 4), wall(W + 50, H / 2, 100, H * 4)]);
    const s = { engine, r, W, H, bodies: [], raf: 0, last: 0, acc: 0 };
    initShakaSound(); attachCollisionSound(engine); // ぶつかった音（シャカと同じ）
    sim.current = s;

    const pop = (x, y) => { const fx = document.createElement('div'); fx.className = 'pop-fx'; fx.style.left = x + 'px'; fx.style.top = y + 'px'; box.appendChild(fx); setTimeout(() => fx.remove(), 450); };
    const kill = (b) => { Matter.World.remove(engine.world, b.body); s.bodies.forEach(o => Matter.Sleeping.set(o.body, false)); /* 下が消えたら上が落ちるように起こす */ b.dead = true; b.el.style.transition = 'opacity .15s'; b.el.style.opacity = '0'; setTimeout(() => b.el.remove(), 200); };
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
      const body = Matter.Bodies.circle(x, -s.r * (1.2 + i * 2.2), s.r * 0.92, { ...BODY_OPTS, angle: (Math.random() - 0.5) * 0.6 });
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
    setMine(l => addPress(l, key, k.g, k.n, !!k.rec));
    setLastRec({ ts: Date.now(), rec: !!k.rec });
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
    setMine([]); setLastRec(null); setHomeDate(null); setBookFav({}); setBookDiary({}); // 次の来場者のために今日の記録も消す
  };

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tg = e.target && e.target.tagName;
      if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT') return; // 本棚の日記を書いているとき
      const nav = { KeyB: 'book', KeyH: 'home', KeyG: 'gauge' }[e.code] || { b: 'book', h: 'home', g: 'gauge' }[(e.key || '').toLowerCase()];
      if (nav && !e.repeat) { e.preventDefault(); setTab(nav); return; }
      if ((e.code === 'KeyF' || e.key === 'f' || e.key === 'F') && !e.repeat) { e.preventDefault(); toggleFull(); return; }
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

  /* ---- ホーム・本棚（本体の画面をそのまま使う）に渡す値 ---- */
  const today = todayStr();
  const hd = homeDate || today;
  const sample = React.useMemo(() => sampleFor([today, shiftDate(today, -365), hd]), [today, hd]);
  const entries = React.useMemo(() => sample.entries.concat(mine), [sample, mine]);
  const wakeLog = React.useMemo(() => Object.values(sample.wake), [sample]);
  const homeV = tab !== 'home' ? null : (() => {
    const dt = strToDate(hd);
    const noop = () => {};
    const count = hd === today ? count0 : (sample.balance[hd] || 0);
    return {
      homeDate: hd, homeIsToday: hd === today, homeNowSlot: hd === today ? slotNow() : null,
      homeDateY: dt.getFullYear(), homeDateM: dt.getMonth() + 1, homeDateD: dt.getDate(), homeDateWd: WD[dt.getDay()],
      homeDateLabel: hd === today ? '今日' : hd === shiftDate(today, -1) ? '昨日' : hd === shiftDate(today, 1) ? '明日' : '',
      homePrevDay: () => setHomeDate(shiftDate(hd, -1)), homeNextDay: () => setHomeDate(shiftDate(hd, 1)),
      goToday: () => setHomeDate(null),
      homeFeed: homeRows(entries, wakeLog, sample.collected, hd), exhibitDay: exhibitDayLabel(hd),
      homeComment: homeLine(Math.min(100, count), null, hd, hd === today ? lastRec : null, Date.now()),
      homeWeekGoal: '課題は早めに少しずつ', homeWeekGoalGlyph: '🎨',
      goMypage: noop, tapCharacter: noop, openMood: noop, openRecordNow: noop,
    };
  })();
  const bookV = tab !== 'book' ? null : {
    land: FW > FH, bookEntries: entries, bookCollected: sample.collected, bookBeforeSleep: sample.balance,
    bookFav: { ...sample.fav, ...bookFav }, bookDiary: { ...sample.diary, ...bookDiary },
    setBookFav: (d) => setBookFav(f => ({ ...f, [d]: !({ ...sample.fav, ...f })[d] })),
    setBookDiary: (d, val) => setBookDiary(x => ({ ...x, [d]: val })),
    goBookDay: (d) => { setHomeDate(d === today ? null : d); setTab('home'); },
  };
  // PC モードは iPad の幅に見えるように拡大（iPad では等倍）
  const zoom = pc ? bw / IPAD_CSS_W : 1;
  const stage = (style) => (
    <div style={{ position: 'relative', overflow: 'hidden', background: '#f7f4ec', ...style }}>
      <div ref={boxRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }} />
      {tab !== 'gauge' && (
        <div style={{ position: 'absolute', left: 0, top: 0, zIndex: 3, width: pc ? bw / zoom : '100%', height: pc ? bh / zoom : '100%', zoom, display: 'flex', flexDirection: 'column', background: '#f7f4ec' }}>
          {homeV && <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}><Home v={homeV} /></div>}
          {bookV && <Bookshelf key={bookV.land ? 'land' : 'port'} v={bookV} />}
        </div>
      )}
    </div>
  );

  const pill = (on) => ({ border: 'none', borderRadius: 999, padding: '6px 12px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', background: on ? '#1b1b18' : 'transparent', color: on ? '#fff' : '#55554e', fontFamily: 'inherit' });
  const ghost = { border: '1.5px solid #e4e1d8', borderRadius: 999, background: '#fff', padding: '7px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };
  // 回すときは、外枠の中で縦横を入れかえた大きさにして90°回す（逆さは180°）
  const rootStyle = rotated
    ? { position: 'absolute', left: '50%', top: '50%', width: win.h, height: win.w, transform: `translate(-50%, -50%) rotate(${angle}deg)`, display: 'flex', flexDirection: 'column', background: '#f7f4ec' }
    : { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#f7f4ec', transform: angle ? `rotate(${angle}deg)` : undefined };
  const safe = !pc && !angle;

  const bar = (
    <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 10, padding: safe ? 'calc(6px + env(safe-area-inset-top)) 16px 6px' : '6px 16px' }}>
      <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>インタラクティブテスト</span>
      <div style={{ display: 'flex', background: '#efece3', borderRadius: 999, padding: 2 }}>
        {[[true, 'PC'], [false, 'iPad']].map(([k, n]) => <button key={n} onClick={() => setOri({ ...ori, pc: k })} style={pill(pc === k)}>{n}</button>)}
      </div>
      <div style={{ display: 'flex', background: '#efece3', borderRadius: 999, padding: 2 }}>
        {[['auto', '自動'], ['portrait', '縦'], ['landscape', '横']].map(([k, n]) => <button key={k} onClick={() => setOri({ ...ori, mode: k })} style={pill(ori.mode === k)}>{n}</button>)}
      </div>
      <button onClick={() => setOri({ ...ori, flip: !ori.flip })} aria-label="上下を逆に" style={{ width: 34, height: 34, borderRadius: '50%', border: '1.5px solid #e4e1d8', background: ori.flip ? '#1b1b18' : '#fff', color: ori.flip ? '#fff' : 'inherit', cursor: 'pointer', fontSize: 16, padding: 0 }}>⟲</button>
      <button onClick={toggleFull} aria-label="フルスクリーン" style={{ width: 34, height: 34, borderRadius: '50%', border: '1.5px solid #e4e1d8', background: '#fff', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={ms(0, 20)}>fullscreen</span></button>
      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 13, fontWeight: 700 }}>{count0}</span>
      <button onClick={shake} style={ghost}>🔀 R</button>
      <button onClick={clear} style={ghost}>リセット</button>
    </div>
  );
  // 数字キー（キーボードがないとき用）。PC モードでは上の余白の残りの高さいっぱい
  const keys = (
    <div style={{ position: 'relative', zIndex: 2, display: 'flex', gap: 6, flex: pc ? 1 : '0 0 auto', minHeight: 0, padding: pc ? '0 12px 10px' : (safe ? '8px 12px calc(8px + env(safe-area-inset-bottom))' : '8px 12px'), background: pc ? 'transparent' : '#fff', borderTop: pc ? 'none' : '1px solid #efece3' }}>
      {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map(k => (
        <button key={k} onClick={() => drop(k)} style={{ flex: 1, height: pc ? 'auto' : 52, maxHeight: pc ? 120 : undefined, border: 'none', borderRadius: 12, background: KEYS[k].rec ? '#eef7cc' : (pc ? '#fff' : '#f1efe8'), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, cursor: 'pointer', fontFamily: 'inherit' }}>
          <span style={{ fontSize: 18 }}>{KEYS[k].g}</span>
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, fontWeight: 700, color: '#55554e' }}>{k}</span>
        </button>
      ))}
    </div>
  );
  // フッター（本体のナビと同じ見た目。ゲージ＝シャカの画面なのでゲージが選ばれた色）
  const navIcon = Math.round(Math.max(23, Math.min(56, mBot * 0.24)));
  const navLabel = Math.round(Math.max(10, Math.min(22, mBot * 0.09)));
  const footer = (
    <div style={{ flex: `0 0 ${mBot}px`, display: 'flex', alignItems: 'stretch', background: '#fff', borderTop: '1px solid #efece3' }}>
      {[['book', 'auto_stories', '本棚', 'B'], ['home', 'home', 'ホーム', 'H'], ['gauge', 'blur_on', 'ゲージ', 'G']].map(([id, ic, n, key]) => { const on = tab === id; return (
        <div key={ic} onClick={() => setTab(id)} style={{ cursor: 'pointer', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: navLabel * 0.4, fontSize: navLabel, fontWeight: 700, color: on ? '#1b1b18' : '#8a8a82' }}>
          <span style={ms(on ? 1 : 0, navIcon)}>{ic}</span><span>{n}<span style={{ marginLeft: '0.4em', fontFamily: "'Space Mono',monospace", fontWeight: 700, color: '#8a8a82' }}>{key}</span></span>
        </div>
      ); })}
    </div>
  );

  return (
    <div ref={outerRef} style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#f7f4ec' }}>
    <div style={rootStyle}>
      {pc ? (
        <>
          <div style={{ flex: `0 0 ${mTop}px`, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#efece3' }}>{bar}{keys}</div>
          {stage({ flex: `0 0 ${bh}px`, width: bw, margin: '0 auto' })}
          {mBot > 0 && footer}
        </>
      ) : (
        <>
          {bar}
          {stage({ flex: 1, minHeight: 0 })}
          {keys}
        </>
      )}
    </div>
    </div>
  );
}
