import React from 'react';
import { createPortal } from 'react-dom';
import Emo, { fluentSrc } from '../fluent';
import { barOf, msOf, mmss, hm, PINK } from './Run';

/* 実行中のピクチャーインピクチャ（実行中のときだけ）。
   - PC（Document Picture-in-Picture がある Chrome/Edge）: Z Flip のサブディスプレイくらいの正方形の小窓に、
     いまの行動・バー・▶/⏸・ラップ・記録。
   - スマホ（動画の PiP だけ）: PC と同じ正方形の形を canvas に描いて動画として流す。
     PiP の ▶/⏸ で一時停止・再開。 */
const INK = '#1b1b18', SUB = '#55554e', MUTED = '#8a8a82', LIME = '#c4f000', LIME_INK = '#2f3a00';
const SQ_W = 360, SQ_H = 374; // Z Flip 6 のサブディスプレイ（720×748）の CSS ピクセル
const CW = SQ_W, CH = SQ_H, DPR = 2; // スマホの小窓も PC と同じ正方形（小窓の幅は OS が決めるので、スマホの幅には合わせられない）
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

/* リストの前・次の行動へ（実行画面のリストの行をタップしたのと同じ） */
const curIdx = (v) => ((v.run && v.run.rows) || []).findIndex(x => x.on);
const canStep = (v, d) => { const i = curIdx(v), n = ((v.run && v.run.rows) || []).length; return i >= 0 && i + d >= 0 && i + d < n; };
function runStep(v, d) { if (canStep(v, d)) v.runSelect(curIdx(v) + d); }

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => runStep(v, -1)} disabled={!canStep(v, -1)} aria-label="前に戻る" style={{ ...round, width: 40, height: 40, borderRadius: '50%', background: 'transparent', opacity: canStep(v, -1) ? 1 : 0.25 }}><span style={ms(32, INK, true)}>skip_previous</span></button>
          <button onClick={v.runToggle} aria-label={r.running ? '一時停止' : '再開'} style={{ ...round, width: 60, height: 60, borderRadius: '50%', background: r.running ? INK : LIME, boxShadow: '0 6px 16px rgba(27,27,24,.2)' }}>
            <span style={ms(38, r.running ? '#fff' : LIME_INK, true)}>{r.running ? 'pause' : 'play_arrow'}</span>
          </button>
          <button onClick={() => runStep(v, 1)} disabled={!canStep(v, 1)} aria-label="次に移動" style={{ ...round, width: 40, height: 40, borderRadius: '50%', background: 'transparent', opacity: canStep(v, 1) ? 1 : 0.25 }}><span style={ms(32, INK, true)}>skip_next</span></button>
        </div>
        {/* 記録: アプリに戻して（小窓を閉じて）記録の確認画面へ */}
        <button onClick={() => { v.runFinish(); try { window.focus(); } catch (e) { /* ignore */ } closeRunPip(); }} style={{ ...round, justifySelf: 'end', border: '2px solid ' + INK, borderRadius: 999, background: '#fff', color: INK, fontSize: 14, fontWeight: 900, padding: '6px 14px' }}>記録</button>
      </div>
    </div>
  );
}

/* ---- スマホ: PC の小窓と同じ正方形を canvas に描く ---- */
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
  ctx.fillStyle = '#f7f4ec'; ctx.fillRect(0, 0, CW, CH);
  if (!r) return;
  const now = Date.now(), c = { ...r.cur, ms: msOf(r.cur.segs, now) }, bar = barOf(r, c, now), over = bar.over;
  const font = (w, px, mono) => `${w} ${px}px ${mono ? '"Space Mono", ui-monospace, monospace' : '"Zen Kaku Gothic New", system-ui, sans-serif'}`;
  ctx.fillStyle = c.color || '#ccc';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(70, 0); ctx.lineTo(0, 70); ctx.closePath(); ctx.fill();
  // 絵文字
  const im = glyphImg(c.glyph, redraw), es = 110, ex = (CW - es) / 2, ey = 34;
  if (im) ctx.drawImage(im, ex, ey, es, es);
  else { ctx.font = `${Math.round(es * 0.82)}px system-ui`; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillStyle = INK; ctx.fillText(c.glyph || '', CW / 2, ey + es / 2); }
  // 名前・カテゴリ
  const L = 26, W = CW - L * 2;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = INK; ctx.font = font(900, 22); ctx.fillText(fit(ctx, c.name || '', W), CW / 2, 172);
  ctx.fillStyle = SUB; ctx.font = font(700, 11.5); ctx.fillText(fit(ctx, c.cat || '', W), CW / 2, 190);
  // 開始・終わりの時刻とバー
  ctx.font = font(700, 10.5, true); ctx.fillStyle = SUB;
  ctx.textAlign = 'left'; ctx.fillText(c.startAt ? hm(c.startAt) : '—', L, 218);
  ctx.textAlign = 'right'; if (!bar.none) ctx.fillText(hm(bar.endTs), CW - L, 218);
  const by = 230, ratio = bar.ratio;
  const line = (x0, x1, col) => { ctx.fillStyle = col; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x0, by - 2, Math.max(0, x1 - x0), 4, 2); else ctx.rect(x0, by - 2, Math.max(0, x1 - x0), 4); ctx.fill(); };
  line(L, CW - L, '#d8d5cb');
  line(L, L + W * (over ? bar.plan : ratio), INK);
  if (over) line(L + W * bar.plan, CW - L, PINK);
  ctx.fillStyle = over ? PINK : INK; ctx.beginPath(); ctx.arc(L + W * ratio, by, 6, 0, Math.PI * 2); ctx.fill();
  // 経過時間（／予定の時間・延長）
  const t1 = mmss(c.ms), t2 = over ? '（+' + mmss(bar.extra) + '）' : bar.none ? '' : ' / ' + mmss(bar.total);
  ctx.font = font(700, 20, true); const w1 = ctx.measureText(t1).width;
  ctx.font = font(700, 12, true); const w2 = ctx.measureText(t2).width;
  const x0 = (CW - w1 - w2) / 2;
  ctx.textAlign = 'left';
  ctx.font = font(700, 20, true); ctx.fillStyle = over ? PINK : INK; ctx.fillText(t1, x0, 262);
  ctx.font = font(700, 12, true); ctx.fillStyle = over ? PINK : MUTED; ctx.fillText(t2, x0 + w1, 262);
  // 止めている／動いている（小窓の ▶/⏸ で切り替え）
  const cx = CW / 2, cy = 318, rr = 30;
  ctx.fillStyle = r.running ? INK : LIME; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = r.running ? '#fff' : LIME_INK;
  if (r.running) { ctx.fillRect(cx - 10, cy - 12, 7, 24); ctx.fillRect(cx + 3, cy - 12, 7, 24); }
  else { ctx.beginPath(); ctx.moveTo(cx - 8, cy - 14); ctx.lineTo(cx + 14, cy); ctx.lineTo(cx - 8, cy + 14); ctx.closePath(); ctx.fill(); }
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
    // 画面には見せないが、iPhone は DOM にあって再生中でないと小窓にできない。
    // 要素の形が小窓の形になる端末があるので、絵と同じ縦横比にしておく（正方形にすると縦がつぶれた）
    Object.assign(video.style, { position: 'fixed', left: '0', top: '0', width: (SQ_W / 10) + 'px', height: (SQ_H / 10) + 'px', opacity: '0.01', pointerEvents: 'none', zIndex: '-1' });
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
    const step = (d) => { const x = vRef.current; if (x) runStep(x, d); setTimeout(draw, 0); };
    try { if (msn) { msn.setActionHandler('play', toggle); msn.setActionHandler('pause', toggle); } } catch (e) { /* ignore */ }
    // 小窓の ⏮/⏭（出せる端末だけ）＝前に戻る・次に移動
    try { if (msn) { msn.setActionHandler('previoustrack', () => step(-1)); msn.setActionHandler('nexttrack', () => step(1)); } } catch (e) { /* ignore */ }
    const t = setInterval(draw, 1000);
    // アプリに戻ってきたら（裏で止まった）動画をまた流しておく
    const onVis = () => { if (!document.hidden && video.paused) video.play().catch(() => {}); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
      video.removeEventListener('pause', onPause);
      try { if (document.pictureInPictureElement === video) document.exitPictureInPicture(); } catch (e) { /* ignore */ }
      try { if (msn) ['play', 'pause', 'previoustrack', 'nexttrack'].forEach(a => msn.setActionHandler(a, null)); } catch (e) { /* ignore */ }
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
