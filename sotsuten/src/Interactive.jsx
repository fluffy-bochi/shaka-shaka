import React from 'react';
import Matter from 'matter-js';
import { appendGlyph } from './fluent';
import { DOG_RATIO } from './dog3d';
import { createDogRoam } from './dogRoam';
import { startGamepad } from './gamepad';
import { startEsp32 } from './esp32ws';
import { initShakaSound, attachCollisionSound, playShaka, soundReady } from './sound';
import HomeEx from './screens/HomeEx'; // 卒展のホーム（Figma 卒展/ホーム）。投稿の見た目は本体の Home.jsx の Post
import Bookshelf from './screens/Bookshelf';
import Record, { actDrop } from './screens/Record';
import QRCode from 'qrcode';
import { watchPostsKeep, postDrop, makeToken, NFC_MOOD, NFC_WAIT_MS } from './posts';
import { addPost, addRecord, sampleFor, homeRows, slotNow, todayStr, shiftDate, WD, exhibitDayLabel } from './exhibit';
import { homeLine } from './wake';
import { strToDate, formatDateShort, tsToHmOn } from './model';

/* 卒展用インタラクティブ（ほどほどふぉーと本体の IpadTest.jsx から移した単独版）。記録も保存もしない。
   記録画面・スマホの投稿で絵文字を降らせる（数字キーで降らせるのはやめた）。R（コントローラーは Y）でシャカシャカ（展示ではモニターに映すのでジャイロは使わない）。回復（rec）はプラスの絵文字に当たると1つずつ消しあう（シャカと同じ）。 */
/* 本体のシャカと同じ「硬い」物理: 跳ねない・よく噛む・沈まない（スリープはしない） */
const BODY_OPTS = { restitution: 0.12, friction: 0.4, frictionStatic: 0.6, frictionAir: 0.012, density: 0.01, slop: 0.01 };
const SUBSTEPS = 2; // 1フレーム（1/60秒）を何回に分けて計算するか
const MICRO_SPEED = 0.25, MICRO_SPIN = 0.01, MICRO_DAMP = 0.5; // この速さ未満の動きを半分にする
/* 卒展は1台だけで使うので、入れた絵文字と記録は端末に残す（再読み込みしても消えない・リセットで消す） */
const PILE_KEY = 'kame_sotsuten_pile', DATA_KEY = 'kame_sotsuten_data';
const loadJSON = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
const saveJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } };
const BUBBLE_KEEP = 3; // スマホのつぶやきの吹き出しは、このあと何回降ったら消すか（数字キー・投稿どちらも1回）
/* ゲージの山のいちばん上にいる、やるきーぬのひとこと（順番に）。m はそのときのモーション（2回やって idle にもどる） */
const DOG_LINES = [
  { t: 'やっほー', m: 'wave' },
  { t: '今日は何してたの？', m: 'think' },
  { t: '今日のご飯何にする？', m: 'think' },
  { t: 'ここで遊ぶの好きなんだー', m: 'happy' },
  { t: 'いっぱい積もったね', m: 'doya' },
  { t: 'ちょっと休もっか？', m: 'relax' },
];
/* 数字キーで降らせたときのやるきーぬの反応（つかれた顔→sad・ふつう→nod・いい顔や回復→happy・ほかの行動→nod） */
const KEY_MOTION = { '😫': 'sad', '😟': 'sad', '😐': 'nod', '🙂': 'happy', '😆': 'happy' };
/* 山が高くなって目が画面の外に出たとき（中継のあいだ）のひとこと */
const FULL_LINES = ['きゅうくつだよー', 'うもれちゃう…', 'ちょっと休もっか？'];
const DOG_LINE_MS = 7000; // ひとことを変える間隔
const DOG_H = 0.36; // やるきーぬ（3D）の高さ（箱の幅に対して）
const IDLE_MS = 5 * 60000; // この間なにも操作がなければゲージ（シャカシャカ）の画面に戻す
const FILL_UNIT = 100; // 卒展: 箱からやるきーぬのぶんを抜いた広さが、この個数でいっぱい（本体のシャカは125）
const DOG_FILL = 0.63; // やるきーぬが四角（高さ×幅）のうち、体で埋まっている割合のめやす

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
  const [tab, setTab] = React.useState('gauge');
  const tabRef = React.useRef(tab); tabRef.current = tab;
  const frozenRef = React.useRef(false); frozenRef.current = tab === 'record';
  const openRecordRef = React.useRef(null); openRecordRef.current = () => setTab('record'); // 'record' のあいだは記録画面がキーを受け取る // フッターの選択（B=本棚・H=ホーム・G=ゲージ。本番は iPad のハードキーで操作）
  // 来場者が数字キーで入れた今日の記録（保存しない）。過去の日はサンプルのペルソナ
  const saved0 = React.useMemo(() => loadJSON(DATA_KEY, {}), []);
  const [mine, setMine] = React.useState(saved0.mine || []);
  const [lastRec, setLastRec] = React.useState(saved0.lastRec || null);
  const [homeDate, setHomeDate] = React.useState(null); // null＝今日
  const homeDateRef = React.useRef(homeDate); homeDateRef.current = homeDate;
  const [bookFav, setBookFav] = React.useState(saved0.bookFav || {});
  const [bookDiary, setBookDiary] = React.useState(saved0.bookDiary || {});
  const [postSince, setPostSince] = React.useState(saved0.postSince || Date.now()); // この時刻より後のスマホの投稿を受け取る（リセットで今に）
  React.useEffect(() => { saveJSON(DATA_KEY, { mine, lastRec, bookFav, bookDiary, postSince }); }, [mine, lastRec, bookFav, bookDiary, postSince]);
  // スマホの投稿画面のQRコード（ゲージの右上）
  const [qr, setQr] = React.useState('');
  // ゲージの日付と大きい時計（本体のシャカ画面と同じ）
  const [clock, setClock] = React.useState(() => tsToHmOn(todayStr(), Date.now()));
  React.useEffect(() => { const t = setInterval(() => setClock(tsToHmOn(todayStr(), Date.now())), 1000); return () => clearInterval(t); }, []);
  // 音が出せるか（再読み込みのあと一度も操作がないと出せない）。出せないときだけバーに🔇
  const [sound, setSound] = React.useState(false);
  React.useEffect(() => { const t = setInterval(() => setSound(soundReady()), 1000); return () => clearInterval(t); }, []);
  // QRコードの中身（しるしつき）は1分ごとに作り直す。古いリンクやリロードでは投稿できない（PostForm.jsx）
  React.useEffect(() => {
    const mk = () => QRCode.toDataURL(location.origin + '/?post=' + makeToken(), { margin: 1, width: 320 }).then(setQr).catch(() => {});
    mk(); const t = setInterval(mk, 60000); return () => clearInterval(t);
  }, []);
  // しばらく操作がなければゲージの画面へ
  React.useEffect(() => {
    let last = Date.now();
    const on = () => { last = Date.now(); };
    const evs = ['keydown', 'pointerdown', 'pointermove', 'touchstart', 'wheel']; // コントローラーのカーソル（gamepad.js）も pointermove
    evs.forEach(ev => window.addEventListener(ev, on, { passive: true }));
    const t = setInterval(() => { if (Date.now() - last >= IDLE_MS) { setTab('gauge'); setHomeDate(null); } }, 5000);
    return () => { evs.forEach(ev => window.removeEventListener(ev, on)); clearInterval(t); };
  }, []);
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
    const dogArea = (W * DOG_H) * (W * DOG_H * DOG_RATIO) * DOG_FILL; // 高さ×幅×体の割合
    const r = Math.sqrt(Math.max(W * H * 0.3, W * H - dogArea) / (FILL_UNIT * Math.PI));
    // 計算は止めない（スリープなし）。たくさん積んだときのモゴモゴは、めり込み解消の反復を増やして抑える
    const engine = Matter.Engine.create({ positionIterations: 20, velocityIterations: 10 });
    // ごく小さい動き（押し合いのモゴモゴ）だけを毎ステップ弱める。計算は続けるので、落ちる・転がる・崩れる動きはそのまま
    Matter.Events.on(engine, 'afterUpdate', () => {
      engine.world.bodies.forEach(b => {
        if (b.isStatic) return;
        if (b.speed < MICRO_SPEED) Matter.Body.setVelocity(b, { x: b.velocity.x * MICRO_DAMP, y: b.velocity.y * MICRO_DAMP });
        if (Math.abs(b.angularVelocity) < MICRO_SPIN) Matter.Body.setAngularVelocity(b, b.angularVelocity * MICRO_DAMP);
      });
    });
    engine.gravity.y = 1.4;
    const wall = (x, y, w, h) => Matter.Bodies.rectangle(x, y, w, h, { isStatic: true, friction: 0.4 });
    Matter.World.add(engine.world, [wall(W / 2, H + 50, W * 3, 100), wall(-50, H / 2, 100, H * 4), wall(W + 50, H / 2, 100, H * 4)]);
    const s = { engine, r, W, H, bodies: [], bubbles: [], raf: 0, last: 0, acc: 0 };
    initShakaSound(); attachCollisionSound(engine); // ぶつかった音（シャカと同じ）
    sim.current = s;

    const pop = (x, y) => { const fx = document.createElement('div'); fx.className = 'pop-fx'; fx.style.left = x + 'px'; fx.style.top = y + 'px'; box.appendChild(fx); setTimeout(() => fx.remove(), 450); };
    // 絵文字を1つ箱に入れる（落とすとき・保存から戻すとき）
    s.spawn = (g, x, y, angle, rec) => {
      const body = Matter.Bodies.circle(x, y, r * 0.92, { ...BODY_OPTS, angle });
      if (rec) body.collisionFilter = { group: -1, category: 2, mask: 1 }; // 回復どうしは重ならず、山の上に当たったら1つ消す
      const el = document.createElement('div');
      el.dataset.t = '1';
      Object.assign(el.style, { position: 'absolute', left: 0, top: 0, width: r * 2 + 'px', height: r * 2 + 'px', display: 'flex', alignItems: 'center', justifyContent: 'center', willChange: 'transform', pointerEvents: 'none', fontSize: Math.round(r * 1.6) + 'px', transform: `translate(${x - r}px, ${y - r}px) rotate(${angle}rad)` });
      appendGlyph(el, g, Math.round(r * 2));
      box.appendChild(el);
      Matter.World.add(engine.world, body);
      const b = { body, el, g, rec: !!rec, at: Date.now() };
      s.bodies.push(b);
      return b;
    };
    // スマホのつぶやきの吹き出し（絵文字の上についていく。このあと BUBBLE_KEEP 回降ったら消える）
    s.say = (b, text) => {
      const el = document.createElement('div');
      el.className = 'say-bubble';
      el.textContent = (text.replace(/\s+/g, ' ').match(/.{1,10}/gu) || []).join('\n'); // 10文字ごとに改行
      el.style.visibility = 'hidden'; // 最初の位置が決まるまで隠す
      box.appendChild(el);
      s.bubbles.push({ el, b, left: BUBBLE_KEEP });
    };
    // やるきーぬ: 山の上を自由に動く（歩く・登る・転がる・投げる・もぐる・満杯に近いと中継）。物理の体はなく絵だけ。しゃべる
    const dogH = Math.round(W * DOG_H);
    // ふきだしはノベルゲームのテキストウィンドウ風（名前つき・犬の右上）
    const dogSay = document.createElement('div');
    dogSay.className = 'dog-say';
    const dogName = document.createElement('div'); dogName.className = 'dog-say-name'; dogName.textContent = 'やるきーぬ';
    const dogText = document.createElement('div'); dogText.className = 'dog-say-text';
    // ウィンドウの右下に「記録する」（Enter でも開く）
    const dogRec = document.createElement('div'); dogRec.className = 'dog-rec';
    dogRec.innerHTML = '記録する<span class="keyhint">Enter</span>';
    dogRec.onclick = () => openRecordRef.current && openRecordRef.current();
    dogSay.appendChild(dogName); dogSay.appendChild(dogText); dogSay.appendChild(dogRec);
    dogSay.style.maxWidth = Math.round(W / 3) + 'px'; // 幅はセリフの長さに合わせる（最大で画面の横幅の1/3・こえたら折り返す）
    box.appendChild(dogSay);
    const solid = () => s.bodies.filter(b => !b.rec && !b.dead);
    const roam = createDogRoam({
      box, engine, W, H, r, dogH,
      pile: () => solid().map(b => b.body),
      glyphs: () => solid().slice(-30).map(b => b.g),
      liveTop: Math.round((pc ? W / IPAD_CSS_W : 1) * 205), // 時計の下
      canAct: () => !frozenRef.current && tabRef.current === 'gauge',
    });
    const dogCtl = roam.ctl; s.dogCtl = dogCtl; s.roam = roam; // 3D（ふだんは idle・セリフや降ってきた絵文字でモーション。読み込み中・失敗したときは絵）
    let lineI = 0;
    const setLine = () => {
      if (roam.offscreen()) { dogText.textContent = FULL_LINES[lineI++ % FULL_LINES.length]; return; }
      const L = DOG_LINES[lineI % DOG_LINES.length]; lineI++; dogText.textContent = L.t;
      if (!roam.busy()) dogCtl.play(L.m, 2); // 動きまわっているあいだはモーションをじゃましない
    };
    setLine();
    const lineT = setInterval(setLine, DOG_LINE_MS);
    const moveDog = () => {
      const { x, y, w } = roam.update();
      // テキストウィンドウは犬の右上（顔にかからないように・右にはみ出すときは左上）
      const bw = dogSay.offsetWidth, bh = dogSay.offsetHeight;
      const rightX = x + w * 0.32, leftX = x - w * 0.32 - bw;
      const bx = rightX + bw <= W - 6 ? rightX : Math.max(6, leftX);
      const by = Math.min(H - bh - 10, Math.max(22, y - dogH - bh * 0.15));
      dogSay.style.transform = `translate(${bx}px, ${by}px)`;
    };
    s.moveDog = moveDog;
    // 山を保存（箱の大きさに対する割合で。回復の絵文字は残さない）
    s.save = () => saveJSON(PILE_KEY, s.bodies.filter(b => !b.rec && !b.dead).map(b => ({ g: b.g, x: +(b.body.position.x / W).toFixed(4), y: +(b.body.position.y / H).toFixed(4), a: +b.body.angle.toFixed(3) })));
    loadJSON(PILE_KEY, []).forEach(p => p && p.g && s.spawn(p.g, Math.min(W - r, Math.max(r, p.x * W)), p.y * H, p.a || 0, false));
    const saveT = setInterval(s.save, 2000);
    window.addEventListener('pagehide', s.save);
    const kill = (b) => { Matter.World.remove(engine.world, b.body); b.dead = true; b.el.style.transition = 'opacity .15s'; b.el.style.opacity = '0'; setTimeout(() => b.el.remove(), 200); };
    const step = (t) => {
      const dt = s.last ? Math.min(50, t - s.last) : 16; s.last = t; s.acc += dt;
      dogCtl.pause(frozenRef.current); // 記録中はぼかした後ろの犬は動かさない（記録画面の犬だけ動く）
      if (frozenRef.current) { s.acc = 0; moveDog(); s.raf = requestAnimationFrame(step); return; } // 記録画面のあいだはゲージを止めておく（後ろにぼかして見せるだけ）
      while (s.acc >= 1000 / 60) { for (let k = 0; k < SUBSTEPS; k++) Matter.Engine.update(engine, 1000 / 60 / SUBSTEPS); s.acc -= 1000 / 60; } // 刻みを細かくして積み重ねを安定させる
      // 回復: プラスに当たったら両方消える
      const hit2 = (r * 2) * (r * 2);
      for (const n of s.bodies) {
        if (n.dead || !n.rec) continue;
        const p = s.bodies.find(b => !b.dead && !b.rec && (b.body.position.x - n.body.position.x) ** 2 + (b.body.position.y - n.body.position.y) ** 2 < hit2);
        if (p) { pop((p.body.position.x + n.body.position.x) / 2, (p.body.position.y + n.body.position.y) / 2); playShaka(20, true); kill(p); kill(n); } // 消えるときも音（いちばん大きく）
        else if (Date.now() - n.at > 2500 && n.body.speed < 0.3) { playShaka(20, true); kill(n); } // 消すものがなければ、着いたら消える（このときも音）
      }
      if (s.bodies.some(b => b.dead)) { s.bodies = s.bodies.filter(b => !b.dead); setCount(s.bodies.filter(b => !b.rec).length); }
      for (const b of s.bodies) {
        const { x, y } = b.body.position;
        b.el.style.transform = `translate(${x - r}px, ${y - r}px) rotate(${b.body.angle}rad)`;
      }
      moveDog();
      if (s.bubbles.length) {
        s.bubbles = s.bubbles.filter(q => {
          if (q.left <= 0) { q.el.style.opacity = '0'; setTimeout(() => q.el.remove(), 400); return false; } // このあと BUBBLE_KEEP 回降ったら消す
          if (!q.b.dead) { // 絵文字の真上についていく（回復で絵文字が消えたあとは、その場に残る）
            const w = q.el.offsetWidth, h = q.el.offsetHeight;
            const bx = Math.min(W - w - 6, Math.max(6, q.b.body.position.x - w / 2));
            const by = Math.max(6, q.b.body.position.y - r - h - 10);
            q.el.style.transform = `translate(${bx}px, ${by}px)`;
            q.el.style.visibility = '';
            q.el.style.setProperty('--tail', Math.min(w - 18, Math.max(10, q.b.body.position.x - bx - 6)) + 'px');
          }
          return true;
        });
      }
      s.raf = requestAnimationFrame(step);
    };
    s.raf = requestAnimationFrame(step);
    setCount(s.bodies.length);
    return () => { s.save(); s.bubbles.forEach(q => q.el.remove()); roam.dispose(); dogSay.remove(); clearInterval(lineT); clearInterval(saveT); window.removeEventListener('pagehide', s.save); cancelAnimationFrame(s.raf); Matter.World.clear(engine.world); Matter.Engine.clear(engine); box.querySelectorAll('[data-t]').forEach(e => e.remove()); sim.current = null; };
  }, [layoutKey]);

  // 絵文字 g を n 個、上から降らせる（数字キー・スマホの投稿）
  const fall = React.useCallback((g, n, rec, text) => {
    const s = sim.current; if (!s) return;
    s.bubbles.forEach(q => { q.left -= 1; }); // 前のつぶやきの吹き出しは、降るたびに残りを1つ減らす
    for (let i = 0; i < n; i++) {
      const x = s.r + Math.random() * (s.W - s.r * 2);
      const b = s.spawn(g, x, -s.r * (1.2 + i * 2.2), (Math.random() - 0.5) * 0.6, !!rec);
      Matter.Body.setVelocity(b.body, { x: (Math.random() - 0.5) * 2, y: 2 });
      if (i === 0 && text) s.say(b, text); // つぶやきは最初の絵文字に吹き出し
    }
    if (s.dogCtl && !s.roam.busy()) s.dogCtl.play(text ? 'happy' : KEY_MOTION[g] || (rec ? 'happy' : 'nod'), 1); // つぶやきが届いたらよろこぶ
    s.save();
    setCount(s.bodies.filter(b => !b.rec).length);
    setLastRec({ ts: Date.now(), rec: !!rec });
  }, []);
  // 記録画面で「記録する」→ ゲージに戻って、気分と行動の絵文字を降らせる（数はがんばりタイプで増える）
  const onRecordDone = React.useCallback((r) => {
    setTab('gauge');
    const md = { g: r.mood.g, n: r.mood.n, rec: !!r.mood.rec }, ad = actDrop(r.act, r.type);
    setTimeout(() => { fall(md.g, md.n, md.rec); setTimeout(() => fall(ad.g, ad.n, ad.rec), 350); }, 250);
    setMine(l => addRecord(l, r, md, ad));
  }, [fall]);
  const onRecordClose = React.useCallback(() => setTab('gauge'), []);
  // スマホからの投稿を受け取って、ゲージに降らせてホームに載せる（同じ投稿は1回だけ）
  const mineRef = React.useRef(mine); mineRef.current = mine;
  // ゲージ以外の画面のときは降らせずに待たせ、ゲージに戻ったら順番に降らせる（記録はすぐホームに入れる）
  const pendingRef = React.useRef([]);
  const [pendingN, setPendingN] = React.useState(0);
  // NFCタグからの投稿（mood=nfc）は、展示で受け取るキー（Space・PCはボタンも）を押すまで待たせる＝会場の外からの投稿は出ない。
  // 押したときに待っているもの（NFC_WAIT_MS 以内）を全部受け取る。先に押していたら、30秒以内に届いたものはそのまま受け取る
  const nfcWaitRef = React.useRef([]);
  const nfcArmRef = React.useRef(0);
  const [nfcN, setNfcN] = React.useState(0);
  const receivePost = React.useCallback((id, d, ts, accepted) => {
    if (mineRef.current.some(e => e.gid === 'p' + id) || pendingRef.current.some(q => q.id === id)) return;
    if (d.mood === NFC_MOOD && !accepted) {
      if (Date.now() - ts > NFC_WAIT_MS || nfcWaitRef.current.some(q => q.id === id)) return;
      if (Date.now() >= nfcArmRef.current) { nfcWaitRef.current.push({ id, d, ts, at: Date.now() }); setNfcN(nfcWaitRef.current.length); return; }
    }
    const dr = postDrop(d), text = (d.text || '').trim();
    if (tabRef.current === 'gauge') fall(dr.g, dr.n, dr.rec, text);
    else { pendingRef.current.push({ id, dr, text }); setPendingN(pendingRef.current.length); }
    setMine(l => addPost(l, id, d, ts, dr));
  }, [fall]);
  const acceptNfc = React.useCallback(() => {
    const now = Date.now();
    const q = nfcWaitRef.current.splice(0).filter(p => now - p.at <= NFC_WAIT_MS);
    setNfcN(0);
    if (!q.length) { nfcArmRef.current = now + 30000; return; }
    q.forEach((p, i) => setTimeout(() => receivePost(p.id, p.d, p.ts, true), i * 900));
  }, [receivePost]);
  const acceptNfcRef = React.useRef(acceptNfc); acceptNfcRef.current = acceptNfc;
  React.useEffect(() => { // 待ちすぎたものは捨てる
    const t = setInterval(() => {
      const now = Date.now(), l = nfcWaitRef.current, k = l.filter(p => now - p.at <= NFC_WAIT_MS);
      if (k.length !== l.length) { nfcWaitRef.current = k; setNfcN(k.length); }
    }, 10000);
    return () => clearInterval(t);
  }, []);
  React.useEffect(() => watchPostsKeep(postSince, receivePost, (e) => console.warn('[sotsuten] posts', e && e.code)), [postSince, receivePost]);
  // 確認用（URL に ?debug のときだけ）: window.__post('テキスト', 顔1〜5) でスマホの投稿が届いたのと同じ動き
  React.useEffect(() => {
    if (!new URLSearchParams(location.search).has('debug')) return undefined;
    window.__post = (text, face = 3, nfc = false) => receivePost('debug' + Date.now(), { face, text, mood: nfc ? NFC_MOOD : '' }, Date.now());
    window.__dog = (name, n = 2) => sim.current && sim.current.dogCtl.play(name, n); // モーションの確認
    window.__act = (k) => sim.current && sim.current.roam.force(k); // やるきーぬの動きの確認
    window.__fill = (n = 90, g = '💻') => { for (let i = 0; i < n; i++) setTimeout(() => fall(g, 1, false), i * 40); }; // 満杯の確認
    return () => { delete window.__post; delete window.__dog; delete window.__fill; delete window.__act; };
  }, [receivePost, fall]);
  React.useEffect(() => {
    if (tab !== 'gauge' || !pendingRef.current.length) return undefined;
    const q = pendingRef.current.splice(0); setPendingN(0);
    const ts = q.map((p, i) => setTimeout(() => fall(p.dr.g, p.dr.n, p.dr.rec, p.text), 400 + i * 900));
    return () => ts.forEach(clearTimeout);
  }, [tab, fall]);

  /* シャカシャカ: 全部の絵文字を散らす（シャカの🔀と同じ動き。箱が大きいぶん少し強め） */
  const shake = React.useCallback(() => {
    const s = sim.current; if (!s) return;
    if (s.dogCtl) s.dogCtl.play('shake', 2); // いっしょにぶるぶる
    if (s.roam) s.roam.jolt(); // ぴょーんと飛ばされる
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
    s.bubbles.forEach(q => q.el.remove()); s.bubbles = [];
    s.bodies = []; setCount(0); s.save();
    nfcWaitRef.current = []; setNfcN(0); nfcArmRef.current = 0;
    setMine([]); setLastRec(null); setHomeDate(null); setBookFav({}); setBookDiary({}); setPostSince(Date.now()); // 次の来場者のために今日の記録も消す（前のスマホの投稿も受け取らない）
  };

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (tabRef.current === 'record') return; // 記録画面（Record.jsx）が受け取る
      if (e.key === 'Enter' && !(e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))) {
        e.preventDefault(); setTab('record'); return; // Enter（やるきーぬのウィンドウの「記録する」）で記録画面を開く
      }
      const tg = e.target && e.target.tagName;
      if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT') return; // 本棚の日記を書いているとき
      const nav = { KeyB: 'book', KeyH: 'home', KeyG: 'gauge' }[e.code] || { b: 'book', h: 'home', g: 'gauge' }[(e.key || '').toLowerCase()];
      if (nav && !e.repeat) { e.preventDefault(); setTab(nav); return; }
      if ((e.code === 'KeyF' || e.key === 'f' || e.key === 'F') && !e.repeat) { e.preventDefault(); toggleFull(); return; }
      if ((e.code === 'KeyR' || e.key === 'r' || e.key === 'R') && !e.repeat) { e.preventDefault(); shake(); return; }
      if ((e.code === 'Space' || e.key === ' ') && !e.repeat) { e.preventDefault(); acceptNfcRef.current(); return; } // NFCからの投稿を受け取る
      if (e.key === 'Escape' || e.key === 'Backspace') { // 戻る（コントローラーの B）: 前の日のホーム→今日／ホーム・本棚→ゲージ
        e.preventDefault();
        if (tabRef.current === 'home' && homeDateRef.current) setHomeDate(null);
        else if (tabRef.current !== 'gauge') setTab('gauge');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shake]);
  // コントローラー（gamepad.js）: スティック＝カーソル・A＝決定・B＝戻る・Y＝シャカシャカ
  const angleRef = React.useRef(0); angleRef.current = angle;
  React.useEffect(() => startGamepad({ isRecord: () => tabRef.current === 'record', angle: () => angleRef.current }), []);
  React.useEffect(() => startEsp32(), []); // ESP32（Wi-Fi）のボタン: B1＝R・B4＝Enter・上下左右＝カーソル（esp32ws.js）

  /* ---- ホーム・本棚（本体の画面をそのまま使う）に渡す値 ---- */
  const today = todayStr();
  const hd = homeDate || today;
  const sample = React.useMemo(() => sampleFor([today, shiftDate(today, -365), hd]), [today, hd]);
  // 来場者の記録がある日は、その日のサンプルを出さない（日をまたいでも残った記録はその日の記録として本棚に並ぶ）
  const mineDays = React.useMemo(() => new Set(mine.map(e => e.date)), [mine]);
  const entries = React.useMemo(() => sample.entries.filter(e => !mineDays.has(e.date)).concat(mine), [sample, mine, mineDays]);
  const balance = React.useMemo(() => { const b = { ...sample.balance }; mineDays.forEach(d => { delete b[d]; }); return b; }, [sample, mineDays]);
  const wakeLog = React.useMemo(() => Object.values(sample.wake), [sample]);
  const homeV = tab !== 'home' ? null : (() => {
    const dt = strToDate(hd);
    const noop = () => {};
    const count = hd === today ? count0 : (balance[hd] || 0);
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
    land: FW > FH, bookEntries: entries, bookCollected: sample.collected, bookBeforeSleep: balance,
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
      {(tab === 'gauge' || tab === 'record') && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: pc ? bw / zoom : '100%', zoom, zIndex: 1, pointerEvents: 'none', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', marginTop: 20, background: 'rgba(255,255,255,.85)', borderRadius: 999, padding: '9px 23px', fontFamily: "'Space Mono',monospace", fontSize: 19, fontWeight: 700 }}>{formatDateShort(today)}</div>
          <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 118, lineHeight: 1, letterSpacing: '.01em', marginTop: 12, /* 本体(68)とロック画面くらい(168)の間 */ color: count0 >= 90 ? '#fff' : '#1b1b18', textShadow: count0 >= 90 ? '0 2px 10px rgba(27,27,24,.35)' : 'none', transition: 'color .3s' }}>{clock}</div>
        </div>
      )}
      {tab === 'gauge' && qr && (
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 2, background: '#fff', borderRadius: 14, padding: '8px 8px 6px', boxShadow: '0 2px 10px rgba(27,27,24,.12)', textAlign: 'center', pointerEvents: 'none' }}>
          <img src={qr} alt="" style={{ display: 'block', width: 112, height: 112 }} />
          <div style={{ fontSize: 11, fontWeight: 800, marginTop: 4 }}>スマホでつぶやく</div>
        </div>
      )}
      {pc && tab !== 'record' && (
        <button onClick={(e) => { e.currentTarget.blur(); acceptNfc(); }} style={{ position: 'absolute', top: tab === 'gauge' && qr ? 178 : 12, right: 12, zIndex: 6, display: 'flex', alignItems: 'center', gap: 8, border: 'none', borderRadius: 999, background: nfcN ? '#1b1b18' : '#fff', color: nfcN ? '#fff' : '#1b1b18', padding: '8px 14px', fontSize: 13, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer', boxShadow: '0 2px 10px rgba(27,27,24,.12)' }}>
          📱 受け取る{nfcN > 0 && <span style={{ background: '#c4f000', color: '#2f3a00', borderRadius: 999, minWidth: 20, padding: '0 6px', fontSize: 12 }}>{nfcN}</span>}<span className="keyhint">Space</span>
        </button>
      )}
      {tab !== 'gauge' && pendingN > 0 && (
        <div style={{ position: 'absolute', left: '50%', top: 16, transform: 'translateX(-50%)', zIndex: 6, display: 'flex', alignItems: 'center', gap: 10, background: '#1b1b18', color: '#fff', borderRadius: 999, padding: '10px 20px', fontSize: 15, fontWeight: 800, whiteSpace: 'nowrap', boxShadow: '0 6px 18px rgba(27,27,24,.25)', pointerEvents: 'none' }}>
          📱 スマホのつぶやきが{pendingN}件届いています・ゲージ画面にもどると降ってきます<span className="keyhint" style={{ color: '#c4f000' }}>G</span>
        </div>
      )}
      {tab !== 'gauge' && (
        <div style={{ position: 'absolute', left: 0, top: 0, zIndex: 3, width: pc ? bw / zoom : '100%', height: pc ? bh / zoom : '100%', zoom, display: 'flex', flexDirection: 'column', background: tab === 'record' ? 'transparent' : '#f7f4ec' /* 記録中は後ろのゲージがぼけて見える */ }}>
          {homeV && <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}><HomeEx v={homeV} /></div>}
          {bookV && <Bookshelf key={bookV.land ? 'land' : 'port'} v={bookV} />}
          {tab === 'record' && <div style={{ position: 'relative', flex: 1, minHeight: 0 }}><Record onDone={onRecordDone} onClose={onRecordClose} /></div>}
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
      <span className="keyhint" style={{ marginLeft: -6 }}>F</span>
      {!sound && <button onClick={() => setTimeout(() => setSound(soundReady()), 500)} aria-label="音を出す" style={{ width: 34, height: 34, borderRadius: '50%', border: '1.5px solid #e4e1d8', background: '#fff', cursor: 'pointer', fontSize: 16, padding: 0 }}>🔇</button>}
      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 13, fontWeight: 700 }}>{count0}</span>
      <button onClick={shake} style={ghost}>🔀 R</button>
      <button onClick={clear} style={ghost}>リセット</button>
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
    <div ref={outerRef} className={pc ? 'show-keys' : ''} style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#f7f4ec' }}>
    <div style={rootStyle}>
      {pc ? (
        <>
          <div style={{ flex: `0 0 ${mTop}px`, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#efece3' }}>{bar}</div>
          {stage({ flex: `0 0 ${bh}px`, width: bw, margin: '0 auto' })}
          {mBot > 0 && footer}
        </>
      ) : (
        <>
          {bar}
          {stage({ flex: 1, minHeight: 0 })}
        </>
      )}
    </div>
    </div>
  );
}
