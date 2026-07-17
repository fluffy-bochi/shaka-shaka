import React from 'react';

const mono = { fontFamily: "'Space Mono',monospace" };

/* 月経周期の設定（オンボーディング・マイページ共用）。
   最終開始日・周期・生理日数と、生理前/生理中の体・心の疲れやすさを設定 */
export default function Cycle({ v }) {
  const f = v.cycForm;
  const numRow = (label, k, sub) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: '1px solid #f1efe8' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{label}</div>
        {sub && <div style={{ ...mono, fontSize: 10.5, color: '#9d9b91', marginTop: 1 }}>{sub}</div>}
      </div>
      <button onClick={() => v.onCycField(k, Math.max(1, (parseInt(f[k], 10) || 0) - 1))} style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid #1b1b18', background: '#fff', fontSize: 16, cursor: 'pointer' }}>−</button>
      <span style={{ ...mono, fontSize: 15, fontWeight: 700, minWidth: 42, textAlign: 'center' }}>{f[k]}日</span>
      <button onClick={() => v.onCycField(k, (parseInt(f[k], 10) || 0) + 1)} style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid #1b1b18', background: '#fff', fontSize: 16, cursor: 'pointer' }}>＋</button>
    </div>
  );
  const strengthRow = (label, k) => (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#55554e' }}>{label}</div>
      <div style={{ display: 'flex', gap: 6, marginTop: 7 }}>
        {v.cycStrengthOpts(f[k], k).map((o, i) => (
          <button key={i} onClick={o.onPick} style={{ flex: 1, textAlign: 'center', border: o.on ? '2px solid #1b1b18' : '1.5px solid #e4e1d8', background: o.on ? '#fbfdf0' : '#fff', borderRadius: 11, padding: '9px 0', fontSize: 11, fontWeight: o.on ? 900 : 700, cursor: 'pointer', lineHeight: 1.3 }}>{o.label}</button>
        ))}
      </div>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: '#f7f4ec' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 20px 10px' }}>
        <button onClick={v.cancelCycle} style={{ background: 'none', border: 'none', fontSize: 19, color: '#8a8a82', cursor: 'pointer' }}>{v.cycFromOnboard ? '‹' : '✕'}</button>
        <div style={{ fontSize: 16, fontWeight: 700, flex: 1 }}>🌙 生理の反映</div>
      </div>
      <div className="nos" style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px' }}>
        <div style={{ fontSize: 12, color: '#55554e', lineHeight: 1.8, background: '#fff', borderRadius: 14, padding: '13px 15px' }}>
          周期からその日が<b>生理前・生理中</b>かを判定して、疲れやすさに反映します。ここの数値はこの端末（＆ログイン時はクラウド）にだけ保存されます。
        </div>
        {/* 周期 */}
        <div style={{ ...mono, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a8a82', margin: '16px 2px 4px' }}>周期</div>
        <div style={{ background: '#fff', borderRadius: 16, padding: '2px 15px', boxShadow: '0 1px 3px rgba(27,27,24,.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: '1px solid #f1efe8' }}>
            <div style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>前回の生理の開始日</div>
            <input type="date" value={f.last} onChange={(e) => v.onCycField('last', e.target.value)} style={{ ...mono, fontSize: 14, fontWeight: 700, border: '1.5px solid #e4e1d8', borderRadius: 10, padding: '8px 8px', color: '#1b1b18', background: '#fff' }} />
          </div>
          {numRow('周期の長さ', 'cycleLen', '生理開始から次の開始まで（ふつう28日）')}
          {numRow('生理の日数', 'periodLen', '出血がある日数（ふつう5日）')}
          {numRow('生理前の期間', 'preDays', 'PMSでしんどくなりやすい日数')}
        </div>
        {/* 生理前 */}
        <div style={{ ...mono, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a8a82', margin: '16px 2px 6px' }}>生理前（PMS）の疲れやすさ</div>
        <div style={{ background: '#fff', borderRadius: 16, padding: '12px 15px 15px', boxShadow: '0 1px 3px rgba(27,27,24,.05)' }}>
          {strengthRow('からだ', 'preBody')}
          {strengthRow('こころ', 'preMind')}
        </div>
        {/* 生理中 */}
        <div style={{ ...mono, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a8a82', margin: '16px 2px 6px' }}>生理中の疲れやすさ</div>
        <div style={{ background: '#fff', borderRadius: 16, padding: '12px 15px 15px', boxShadow: '0 1px 3px rgba(27,27,24,.05)' }}>
          {strengthRow('からだ', 'periodBody')}
          {strengthRow('こころ', 'periodMind')}
        </div>
        <button onClick={v.saveCycle} style={{ width: '100%', marginTop: 18, border: 'none', borderRadius: 14, background: '#c4f000', color: '#2f3a00', fontWeight: 700, fontSize: 16, padding: 16, cursor: 'pointer' }}>{v.cycFromOnboard ? '設定して次へ' : '保存する'}</button>
        {!v.cycFromOnboard && v.cycleEnabled && (
          <button onClick={v.disableCycle} style={{ display: 'block', width: '100%', marginTop: 12, border: 'none', background: 'none', fontSize: 12.5, fontWeight: 700, color: '#b4645a', cursor: 'pointer' }}>生理の反映をオフにする</button>
        )}
      </div>
    </div>
  );
}
