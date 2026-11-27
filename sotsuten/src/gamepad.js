/* 卒展: ゲームコントローラー（任天堂の配置）で操作する。
   スティック＝カーソル（PetCursor.jsx の輪が動く・やるきーぬもなでられる）／A＝カーソルの場所をクリック／B＝戻る（Esc）／Y＝シャカシャカ（R）／十字キー＝↑↓←→。
   記録画面（行動選択）のあいだは、スティックも ↑↓←→ になり A＝決定（Enter）。
   ボタンの番号はブラウザの「standard」配置（位置で決まる: 下0・右1・左2・上3）→ 任天堂の A＝右・B＝下・Y＝左。
   キーやマウスの操作と同じ事件（keydown / pointermove / click）を作って送るので、画面の側は今までのキー操作のまま
   ESP32 の手作りコントローラー（Bluetooth キーボードとしてつなぐ）: W/A/S/D＝スティック（上/左/下/右・押している間カーソルが動く）／O＝A（クリック）
   ESP32 のスケッチ: ~/Documents/Arduino/sotsuten_controller/sotsuten_controller.ino */
const BTN = { B: 0, A: 1, Y: 2, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const DEAD = 0.18; // スティックの遊び
const SPEED = 1.1; // いちばん倒したときのカーソルの速さ（画面の短いほう ÷ 秒）
const REPEAT0 = 380, REPEAT = 140;
const KEY_STICK = { KeyW: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0] }; // PC のキーボード・ESP32 のジョイスティック（11-27 I/J/K/L から W/A/S/D に）
// ESP32 のジョイスティック（キー W/A/S/D）の速さ（画面の短いほう ÷ 秒）。押しはじめは KEY_V0 → KEY_RAMP 秒かけて KEY_V1 まで
// 11-27: 最高速が速すぎて止めにくい → 0.165→1.1 から 0.08→0.45 に（iPad の短い辺 約820pt で 約65→370pt/秒）
const KEY_V0 = 0.08, KEY_V1 = 0.45, KEY_RAMP = 1.2;

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
  const held = {}, tap = {}; let heldAt = 0, kClick = false; // ESP32 のキー（押しているキー・押しはじめた時刻・O を押した）
  const codeOf = (e) => e.code || ({ w: 'KeyW', a: 'KeyA', s: 'KeyS', d: 'KeyD', o: 'KeyO' })[(e.key || '').toLowerCase()];
  const typing = (e) => e.metaKey || e.ctrlKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '');
  const onKeyDown = (e) => {
    const c = codeOf(e);
    if (!(c in KEY_STICK) && c !== 'KeyO') return;
    if (typing(e)) return; // 本棚の日記を書いているときは文字のまま
    e.preventDefault(); e.stopPropagation();
    if (e.repeat) return;
    if (c === 'KeyO') { kClick = true; return; }
    if (!Object.keys(held).length) heldAt = performance.now();
    held[c] = true; tap[c] = true; // すぐ離しても1回は動く
  };
  const onKeyUp = (e) => { const c = codeOf(e); if (c in KEY_STICK) delete held[c]; };
  const onBlur = () => { for (const c in held) delete held[c]; };
  const pos = () => cur || (cur = { x: innerWidth / 2, y: innerHeight / 2 });
  const move = (x, y) => {
    const p = pos();
    p.x = Math.max(0, Math.min(innerWidth - 1, x)); p.y = Math.max(0, Math.min(innerHeight - 1, y));
    const t = document.elementFromPoint(p.x, p.y) || window;
    t.dispatchEvent(new PointerEvent('pointermove', { clientX: p.x, clientY: p.y, bubbles: true, pointerType: 'mouse' }));
  };
  const click = () => {
    const p = pos(), t = document.elementFromPoint(p.x, p.y);
    if (!t) return;
    const o = { clientX: p.x, clientY: p.y, bubbles: true, cancelable: true, pointerType: 'mouse', button: 0 };
    t.dispatchEvent(new PointerEvent('pointerdown', o)); // やるきーぬをタッチ（dogRoam.js）
    if (!clickable(t)) return;
    t.dispatchEvent(new MouseEvent('mousedown', o));
    t.dispatchEvent(new PointerEvent('pointerup', o));
    t.dispatchEvent(new MouseEvent('mouseup', o));
    t.dispatchEvent(new MouseEvent('click', o));
  };
  // スティックの向き＝見ている人から見た向き＝回したアプリの中の向き。↑↓←→ はそのまま
  const arrowOf = (sx, sy) => {
    if (Math.abs(sx) > Math.abs(sy)) return sx < 0 ? 'ArrowLeft' : 'ArrowRight';
    return sy < 0 ? 'ArrowUp' : 'ArrowDown';
  };
  // カーソルは画面（回す前）の座標で動くので、アプリを回している角度ぶん回す（回していると上下が左右になっていた）
  const toScreen = (x, y) => {
    const a = (angle() || 0) * Math.PI / 180;
    return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
  };
  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = Array.from(pads || []).find(g => g && g.connected) || null;
    let kx = 0, ky = 0;
    for (const c in { ...held, ...tap }) { kx += KEY_STICK[c][0]; ky += KEY_STICK[c][1]; }
    for (const c in tap) delete tap[c];
    const keyStick = !!(kx || ky);
    if (!gp && !keyStick && !kClick) return;
    const b = (i) => !!(gp && gp.buttons[i] && gp.buttons[i].pressed);
    const down = (i) => b(i) && !prev[i];
    const rec = isRecord();
    // スティック（左。右スティックでもカーソルは動く）
    let lx = gp ? gp.axes[0] || 0 : 0, ly = gp ? gp.axes[1] || 0 : 0;
    const rx = gp ? gp.axes[2] || 0 : 0, ry = gp ? gp.axes[3] || 0 : 0;
    if (Math.hypot(rx, ry) > Math.hypot(lx, ly)) { lx = rx; ly = ry; }
    let keySpeed = 0;
    if (keyStick) { // ESP32: 倒している向きに、押しはじめはゆっくり→だんだん速く（なめらかに）
      const t = Math.min(1, (now - heldAt) / 1000 / KEY_RAMP), e = t * t * (3 - 2 * t), n = Math.hypot(kx, ky);
      keySpeed = KEY_V0 + (KEY_V1 - KEY_V0) * e;
      lx = kx / n; ly = ky / n;
    }
    const mag = Math.hypot(lx, ly);
    // ↑↓←→: 十字キー（いつでも）・記録画面ではスティックも
    let sx = (b(BTN.RIGHT) ? 1 : 0) - (b(BTN.LEFT) ? 1 : 0), sy = (b(BTN.DOWN) ? 1 : 0) - (b(BTN.UP) ? 1 : 0);
    if (!sx && !sy && rec && (mag > 0.5 || keyStick)) { sx = lx; sy = ly; }
    const dir = (sx || sy) ? arrowOf(sx, sy) : null;
    if (dir !== rep.dir) { rep = { dir, at: now + REPEAT0 }; if (dir) key(dir); }
    else if (dir && now >= rep.at) { rep.at = now + REPEAT; key(dir); }
    // カーソル（記録画面いがい）
    if (!rec && mag > DEAD) {
      const v = keyStick ? keySpeed : Math.pow((mag - DEAD) / (1 - DEAD), 2) * SPEED; // ゲームコントローラーは倒した量で
      const k = v * Math.min(innerWidth, innerHeight) * dt / mag;
      const [dx, dy] = toScreen(lx * k, ly * k);
      const p = pos(); move(p.x + dx, p.y + dy);
    }
    if (down(BTN.A) || kClick) { if (rec) key('Enter'); else click(); }
    kClick = false;
    if (down(BTN.B)) key('Escape');
    if (down(BTN.Y)) key('r', 'KeyR');
    prev = {}; if (gp) gp.buttons.forEach((x, i) => { prev[i] = x.pressed; });
  };
  const onConn = () => { if (cur == null) move(innerWidth / 2, innerHeight / 2); }; // つないだら真ん中にカーソル
  window.addEventListener('gamepadconnected', onConn);
  window.addEventListener('keydown', onKeyDown, true); // 記録画面（Record.jsx）より先に受け取る
  window.addEventListener('keyup', onKeyUp, true);
  window.addEventListener('blur', onBlur);
  raf = requestAnimationFrame(loop);
  return () => {
    cancelAnimationFrame(raf); window.removeEventListener('gamepadconnected', onConn);
    window.removeEventListener('keydown', onKeyDown, true); window.removeEventListener('keyup', onKeyUp, true); window.removeEventListener('blur', onBlur);
  };
}
