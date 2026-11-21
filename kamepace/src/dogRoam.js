import Matter from 'matter-js';
import { mountDog, DOG_RATIO } from './dog3d';
import { appendGlyph } from './fluent';

/* やるきーぬがシャカシャカ（がんばりゲージ）の山の上を自由に動く。物理の体はなく、絵文字の山の上に立つだけ。
   - うろうろ歩く（前の絵文字を蹴散らす）・四つ足で山のいちばん高いところに登る・四つ足で丸まってゴロゴロ・近くの絵文字を投げる
     ・四つ足で前足で掘ってもぐる（掘った絵文字を後ろへ飛ばす）・四つ足で伏せて寝る（モーションは dog3d.js の dig ball nap crawl）
   - 犬にも物理の体（動かない体＝static を毎フレーム犬の場所へ動かす）があり、絵文字は犬をよける・押しのけられる・頭に乗る
   - 山が高くなって犬の目が画面の上から出たら、テレビの中継（ワイプ）で顔を映して「ねー、きゅうくつだよー！やすんでー！」
   卒展（sotsuten）とほどふぉ（kamepace）で同じファイルを使う（コピー）。
   使い方: const roam = createDogRoam({...}); 毎フレーム roam.update() → 犬の場所 {x, y, w} が返る */
export const LIVE_LINE = 'ねー、きゅうくつだよー！やすんでー！';
const WALK = 0.17; // 歩く速さ（箱の幅/秒）
const ROLL = 0.26; // 転がる速さ（箱の幅/秒）
const EYE = 0.7; // 目の高さ（足もとから・犬の高さに対して）
const NEAR_FULL = 0.7; // 山の絵文字が箱の広さのこれだけを埋めていないときは中継を出さない（降ってきた絵文字が頭に乗っただけ・山の一部が高いだけで出ないように）
const OFF_MS = 300, BACK_MS = 600; // 目が画面の外に出て／もどって、これだけたったら中継を出す／しまう
const rnd = (a, b) => a + Math.random() * (b - a);
const pickW = (list) => { let t = Math.random() * list.reduce((a, x) => a + x[1], 0); for (const x of list) { t -= x[1]; if (t <= 0) return x[0]; } return list[0][0]; };

/* box: 箱の要素（絵文字と同じ座標）・W H: 箱の大きさ・r: 絵文字の半径・dogH: 犬の高さ
   pile(): 山の絵文字（Matter の body の配列。回復や灰色の予定はのぞく）
   engine: Matter のエンジン（犬の体を入れる）・glyphs(): 山の絵文字の文字（中継の背景に使う）
   wake(): 絵文字を動かしたあとに呼ぶ（ほどふぉは止めた物理を動かし直す）
   liveTop: 中継を出す高さ（箱の上から）・canAct(): false のあいだは止まる（記録中など） */
export function createDogRoam({ box, engine, W, H, r, dogH, pile, glyphs = () => [], wake = () => {}, liveTop = 150, canAct = () => true, onTapped = null }) {
  const dogW = Math.round(dogH * DOG_RATIO);
  const el = document.createElement('div');
  el.className = 'dog-pic'; el.dataset.noshot = '1'; // シャカの共有画像（shakaShot.js）には入れない
  Object.assign(el.style, { position: 'absolute', left: 0, top: 0, zIndex: 2, height: dogH + 'px', width: dogW + 'px', pointerEvents: 'none', willChange: 'transform', transformOrigin: '50% 58%' });
  box.appendChild(el);
  const ctl = mountDog(el, { wide: 1.8 });
  ctl.roamed = true; // なでたときの反応はこちらで（PetCursor.jsx は ♥ だけ）

  const t0 = performance.now();
  const st = { x: W / 2, y: H, ready: false, rot: 0, spin: 0, jy: 0, jv: 0, dig: 0, face: 0, act: null, last: t0, next: t0 + 2500, off: false, offAt: 0, live: null, buried: false, wakeAt: 0, px: null, py: null };
  // 犬の体（角の丸い四角・回転の中心＝絵の 50% 58%）。山がおちつくまで少し待ってから入れる（いきなり重なって絵文字がはじけないように）
  const BW = dogW * 0.56, BH = dogH * 0.82, PIV = 0.42; // 体の幅・高さ・回転の中心（足もとから）
  const body = Matter.Bodies.rectangle(W / 2, H, BW, BH, { isStatic: true, chamfer: { radius: BW * 0.45 }, friction: 0.4, label: 'dog' });
  let inWorld = false;
  const bodies = () => pile().filter(b => b && !b.isStatic);
  /* x の場所の山の上（立つ高さ）。落ちている途中のは見ない */
  const surf = (x, half) => {
    let top = H;
    for (const b of bodies()) { const p = b.position; if (b.speed > 1.5 || p.y < r) continue; if (Math.abs(p.x - x) < half && p.y - r * 0.85 < top) top = p.y - r * 0.85; }
    return top;
  };
  /* 犬が立つ高さ: 足もとの何本かの列の山の高さの「真ん中」。いちばん高い絵文字に合わせると浮いて見えるので、
     出っぱった絵文字は犬の体で押しのける（蹴散らす）。頭や背中に乗っている絵文字は見ない（見ると自分で自分を持ち上げてしまう） */
  const dogSurf = (x0 = st.x) => { // x0: そこに立ったときの高さ（ふだんは今いる場所）
    const hw = BW / 2, offs = [-hw - r * 2.5, -hw - r, -hw * 0.6, -hw * 0.2, hw * 0.2, hw * 0.6, hw + r, hw + r * 2.5];
    const cols = offs.map(d => x0 + d), tops = cols.map(() => null);
    for (const b of bodies()) {
      const p = b.position; if (b.speed > 1.5 || p.y < r) continue; // 落ちてくるところ（出たばかりで速さ0・箱の上）は数えない
      const dx = Math.abs(p.x - x0); if (dx > hw + r * 3.5) continue;
      if (Math.abs(p.x - st.x) < hw && st.ready && p.y < st.y - r * 0.5) continue; // 体の上に乗っている
      const top = p.y - r * 0.85;
      cols.forEach((cx, i) => { if (cx > 0 && cx < W && Math.abs(p.x - cx) < r && (tops[i] == null || top < tops[i])) tops[i] = top; });
    }
    const t = tops.filter(v => v != null).sort((a, b) => a - b); // 絵文字がない列（犬の下が空いている・箱の外）は数えない
    if (!t.length) return H;
    return t.length % 2 ? t[(t.length - 1) / 2] : (t[t.length / 2 - 1] + t[t.length / 2]) / 2;
  };
  /* 歩きながら、足もとの前にある絵文字を蹴る */
  const kickAt = new WeakMap();
  const kick = (dir) => {
    const now = performance.now(), hw = BW / 2, k = Math.sqrt(Math.max(1, r / 20));
    let n = 0;
    for (const b of bodies()) {
      const p = b.position, dx = (p.x - st.x) * dir;
      if (dx < hw * 0.4 || dx > hw + r * 1.6 || Math.abs(p.y - (st.y - r)) > r * 1.6) continue;
      if (now - (kickAt.get(b) || 0) < 700) continue;
      kickAt.set(b, now);
      Matter.Sleeping.set(b, false);
      Matter.Body.setVelocity(b, { x: dir * rnd(3, 6) * k, y: -rnd(4, 8) * k });
      Matter.Body.setAngularVelocity(b, dir * rnd(0.1, 0.3));
      n++;
    }
    if (n) wake();
  };
  /* 前足で掘った絵文字を、後ろへぽいっと飛ばす */
  const scoop = (dir) => {
    const hw = BW / 2, k = Math.sqrt(Math.max(1, r / 20));
    const near = bodies().filter(b => { const dx = (b.position.x - st.x) * dir; return dx > -hw * 0.2 && dx < hw + r * 2 && Math.abs(b.position.y - st.y) < r * 2.5; });
    if (!near.length) return;
    const b = near[Math.floor(Math.random() * near.length)];
    Matter.Sleeping.set(b, false);
    Matter.Body.setPosition(b, { x: b.position.x, y: b.position.y - r * 0.4 });
    Matter.Body.setVelocity(b, { x: -dir * rnd(3.5, 6.5) * k, y: -rnd(7, 11) * k });
    Matter.Body.setAngularVelocity(b, -dir * rnd(0.2, 0.4));
    wake();
  };
  const clampX = (x) => Math.min(W - dogW / 2, Math.max(dogW / 2, x));
  const face = (dir) => { st.face = dir; ctl.turn(dir * 0.95); }; // 横を向く（真横だと顔が見えないので斜め）
  /* ---- 次になにをするか ---- */
  const plan = () => {
    const now = performance.now();
    const deep = H - dogSurf(); // 足もとの山の深さ
    st.rot = 0; // 転がっている途中でほかの動きに切りかわったとき
    const choice = st.force || pickW([['stay', 1.6], ['walk', 3], ['climb', 2], ['roll', 1.6], ['throw', bodies().length ? 1.8 : 0], ['dig', deep > dogH * 0.55 ? 1.6 : 0], ['nap', 1]]);
    st.force = null;
    if (choice === 'stay') { st.act = { k: 'stay', until: now + rnd(5000, 9000) }; face(0); ctl.setBase('idle'); return; }
    if (choice === 'nap') { st.act = { k: 'stay', until: now + rnd(14000, 22000), nap: true }; face(rnd(-0.5, 0.5)); ctl.setBase('nap'); return; } // 四つ足のまま伏せて寝る
    if (choice === 'walk' || choice === 'climb') {
      let tx = clampX(rnd(dogW / 2, W - dogW / 2));
      if (choice === 'climb') { // 山のいちばん高いところへ
        let best = null; for (const b of bodies()) { if (b.speed > 1.5) continue; if (!best || b.position.y < best.position.y) best = b; }
        if (best) tx = clampX(best.position.x);
      }
      if (Math.abs(tx - st.x) < W * 0.3 && choice === 'walk') tx = clampX(st.x + (st.x < W / 2 ? 1 : -1) * rnd(0.35, 0.6) * W); // 1回の散歩を長めに
      else if (Math.abs(tx - st.x) < W * 0.08) tx = clampX(st.x + (st.x < W / 2 ? 1 : -1) * W * 0.25);
      st.act = { k: choice, tx, rest: choice === 'climb' ? rnd(3000, 5000) : 0 }; face(tx > st.x ? 1 : -1); ctl.setBase(choice === 'climb' ? 'crawl' : 'walk', true); // 登るときは四つ足
      return;
    }
    if (choice === 'roll') {
      const dir = st.x < W * 0.35 ? 1 : st.x > W * 0.65 ? -1 : (Math.random() < 0.5 ? -1 : 1);
      const tx = clampX(st.x + dir * rnd(0.4, 0.65) * W);
      st.act = { k: 'roll', tx, dir }; face(0); ctl.setBase('ball', true); // 四つ足のまま丸まって転がる
      return;
    }
    if (choice === 'throw') { // 近くの山の上のほうの絵文字をつかんで、ぽーんと投げる
      const near = bodies().filter(b => b.speed < 1.5 && Math.abs(b.position.x - st.x) < W * 0.3 && b.position.y < surf(b.position.x, r * 1.2) + r * 3);
      const tgt = near.length ? near[Math.floor(Math.random() * near.length)] : null;
      if (!tgt) { st.throwN = null; st.act = { k: 'stay', until: now + 1500 }; return; }
      const dir = tgt.position.x >= st.x ? 1 : -1;
      st.act = { k: 'throw', tgt, dir, tx: clampX(tgt.position.x - dir * dogW * 0.35), phase: 'go', left: st.throwN != null ? st.throwN : Math.floor(rnd(2, 4)) - 1 }; st.throwN = null; face(dir); ctl.setBase('walk', true);
      return;
    }
    if (choice === 'dig') { const dir = Math.random() < 0.5 ? -1 : 1; st.act = { k: 'dig', phase: 'down', t0: now, baseY: st.y, dir, scoopAt: 0 }; face(dir); ctl.setBase('dig'); } // 横を向いて、四つ足で前足で掘る
  };
  /* 動き出してよいか: そのモーションに切りかわってから少しずつ速く（足が動く前に体だけすべらないように）。0〜1 */
  const gait = (name) => {
    const m = ctl.motion(); if (!m) return 1; // 3Dが出ていない（絵のまま）ときはそのまま動く
    if (m.name !== name) { ctl.setBase(name, true); return 0; }
    return Math.max(0, Math.min(1, (m.t - 0.2) / 0.35));
  };
  /* ---- なでられる（卒展の PetCursor.jsx が ctl.petAt を入れる） ----
     なでられているあいだはずっと喜ぶ（happy をくり返す）。長すぎると飽きてぶるぶるして歩いていく（しばらくなでても止まらない）。
     なで終わったら、ときどきカーソルのほうを向いて「もっとなでて」（beg） */
  const PET_BORED_MS = 9000, PET_COOL_MS = 7000;
  let cursorX = null;
  const onPtr = (e) => { cursorX = e.clientX; };
  window.addEventListener('pointermove', onPtr);
  const faceCursor = () => { // カーソルが犬の右なら右、左なら左を向く（真横ではなく少し）
    if (cursorX == null) return;
    const rc = el.getBoundingClientRect(), d = cursorX - (rc.left + rc.width / 2);
    ctl.turn(Math.max(-0.7, Math.min(0.7, d / (rc.width * 1.5))));
  };
  const petUpdate = (now) => {
    const on = ctl.petAt && now - ctl.petAt < 500;
    if (st.bored && now - st.bored > PET_COOL_MS) st.bored = 0;
    if (on && !st.bored && !st.off) {
      if (!st.petting) { st.petting = true; st.petStart = now; if (st.act && st.act.k === 'dig') { st.dig = 0; setBuried(false); } st.act = null; st.rot = 0; face(0); ctl.setBase('happy', true); }
      else if (now - st.petStart > PET_BORED_MS) { // 飽きた
        st.petting = false; st.bored = now; ctl.play('shake', 1); st.force = 'walk'; st.next = now + 1100;
      }
    } else if (st.petting) { // なで終わった
      st.petting = false;
      if (Math.random() < 0.6) { st.act = { k: 'beg', until: now + rnd(2600, 4200) }; faceCursor(); ctl.setBase('beg', true); }
      else { ctl.setBase('idle'); st.next = now + rnd(800, 1600); }
    }
  };
  const done = (after) => { const nap = st.act && st.act.nap; st.act = null; st.next = performance.now() + rnd(1200, 2600); face(0); ctl.setBase('idle'); if (after) ctl.play(after, 1); else if (nap) ctl.play('happy', 1); };

  /* ---- 犬を山の後ろ（もぐる）／前に ---- */
  const setBuried = (b) => {
    if (st.buried === b) return; st.buried = b;
    if (b) { el.style.zIndex = '0'; box.insertBefore(el, box.firstChild); } // 絵文字より後ろにかく
    else { el.style.zIndex = '2'; }
  };

  /* ---- 中継（ワイプ）: 顔のアップ＋テロップ ---- */
  const showLive = () => {
    if (st.live) return;
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
    st.live = { wrap, fc, typeT };
  };
  function hideLive() {
    const L = st.live; if (!L) return; st.live = null;
    clearInterval(L.typeT);
    L.wrap.classList.add('out');
    setTimeout(() => { L.fc.dispose(); L.wrap.remove(); }, 350);
  }

  /* ---- タッチ（クリック）されたら反応する ----
     ぴょんと跳ねて喜ぶ（続けてさわると手をふる・ドヤ顔）。寝ていたらびっくりしてぶるぶる→喜ぶ。もぐっていたら飛び出す */
  const onTap = (e) => {
    if (!canAct() || st.off || !st.ready) return;
    const rc = el.getBoundingClientRect(), x = e.clientX, y = e.clientY;
    if (!(x > rc.left + rc.width * 0.15 && x < rc.right - rc.width * 0.15 && y > rc.top + rc.height * 0.08 && y < rc.bottom - rc.height * 0.04)) return;
    const now = performance.now();
    st.taps = now - (st.tapAt || 0) < 3000 ? (st.taps || 0) + 1 : 1; st.tapAt = now;
    if (onTapped) onTapped();
    const a = st.act;
    if (a && a.k === 'jump') return; // 跳んでいるあいだはそのまま
    if (a && a.k === 'dig') { st.dig = 0; setBuried(false); }
    st.rot = 0; st.petting = false; face(0); ctl.setBase('idle');
    if (a && a.nap) { st.act = { k: 'stay', until: now + 1400, after: 'happy' }; ctl.play('shake', 1); return; } // 起こされた
    st.after = st.taps >= 3 ? (st.taps % 2 ? 'doya' : 'wave') : 'happy';
    st.act = { k: 'jump' }; st.jv = -rnd(380, 480) * Math.sqrt(dogH / 200); st.jy = -1; st.spin = 0;
  };
  window.addEventListener('pointerdown', onTap);

  /* ---- 毎フレーム ---- */
  const update = () => {
    const now = performance.now(), dt = Math.min(0.05, (now - st.last) / 1000); st.last = now;
    const active = canAct();
    if (!active) { if (st.live) hideLive(); st.off = false; st.offAt = 0; return place(); }
    // 目が画面の上から出たら中継（出ているあいだずっと）。もどったらしまう
    const eye = st.y + dogH * st.dig * 0.85 + st.jy - dogH * EYE;
    const out = eye < 0 && !(st.act && st.act.k === 'jump') && pile().length * Math.PI * r * r / (W * H) >= NEAR_FULL;
    if (out !== st.off) { if (!st.offAt) st.offAt = now; if (now - st.offAt > (out ? OFF_MS : BACK_MS)) { st.off = out; st.offAt = 0; if (out) { showLive(); st.act = null; st.rot = 0; face(0); ctl.setBase('sad'); } else { hideLive(); st.next = now + 800; ctl.setBase('idle'); ctl.play('happy', 1); } } }
    else st.offAt = 0;
    petUpdate(now);
    const petting = st.petting;
    let rollY = 0;
    if (st.off) {
      // 画面の外: きゅうくつで動けない
    } else if (st.act && !petting) {
      const a = st.act;
      if (a.k === 'stay') { if (now > a.until) done(a.after); }
      else if (a.k === 'beg') { faceCursor(); if (now > a.until) done(); } // カーソルを見ながらおねだり
      else if (a.k === 'walk' || a.k === 'climb' || (a.k === 'throw' && a.phase === 'go')) {
        const d = a.tx - st.x;
        // 前の山が高い（登り）あいだは四つ足で。少し平らが続いたら二本足にもどす（行ったり来たりしないように）
        if (st.y - dogSurf(st.x + Math.sign(d) * BW * 0.8) > r * 1.0) a.upAt = now;
        const quad = a.k === 'climb' || (a.upAt && now - a.upAt < 1200);
        const v = WALK * W * dt * gait(quad ? 'crawl' : 'walk') * Math.min(1, 0.3 + Math.abs(d) / (W * 0.05)); // 着く手前で少しずつ遅く
        if (Math.abs(d) <= v) {
          st.x = a.tx;
          if (a.k === 'throw') { a.phase = 'throw'; a.t0 = now; face(a.dir * 0.6); ctl.setBase('idle'); ctl.play('wave', 1); }
          else if (a.k === 'climb') { st.act = { k: 'stay', until: now + a.rest }; face(0); ctl.setBase('idle'); ctl.play('doya', 1); } // てっぺんでしばらく
          else done(null);
        } else { st.x += Math.sign(d) * v; kick(Math.sign(d)); } // 歩きながら前の絵文字を蹴散らす
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
        if (now - a.t0 > 1500) { if (a.left > 0) { st.throwN = a.left - 1; st.force = 'throw'; done(); st.next = now + 300; } else done('happy'); } // 2〜3回つづけて投げる
      } else if (a.k === 'roll') {
        const d = a.tx - st.x, v = ROLL * W * dt * gait('ball');
        const mv = Math.abs(d) <= v ? d : Math.sign(d) * v;
        st.x += mv; st.rot += mv / (dogH * 0.36); // 転がった距離＝回った角度×半径
        rollY = dogH * 0.26;
        if (Math.abs(d) <= v) { // 止まるときは起き上がる（いちばん近いまっすぐの向きへ）
          a.k = 'rollEnd';
        }
      } else if (a.k === 'rollEnd') {
        const up = Math.round(st.rot / (Math.PI * 2)) * Math.PI * 2;
        st.rot += (up - st.rot) * Math.min(1, dt * 6); rollY = dogH * 0.26 * Math.min(1, Math.abs(up - st.rot));
        if (Math.abs(up - st.rot) < 0.02) { st.rot = 0; done(a.after || 'happy'); }
      } else if (a.k === 'dig') {
        const t = now - a.t0;
        st.y = a.baseY; // もぐっているあいだは、もぐり始めた高さから下へ（押しのけた絵文字で持ち上がらない）
        const DEEP = 0.55, DOWN = 3600;
        if (a.phase !== 'up' && (a.phase === 'down' || t < 1200) && now - a.scoopAt > 260) { a.scoopAt = now; scoop(a.dir); } // 掘った絵文字を後ろへ
        if (a.phase === 'down') {
          if (t > 300) setBuried(true);
          st.dig = Math.min(DEEP, t / DOWN * DEEP);
          if (t > DOWN) { a.phase = 'in'; a.t0 = now; }
        } else if (a.phase === 'in') { // 掘り終わったら、顔を出してきょろきょろ
          if (t > 1200 && !a.look) { a.look = true; ctl.setBase('idle'); [[-1, 0], [1, 900], [0, 1800], [-0.5, 3200], [0.5, 4200], [0, 5200]].forEach(([f, ms]) => setTimeout(() => { if (st.act === a) face(f); }, ms)); }
          if (t > 6500) { a.phase = 'up'; a.t0 = now; ctl.play('happy', 1); }
        } else {
          st.dig = Math.max(0, DEEP - t / 900 * DEEP);
          if (t > 900) { st.dig = 0; setBuried(false); done(); }
        }
      }
    } else if (!st.act && !petting && now > st.next) plan();
    if (!(st.act && st.act.k === 'dig')) { st.dig += (0 - st.dig) * Math.min(1, dt * 4); if (st.dig < 0.02 && st.buried) setBuried(false); }
    // ジャンプ（シャカで飛ばされたとき）
    if (st.jy < 0 || st.jv) { st.jv += 2600 * dt; st.jy += st.jv * dt; st.rot += st.spin * dt; if (st.jy >= 0) { st.jy = 0; st.jv = 0; st.act = { k: 'rollEnd', after: st.after }; st.after = null; } }
    // 高さ: 足もとの山の上。ゆっくり追いかける（山のゆれでガタつかない）
    if (!(st.act && st.act.k === 'dig')) {
      const ty = dogSurf();
      if (!st.ready) { st.y = ty; st.ready = true; }
      else st.y += (ty - st.y) * Math.min(1, dt * 7);
    }
    st.rollY = rollY;
    return place();
  };
  const place = () => {
    const x = clampX(st.x);
    const y = Math.min(H + dogH * 0.2, st.y + dogH * st.dig * 0.85 + (st.rollY || 0)) + st.jy;
    el.style.transform = `translate(${x - dogW / 2}px, ${y - dogH}px)` + (st.rot ? ` rotate(${st.rot}rad)` : '');
    // 物理の体も同じ場所へ。動いたら近くの眠っている絵文字を起こす（起こさないと押しのけられない）
    const now = performance.now();
    if (!inWorld && st.ready && now - t0 > 1200) { Matter.Body.setPosition(body, { x, y: y - dogH * PIV }); Matter.World.add(engine.world, body); inWorld = true; }
    if (inWorld) {
      const moved = st.px == null || Math.abs(x - st.px) + Math.abs(y - st.py) > 0.3 || Math.abs(st.rot - body.angle) > 0.01;
      if (moved) {
        Matter.Body.setPosition(body, { x, y: y - dogH * PIV }); Matter.Body.setAngle(body, st.rot);
        st.px = x; st.py = y;
        const R2 = (dogH * 0.7) ** 2;
        for (const b of bodies()) if (b.isSleeping && (b.position.x - x) ** 2 + (b.position.y - y + dogH * PIV) ** 2 < R2) Matter.Sleeping.set(b, false);
        if (now - st.wakeAt > 400) { st.wakeAt = now; wake(); }
      }
    }
    return { x, y, w: dogW, h: dogH, buried: st.buried, dig: st.dig, live: !!st.live, off: st.off, busy: !!st.act };
  };

  return {
    el, ctl, update,
    force(k) { st.force = k; st.act = null; st.next = 0; }, // 確認用: 次の動きを決める（stay walk climb roll throw dig）
    offscreen: () => st.off, // 目が画面の外（中継中）
    /* シャカシャカ: ぴょーんと飛ばされてくるっと回る */
    jolt() { if (st.off) return; if (st.act && st.act.k === 'dig') { st.dig = 0; setBuried(false); } st.act = { k: 'jump' }; face(0); st.jv = -rnd(700, 950); st.jy = -1; st.spin = (Math.random() < 0.5 ? -1 : 1) * rnd(8, 11); },
    busy: () => !!st.act || st.off || st.petting,
    dispose() { window.removeEventListener('pointermove', onPtr); window.removeEventListener('pointerdown', onTap); if (st.live) { const L = st.live; st.live = null; clearInterval(L.typeT); L.fc.dispose(); L.wrap.remove(); } if (inWorld) Matter.World.remove(engine.world, body); ctl.dispose(); el.remove(); },
  };
}
