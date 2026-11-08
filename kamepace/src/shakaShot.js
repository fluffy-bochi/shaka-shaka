/* シャカの画面を画像にして共有・保存する。
   絵文字はDOMの<div>（transformで動かす）なので、いま見えている位置・角度・大きさ・透明度を読んで canvas に描き写す。
   ナビや右の「ためた」タブ・予測バーは入れず、シャカの箱＋上の日付と時計だけ。 */
import { fluentSrc } from './fluent';

const imgCache = new Map();
function loadImg(src) {
  if (imgCache.has(src)) return imgCache.get(src);
  const p = new Promise((res) => {
    const im = new Image();
    im.crossOrigin = 'anonymous'; // CDN（jsdelivr）は CORS 可。付けないと canvas が書き出せなくなる
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = src;
  });
  imgCache.set(src, p);
  return p;
}

// 要素と親の opacity をかけ合わせる（箱の外まで）
function opacityOf(el, stop) {
  let o = 1;
  for (let e = el; e && e !== stop; e = e.parentElement) { const v = parseFloat(getComputedStyle(e).opacity); if (!Number.isNaN(v)) o *= v; }
  return o;
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/* opts: { date: '11月9日(日)' など, clock: '10:24', clockWhite: 山が高く時計が白いとき } → Blob(PNG) */
export async function shakaBlob({ date, clock, clockWhite }) {
  const box = document.getElementById('shakacase');
  if (!box) return null;
  const R = box.getBoundingClientRect();
  const W = Math.round(R.width), H = Math.round(R.height);
  const dpr = Math.min(3, Math.max(2, window.devicePixelRatio || 1));
  const cv = document.createElement('canvas');
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  // 背景（画面と同じ色）
  let bg = '#f7f4ec';
  for (let e = box; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (c && c !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(c)) { bg = c; break; } }
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // 絵文字（箱の直下の<div>。消える途中の演出 pop-fx は除く）
  const items = [];
  for (const d of box.children) {
    if (d.classList.contains('pop-fx')) continue;
    const img = d.querySelector('img');
    const text = img ? null : (d.textContent || '').trim();
    if (!img && !text) continue;
    const r = d.getBoundingClientRect();
    if (r.right < R.left || r.left > R.right || r.bottom < R.top || r.top > R.bottom) continue; // 箱の外（画面外へ出た分）
    const op = opacityOf(d, box);
    if (op <= 0.01) continue;
    const m = getComputedStyle(d).transform;
    let ang = 0;
    if (m && m !== 'none') { const v = m.match(/matrix\(([^)]+)\)/); if (v) { const [a, b] = v[1].split(',').map(Number); ang = Math.atan2(b, a); } }
    const size = img ? (img.offsetWidth || d.offsetWidth) : d.offsetWidth;
    const filt = getComputedStyle(d).filter;
    items.push({ cx: (r.left + r.right) / 2 - R.left, cy: (r.top + r.bottom) / 2 - R.top, ang, size, op, text, src: img ? (fluentSrc(img.alt) || img.src) : null, fontSize: parseFloat(getComputedStyle(d).fontSize) || size * 0.8, filt: filt && filt !== 'none' ? filt : 'none' });
  }
  const imgs = await Promise.all(items.map(it => (it.src ? loadImg(it.src) : null)));
  items.forEach((it, i) => {
    ctx.save();
    ctx.globalAlpha = it.op;
    try { ctx.filter = it.filt; } catch (e) { /* ignore */ }
    ctx.translate(it.cx, it.cy); ctx.rotate(it.ang);
    const im = imgs[i];
    if (im) ctx.drawImage(im, -it.size / 2, -it.size / 2, it.size, it.size);
    else { ctx.font = it.fontSize + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(it.text || (it.src ? '' : ''), 0, 0); }
    ctx.restore();
  });

  // 日付（ピル）と時計: 画面に出ている位置に合わせる
  const at = (id) => { const e = document.querySelector('[data-shot="' + id + '"]'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left - R.left, y: r.top - R.top, w: r.width, h: r.height }; };
  const dp = at('date');
  if (date) {
    ctx.font = "700 12px 'Space Mono', monospace";
    const tw = ctx.measureText(date).width, pw = tw + 32, ph = 30;
    const cx = dp ? dp.x + dp.w / 2 : W / 2, cy = dp ? dp.y + dp.h / 2 : 6 + ph / 2;
    ctx.fillStyle = 'rgba(255,255,255,.85)'; rr(ctx, cx - pw / 2, cy - ph / 2, pw, ph, ph / 2); ctx.fill();
    ctx.fillStyle = '#1b1b18'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(date, cx, cy + 0.5);
  }
  const cp = at('clock');
  if (clock) {
    ctx.save();
    ctx.font = "800 68px 'Archivo', sans-serif";
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (clockWhite) { ctx.shadowColor = 'rgba(27,27,24,.35)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 2; }
    ctx.fillStyle = clockWhite ? '#fff' : '#1b1b18';
    ctx.fillText(clock, cp ? cp.x + cp.w / 2 : W / 2, cp ? cp.y + cp.h / 2 : 90);
    ctx.restore();
  }
  return new Promise((res) => { try { cv.toBlob(b => res(b), 'image/png'); } catch (e) { res(null); } });
}

/* プレビューから押す: 共有シート（ボタンを押したその場で呼ぶ）。戻り値: 'shared' | 'cancel' | null（使えない・失敗） */
export function canShareFile(file) { try { return !!(navigator.canShare && navigator.canShare({ files: [file] })); } catch (e) { return false; } }
export async function shareFile(file) {
  try { await navigator.share({ files: [file] }); return 'shared'; } catch (e) { return e && e.name === 'AbortError' ? 'cancel' : null; }
}
export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fileName;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
