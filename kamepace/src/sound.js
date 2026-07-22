/* シャカシャカ効果音（Web Audio 版・iOSノイズ対策済み）。
   重さ対策で Web Audio を採用（HTMLAudio の play() 連打は iOS でメインスレッドを詰まらせる）。
   iOS Safari で音が「砂ノイズ」になる問題は、AudioContext をページ読み込み時に生成していたのが原因。
   → AudioContext は「最初のユーザー操作の中で」生成する（howler.js 等と同じ回避策）。 */
import Matter from 'matter-js';

const SHAKA_MIN_SPEED = 4.2;     // この相対速度未満の接触は鳴らさない
const SHAKA_COOLDOWN = 45;       // 連続発音の最小間隔(ms)
const SHAKA_MAX_CONCURRENT = 5;  // 同時に鳴らす最大数

let ctx = null, buffer = null, masterGain = null;
let lastShakaPlay = 0, liveCount = 0, listenersAdded = false;

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

/* 初回ユーザー操作の中で呼ぶ: ここで AudioContext を生成・解錠・デコード開始する（iOSのノイズ対策の要）。 */
function ensureContext() {
  if (ctx) { if (ctx.state !== 'running') ctx.resume().catch(() => {}); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  masterGain = ctx.createGain();
  masterGain.gain.value = 1;
  masterGain.connect(ctx.destination);
  // ウォームアップ: コンテキストのサンプルレートで無音1サンプルを鳴らして完全解錠
  try {
    const b = ctx.createBufferSource();
    b.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    b.connect(ctx.destination);
    b.start(0);
  } catch (e) { /* ignore */ }
  // 音源を取得してデコード（コールバック形＝古いiOSでも動く）
  fetch('/sound/syakasyaka.mp3')
    .then(r => r.arrayBuffer())
    .then(ab => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)))
    .then(buf => { buffer = buf; })
    .catch(() => { /* 取得失敗時は無音でよい */ });
}

export function initShakaSound() {
  if (listenersAdded) return;
  listenersAdded = true;
  // AudioContext は「最初の操作の中」で作る。once にせず、状態が眠ったら起こし直せるようにする。
  const onGesture = () => ensureContext();
  window.addEventListener('pointerdown', onGesture, { once: false });
  window.addEventListener('touchstart', onGesture, { once: false });
  window.addEventListener('mousedown', onGesture, { once: false });
  window.addEventListener('keydown', onGesture, { once: false });
}

export function playShaka(speed) {
  // まだ用意できていなければ鳴らさない（AudioContext の生成はユーザー操作の中でだけ行う）
  if (!ctx || !buffer) return;
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  const now = performance.now();
  if (now - lastShakaPlay < SHAKA_COOLDOWN) return;
  lastShakaPlay = now;
  if (liveCount >= SHAKA_MAX_CONCURRENT) return;
  const v = clamp((speed - SHAKA_MIN_SPEED) / 14, 0.15, 1);
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
    if (best >= SHAKA_MIN_SPEED * SHAKA_MIN_SPEED) playShaka(Math.sqrt(best));
  });
}
