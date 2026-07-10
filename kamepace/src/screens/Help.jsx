import React, { useMemo } from 'react';

/* ペルソナ別・1日のシミュレーション:
   3人の1日の数値（かめペース UI v1 §5c の実計算）を反映した「ホーム画面のサンプル」を表示する。
   睡眠カード・時間帯カード×4・背景に積もる絵文字まで本物のホームと同じ構成。 */

const mono = { fontFamily: "'Space Mono',monospace" };

const PERSONAS = [
  {
    id: 'haruka', avatar: '💻', name: 'ハルカ', title: 'ハルカ（26・会社員）', desc: '出社日。心が疲れやすい自覚あり',
    coefs: [
      { t: '疲労 体×1.0' },
      { t: '疲労 心×1.2', pink: true },
      { t: '回復 ×1.0' },
    ],
    sleepRecover: 52,
    slots: [
      { emoji: '🌅', name: '朝', records: [
        { g: '🧼', t: '身じたく', f: 2 },
        { g: '🚃', t: '満員の通勤', f: 7 },
      ] },
      { emoji: '☀️', name: '午前', records: [
        { g: '💬', t: '会議', f: 11 },
        { g: '📝', t: '資料作成', f: 14 },
      ] },
      { emoji: '🌤', name: '午後', records: [
        { g: '⌨️', t: '集中作業', f: 18 },
        { g: '💬', t: '打ち合わせ', f: 8 },
        { g: '☕', t: 'お茶', f: -4 },
      ] },
      { emoji: '🌙', name: '夜', records: [
        { g: '🛒', t: '買い物 ⏰', f: 3 },
        { g: '🍳', t: '料理・片付け ⏰', f: 5 },
        { g: '🎮', t: 'ゲーム', f: 3 },
      ] },
    ],
    total: 67, over: false,
    note: <>就寝前は<b>67</b>。🛏 7時間ねむって朝の申告は「すこし残ってる」＝15 → <span style={{ ...mono, color: '#7a9a00' }}>睡眠回復 −52</span>、⏰後から回復 −2。翌朝は <b style={mono}>13</b> でスタート。</>,
  },
  {
    id: 'yuta', avatar: '🎒', name: 'ユウタ', title: 'ユウタ（20・大学生）', desc: '授業＋夜バイトの日。体は丈夫',
    coefs: [
      { t: '疲労 体×0.9', lime: true },
      { t: '疲労 心×1.0' },
      { t: '回復 体×1.1', lime: true },
    ],
    sleepRecover: 40,
    slots: [
      { emoji: '🌅', name: '朝', records: [
        { g: '🚃', t: '通学', f: 4 },
      ] },
      { emoji: '☀️', name: '午前', records: [
        { g: '📖', t: '講義', f: 10 },
        { g: '📚', t: '自習', f: 6 },
      ] },
      { emoji: '🌤', name: '午後', records: [
        { g: '🎤', t: 'ゼミ発表', f: 8 },
        { g: '📖', t: '講義', f: 10 },
      ] },
      { emoji: '🌙', name: '夜', records: [
        { g: '🙋', t: 'バイト接客', f: 29 },
        { g: '🎮', t: '帰宅してゲーム', f: 3 },
      ] },
    ],
    total: 70, over: false,
    note: <>就寝前は<b>70</b>。🛏 6時間ねむって朝の申告は「どっさり」＝30 → <span style={{ ...mono, color: '#7a9a00' }}>睡眠回復 −40</span>。翌朝は <b style={mono}>30</b> でスタート。バイトの日の重さが翌日に見える。</>,
  },
  {
    id: 'misaki', avatar: '👩‍👧', name: 'ミサキ', title: 'ミサキ（38・時短勤務×育児）', desc: '多重役割の日。あふれの実例',
    coefs: [
      { t: '疲労 体×1.1' },
      { t: '疲労 心×1.2', pink: true },
      { t: '回復 ×0.9' },
    ],
    sleepRecover: 68,
    slots: [
      { emoji: '🌅', name: '朝', records: [
        { g: '🍳', t: '朝食づくり ⏰', f: 3 },
        { g: '🚙', t: '保育園おくり', f: 4 },
        { g: '🚃', t: '満員の通勤', f: 7 },
      ] },
      { emoji: '☀️', name: '午前', records: [
        { g: '💬', t: '会議', f: 12 },
        { g: '📝', t: '事務作業', f: 14 },
      ] },
      { emoji: '🌤', name: '午後', records: [
        { g: '⌨️', t: '集中作業', f: 19 },
        { g: '📞', t: '電話対応', f: 6 },
      ] },
      { emoji: '🌙', name: '夜', records: [
        { g: '🚙', t: 'お迎え', f: 4 },
        { g: '🍳', t: '夕食づくり ⏰', f: 6 },
        { g: '🧺', t: '洗濯 ⏰', f: 3 },
        { g: '🍼', t: '子の世話', f: 17 },
        { g: '🧸', t: '寝かしつけ', f: 8 },
        { g: '🍽', t: '皿洗い ⏰', f: 3 },
        { g: '🛁', t: '入浴', f: -3 },
      ] },
    ],
    total: 103, over: true,
    note: <>就寝前は<b>103</b>＝<b>あふれ</b>。シェイカーはあふれて振れない＝この生活自体が頑張りすぎの信号（警告はしない）。🛏 6.5時間ねむって申告「どっさり」＝35 → <span style={{ ...mono, color: '#7a9a00' }}>回復 −68</span>、⏰後から回復 −5。翌朝は <b style={mono}>30</b> でスタート。</>,
  },
];

const fatText = (f) => (f >= 0 ? '+' + f : '−' + Math.abs(f));

/* 背景の山: ホームの makePile と同じ幾何で、その日の絵文字を就寝前の量だけ積む */
function calcR(w, h) {
  const area = Math.max(1, w) * Math.max(1, h);
  const r = Math.sqrt(area * 0.6 / (100 * Math.PI));
  return Math.max(12, Math.min(r, 60));
}
function buildPile(p) {
  const glyphs = [];
  p.slots.forEach(s => s.records.forEach(r => { if (r.f > 0) for (let i = 0; i < r.f; i++) glyphs.push(r.g); }));
  const keep = glyphs.slice(0, p.total);
  const W = Math.min(480, window.innerWidth || 372), H = (window.innerHeight || 812) - 104;
  const r = calcR(W, H), d = r * 2, font = Math.round(r * 1.6);
  let s = 7; const rng = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const cols = Math.max(1, Math.floor(W / d)); const out = [];
  const n = Math.min(keep.length, 130);
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / cols), col = i % cols;
    const x = Math.round(col * d + (row % 2 ? d / 2 : 0) + (rng() - 0.5) * (d * 0.35));
    out.push({
      e: keep[i],
      x: Math.max(-8, Math.min(W - d + 8, x)),
      y: Math.max(-6, Math.round(row * d * 0.82 + (rng() - 0.5) * (d * 0.25))),
      r2: Math.round((rng() - 0.5) * 54),
      s: font,
    });
  }
  return out;
}

export default function Help({ v }) {
  const p = PERSONAS[v.helpPersona] || PERSONAS[0];
  const pile = useMemo(() => buildPile(p), [p.id]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: '#f7f4ec' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 20px 8px', position: 'relative', zIndex: 2 }}>
        <button onClick={v.goMypage} style={{ background: 'none', border: 'none', fontSize: 19, color: '#8a8a82', cursor: 'pointer' }}>‹</button>
        <div style={{ fontSize: 15, fontWeight: 700, flex: 1, lineHeight: 1.3 }}>3人の1日サンプル</div>
      </div>
      {/* persona selector */}
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 8px', flex: '0 0 auto', position: 'relative', zIndex: 2 }}>
        {PERSONAS.map((pp, i) => {
          const on = i === v.helpPersona;
          return (
            <button key={pp.id} onClick={() => v.setHelpPersona(i)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: on ? '2px solid #1b1b18' : '1.5px solid #e4e1d8', background: on ? '#fbfdf0' : '#fff', borderRadius: 12, padding: '9px 0', fontSize: 12.5, fontWeight: on ? 900 : 700, cursor: 'pointer' }}>
              <span style={{ fontSize: 16 }}>{pp.avatar}</span>{pp.name}
            </button>
          );
        })}
      </div>
      {/* ホーム画面サンプル */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* 背景に積もる絵文字（ホームと同じ・ボカシ） */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, filter: 'blur(1.5px)', pointerEvents: 'none' }}>
          {pile.map((q, i) => (
            <span key={i} style={{ position: 'absolute', left: q.x, bottom: q.y, fontSize: q.s, transform: `rotate(${q.r2}deg)`, filter: 'drop-shadow(0 4px 6px rgba(27,27,24,.14))' }}>{q.e}</span>
          ))}
        </div>
        <div className="nos" style={{ position: 'relative', zIndex: 1, height: '100%', overflowY: 'auto', padding: '0 0 12px' }}>
          {/* ホームのヘッダー相当 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 18px 8px 16px' }}>
            <div>
              <div style={{ ...mono, fontSize: 9, letterSpacing: '.12em', color: '#8a8a82' }}>SAMPLE · {p.title}</div>
              <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.25, marginTop: 1 }}>{p.name}の1日</div>
            </div>
            <div style={{ width: 38, height: 38, background: 'rgba(255,255,255,.85)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{p.avatar}</div>
          </div>
          {/* ペルソナ説明＋個人係数 */}
          <div style={{ margin: '0 16px 10px', background: 'rgba(255,255,255,.9)', borderRadius: 14, padding: '10px 13px' }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#55554e' }}>{p.desc}</div>
            <div style={{ display: 'flex', gap: 5, marginTop: 7, flexWrap: 'wrap' }}>
              {p.coefs.map((c, i) => (
                <span key={i} style={{ ...mono, fontSize: 10, borderRadius: 6, padding: '3px 8px', background: c.pink ? '#ffe3ef' : c.lime ? '#eef7cc' : '#efece3', color: c.pink ? '#a33e6d' : c.lime ? '#5a7500' : '#55554e' }}>{c.t}</span>
              ))}
            </div>
          </div>
          {/* sleep card（ホームと同じ） */}
          <div style={{ display: 'block', background: '#fff', borderRadius: 16, padding: '13px 14px', margin: '0 16px 10px', boxShadow: '0 1px 3px rgba(27,27,24,.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 15 }}>🛏</span>
              <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>睡眠</span>
              <span style={{ ...mono, fontSize: 10, color: '#8a8a82' }}>回復</span>
              <span style={{ ...mono, fontSize: 13, fontWeight: 700, color: '#7a9a00' }}>−{p.sleepRecover}</span>
            </div>
          </div>
          {/* slot cards（ホームと同じあすけん式） */}
          {p.slots.map((s, si) => {
            const sum = s.records.reduce((a, r) => a + r.f, 0);
            return (
              <div key={si} style={{ background: '#fff', borderRadius: 18, margin: '0 16px 12px', boxShadow: '0 1px 3px rgba(27,27,24,.06)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px 12px' }}>
                  <div style={{ position: 'relative', width: 42, height: 42, flex: '0 0 auto', borderRadius: '50%', background: '#eaf5c9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                    {s.emoji}
                    <span style={{ position: 'absolute', top: -1, right: -2, width: 17, height: 17, borderRadius: '50%', background: '#c4f000', border: '2.5px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Material Symbols Rounded', fontVariationSettings: "'FILL' 1", fontSize: 10, color: '#2f3a00' }}>check</span>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 800, flex: 1, color: '#1b1b18' }}>{s.name}</span>
                  <span style={{ ...mono, fontSize: 13, fontWeight: 700, color: '#f5994e' }}>{fatText(sum)}</span>
                </div>
                <div style={{ borderTop: '1px solid #f1efe8' }}>
                  {s.records.map((r, ri) => (
                    <div key={ri} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '9px 15px', borderBottom: '1px solid #f1efe8' }}>
                      <span style={{ fontSize: 15, flex: '0 0 auto', marginTop: 1 }}>{r.g}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1b1b18', lineHeight: 1.4 }}>{r.t}</div>
                      </div>
                      <span style={{ ...mono, fontSize: 13, fontWeight: 700, color: r.f < 0 ? '#7a9a00' : '#f5994e', flex: '0 0 auto', whiteSpace: 'nowrap', marginTop: 1 }}>{fatText(r.f)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {/* 1日のまとめ */}
          <div style={{ margin: '0 16px', background: 'rgba(255,255,255,.92)', border: '1px solid #e4e1d8', borderRadius: 14, padding: '13px 15px' }}>
            <div style={{ fontSize: 11.5, lineHeight: 1.9, color: '#55554e' }}>{p.note}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
