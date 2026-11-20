/* 卒展: ゲームコントローラー（任天堂の配置）で操作する。
   スティック＝カーソル（PetCursor.jsx の輪が動く・やるきーぬもなでられる）／A＝カーソルの場所をクリック／B＝戻る（Esc）／Y＝シャカシャカ（R）／十字キー＝↑↓←→。
   記録画面（行動選択）のあいだは、スティックも ↑↓←→ になり A＝決定（Enter）。
   ボタンの番号はブラウザの「standard」配置（位置で決まる: 下0・右1・左2・上3）→ 任天堂の A＝右・B＝下・Y＝左。
   キーやマウスの操作と同じ事件（keydown / pointermove / click）を作って送るので、画面の側は今までのキー操作のまま */
const BTN = { B: 0, A: 1, Y: 2, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const DEAD = 0.18; // スティックの遊び
const SPEED = 1.1; // いちばん倒したときのカーソルの速さ（画面の短いほう ÷ 秒）
const REPEAT0 = 380, REPEAT = 140; // ↑↓←→ を押しっぱなしにしたときの、くり返しまでの時間と間隔（ms）

const key = (k, code) => {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: k, code: code || k, bubbles: true, cancelable: true }));
};
const clickable = (el) => {
  for (let e = el; e && e !== document.body; e = e.parentElement) {
    if (e.onclick || e.tagName === 'BUTTON' || e.tagName === 'A' || getComputedStyle(e).cursor === 'pointer') return true;
  }
  return false;
};

/* isRecord(): いま記録画面か／angle(): 画面を回している角度（度）。回していても、スティックを倒した向き＝見えている向きに動く */
export function startGamepad({ isRecord, angle }) {
  let raf = 0, last = 0, prev = {}, cur = null, rep = { dir: null, at: 0 };
  const pos = () => cur || (cur = { x: innerWidth / 2, y: innerHeight / 2 });
  const move = (x, y) => {
    const p = pos();
    p.x = Math.max(0, Math.min(innerWidth - 1, x)); p.y = Math.max(0, Math.min(innerHeight - 1, y));
    const t = document.elementFromPoint(p.x, p.y) || window;
    t.dispatchEvent(new PointerEvent('pointermove', { clientX: p.x, clientY: p.y, bubbles: true, pointerType: 'mouse' }));
  };
  const click = () => {
    const p = pos(), t = document.elementFromPoint(p.x, p.y);
    if (!t || !clickable(t)) return;
    const o = { clientX: p.x, clientY: p.y, bubbles: true, cancelable: true, pointerType: 'mouse', button: 0 };
    t.dispatchEvent(new PointerEvent('pointerdown', o));
    t.dispatchEvent(new MouseEvent('mousedown', o));
    t.dispatchEvent(new PointerEvent('pointerup', o));
    t.dispatchEvent(new MouseEvent('mouseup', o));
    t.dispatchEvent(new MouseEvent('click', o));
  };
  // 見えている向き（画面）→ アプリの中の向き（回しているぶんを戻す）
  const arrowOf = (sx, sy) => {
    const a = -(angle() || 0) * Math.PI / 180;
    const x = sx * Math.cos(a) - sy * Math.sin(a), y = sx * Math.sin(a) + sy * Math.cos(a);
    if (Math.abs(x) > Math.abs(y)) return x < 0 ? 'ArrowLeft' : 'ArrowRight';
    return y < 0 ? 'ArrowUp' : 'ArrowDown';
  };
  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = Array.from(pads || []).find(g => g && g.connected);
    if (!gp) return;
    const b = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
    const down = (i) => b(i) && !prev[i];
    const rec = isRecord();
    // スティック（左。右スティックでもカーソルは動く）
    let lx = gp.axes[0] || 0, ly = gp.axes[1] || 0;
    const rx = gp.axes[2] || 0, ry = gp.axes[3] || 0;
    if (Math.hypot(rx, ry) > Math.hypot(lx, ly)) { lx = rx; ly = ry; }
    const mag = Math.hypot(lx, ly);
    // ↑↓←→: 十字キー（いつでも）・記録画面ではスティックも
    let sx = (b(BTN.RIGHT) ? 1 : 0) - (b(BTN.LEFT) ? 1 : 0), sy = (b(BTN.DOWN) ? 1 : 0) - (b(BTN.UP) ? 1 : 0);
    if (!sx && !sy && rec && mag > 0.5) { sx = lx; sy = ly; }
    const dir = (sx || sy) ? arrowOf(sx, sy) : null;
    if (dir !== rep.dir) { rep = { dir, at: now + REPEAT0 }; if (dir) key(dir); }
    else if (dir && now >= rep.at) { rep.at = now + REPEAT; key(dir); }
    // カーソル（記録画面いがい）
    if (!rec && mag > DEAD) {
      const k = Math.pow((mag - DEAD) / (1 - DEAD), 2) * SPEED * Math.min(innerWidth, innerHeight) * dt / mag;
      const p = pos(); move(p.x + lx * k, p.y + ly * k);
    }
    if (down(BTN.A)) { if (rec) key('Enter'); else click(); }
    if (down(BTN.B)) key('Escape');
    if (down(BTN.Y)) key('r', 'KeyR');
    prev = {}; gp.buttons.forEach((x, i) => { prev[i] = x.pressed; });
  };
  const onConn = () => { if (cur == null) move(innerWidth / 2, innerHeight / 2); }; // つないだら真ん中にカーソル
  window.addEventListener('gamepadconnected', onConn);
  raf = requestAnimationFrame(loop);
  return () => { cancelAnimationFrame(raf); window.removeEventListener('gamepadconnected', onConn); };
}
