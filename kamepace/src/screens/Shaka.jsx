import React from 'react';
import PredictBar from './PredictBar';
import { shakaBlob, canShareFile, shareFile, downloadBlob } from '../shakaShot';

const mono = { fontFamily: "'Space Mono',monospace" };
const ms = (size, color) => ({ fontFamily: 'Material Symbols Rounded', fontVariationSettings: "'FILL' 1", fontSize: size, color, lineHeight: 1 });
const pad = (n) => String(n).padStart(2, '0');

export default function Shaka({ v }) {
  // 共有: シャカの箱＋日付＋時計を画像にして、プレビューから「共有」「保存」
  const [shot, setShot] = React.useState(null); // { url, blob, file }
  const [busy, setBusy] = React.useState(false);
  const makeShot = async () => {
    if (busy) return; setBusy(true);
    try {
      const blob = await shakaBlob({ date: v.shakaDate, clock: v.clockHm, clockWhite: v.pileHigh });
      if (!blob) { if (v.toast) v.toast('画像を作れませんでした'); return; }
      const d = new Date(), name = 'kamepace-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + '.png';
      setShot({ url: URL.createObjectURL(blob), blob, file: new File([blob], name, { type: 'image/png' }) });
    } catch (e) { if (v.toast) v.toast('画像を作れませんでした'); } finally { setBusy(false); }
  };
  const closeShot = () => { if (shot) URL.revokeObjectURL(shot.url); setShot(null); };
  const circle = { width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,.85)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 };
  return (
    <>
      <div id="shakacase" style={{ position: 'absolute', left: 0, top: 0, bottom: v.shakaBottom, right: v.shakaRight || 0, zIndex: 0, overflow: 'hidden' }} />
      {/* 上部: 日付ピル＋シャッフル（メイン画面なので閉じるボタンは無し） */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 20px 0' }}>
        <button onClick={makeShot} aria-label="共有" style={{ ...circle, opacity: busy ? 0.5 : 1 }}><span style={ms(18, '#1b1b18')}>ios_share</span></button>
        <div data-shot="date" style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,.85)', borderRadius: 999, padding: '6px 10px' }}>
          <button onClick={v.prevDay} style={{ background: 'none', border: 'none', fontSize: 14, color: v.prevColor, cursor: 'pointer', padding: '2px 6px' }}>‹</button>
          <span style={{ ...mono, fontSize: 12, fontWeight: 700 }}>{v.shakaDate}</span>
          <button onClick={v.nextDay} style={{ background: 'none', border: 'none', fontSize: 14, color: v.nextColor, cursor: 'pointer', padding: '2px 6px' }}>›</button>
        </div>
        <button onClick={v.shake} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,.85)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, cursor: 'pointer' }}>🔀</button>
      </div>
      {/* ロック画面風の時計（旧本番 backClock 相当） */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '14px 26px 0', pointerEvents: 'none' }}>
        <div data-shot="clock" style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 68, lineHeight: 1.02, letterSpacing: '.01em', color: v.pileHigh ? '#fff' : '#1b1b18', textShadow: v.pileHigh ? '0 2px 10px rgba(27,27,24,.35)' : 'none', transition: 'color .3s' }}>{v.clockHm}</div>
      </div>
      {/* 予測バー中: その時間の行動（やっていた/やっている/やる予定） */}
      {v.predictActs && v.predictActs.length > 0 && (
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '8px 26px 0', pointerEvents: 'none' }}>
          {v.predictActs.slice(0, 4).map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, maxWidth: '100%', fontSize: 12.5, fontWeight: 700, color: '#1b1b18', textShadow: '0 0 6px rgba(247,244,236,.95), 0 0 2px rgba(247,244,236,.95)' }}>
              {a.plan && <span style={{ minWidth: 0, maxWidth: '38%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: '0 1 auto' }}>{a.plan} -</span>}
              <span style={{ fontSize: 14, flex: '0 0 auto' }}>{a.glyph}</span>
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</span>
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#8a8a82', flex: '0 0 auto' }}>{a.from}–{a.to}</span>
            </div>
          ))}
          {v.predictActs.length > 4 && <div style={{ fontSize: 11, fontWeight: 700, color: '#55554e' }}>ほか{v.predictActs.length - 4}件</div>}
        </div>
      )}
      <div style={{ flex: 1 }} />
      {/* 右端の「ためた回復」タブ（画面右辺にくっつく） */}
      <button onClick={v.goCollect} aria-label="ためた回復" style={{ position: 'absolute', right: v.shakaRight || 0, top: '46%', transform: 'translateY(-50%)', zIndex: 2, background: '#1b1b18', color: '#fff', border: 'none', borderRadius: '14px 0 0 14px', padding: '11px 9px 11px 11px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', boxShadow: '0 4px 14px rgba(27,27,24,.2)' }}>
        <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#c4f000', color: '#2f3a00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>🏆</span>
        <span style={{ ...mono, fontSize: 9, fontWeight: 700, writingMode: 'vertical-rl', letterSpacing: '.1em' }}>ためた</span>
      </button>
      <PredictBar v={v} />
      {/* 起床後記録: 🌙が降っている間、下にある「つぎへ」で次の画面へ */}
      {v.wakeFlow && (
        <button onClick={v.goWake2} style={{ position: 'absolute', left: 20, right: 20, bottom: v.shakaBottom + 20, zIndex: 4, border: 'none', borderRadius: 16, background: '#c4f000', color: '#2f3a00', fontWeight: 800, fontSize: 16, padding: '16px 0', cursor: 'pointer', boxShadow: '0 8px 22px rgba(122,154,0,.4)' }}>つぎへ</button>
      )}
      {v.bedFlow && (
        <button onClick={v.goBed2} style={{ position: 'absolute', left: 20, right: 20, bottom: v.shakaBottom + 20, zIndex: 4, border: 'none', borderRadius: 16, background: '#c4f000', color: '#2f3a00', fontWeight: 800, fontSize: 16, padding: '16px 0', cursor: 'pointer', boxShadow: '0 8px 22px rgba(122,154,0,.4)' }}>つぎへ</button>
      )}
      {shot && (
        <div onClick={closeShot} style={{ position: 'absolute', inset: 0, zIndex: 30, background: 'rgba(27,27,24,.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '24px 28px' }}>
          {/* iPhone は画像の長押しでも「写真に保存」できる */}
          <img src={shot.url} alt="シャカシャカ" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '100%', maxHeight: '68%', borderRadius: 16, boxShadow: '0 16px 40px rgba(27,27,24,.35)', background: '#f7f4ec' }} />
          <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 320 }}>
            <button onClick={closeShot} style={{ flex: 1, border: 'none', borderRadius: 13, background: '#fff', color: '#55554e', fontWeight: 800, fontSize: 14, padding: '13px 0', cursor: 'pointer', fontFamily: 'inherit' }}>とじる</button>
            <button onClick={() => { downloadBlob(shot.blob, shot.file.name); }} style={{ flex: 1, border: 'none', borderRadius: 13, background: '#fff', color: '#1b1b18', fontWeight: 900, fontSize: 14, padding: '13px 0', cursor: 'pointer', fontFamily: 'inherit' }}>保存</button>
            {canShareFile(shot.file) && <button onClick={() => { shareFile(shot.file); }} style={{ flex: 1.2, border: 'none', borderRadius: 13, background: '#c4f000', color: '#2f3a00', fontWeight: 900, fontSize: 14, padding: '13px 0', cursor: 'pointer', fontFamily: 'inherit' }}>共有</button>}
          </div>
        </div>
      )}
    </>
  );
}
