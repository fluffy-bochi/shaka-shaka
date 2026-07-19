import React from 'react';

const mono = { fontFamily: "'Space Mono',monospace" };

export default function Shaka({ v }) {
  return (
    <>
      <div id="shakacase" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 64, zIndex: 0, overflow: 'hidden' }} />
      {/* 上部: 日付ピル＋シャッフル（メイン画面なので閉じるボタンは無し） */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 20px 0' }}>
        <div style={{ width: 34 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,.85)', borderRadius: 999, padding: '6px 10px' }}>
          <button onClick={v.prevDay} style={{ background: 'none', border: 'none', fontSize: 14, color: v.prevColor, cursor: 'pointer', padding: '2px 6px' }}>‹</button>
          <span style={{ ...mono, fontSize: 12, fontWeight: 700 }}>{v.shakaDate}</span>
          <button onClick={v.nextDay} style={{ background: 'none', border: 'none', fontSize: 14, color: v.nextColor, cursor: 'pointer', padding: '2px 6px' }}>›</button>
        </div>
        <button onClick={v.shake} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,.85)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, cursor: 'pointer' }}>🔀</button>
      </div>
      {/* ロック画面風の時計（旧本番 backClock 相当） */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '14px 26px 0', pointerEvents: 'none' }}>
        <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 68, lineHeight: 1.02, letterSpacing: '.01em', color: v.pileHigh ? '#fff' : '#1b1b18', textShadow: v.pileHigh ? '0 2px 10px rgba(27,27,24,.35)' : 'none', transition: 'color .3s' }}>{v.clockHm}</div>
      </div>
      <div style={{ flex: 1 }} />
      {/* 右端の「ためた回復」タブ（画面右辺にくっつく） */}
      <button onClick={v.goCollect} aria-label="ためた回復" style={{ position: 'absolute', right: 0, top: '46%', transform: 'translateY(-50%)', zIndex: 2, background: '#1b1b18', color: '#fff', border: 'none', borderRadius: '14px 0 0 14px', padding: '11px 9px 11px 11px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', boxShadow: '0 4px 14px rgba(27,27,24,.2)' }}>
        <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#c4f000', color: '#2f3a00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>🏆</span>
        <span style={{ ...mono, fontSize: 9, fontWeight: 700, writingMode: 'vertical-rl', letterSpacing: '.1em' }}>ためた</span>
      </button>
      {/* 右下の記録ボタン（＋） */}
      <button onClick={v.goRecordNow} aria-label="記録する" style={{ position: 'absolute', right: 18, bottom: 84, zIndex: 3, width: 58, height: 58, borderRadius: '50%', background: '#c4f000', color: '#2f3a00', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 8px 22px rgba(122,154,0,.4)' }}>
        <span style={{ fontFamily: 'Material Symbols Rounded', fontSize: 30, fontWeight: 700 }}>add</span>
      </button>
    </>
  );
}
