/* シャカシャカ効果音（reference/index.html から移植） */
import Matter from 'matter-js';

const SHAKA_POOL_SIZE = 5;       // 同時に重ねて鳴らせる数
const SHAKA_MIN_SPEED = 4.2;     // この相対速度未満の接触は鳴らさない（積もって接しているだけ＝無音）
const SHAKA_COOLDOWN = 45;       // 連続発音の最小間隔(ms)

const shakaPool = [];
let shakaPoolIdx = 0;
let shakaUnlocked = false;
let lastShakaPlay = 0;

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

export function initShakaSound() {
  if (shakaPool.length) return;
  for (let i = 0; i < SHAKA_POOL_SIZE; i++) {
    const a = new Audio('/sound/syakasyaka.mp3');
    a.preload = 'auto';
    a.volume = 0;
    shakaPool.push(a);
  }
  // モバイルは初回ユーザー操作で音声を解錠する必要がある
  const unlock = () => {
    if (shakaUnlocked) return;
    shakaUnlocked = true;
    shakaPool.forEach(a => { a.play().then(() => { a.pause(); a.currentTime = 0; }).catch(() => {}); });
  };
  window.addEventListener('pointerdown', unlock, { once: false });
  window.addEventListener('touchstart', unlock, { once: false });
}

export function playShaka(speed) {
  if (!shakaPool.length) return;
  const now = performance.now();
  if (now - lastShakaPlay < SHAKA_COOLDOWN) return;
  lastShakaPlay = now;
  const a = shakaPool[shakaPoolIdx];
  shakaPoolIdx = (shakaPoolIdx + 1) % SHAKA_POOL_SIZE;
  // 衝突の強さで音量を調整
  const v = clamp((speed - SHAKA_MIN_SPEED) / 14, 0.15, 1);
  try {
    a.volume = v;
    a.currentTime = 0;
    const p = a.play();
    if (p && p.catch) p.catch(() => {});
  } catch (e) { /* ignore */ }
}

/* 絵文字どうしが「ぶつかった瞬間」だけ鳴らす。collisionStart は新規接触時のみ発火 */
export function attachCollisionSound(engine) {
  Matter.Events.on(engine, 'collisionStart', (ev) => {
    for (const pair of ev.pairs) {
      const a = pair.bodyA, b = pair.bodyB;
      if (a.isStatic || b.isStatic) continue;
      const dvx = a.velocity.x - b.velocity.x;
      const dvy = a.velocity.y - b.velocity.y;
      const relSpeed = Math.sqrt(dvx * dvx + dvy * dvy);
      if (relSpeed >= SHAKA_MIN_SPEED) { playShaka(relSpeed); break; }
    }
  });
}
