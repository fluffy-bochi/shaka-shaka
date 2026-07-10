import React from 'react';

/* ペルソナ別・1日の疲労シミュレーション
   （かめペース UI v1（ホーム・記録・登録確認）.dc.html §5c から移植） */

const mono = { fontFamily: "'Space Mono',monospace" };

const PERSONAS = [
  {
    id: 'haruka', avatar: '💻', name: 'ハルカ（26・会社員）', desc: '出社日。心が疲れやすい自覚あり',
    coefs: [
      { t: '疲労 体×1.0' },
      { t: '疲労 心×1.2', pink: true },
      { t: '回復 ×1.0' },
    ],
    slots: [
      { emoji: '🌅', name: '朝', fat: '+9', pct: 9, lines: [
        { t: '身じたく 0.5h (2+1×1.2)×.5 → +2' },
        { t: '満員の通勤 0.5h (6+7.2)×.5 → +7' },
      ] },
      { emoji: '☀️', name: '午前', fat: '+25', pct: 34, lines: [
        { t: '会議 1h (3+7×1.2) → +11' },
        { t: '資料作成 2h (2+4.8)×2 → +14' },
      ] },
      { emoji: '🌤', name: '午後', fat: '+22', pct: 56, lines: [
        { t: '集中作業 2h (2+7.2)×2 → +18' },
        { t: '打ち合わせ 1h (2+6) → +8' },
        { t: 'お茶 0.5h (2+6)×.5 → −4', green: true },
      ] },
      { emoji: '🌙', name: '夜', fat: '+11', pct: 67, lines: [
        { t: '買い物 0.5h → +3 ⏰' },
        { t: '料理・片付け 1h → +5 ⏰' },
        { t: 'ゲーム 1h → +3' },
      ] },
    ],
    total: '67', totalNote: '/ 100',
    night: (
      <>🛏 7h → 朝の申告「すこし残ってる」＝<b>15</b><br />
        <span style={{ ...mono, color: '#7a9a00' }}>睡眠回復 67−15 = −52</span>　⏰後から回復 −2<br />
        → 翌朝は <b style={mono}>13</b> でスタート</>
    ),
  },
  {
    id: 'yuta', avatar: '🎒', name: 'ユウタ（20・大学生）', desc: '授業＋夜バイトの日。体は丈夫',
    coefs: [
      { t: '疲労 体×0.9', lime: true },
      { t: '疲労 心×1.0' },
      { t: '回復 体×1.1', lime: true },
    ],
    slots: [
      { emoji: '🌅', name: '朝', fat: '+4', pct: 4, lines: [
        { t: '通学 0.5h (3.6+4)×.5 → +4' },
      ] },
      { emoji: '☀️', name: '午前', fat: '+16', pct: 20, lines: [
        { t: '講義 1.5h (1.8+5)×1.5 → +10' },
        { t: '自習 1h (1.8+4) → +6' },
      ] },
      { emoji: '🌤', name: '午後', fat: '+18', pct: 38, lines: [
        { t: 'ゼミ発表 1h ※講義のコピー×心1.2 → +8' },
        { t: '講義 1.5h → +10' },
      ] },
      { emoji: '🌙', name: '夜', fat: '+32', pct: 70, lines: [
        { t: 'バイト接客 3h (3.6+6)×3 → +29' },
        { t: '帰宅してゲーム 1h → +3' },
      ] },
    ],
    total: '70', totalNote: '/ 100',
    night: (
      <>🛏 6h → 朝の申告「どっさり」＝<b>30</b><br />
        <span style={{ ...mono, color: '#7a9a00' }}>睡眠回復 70−30 = −40</span><br />
        → 翌朝は <b style={mono}>30</b> でスタート。バイトの日の重さが翌日に見える</>
    ),
  },
  {
    id: 'misaki', avatar: '👩‍👧', name: 'ミサキ（38・時短勤務×育児）', desc: '多重役割の日。あふれの実例',
    coefs: [
      { t: '疲労 体×1.1' },
      { t: '疲労 心×1.2', pink: true },
      { t: '回復 ×0.9' },
    ],
    slots: [
      { emoji: '🌅', name: '朝', fat: '+14', pct: 14, lines: [
        { t: '朝食づくり 0.5h → +3 ⏰' },
        { t: '保育園おくり 0.5h → +4' },
        { t: '満員の通勤 0.5h → +7' },
      ] },
      { emoji: '☀️', name: '午前', fat: '+26', pct: 40, lines: [
        { t: '会議 1h (3.3+8.4) → +12' },
        { t: '事務作業 2h (2.2+4.8)×2 → +14' },
      ] },
      { emoji: '🌤', name: '午後', fat: '+25', pct: 65, lines: [
        { t: '集中作業 2h (2.2+7.2)×2 → +19' },
        { t: '電話対応 1h (1.1+4.8) → +6' },
      ] },
      { emoji: '🌙', name: '夜', fat: '+38', pct: 100, lines: [
        { t: 'お迎え 0.5h → +4　夕食づくり 1h → +6 ⏰' },
        { t: '洗濯 0.5h → +3 ⏰　子の世話 1.5h → +17' },
        { t: '寝かしつけ 1h → +8　皿洗い 0.5h → +3 ⏰' },
        { t: '入浴 0.5h (1.8+3.6)×.5 → −3', green: true },
      ] },
    ],
    total: '103', totalNote: '/ 100 ＝ あふれ',
    night: (
      <>シェイカーはあふれて振れない＝<b>この生活自体が頑張りすぎ</b>の信号（警告はしない）<br />
        🛏 6.5h → 申告「どっさり」＝<b>35</b>　<span style={{ ...mono, color: '#7a9a00' }}>回復 −68</span><br />
        ⏰後から回復 (1,5)×0.9 → −5 → 翌朝 <b style={mono}>30</b> でスタート</>
    ),
  },
];

function coefStyle(c) {
  if (c.pink) return { background: '#ffe3ef', color: '#a33e6d' };
  if (c.lime) return { background: '#eef7cc', color: '#5a7500' };
  return { background: '#efece3', color: '#55554e' };
}

export default function Help({ v }) {
  const p = PERSONAS[v.helpPersona] || PERSONAS[0];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: '#f7f4ec' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 20px 10px' }}>
        <button onClick={v.goMypage} style={{ background: 'none', border: 'none', fontSize: 19, color: '#8a8a82', cursor: 'pointer' }}>‹</button>
        <div style={{ fontSize: 15, fontWeight: 700, flex: 1, lineHeight: 1.3 }}>ペルソナ別・1日のシミュレーション</div>
      </div>
      {/* persona selector */}
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 10px', flex: '0 0 auto' }}>
        {PERSONAS.map((pp, i) => {
          const on = i === v.helpPersona;
          return (
            <button key={pp.id} onClick={() => v.setHelpPersona(i)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: on ? '2px solid #1b1b18' : '1.5px solid #e4e1d8', background: on ? '#fbfdf0' : '#fff', borderRadius: 12, padding: '9px 0', fontSize: 12.5, fontWeight: on ? 900 : 700, cursor: 'pointer' }}>
              <span style={{ fontSize: 16 }}>{pp.avatar}</span>{pp.name.split('（')[0]}
            </button>
          );
        })}
      </div>
      <div className="nos" style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px' }}>
        {/* persona card（設計リファレンス 5c と同じ構成） */}
        <div style={{ background: '#fff', borderRadius: 22, padding: 20, boxShadow: '0 1px 3px rgba(27,27,24,.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: '#efece3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flex: '0 0 auto' }}>{p.avatar}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: 15 }}>{p.name}</div>
              <div style={{ fontSize: 11, color: '#8a8a82', marginTop: 1 }}>{p.desc}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 5, marginTop: 10, flexWrap: 'wrap' }}>
            {p.coefs.map((c, i) => (
              <span key={i} style={{ ...mono, fontSize: 10, borderRadius: 6, padding: '3px 8px', ...coefStyle(c) }}>{c.t}</span>
            ))}
          </div>
          {p.slots.map((s, si) => (
            <div key={si} style={si === 0 ? { borderTop: '1px solid #f1efe8', marginTop: 14, paddingTop: 12 } : { marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 13 }}>{s.emoji}</span>
                <span style={{ fontSize: 12.5, fontWeight: 900, flex: 1 }}>{s.name}</span>
                <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: '#f5994e' }}>{s.fat}</span>
              </div>
              <div style={{ ...mono, fontSize: 10.5, lineHeight: 1.9, color: '#8a8a82', margin: '4px 0 0 21px' }}>
                {s.lines.map((l, li) => (
                  <div key={li} style={l.green ? { color: '#7a9a00' } : undefined}>{l.t}</div>
                ))}
              </div>
              <div style={{ height: 7, borderRadius: 99, background: '#efece3', margin: '8px 0 0 21px', overflow: 'hidden' }}>
                <div style={{ width: s.pct + '%', height: '100%', background: '#c4f000' }} />
              </div>
            </div>
          ))}
          <div style={{ borderTop: '1.5px solid #1b1b18', marginTop: 14, paddingTop: 11, display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 900, flex: 1 }}>就寝前</span>
            <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 22 }}>{p.total}</span>
            <span style={{ ...mono, fontSize: 10, color: '#b4b2a8' }}>{p.totalNote}</span>
          </div>
          <div style={{ background: '#f7f4ec', borderRadius: 12, padding: '10px 12px', marginTop: 10, fontSize: 11, lineHeight: 1.9, color: '#55554e' }}>{p.night}</div>
        </div>
        {/* 説明 */}
        <div style={{ background: '#fff', border: '1px solid #e4e1d8', borderRadius: 14, padding: '15px 18px', marginTop: 14 }}>
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.8, color: '#55554e' }}>
            3人とも<b style={{ color: '#1b1b18' }}>初期値マスタ＋個人係数で実計算</b>したサンプルです。ほどほどの日はネット30〜50、詰め込み・多重役割の日は100を超えてあふれます。⏰＝後から回復が翌枠頭に付く記録。ふだんの画面で見えるのは各記録の「+n」までで、合計はシャカの絵文字の量だけで伝えます。
          </p>
        </div>
      </div>
    </div>
  );
}
