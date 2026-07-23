/* シャカシャカ効果音。
   iOS実機での切り分け結果:
     - HTMLAudio … 音は正しいが play() 連打でメインスレッドが重い
     - Web Audio  … 軽いが iOS で「砂ノイズ」or「無音」になり安定しない（Androidは完璧）
   → プラットフォームで分ける:
     - Android等 … Web Audio（軽い＋正しい）
     - iOS(Safari) … HTMLAudio（確実に鳴る）＋クールダウンを広げて play() 回数を減らし軽く保つ */
import Matter from 'matter-js';

const SHAKA_MIN_SPEED = 4.2;     // この相対速度未満の接触は鳴らさない
const SRC = '/sound/syakasyaka.mp3';

// iOS(iPadOSはMac扱いになるのでタッチ数でも判定)
const IS_IOS = typeof navigator !== 'undefined' && (
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
);

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

let lastShakaPlay = 0;

/* ========== iOS: HTMLAudio 版（確実に鳴る・頻度を絞って軽く） ========== */
const HTML_POOL_SIZE = 4;
const HTML_COOLDOWN = 200;       // iOSの play() は重いので広め＝発音回数を減らす（重さ対策で更に間引き）
const htmlPool = [];
let htmlIdx = 0, htmlUnlocked = false;

/* ========== 他: Web Audio 版（軽い・AudioContextは初回操作の中で生成） ========== */
const WA_COOLDOWN = 45;
const WA_MAX_CONCURRENT = 5;
let ctx = null, buffer = null, masterGain = null, liveCount = 0;

let listenersAdded = false;

function ensureContext() { // Web Audio: 初回ユーザー操作の中で生成（iOS配慮の作法・Androidでも安全）
  if (ctx) { if (ctx.state !== 'running') ctx.resume().catch(() => {}); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  masterGain = ctx.createGain();
  masterGain.gain.value = 1;
  masterGain.connect(ctx.destination);
  fetch(SRC).then(r => r.arrayBuffer())
    .then(ab => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)))
    .then(buf => { buffer = buf; })
    .catch(() => {});
}

export function initShakaSound() {
  if (listenersAdded) return;
  listenersAdded = true;
  if (IS_IOS) {
    for (let i = 0; i < HTML_POOL_SIZE; i++) {
      const a = new Audio(SRC); a.preload = 'auto'; a.volume = 0; htmlPool.push(a);
    }
    const unlock = () => {
      if (htmlUnlocked) return;
      htmlUnlocked = true;
      htmlPool.forEach(a => { a.play().then(() => { a.pause(); a.currentTime = 0; }).catch(() => {}); });
    };
    window.addEventListener('pointerdown', unlock, { once: false });
    window.addEventListener('touchstart', unlock, { once: false });
  } else {
    const onGesture = () => ensureContext();
    window.addEventListener('pointerdown', onGesture, { once: false });
    window.addEventListener('touchstart', onGesture, { once: false });
    window.addEventListener('mousedown', onGesture, { once: false });
    window.addEventListener('keydown', onGesture, { once: false });
  }
}

export function playShaka(speed) {
  const now = performance.now();
  const cooldown = IS_IOS ? HTML_COOLDOWN : WA_COOLDOWN;
  if (now - lastShakaPlay < cooldown) return;
  const v = clamp((speed - SHAKA_MIN_SPEED) / 14, 0.15, 1);

  if (IS_IOS) {
    if (!htmlPool.length) return;
    lastShakaPlay = now;
    const a = htmlPool[htmlIdx];
    htmlIdx = (htmlIdx + 1) % HTML_POOL_SIZE;
    try { a.volume = v; a.currentTime = 0; const p = a.play(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ }
    return;
  }
  // Web Audio
  if (!ctx || !buffer) return;
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  lastShakaPlay = now;
  if (liveCount >= WA_MAX_CONCURRENT) return;
  try {
    const src = ctx.createBufferSource(); src.buffer = buffer;
    const g = ctx.createGain(); g.gain.value = v;
    src.connect(g); g.connect(masterGain);
    liveCount++;
    src.onended = () => { liveCount--; try { src.disconnect(); g.disconnect(); } catch (e) { /* ignore */ } };
    src.start();
  } catch (e) { /* ignore */ }
}

/* 絵文字どうしが「ぶつかった瞬間」だけ鳴らす。1イベント最大1回。 */
export function attachCollisionSound(engine) {
  Matter.Events.on(engine, 'collisionStart', (ev) => {
    let best = 0;
    const pairs = ev.pairs;
    for (let i = 0; i < pairs.length; i++) {
      const a = pairs[i].bodyA, b = pairs[i].bodyB;
      if (a.isStatic || b.isStatic) continue;
      const dvx = a.velocity.x - b.velocity.x;
      const dvy = a.velocity.y - b.velocity.y;
      const s = dvx * dvx + dvy * dvy;
      if (s > best) best = s;
    }
    if (best >= SHAKA_MIN_SPEED * SHAKA_MIN_SPEED) playShaka(Math.sqrt(best));
  });
}
