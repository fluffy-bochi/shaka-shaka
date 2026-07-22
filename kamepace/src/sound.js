/* シャカシャカ効果音。
   ※ 再生は HTMLAudioElement（プール）方式に戻した。
   Web Audio 版は iOS Safari で音が「砂ノイズ」になる不具合があり（Androidは正常）、
   perf改善前の HTMLAudio 版は iOS でも正しく鳴っていたため、こちらを採用する。
   パフォーマンス改善の主因は物理の fixed timestep 化（App.jsx）なので、音方式を戻しても軽さは維持される。 */
import Matter from 'matter-js';

const SHAKA_POOL_SIZE = 6;       // 同時に重ねて鳴らせる数
const SHAKA_MIN_SPEED = 4.2;     // この相対速度未満の接触は鳴らさない（積もって接しているだけ＝無音）
const SHAKA_COOLDOWN = 50;       // 連続発音の最小間隔(ms)。少し広げて iOS の play() 連打を抑える

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
