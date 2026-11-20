import Matter from 'matter-js';
import { mountDog, DOG_RATIO } from './dog3d';
import { appendGlyph } from './fluent';

/* やるきーぬがシャカシャカ（がんばりゲージ）の山の上を自由に動く。物理の体はなく、絵文字の山の上に立つだけ。
   - うろうろ歩く・山のいちばん高いところに登る・ゴロゴロ転がる・近くの絵文字を投げる・山にもぐる
   - 満杯に近づくと山にうもれて、テレビの中継（ワイプ）で顔を映して「ねー、きゅうくつだよー！やすんでー！」
   卒展（sotsuten）とほどふぉ（kamepace）で同じファイルを使う（コピー）。
   使い方: const roam = createDogRoam({...}); 毎フレーム roam.update() → 犬の場所 {x, y, w} が返る */
export const LIVE_LINE = 'ねー、きゅうくつだよー！やすんでー！';
export const FULL_AT = 0.85; // 満杯のこの割合から「きゅうくつ」
const WALK = 0.17; // 歩く速さ（箱の幅/秒）
const ROLL = 0.26; // 転がる速さ（箱の幅/秒）
const LIVE_MS = 7000; // 中継を出しておく時間
const LIVE_AGAIN_MS = 40000; // 満杯のあいだ、この間隔でまた中継
const LIVE_POKE_MS = 12000; // 満杯で絵文字が増えたら（前の中継からこれだけたっていれば）中継
const rnd = (a, b) => a + Math.random() * (b - a);
const pickW = (list) => { let t = Math.random() * list.reduce((a, x) => a + x[1], 0); for (const x of list) { t -= x[1]; if (t <= 0) return x[0]; } return list[0][0]; };

/* box: 箱の要素（絵文字と同じ座標）・W H: 箱の大きさ・r: 絵文字の半径・dogH: 犬の高さ
   pile(): 山の絵文字（Matter の body の配列。回復や灰色の予定はのぞく）
   glyphs(): 山の絵文字の文字（中継の背景に使う）・fill(): 満杯に対する割合（1で満杯）
   wake(): 絵文字を動かしたあとに呼ぶ（ほどふぉは止めた物理を動かし直す）
   liveTop: 中継を出す高さ（箱の上から）・canAct(): false のあいだは止まる（記録中など） */
export function createDogRoam({ box, W, H, r, dogH, pile, glyphs = () => [], fill = () => 0, wake = () => {}, liveTop = 150, canAct = () => true }) {
  const dogW = Math.round(dogH * DOG_RATIO);
  const el = document.createElement('div');
  el.className = 'dog-pic'; el.dataset.noshot = '1'; // シャカの共有画像（shakaShot.js）には入れない
  Object.assign(el.style, { position: 'absolute', left: 0, top: 0, zIndex: 2, height: dogH + 'px', width: dogW + 'px', pointerEvents: 'none', willChange: 'transform', transformOrigin: '50% 58%' });
  box.appendChild(el);
  const ctl = mountDog(el, { wide: 1.8 });

  const st = { x: W / 2, y: H, ready: false, rot: 0, spin: 0, jy: 0, jv: 0, dig: 0, digT: 0, face: 0, act: null, last: performance.now(), next: performance.now() + 2500, full: false, liveAt: 0, live: null, buried: false, jigAt: 0 };
  const foot = dogW * 0.3; // 足もとの幅の半分
  const bodies = () => pile().filter(b => b && !b.isStatic);
  /* x の場所の山の上（立つ高さ）。落ちている途中のは見ない */
  const surf = (x, half = foot) => {
    let top = H;
    for (const b of bodies()) { const p = b.position; if (b.speed > 1.5 || p.y < r) continue; if (Math.abs(p.x - x) < half && p.y - r * 0.85 < top) top = p.y - r * 0.85; }
    return top;
  };
  const clampX = (x) => Math.min(W - dogW / 2, Math.max(dogW / 2, x));
  const face = (dir) => { st.face = dir; ctl.turn(dir * 0.95); }; // 横を向く（真横だと顔が見えないので斜め）
  const nudge = (cx, cy, rad, k) => { // まわりの絵文字を少しゆらす（もぐる・うもれてもがく）
    let n = 0;
    for (const b of bodies()) {
      const p = b.position; if (Math.hypot(p.x - cx, p.y - cy) > rad) continue;
      Matter.Sleeping.set(b, false);
      Matter.Body.setVelocity(b, { x: b.velocity.x + rnd(-1, 1) * k, y: b.velocity.y - rnd(0.3, 1) * k });
      n++;
    }
    if (n) wake();
  };

  /* ---- 次になにをするか ---- */
  const plan = () => {
    const now = performance.now();
    const deep = H - surf(st.x); // 足もとの山の深さ
    const choice = pickW([['stay', 2], ['walk', 3], ['climb', 2], ['roll', 1.6], ['throw', bodies().length ? 1.8 : 0], ['dig', deep > dogH * 0.55 ? 1.4 : 0]]);
    if (choice === 'stay') { st.act = { k: 'stay', until: now + rnd(2500, 5000) }; face(0); ctl.setBase('idle'); return; }
    if (choice === 'walk' || choice === 'climb') {
      let tx = clampX(rnd(dogW / 2, W - dogW / 2));
      if (choice === 'climb') { // 山のいちばん高いところへ
        let best = null; for (const b of bodies()) { if (b.speed > 1.5) continue; if (!best || b.position.y < best.position.y) best = b; }
        if (best) tx = clampX(best.position.x);
      }
      if (Math.abs(tx - st.x) < W * 0.08) tx = clampX(st.x + (st.x < W / 2 ? 1 : -1) * W * 0.25);
      st.act = { k: choice, tx }; face(tx > st.x ? 1 : -1); ctl.setBase('walk');
      return;
    }
    if (choice === 'roll') {
      const dir = st.x < W * 0.35 ? 1 : st.x > W * 0.65 ? -1 : (Math.random() < 0.5 ? -1 : 1);
      const tx = clampX(st.x + dir * rnd(0.22, 0.4) * W);
      st.act = { k: 'roll', tx, dir }; face(0); ctl.setBase('relax');
      return;
    }
    if (choice === 'throw') { // 近くの山の上のほうの絵文字をつかんで、ぽーんと投げる
      const near = bodies().filter(b => b.speed < 1.5 && Math.abs(b.position.x - st.x) < W * 0.3 && b.position.y < surf(b.position.x, r * 1.2) + r * 3);
      const tgt = near.length ? near[Math.floor(Math.random() * near.length)] : null;
      if (!tgt) { st.act = { k: 'stay', until: now + 1500 }; return; }
      const dir = tgt.position.x >= st.x ? 1 : -1;
      st.act = { k: 'throw', tgt, dir, tx: clampX(tgt.position.x - dir * dogW * 0.35), phase: 'go' }; face(dir); ctl.setBase('walk');
      return;
    }
    if (choice === 'dig') { st.act = { k: 'dig', phase: 'down', t0: now }; face(0); ctl.setBase('idle'); ctl.play('shake', 2); }
  };
  const done = (after) => { st.act = null; st.next = performance.now() + rnd(600, 1600); face(0); ctl.setBase('idle'); if (after) ctl.play(after, 1); };

  /* ---- 犬を山の後ろ（もぐる）／前に ---- */
  const setBuried = (b) => {
    if (st.buried === b) return; st.buried = b;
    if (b) { el.style.zIndex = '0'; box.insertBefore(el, box.firstChild); } // 絵文字より後ろにかく
    else { el.style.zIndex = '2'; }
  };

  /* ---- 中継（ワイプ）: 顔のアップ＋テロップ ---- */
  const showLive = () => {
    if (st.live) return;
    st.liveAt = performance.now();
    const w = Math.round(Math.min(Math.max(W * 0.46, 190), 380, W * 0.62)), vh = Math.round(w * 0.72);
    const wrap = document.createElement('div');
    wrap.className = 'dog-live'; wrap.dataset.noshot = '1';
    Object.assign(wrap.style, { position: 'absolute', left: Math.round(W * 0.04) + 'px', top: liveTop + 'px', width: w + 'px', zIndex: 5, pointerEvents: 'none' });
    const scr = document.createElement('div'); scr.className = 'dog-live-screen'; scr.style.height = vh + 'px';
    // 背景: 山の絵文字がまわりからぎゅうぎゅうに押してくる
    const gs = glyphs(); const pool = gs.length ? gs : ['😫', '💻', '🎨'];
    const sz = Math.round(vh * 0.42);
    const spots = [[-0.12, 0.62], [0.08, 0.86], [0.3, 0.98], [0.55, 1.0], [0.78, 0.9], [0.98, 0.64], [1.04, 0.3], [-0.08, 0.24], [0.9, 0.02], [0.02, -0.08]];
    spots.forEach(([fx, fy], i) => {
      const g = document.createElement('div'); g.className = 'dog-live-emoji';
      Object.assign(g.style, { left: (fx * w - sz / 2) + 'px', top: (fy * vh - sz / 2) + 'px', width: sz + 'px', height: sz + 'px', animationDelay: (i * -0.13) + 's', '--dx': ((0.5 - fx) * 14) + 'px', '--dy': ((0.5 - fy) * 14) + 'px' });
      appendGlyph(g, pool[Math.floor(Math.random() * pool.length)], sz);
      scr.appendChild(g);
    });
    const faceEl = document.createElement('div'); faceEl.className = 'dog-live-face';
    scr.insertBefore(faceEl, scr.firstChild);
    const tag = document.createElement('div'); tag.className = 'dog-live-tag'; tag.innerHTML = '<i></i>LIVE';
    scr.appendChild(tag);
    const telop = document.createElement('div'); telop.className = 'dog-live-telop'; telop.style.fontSize = Math.round(Math.max(12, Math.min(17, w / 15))) + 'px'; // せまい画面でも2行くらいに
    wrap.appendChild(scr); wrap.appendChild(telop);
    box.appendChild(wrap);
    const fc = mountDog(faceEl, { frame: 'face', base: 'sad' });
    fc.play('shake', 2);
    // テロップは1文字ずつ
    let n = 0; const typeT = setInterval(() => { n++; telop.textContent = LIVE_LINE.slice(0, n); if (n >= LIVE_LINE.length) clearInterval(typeT); }, 70);
    const hideT = setTimeout(hideLive, LIVE_MS);
    st.live = { wrap, fc, typeT, hideT };
  };
  function hideLive() {
    const L = st.live; if (!L) return; st.live = null;
    clearInterval(L.typeT); clearTimeout(L.hideT);
    L.wrap.classList.add('out');
    setTimeout(() => { L.fc.dispose(); L.wrap.remove(); }, 350);
  }

  /* ---- 毎フレーム ---- */
  const update = () => {
    const now = performance.now(), dt = Math.min(0.05, (now - st.last) / 1000); st.last = now;
    const active = canAct();
    if (!active) { if (st.live) hideLive(); return place(); }
    // 満杯に近い → うもれて中継
    const f = fill();
    const full = f >= FULL_AT;
    if (full && !st.full) { st.act = null; showLive(); ctl.setBase('sad'); face(0); }
    if (!full && st.full) { if (st.live) hideLive(); setBuried(false); st.next = now + 800; ctl.setBase('idle'); ctl.play('happy', 1); }
    st.full = full;
    const petting = ctl.petAt && now - ctl.petAt < 700; // なでられているあいだは止まる
    let rollY = 0;
    if (full) {
      if (now - st.liveAt > LIVE_AGAIN_MS) showLive();
      setBuried(true);
      st.dig += (1 - st.dig) * Math.min(1, dt * 2);
      if (now - st.jigAt > 1600) { st.jigAt = now; nudge(st.x, st.y - dogH * 0.5, dogW * 0.8, 1.6); } // うもれてもがく
    } else if (st.act && !petting) {
      const a = st.act;
      if (a.k === 'stay') { if (now > a.until) done(); }
      else if (a.k === 'walk' || a.k === 'climb' || (a.k === 'throw' && a.phase === 'go')) {
        const d = a.tx - st.x, v = WALK * W * dt;
        if (Math.abs(d) <= v) {
          st.x = a.tx;
          if (a.k === 'throw') { a.phase = 'throw'; a.t0 = now; face(a.dir * 0.6); ctl.setBase('idle'); ctl.play('wave', 1); }
          else done(a.k === 'climb' ? 'doya' : null);
        } else st.x += Math.sign(d) * v;
      } else if (a.k === 'throw') {
        if (!a.thrown && now - a.t0 > 450) { // 手をふりあげたところで投げる
          a.thrown = true;
          const b = a.tgt, k = Math.sqrt(Math.max(1, r / 20));
          if (b && b.position) {
            Matter.Sleeping.set(b, false);
            Matter.Body.setPosition(b, { x: b.position.x, y: b.position.y - r * 0.5 });
            Matter.Body.setVelocity(b, { x: a.dir * rnd(4, 8) * k, y: -rnd(11, 15) * k });
            Matter.Body.setAngularVelocity(b, a.dir * rnd(0.15, 0.35));
            wake();
          }
        }
        if (now - a.t0 > 1500) done('happy');
      } else if (a.k === 'roll') {
        const d = a.tx - st.x, v = ROLL * W * dt;
        const mv = Math.abs(d) <= v ? d : Math.sign(d) * v;
        st.x += mv; st.rot += mv / (dogH * 0.36); // 転がった距離＝回った角度×半径
        rollY = dogH * 0.26;
        if (Math.abs(d) <= v) { // 止まるときは起き上がる（いちばん近いまっすぐの向きへ）
          a.k = 'rollEnd';
        }
      } else if (a.k === 'rollEnd') {
        const up = Math.round(st.rot / (Math.PI * 2)) * Math.PI * 2;
        st.rot += (up - st.rot) * Math.min(1, dt * 6); rollY = dogH * 0.26 * Math.min(1, Math.abs(up - st.rot));
        if (Math.abs(up - st.rot) < 0.02) { st.rot = 0; done('happy'); }
      } else if (a.k === 'dig') {
        const t = now - a.t0;
        if (a.phase === 'down') {
          if (t > 250) setBuried(true);
          st.dig = Math.min(0.75, t / 1400 * 0.75);
          if (now - st.jigAt > 350) { st.jigAt = now; nudge(st.x, st.y - dogH * 0.3, dogW * 0.6, 1.1); }
          if (t > 1400) { a.phase = 'in'; a.t0 = now; }
        } else if (a.phase === 'in') { // もぐったまま、顔だけ出してきょろきょろ
          if (!a.look) { a.look = true; face(-1); setTimeout(() => face(1), 900); setTimeout(() => face(0), 1800); }
          if (t > 2600) { a.phase = 'up'; a.t0 = now; ctl.play('happy', 1); nudge(st.x, st.y - dogH * 0.4, dogW * 0.7, 2.2); }
        } else {
          st.dig = Math.max(0, 0.75 - t / 600 * 0.75);
          if (t > 600) { st.dig = 0; setBuried(false); done(); }
        }
      }
    } else if (!st.act && !petting && now > st.next) plan();
    if (!full && !(st.act && st.act.k === 'dig')) { st.dig += (0 - st.dig) * Math.min(1, dt * 4); if (st.dig < 0.02 && st.buried && !full) setBuried(false); }
    // ジャンプ（シャカで飛ばされたとき）
    if (st.jy < 0 || st.jv) { st.jv += 2600 * dt; st.jy += st.jv * dt; st.rot += st.spin * dt; if (st.jy >= 0) { st.jy = 0; st.jv = 0; st.act = { k: 'rollEnd' }; } }
    // 高さ: 足もとの山の上。ゆっくり追いかける（山のゆれでガタつかない）
    const ty = surf(st.x);
    if (!st.ready) { st.y = ty; st.ready = true; }
    else st.y += (ty - st.y) * Math.min(1, dt * 7);
    st.rollY = rollY;
    return place();
  };
  const place = () => {
    const x = clampX(st.x);
    const y = Math.max(dogH * (1 - st.dig * 0.9), Math.min(H + dogH * 0.2, st.y + dogH * st.dig * 0.85 + (st.rollY || 0))) + st.jy;
    el.style.transform = `translate(${x - dogW / 2}px, ${y - dogH}px)` + (st.rot ? ` rotate(${st.rot}rad)` : '');
    return { x, y, w: dogW, h: dogH, buried: st.buried, dig: st.dig, live: !!st.live, full: st.full, busy: !!st.act };
  };

  return {
    el, ctl, update,
    /* 絵文字が増えたとき（満杯なら中継をもう一度） */
    poke() { if (st.full && !st.live && performance.now() - st.liveAt > LIVE_POKE_MS) showLive(); },
    /* シャカシャカ: ぴょーんと飛ばされてくるっと回る */
    jolt() { if (st.full) return; if (st.act && st.act.k === 'dig') { st.dig = 0; setBuried(false); } st.act = { k: 'jump' }; face(0); st.jv = -rnd(700, 950); st.jy = -1; st.spin = (Math.random() < 0.5 ? -1 : 1) * rnd(8, 11); },
    busy: () => !!st.act || st.full,
    dispose() { if (st.live) { const L = st.live; st.live = null; clearInterval(L.typeT); clearTimeout(L.hideT); L.fc.dispose(); L.wrap.remove(); } ctl.dispose(); el.remove(); },
  };
}
