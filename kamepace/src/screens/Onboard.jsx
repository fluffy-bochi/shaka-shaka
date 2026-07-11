import React from 'react';

/* オンボーディング（記録フロー設計.dc.html の9問ウィザードを移植）
   1問1画面・上部プログレスバー・大きな選択カード。約1分・あとでマイページから変更可 */

const mono = { fontFamily: "'Space Mono',monospace" };

export default function Onboard({ v }) {
  const step = v.obStep;
  const total = 9;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: '#f7f4ec' }}>
      {/* progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 20px 2px', flex: '0 0 auto' }}>
        <button onClick={v.obBack} style={{ background: 'none', border: 'none', fontSize: 22, color: step > 1 ? '#8a8a82' : 'transparent', cursor: step > 1 ? 'pointer' : 'default', padding: 0 }}>‹</button>
        <div style={{ flex: 1, height: 6, borderRadius: 999, background: '#e4e1d8', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(step / total) * 100}%`, background: '#c4f000', borderRadius: 999, transition: 'width .25s ease' }} />
        </div>
        <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: '#8a8a82' }}>{step}/{total}</span>
      </div>
      <div className="nos" style={{ flex: 1, overflowY: 'auto', padding: '14px 24px 24px', display: 'flex', flexDirection: 'column' }}>
        {step === 1 && <Welcome v={v} />}
        {step === 2 && <Choice v={v} k="age" icon="🎂" q="年代を教えてください" sub="周りとくらべる基準に使います" opts={['10代', '20代', '30代', '40代', '50代', '60代〜']} cols={2} />}
        {step === 3 && <Choice v={v} k="gender" icon="🧍" q="からだの性別は？" sub="疲労の目安の参考にします" opts={['女性', '男性', 'その他', '答えない']} cols={2} />}
        {step === 4 && <Choice v={v} k="occupation" icon="💼" q="おもな職業・活動は？" sub="記録するカテゴリのおすすめ表示に使います" opts={['会社員（デスクワーク）', '学生', '立ち仕事・接客', '医療・介護', '主婦・主夫', 'その他']} emojis={['💻', '🎒', '🙋', '🩺', '🏠', '✨']} cols={1} />}
        {step === 5 && <Choice v={v} k="bodyFat" icon="💪" q="からだは疲れやすい方？" sub="計算の係数になります（あとで変更できます）" opts={['とても疲れやすい', '疲れやすい', 'ふつう', '疲れにくい', 'とても疲れにくい']} cols={1} />}
        {step === 6 && <Choice v={v} k="bodyRec" icon="💪" q="からだは回復しやすい方？" sub="ねむったり休んだりしたときの戻りやすさ" opts={['とても回復しやすい', '回復しやすい', 'ふつう', '回復しにくい', 'とても回復しにくい']} cols={1} />}
        {step === 7 && <Choice v={v} k="mindFat" icon="🧠" q="心は疲れやすい方？" sub="人づきあい・プレッシャーなどの効きかた" opts={['とても疲れやすい', '疲れやすい', 'ふつう', '疲れにくい', 'とても疲れにくい']} cols={1} />}
        {step === 8 && <Choice v={v} k="mindRec" icon="🧠" q="心は回復しやすい方？" sub="気晴らしで気持ちが戻りやすいか" opts={['とても回復しやすい', '回復しやすい', 'ふつう', '回復しにくい', 'とても回復しにくい']} cols={1} />}
        {step === 9 && <Done v={v} />}
      </div>
    </div>
  );
}

function Welcome({ v }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ width: 96, height: 96, borderRadius: 28, background: '#c4f000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52, boxShadow: '0 16px 40px rgba(122,154,0,.3)' }}>🐢</div>
      <div style={{ ...mono, fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: '#8a8a82', marginTop: 22 }}>KAMEPACE</div>
      <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6, lineHeight: 1.5 }}>かめペースへ<br />ようこそ</div>
      <div style={{ fontSize: 13.5, color: '#55554e', lineHeight: 1.9, marginTop: 14 }}>あなたに合わせて疲労を記録します。<br />まずは <b>7つの質問</b> に答えてね。</div>
      <div style={{ ...mono, fontSize: 10.5, color: '#b4b2a8', marginTop: 10 }}>約1分 · あとで変更できます</div>
      <button onClick={v.obNext} style={{ width: '100%', marginTop: 26, border: 'none', borderRadius: 14, background: '#c4f000', color: '#2f3a00', fontWeight: 700, fontSize: 16, padding: 16, cursor: 'pointer' }}>はじめる</button>
      <button onClick={v.skipOnboard} style={{ marginTop: 14, border: 'none', background: 'none', fontSize: 12, fontWeight: 700, color: '#b4b2a8', cursor: 'pointer' }}>あとで（ふつうの設定ではじめる）</button>
    </div>
  );
}

function Choice({ v, k, icon, q, sub, opts, emojis, cols }) {
  const sel = v.obSel[k];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ textAlign: 'center', fontSize: 44, marginTop: 6 }}>{icon}</div>
      <div style={{ textAlign: 'center', fontSize: 20, fontWeight: 900, marginTop: 10, lineHeight: 1.5 }}>{q}</div>
      <div style={{ textAlign: 'center', fontSize: 11.5, color: '#8a8a82', marginTop: 6, lineHeight: 1.6 }}>{sub}</div>
      <div style={{ display: 'grid', gridTemplateColumns: cols === 2 ? '1fr 1fr' : '1fr', gap: 9, marginTop: 18 }}>
        {opts.map((o, i) => {
          const on = sel === o;
          return (
            <button key={o} onClick={() => v.obPick(k, o)} style={{ display: 'flex', alignItems: 'center', gap: 10, border: on ? '2px solid #1b1b18' : '1.5px solid #e4e1d8', background: on ? '#fbfdf0' : '#fff', borderRadius: 14, padding: '15px 16px', fontSize: 14.5, fontWeight: on ? 900 : 700, color: '#1b1b18', cursor: 'pointer', textAlign: 'left' }}>
              {emojis && <span style={{ fontSize: 20 }}>{emojis[i]}</span>}
              <span style={{ flex: 1 }}>{o}</span>
              {on && <span style={{ fontFamily: 'Material Symbols Rounded', fontSize: 18, color: '#7a9a00' }}>check</span>}
            </button>
          );
        })}
      </div>
      <div style={{ flex: 1 }} />
      <button onClick={v.obNext} disabled={!sel} style={{ width: '100%', marginTop: 16, border: 'none', borderRadius: 14, background: sel ? '#c4f000' : '#e4e1d8', color: sel ? '#2f3a00' : '#a5a39a', fontWeight: 700, fontSize: 15, padding: 15, cursor: sel ? 'pointer' : 'default' }}>次へ →</button>
    </div>
  );
}

function Done({ v }) {
  const rows = v.obSummary;
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ fontSize: 52 }}>🎉</div>
      <div style={{ fontSize: 21, fontWeight: 900, marginTop: 10 }}>準備ができました！</div>
      <div style={{ fontSize: 13, color: '#55554e', lineHeight: 1.8, marginTop: 8 }}>あなたに合わせた設定で<br />疲労を記録していきます。</div>
      <div style={{ width: '100%', background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(27,27,24,.05)', marginTop: 18, overflow: 'hidden', textAlign: 'left' }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 15px', borderBottom: i < rows.length - 1 ? '1px solid #f1efe8' : 'none' }}>
            <span style={{ fontSize: 15 }}>{r.icon}</span>
            <span style={{ flex: 1, fontSize: 13 }}>{r.label}</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{r.value}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: '#b4b2a8', marginTop: 12 }}>いつでも <b>マイページ</b> から調整できます。</div>
      <button onClick={v.finishOnboard} style={{ width: '100%', marginTop: 18, border: 'none', borderRadius: 14, background: '#c4f000', color: '#2f3a00', fontWeight: 700, fontSize: 16, padding: 16, cursor: 'pointer' }}>かめペースをはじめる</button>
    </div>
  );
}
