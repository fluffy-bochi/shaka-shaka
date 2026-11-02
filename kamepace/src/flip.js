/* Galaxy Z Flip 用の表示（開発者モードの人だけの先行体験）。
   - サブディスプレイ（カバー画面）: 小さくほぼ正方形の画面。全体を少し縮めて横幅を確保し、
     下の帯（左下=端末の戻る・ホーム、右下=カメラ）は空けて、ナビはアイコンだけで右端に縦。
   - 縦に折っている時（フレックスモード）: 折り目より上にシャカ、下にタイムライン（ホーム）。
   設定は端末ごと（localStorage）。開発者モードがオフなら何もしない。 */

const KEY = 'kame_flip';
const DEF = { tab: false, on: false, mode: 'auto', railW: 56, navH: 0, baseW: 375, foldAdj: 0, foldGap: 28 }; // railW: サブの右端の縦ナビの幅 / navH: サブの下に空ける帯（実機ではカメラ・戻るボタンの部分は表示領域の外なので 0）

let cfg = { ...DEF };
try { cfg = { ...DEF, ...(JSON.parse(localStorage.getItem(KEY) || '{}') || {}) }; } catch (e) { /* ignore */ }
// 自動判定を直したので、手で「サブ」「折り」にしていた端末も一度だけ「自動」に戻す
if (!cfg.autoV) {
  cfg = { ...cfg, mode: 'auto', autoV: 1 };
  try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { /* ignore */ }
}
// 下の帯は実機では不要だった。保存済みの 64px も一度だけ 0 に戻す
if (!cfg.bandV) {
  cfg = { ...cfg, navH: 0, bandV: 1 };
  try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { /* ignore */ }
}

const subs = new Set();
const emit = () => subs.forEach(f => { try { f(); } catch (e) { /* ignore */ } });

export function getFlip() { return cfg; }
export function setFlip(patch) {
  cfg = { ...cfg, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { /* ignore */ }
  emit();
}
export function subscribeFlip(f) { subs.add(f); return () => subs.delete(f); }

/* いまの姿勢: 'folded'（半分折り）/'continuous'/null（APIなし） */
function posture() {
  try { return (navigator.devicePosture && navigator.devicePosture.type) || null; } catch (e) { return null; }
}
/* 折り目で上下に分かれた画面（Viewport Segments API）。上下2つなら [上, 下] */
function vSegments() {
  try {
    const s = window.viewportSegments;
    if (s && s.length === 2 && Math.abs(s[0].left - s[1].left) < 2 && s[1].top > s[0].top) return s;
  } catch (e) { /* ignore */ }
  return null;
}

/* サブディスプレイらしい画面。端末の画面そのものが小さくてほぼ正方形（Z Flip 6 のサブは 720×748）なら確実にサブ。
   それ以外は表示領域の形で見る（ブラウザのバーで横長になっても拾う） */
export function looksCover(w = window.innerWidth, h = window.innerHeight) {
  const sw = (window.screen && window.screen.width) || 0, sh = (window.screen && window.screen.height) || 0;
  if (sw > 0 && sh > 0 && Math.min(sw, sh) <= 500 && Math.max(sw, sh) / Math.min(sw, sh) <= 1.3) return true;
  return w > 0 && h > 0 && w <= 480 && h <= 560 && w / h > 0.7 && w / h < 1.9;
}

/* いまの表示: { kind: 'cover'|'fold'|null, foldTop, foldBottom, zoom } */
export function computeFlip(enabled) {
  const w = window.innerWidth || 0, h = window.innerHeight || 0;
  const none = { kind: null, foldTop: 0, foldBottom: 0, zoom: 1 };
  if (!enabled || !cfg.on) return none;
  const portrait = h > w;
  let kind = null;
  if (cfg.mode === 'cover') kind = 'cover';
  else if (cfg.mode === 'fold') kind = 'fold';
  else if (looksCover(w, h)) kind = 'cover';
  else if (portrait && (posture() === 'folded' || vSegments())) kind = 'fold';
  if (kind === 'cover') {
    const zoom = Math.min(1, Math.max(0.6, w / (cfg.baseW || 375)));
    return { ...none, kind, zoom };
  }
  if (kind === 'fold') {
    const seg = vSegments();
    let top = seg ? seg[0].bottom : h / 2, bottom = seg ? seg[1].top : h / 2;
    top += cfg.foldAdj || 0; bottom += cfg.foldAdj || 0;
    // 折り目はゆるく曲がっているので、上下 foldGap ずつは使わない
    const gap = cfg.foldGap || 0;
    return { ...none, kind, foldTop: Math.round(top - gap), foldBottom: Math.round(Math.max(top, bottom) + gap) };
  }
  return none;
}

/* 姿勢・画面サイズが変わったら知らせる */
export function watchFlipEnv(f) {
  const on = () => f();
  window.addEventListener('resize', on);
  window.addEventListener('orientationchange', on);
  document.addEventListener('visibilitychange', on); // 閉じた/開いた直後に resize が来ない時のため
  let dp = null;
  try { dp = navigator.devicePosture; if (dp && dp.addEventListener) dp.addEventListener('change', on); } catch (e) { dp = null; }
  return () => {
    window.removeEventListener('resize', on);
    window.removeEventListener('orientationchange', on);
    document.removeEventListener('visibilitychange', on);
    try { if (dp && dp.removeEventListener) dp.removeEventListener('change', on); } catch (e) { /* ignore */ }
  };
}

/* iPad などのタブレット: 縦はスマホ枠をやめて画面いっぱい（横幅に合わせる）。横は本棚だけ横向きの画面、ほかは縦の幅で真ん中に */
export function computeTablet(enabled) {
  const w = window.innerWidth || 0, h = window.innerHeight || 0;
  if (!enabled || !cfg.tab) return { on: false, land: false };
  let touch = false;
  try { touch = (navigator.maxTouchPoints || 0) > 0 || window.matchMedia('(pointer: coarse)').matches; } catch (e) { /* ignore */ }
  if (!touch || Math.min(w, h) < 600) return { on: false, land: false };
  return { on: true, land: w > h };
}
