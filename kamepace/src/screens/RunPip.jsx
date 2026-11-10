import React from 'react';
import { createPortal } from 'react-dom';
import Emo, { fluentSrc } from '../fluent';
import { barOf, msOf, mmss, hm, PINK } from './Run';

/* 実行中のピクチャーインピクチャ（実行中のときだけ）。
   - PC（Document Picture-in-Picture がある Chrome/Edge）: Z Flip のサブディスプレイくらいの正方形の小窓に、
     いまの行動・バー・▶/⏸・ラップ・記録。
   - スマホ（動画の PiP だけ）: ホームの「実施中」のバーと同じ形を canvas に描いて動画として流す。
     PiP の ▶/⏸ で一時停止・再開。 */
const INK = '#1b1b18', SUB = '#55554e', MUTED = '#8a8a82', LIME = '#c4f000', LIME_INK = '#2f3a00';
const SQ_W = 360, SQ_H = 374; // Z Flip 6 のサブディスプレイ（720×748）の CSS ピクセル
const CW = 360, CH = 150, DPR = 2; // スマホの小窓（横長・Android の上限 2.39:1 の内側）
const ms = (size, color, fill = false) => ({ fontFamily: 'Material Symbols Rounded', fontVariationSettings: fill ? "'FILL' 1" : "'FILL' 0", fontSize: size, color, lineHeight: 1 });

const S = { win: null, video: null, canvas: null, toggle: null };
const subs = new Set();
const emit = () => subs.forEach(f => f());

export function pipKind() {
  try {
    if (typeof window !== 'undefined' && window.documentPictureInPicture && window.isSecureContext) return 'doc';
    const v = document.createElement('video');
    if (document.pictureInPictureEnabled || typeof v.webkitSetPresentationMode === 'function') return 'video';
  } catch (e) { /* ignore */ }
  return null;
}
export function pipActive() {
  return !!S.win || (!!S.video && (document.pictureInPictureElement === S.video || S.video.webkitPresentationMode === 'picture-in-picture'));
}

/* 元のページのスタイル（フォント・app.css）を小窓に写す */
function copyStyles(doc) {
  [...document.styleSheets].forEach(sh => {
    try {
      const css = [...sh.cssRules].map(r => r.cssText).join('\n');
      const st = doc.createElement('style'); st.textContent = css; doc.head.appendChild(st);
    } catch (e) {
      if (sh.href) { const l = doc.createElement('link'); l.rel = 'stylesheet'; l.href = sh.href; doc.head.appendChild(l); }
    }
  });
}

/* ボタンから呼ぶ（押した直後に開く必要がある） */
export async function openRunPip() {
  if (pipActive()) { closeRunPip(); return; }
  const kind = pipKind();
  if (kind === 'doc') {
    try {
      // 指定した高さにはタイトルバーが含まれるので、前に開いたときの差を足して中身を SQ_H に近づける
      let dh = 56; try { const x = localStorage.getItem('kame_pip_dh'); if (x != null) dh = Math.max(0, Math.min(120, +x || 0)); } catch (e) { /* ignore */ }
      const w = await window.documentPictureInPicture.requestWindow({ width: SQ_W, height: SQ_H + dh });
      setTimeout(() => { try { const d = dh + (SQ_H - w.innerHeight); if (w.innerHeight > 0 && d >= 0 && d < 120) localStorage.setItem('kame_pip_dh', String(d)); } catch (e) { /* ignore */ } }, 400);
      copyStyles(w.document);
      w.document.title = '実行中';
      w.document.body.style.margin = '0';
      w.document.body.style.background = '#f7f4ec';
      w.addEventListener('pagehide', () => { if (S.win === w) { S.win = null; emit(); } });
      S.win = w; emit();
    } catch (e) { console.warn('[kamepace] pip', e); }
    return;
  }
  const v = S.video; if (!v) return;
  try {
    if (v.paused) v.play().catch(() => {});
    if (v.requestPictureInPicture && document.pictureInPictureEnabled) await v.requestPictureInPicture();
    else if (v.webkitSetPresentationMode) v.webkitSetPresentationMode('picture-in-picture');
  } catch (e) { console.warn('[kamepace] pip', e); }
  emit();
}
export function closeRunPip() {
  if (S.win) { try { S.win.close(); } catch (e) { /* ignore */ } S.win = null; }
  const v = S.video;
  if (v) {
    try { if (document.pictureInPictureElement === v) document.exitPictureInPicture(); } catch (e) { /* ignore */ }
    try { if (v.webkitPresentationMode === 'picture-in-picture') v.webkitSetPresentationMode('inline'); } catch (e) { /* ignore */ }
  }
  emit();
}
export function usePip() {
  const [, f] = React.useState(0);
  React.useEffect(() => { const g = () => f(x => x + 1); subs.add(g); return () => subs.delete(g); }, []);
  return pipActive();
}

/* ---- PC: 正方形の小窓 ---- */
function Square({ v, win }) {
  const [, tick] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => tick(x => x + 1), 1000);
    const on = () => tick(x => x + 1);
    win.addEventListener('resize', on);
    return () => { clearInterval(t); win.removeEventListener('resize', on); };
  }, [win]);
  const r = v.run; if (!r) return null;
  const now = Date.now(), c = { ...r.cur, ms: msOf(r.cur.segs, now) }, bar = barOf(r, c, now), ratio = bar.ratio, over = bar.over;
  const z = Math.max(0.5, Math.min(win.innerWidth / SQ_W, win.innerHeight / SQ_H)); // 小窓の大きさに合わせて全体を拡大縮小
  const round = { border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 };
  return (
    <div style={{ width: win.innerWidth / z, height: win.innerHeight / z, zoom: z, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', background: '#f7f4ec', color: INK, fontFamily: '"Zen Kaku Gothic New", system-ui, sans-serif', position: 'relative', overflow: 'hidden', userSelect: 'none' }}>
      <span style={{ position: 'absolute', left: 0, top: 0, width: 70, height: 70, background: c.color, clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 26px 0' }}>
        <Emo e={c.glyph} size={110} />
        <div style={{ width: '100%', textAlign: 'center', fontSize: 22, fontWeight: 900, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: SUB }}>{c.cat}</div>
        <div style={{ width: '100%', marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, fontWeight: 700, color: SUB, fontFamily: "'Space Mono',monospace" }}>
            <span>{c.startAt ? hm(c.startAt) : '—'}</span><span>{bar.none ? '' : hm(bar.endTs)}</span>
          </div>
          <div style={{ position: 'relative', height: 12, display: 'flex', alignItems: 'center' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 2, background: '#d8d5cb' }} />
            <div style={{ position: 'absolute', left: 0, width: (over ? bar.plan : ratio) * 100 + '%', height: 4, borderRadius: 2, background: INK }} />
            {over && <div style={{ position: 'absolute', left: bar.plan * 100 + '%', right: 0, height: 4, borderRadius: 2, background: PINK }} />}
            <div style={{ position: 'absolute', left: `calc(${ratio * 100}% - 6px)`, width: 12, height: 12, borderRadius: '50%', background: over ? PINK : INK }} />
          </div>
          <div style={{ textAlign: 'center', fontSize: 20, fontWeight: 700, color: over ? PINK : INK, fontFamily: "'Space Mono',monospace", marginTop: 2 }}>
            {mmss(c.ms)}{over ? <span style={{ fontSize: 12 }}>（+{mmss(bar.extra)}）</span> : bar.none ? '' : <span style={{ fontSize: 12, color: MUTED }}> / {mmss(bar.total)}</span>}
          </div>
        </div>
      </div>
      <div style={{ flex: '0 0 auto', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '8px 18px 16px' }}>
        <button onClick={v.runLap} disabled={!r.running} style={{ ...round, justifySelf: 'start', width: 44, height: 44, borderRadius: '50%', background: '#efece3', color: INK, fontSize: 11, fontWeight: 900, opacity: r.running ? 1 : 0.35 }}>ラップ</button>
        <button onClick={v.runToggle} aria-label={r.running ? '一時停止' : '再開'} style={{ ...round, width: 60, height: 60, borderRadius: '50%', background: r.running ? INK : LIME, boxShadow: '0 6px 16px rgba(27,27,24,.2)' }}>
          <span style={ms(38, r.running ? '#fff' : LIME_INK, true)}>{r.running ? 'pause' : 'play_arrow'}</span>
        </button>
        <button onClick={() => { v.runFinish(); try { window.focus(); } catch (e) { /* ignore */ } }} style={{ ...round, justifySelf: 'end', border: '2px solid ' + INK, borderRadius: 999, background: '#fff', color: INK, fontSize: 14, fontWeight: 900, padding: '6px 14px' }}>記録</button>
      </div>
    </div>
  );
}

/* ---- スマホ: 「実施中」のバーの形を canvas に描く ---- */
const imgCache = {};
function glyphImg(g, redraw) {
  if (imgCache[g] !== undefined) return imgCache[g];
  const src = fluentSrc(g);
  if (!src) { imgCache[g] = null; return null; }
  imgCache[g] = false;
  const im = new Image(); im.crossOrigin = 'anonymous'; // 付けないと canvas が動画にできなくなる
  im.onload = () => { imgCache[g] = im; redraw(); };
  im.onerror = () => { imgCache[g] = null; redraw(); };
  im.src = src;
  return false;
}
function fit(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}
function drawCard(cv, v, redraw) {
  const ctx = cv.getContext('2d'), r = v.run;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, CW, CH);
  if (!r) return;
  const now = Date.now(), c = { ...r.cur, ms: msOf(r.cur.segs, now) }, bar = barOf(r, c, now), over = bar.over;
  ctx.fillStyle = c.color || '#ccc';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(96, 0); ctx.lineTo(0, 96); ctx.closePath(); ctx.fill();
  const im = glyphImg(c.glyph, redraw), es = 72, ex = 18, ey = (CH - 10 - es) / 2;
  if (im) ctx.drawImage(im, ex, ey, es, es);
  else { ctx.font = `${Math.round(es * 0.82)}px system-ui`; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillStyle = INK; ctx.fillText(c.glyph || '', ex + es / 2, ey + es / 2); }
  const tx = ex + es + 14, tw = CW - tx - 60;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = INK; ctx.font = '900 26px "Zen Kaku Gothic New", system-ui, sans-serif';
  ctx.fillText(fit(ctx, c.name || '', tw), tx, 62);
  ctx.fillStyle = over ? PINK : MUTED; ctx.font = '700 17px "Space Mono", ui-monospace, monospace';
  const t2 = mmss(c.ms) + (bar.none ? '' : ' / ' + mmss(bar.total));
  ctx.fillText(fit(ctx, t2, tw), tx, 92);
  if (over) { ctx.font = '700 14px "Space Mono", ui-monospace, monospace'; ctx.fillText(fit(ctx, '延長 +' + mmss(bar.extra), tw), tx, 114); }
  // 右: 止めている／動いている
  const bx = CW - 52, by = (CH - 10 - 40) / 2;
  ctx.fillStyle = r.running ? '#efece3' : LIME;
  ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(bx, by, 40, 40, 11); else ctx.rect(bx, by, 40, 40); ctx.fill();
  ctx.fillStyle = r.running ? INK : LIME_INK;
  if (r.running) { ctx.fillRect(bx + 13, by + 11, 5, 18); ctx.fillRect(bx + 22, by + 11, 5, 18); }
  else { ctx.beginPath(); ctx.moveTo(bx + 15, by + 10); ctx.lineTo(bx + 30, by + 20); ctx.lineTo(bx + 15, by + 30); ctx.closePath(); ctx.fill(); }
  // 下のバー
  ctx.fillStyle = '#e4e1d8'; ctx.fillRect(0, CH - 8, CW, 8);
  ctx.fillStyle = INK; ctx.fillRect(0, CH - 8, CW * (over ? bar.plan : bar.ratio), 8);
  if (over) { ctx.fillStyle = PINK; ctx.fillRect(CW * bar.plan, CH - 8, CW * (1 - bar.plan), 8); }
}

function VideoPip({ v }) {
  const vRef = React.useRef(v); vRef.current = v;
  const host = React.useRef(null);
  React.useEffect(() => {
    const cv = document.createElement('canvas'); cv.width = CW * DPR; cv.height = CH * DPR;
    const draw = () => { try { drawCard(cv, vRef.current, draw); } catch (e) { /* ignore */ } };
    draw();
    const video = document.createElement('video');
    video.muted = true; video.playsInline = true; video.autoplay = true;
    video.setAttribute('playsinline', ''); video.setAttribute('muted', '');
    video.setAttribute('autopictureinpicture', ''); // iPhone: 実行中にアプリを離れたら自動で小窓に
    // 画面には見せないが、iPhone は DOM にあって再生中でないと小窓にできない
    Object.assign(video.style, { position: 'fixed', left: '0', top: '0', width: '2px', height: '2px', opacity: '0.01', pointerEvents: 'none', zIndex: '-1' });
    let stream = null;
    try { stream = cv.captureStream(1); video.srcObject = stream; } catch (e) { console.warn('[kamepace] pip stream', e); }
    (host.current || document.body).appendChild(video);
    video.play().catch(() => {});
    S.video = video; S.canvas = cv;
    const toggle = () => { const x = vRef.current; if (x && x.runToggle) x.runToggle(); setTimeout(draw, 0); };
    // 小窓の ▶/⏸: 動画は止めずに、実行を止める・再開する
    const onPause = () => {
      if (!pipActive()) return;
      toggle(); video.play().catch(() => {});
    };
    video.addEventListener('pause', onPause);
    const onPip = () => emit();
    video.addEventListener('enterpictureinpicture', onPip); video.addEventListener('leavepictureinpicture', onPip);
    video.addEventListener('webkitpresentationmodechanged', onPip);
    const msn = navigator.mediaSession;
    try { if (msn) { msn.setActionHandler('play', toggle); msn.setActionHandler('pause', toggle); } } catch (e) { /* ignore */ }
    const t = setInterval(draw, 1000);
    // アプリに戻ってきたら（裏で止まった）動画をまた流しておく
    const onVis = () => { if (!document.hidden && video.paused) video.play().catch(() => {}); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
      video.removeEventListener('pause', onPause);
      try { if (document.pictureInPictureElement === video) document.exitPictureInPicture(); } catch (e) { /* ignore */ }
      try { if (msn) { msn.setActionHandler('play', null); msn.setActionHandler('pause', null); } } catch (e) { /* ignore */ }
      try { stream && stream.getTracks().forEach(tr => tr.stop()); } catch (e) { /* ignore */ }
      video.remove();
      if (S.video === video) { S.video = null; S.canvas = null; }
      emit();
    };
  }, []);
  // 状態が変わったらすぐ描き直す（毎秒を待たない）
  React.useEffect(() => { if (S.canvas) { try { drawCard(S.canvas, v, () => {}); } catch (e) { /* ignore */ } } });
  React.useEffect(() => {
    const msn = navigator.mediaSession, r = v.run;
    try { if (msn && r) { msn.metadata = new window.MediaMetadata({ title: r.cur.name || '実行中', artist: 'かめペース' }); msn.playbackState = r.running ? 'playing' : 'paused'; } } catch (e) { /* ignore */ }
  });
  return <div ref={host} />;
}

/* App に常に置く。実行中でなくなったら小窓を閉じる */
export default function RunPip({ v }) {
  usePip();
  const kind = React.useMemo(pipKind, []);
  const has = !!v.run;
  React.useEffect(() => { if (!has) closeRunPip(); }, [has]);
  React.useEffect(() => () => closeRunPip(), []);
  if (!has) return null;
  if (kind === 'video') return <VideoPip v={v} />;
  if (kind === 'doc' && S.win) return createPortal(<Square v={v} win={S.win} />, S.win.document.body);
  return null;
}
