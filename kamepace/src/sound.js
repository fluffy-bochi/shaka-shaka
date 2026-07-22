/* シャカシャカ効果音（Web Audio 版）。
   iOS(WebKit)対策: HTMLAudioElement.play()/currentTime=0 の連打はメインスレッドをカクつかせるため、
   mp3 を一度だけ decodeAudioData してバッファ化し、衝突ごとに軽量な AudioBufferSourceNode で鳴らす。
   Web Audio は重ね再生・GC が軽く、iOS でも詰まりにくい。 */
import Matter from 'matter-js';

const SHAKA_MIN_SPEED = 4.2;     // この相対速度未満の接触は鳴らさない（積もって接しているだけ＝無音）
const SHAKA_COOLDOWN = 45;       // 連続発音の最小間隔(ms)
const SHAKA_MAX_CONCURRENT = 5;  // 同時に鳴らす最大数（重なりすぎ防止）

let ctx = null;                  // AudioContext（初回ユーザー操作で resume）
let buffer = null;               // デコード済み音声
let masterGain = null;
let lastShakaPlay = 0;
let liveCount = 0;               // 再生中ソース数
let unlocked = false;
let htmlFallback = null;         // Web Audio 不可のときだけ使う予備

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

export function initShakaSound() {
  if (ctx || htmlFallback) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) {
    // 予備: Web Audio 非対応環境のみ HTMLAudio（ほぼ来ない）
    htmlFallback = new Audio('/sound/syakasyaka.mp3');
    htmlFallback.preload = 'auto';
    return;
  }
  ctx = new AC();
  masterGain = ctx.createGain();
  masterGain.gain.value = 1;
  masterGain.connect(ctx.destination);
  // mp3 を一度だけ取得・デコード
  fetch('/sound/syakasyaka.mp3')
    .then(r => r.arrayBuffer())
    .then(ab => ctx.decodeAudioData(ab))
    .then(buf => { buffer = buf; })
    .catch(() => { /* 取得失敗時は無音でよい */ });

  // モバイルは初回ユーザー操作で AudioContext を解錠する必要がある
  const unlock = () => {
    if (unlocked) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    if (ctx.state === 'running') unlocked = true;
  };
  window.addEventListener('pointerdown', unlock, { once: false });
  window.addEventListener('touchstart', unlock, { once: false });
}

export function playShaka(speed) {
  const now = performance.now();
  if (now - lastShakaPlay < SHAKA_COOLDOWN) return;
  lastShakaPlay = now;
  const v = clamp((speed - SHAKA_MIN_SPEED) / 14, 0.15, 1);

  if (ctx && buffer) {
    if (ctx.state === 'suspended') { ctx.resume().catch(() => {}); return; }
    if (liveCount >= SHAKA_MAX_CONCURRENT) return; // 重なりすぎは間引く
    try {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const g = ctx.createGain();
      g.gain.value = v;
      src.connect(g); g.connect(masterGain);
      liveCount++;
      src.onended = () => { liveCount--; try { src.disconnect(); g.disconnect(); } catch (e) { /* ignore */ } };
      src.start();
    } catch (e) { /* ignore */ }
    return;
  }
  // 予備（HTMLAudio）
  if (htmlFallback) {
    try { htmlFallback.volume = v; htmlFallback.currentTime = 0; const p = htmlFallback.play(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ }
  }
}

/* 絵文字どうしが「ぶつかった瞬間」だけ鳴らす。collisionStart は新規接触時のみ発火。
   1イベントにつき最大1回（最速のペアで代表）＝ループも軽く保つ */
export function attachCollisionSound(engine) {
  Matter.Events.on(engine, 'collisionStart', (ev) => {
    let best = 0;
    const pairs = ev.pairs;
    for (let i = 0; i < pairs.length; i++) {
      const a = pairs[i].bodyA, b = pairs[i].bodyB;
      if (a.isStatic || b.isStatic) continue;
      const dvx = a.velocity.x - b.velocity.x;
      const dvy = a.velocity.y - b.velocity.y;
      const s = dvx * dvx + dvy * dvy; // sqrt は最後に1回だけ
      if (s > best) best = s;
    }
    const relSpeed = Math.sqrt(best);
    if (relSpeed >= SHAKA_MIN_SPEED) playShaka(relSpeed);
  });
}
