import React from 'react';
import Emo from '../fluent';
import { FreqPop } from './Pick';
import { freqText } from '../research';

/* オンボーディング（記録フロー設計.dc.html のオンボーディングを移植）
   1問1画面・上部プログレスバー・大きな選択カード。約1分・あとでマイページから変更可 */

const mono = { fontFamily: "'Space Mono',monospace" };

export default function Onboard({ v }) {
  const step = v.obStep;
  const total = 12;
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
        {step === 2 && <OnbWheel v={v} k="req" q="生活に必要なことは？" onlyCat="house" />}
        {step === 3 && <OnbWheel v={v} k="fav" q="やりたいことは？" />}
        {step === 4 && <Choice v={v} k="age" icon="🎂" q="年代を教えてください" sub="周りとくらべる基準に使います" opts={['10代', '20代', '30代', '40代', '50代', '60代〜']} cols={2} />}
        {step === 5 && <Choice v={v} k="gender" icon="🧍" q="からだの性別は？" sub="疲労の目安の参考にします" opts={['女性', '男性', 'その他', '答えない']} cols={2} />}
        {step === 6 && <Choice v={v} k="occupation" icon="💼" q="おもな職業・活動は？" sub="記録するカテゴリのおすすめ表示に使います" opts={['会社員（デスクワーク）', '学生', '立ち仕事・接客', '医療・介護', '主婦・主夫', 'その他']} emojis={['💻', '🎒', '🙋', '🩺', '🏠', '✨']} cols={1} />}
        {step === 7 && <HideCats v={v} />}
        {step === 8 && <Choice v={v} k="bodyFat" icon="💪" q="からだは疲れやすい方？" sub="計算の係数になります（あとで変更できます）" opts={['とても疲れやすい', '疲れやすい', 'ふつう', '疲れにくい', 'とても疲れにくい']} cols={1} />}
        {step === 9 && <Choice v={v} k="bodyRec" icon="💪" q="からだは回復しやすい方？" sub="ねむったり休んだりしたときの戻りやすさ" opts={['とても回復しやすい', '回復しやすい', 'ふつう', '回復しにくい', 'とても回復しにくい']} cols={1} />}
        {step === 10 && <Choice v={v} k="mindFat" icon="🧠" q="心は疲れやすい方？" sub="人づきあい・プレッシャーなどの効きかた" opts={['とても疲れやすい', '疲れやすい', 'ふつう', '疲れにくい', 'とても疲れにくい']} cols={1} />}
        {step === 11 && <Choice v={v} k="mindRec" icon="🧠" q="心は回復しやすい方？" sub="気晴らしで気持ちが戻りやすいか" opts={['とても回復しやすい', '回復しやすい', 'ふつう', '回復しにくい', 'とても回復しにくい']} cols={1} />}
        {step === 12 && <Done v={v} />}
      </div>
    </div>
  );
}

function Welcome({ v }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ width: 96, height: 96, borderRadius: 28, background: '#c4f000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52, boxShadow: '0 16px 40px rgba(122,154,0,.3)' }}>🐢</div>
      <div style={{ ...mono, fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: '#8a8a82', marginTop: 22 }}>HodoHodo Effort</div>
      <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6, lineHeight: 1.5 }}>ほどほどふぉーとへ<br />ようこそ</div>
      <div style={{ fontSize: 13.5, color: '#55554e', lineHeight: 1.9, marginTop: 14 }}>あなたに合わせて疲労を記録します。<br />まずは <b>10の質問</b> に答えてね。</div>
      <div style={{ ...mono, fontSize: 10.5, color: '#b4b2a8', marginTop: 10 }}>約1分 · あとで変更できます</div>
      <button onClick={v.obNext} style={{ width: '100%', marginTop: 26, border: 'none', borderRadius: 14, background: '#c4f000', color: '#2f3a00', fontWeight: 700, fontSize: 16, padding: 16, cursor: 'pointer' }}>はじめる</button>
      <button onClick={v.skipOnboard} style={{ marginTop: 14, border: 'none', background: 'none', fontSize: 12, fontWeight: 700, color: '#b4b2a8', cursor: 'pointer' }}>あとで（ふつうの設定ではじめる）</button>
    </div>
  );
}

const nextBtn = { width: '100%', marginTop: 16, border: 'none', borderRadius: 14, background: '#c4f000', color: '#2f3a00', fontWeight: 700, fontSize: 15, padding: 15, cursor: 'pointer', flex: '0 0 auto' };
const chip = (on) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, border: on ? '2px solid #1b1b18' : '1.5px solid #e4e1d8', background: on ? '#fbfdf0' : '#fff', borderRadius: 999, padding: on ? '7px 11px' : '7.5px 11.5px', fontSize: 13, fontWeight: on ? 900 : 700, color: '#1b1b18', cursor: 'pointer' });

function Head({ icon, q, sub }) {
  return (
    <>
      <div style={{ textAlign: 'center', fontSize: 44, marginTop: 6 }}>{icon}</div>
      <div style={{ textAlign: 'center', fontSize: 20, fontWeight: 900, marginTop: 10, lineHeight: 1.5 }}>{q}</div>
      <div style={{ textAlign: 'center', fontSize: 11.5, color: '#8a8a82', marginTop: 6, lineHeight: 1.6 }}>{sub}</div>
    </>
  );
}

/* 行動選択と同じ「くるくる回る」縦のリストで選ぶ（アプリの操作に慣れてもらうため）。
   行の右の「必」（やりたいことは♡）を押すと選べて、その横の頻度（はじめは1日1回）を押すと回数を変えられる。
   onlyCat: そのカテゴリの行動だけ（生活に必要なこと＝家事・生活） */
const ROW_I = 58, ROW_C = 34;
function OnbWheel({ v, k, q, onlyCat }) {
  const sel = v.obSel[k] || [], freqs = v.obSel[k + 'F'] || {};
  const [open, setOpen] = React.useState({});
  const [idx, setIdx] = React.useState(0);
  const [pop, setPop] = React.useState(null);
  const box = React.useRef(null);
  const cats = onlyCat ? v.obCats.filter(c => c.id === onlyCat) : v.obCats;
  const rows = [];
  cats.forEach(c => {
    if (!onlyCat) rows.push({ type: 'cat', cat: c, key: 'c:' + c.id });
    if (onlyCat || open[c.id]) c.items.forEach(it => rows.push({ type: 'item', cat: c, it, key: c.id + ':' + it.name }));
  });
  const hOf = (r) => (r.type === 'item' ? ROW_I : ROW_C);
  const offs = []; rows.reduce((a, r) => { offs.push(a); return a + hOf(r); }, 0);
  const onScroll = () => {
    const el = box.current; if (!el) return;
    const mid = el.scrollTop + el.clientHeight / 2 - el.clientHeight / 2; // 上の余白ぶんずらした位置
    let best = 0, bd = Infinity;
    rows.forEach((r, i) => { const c = offs[i] + hOf(r) / 2; const d = Math.abs(c - mid - 0); if (d < bd) { bd = d; best = i; } });
    if (best !== idx) setIdx(best);
  };
  const center = (i) => { const el = box.current; if (!el) return; el.scrollTo({ top: offs[i] + hOf(rows[i]) / 2 - 0, behavior: 'smooth' }); };
  // はじめは真ん中あたりの行から（上下に行が並んで見えるように）
  React.useLayoutEffect(() => {
    const el = box.current; if (!el || !rows.length) return;
    const mid = Math.floor((rows.length - 1) / 2);
    el.scrollTop = offs[mid] + hOf(rows[mid]) / 2; setIdx(mid);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const keepKey = React.useRef(null);
  // カテゴリを開け閉めしたら、そのカテゴリを真ん中に保つ
  React.useLayoutEffect(() => {
    const el = box.current; if (!el || !keepKey.current) return;
    const i = rows.findIndex(r => r.key === keepKey.current); keepKey.current = null;
    if (i >= 0) { el.scrollTop = offs[i] + hOf(rows[i]) / 2; setIdx(i); }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const tap = (r, i) => {
    if (i !== idx) { center(i); return; }
    if (r.type === 'cat') { keepKey.current = r.key; setOpen(o => ({ ...o, [r.cat.id]: !o[r.cat.id] })); }
  };
  const mark = k === 'req' ? '必' : '♡';
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, margin: '0 -24px -24px' }}>
      <div style={{ textAlign: 'center', fontSize: 20, fontWeight: 900, lineHeight: 1.5, padding: '4px 24px 0' }}>{q}</div>
      <div style={{ textAlign: 'center', fontSize: 11.5, color: '#8a8a82', marginTop: 4 }}>{mark === '必' ? '「必」' : '「♡」'}を押して選んでね</div>
      <div style={{ position: 'relative', flex: 1, minHeight: 300, marginTop: 10 }}>
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', zIndex: 2, width: 0, height: 0, borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderLeft: '12px solid #1b1b18', pointerEvents: 'none' }} />
        <div ref={box} onScroll={onScroll} className="nos" style={{ position: 'absolute', inset: 0, overflowY: 'auto', scrollSnapType: 'y mandatory' }}>
          <div style={{ height: '50%' }} />
          {rows.map((r, i) => {
            const on = i === idx;
            if (r.type === 'cat') {
              return (
                <div key={r.key} onClick={() => tap(r, i)} style={{ height: ROW_C, display: 'flex', alignItems: 'center', padding: on ? '0 28px 0 26px' : '0 36px 0 38px', scrollSnapAlign: 'center', boxSizing: 'border-box', cursor: 'pointer' }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', height: on ? 30 : 26, borderRadius: 7, background: '#fcfaf3', border: '2px solid ' + r.cat.color, overflow: 'hidden', boxSizing: 'border-box' }}>
                    <span style={{ flex: '0 0 30px', alignSelf: 'stretch', background: r.cat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5 }}>{open[r.cat.id] ? '▼' : '▶'}</span>
                    <span style={{ flex: 1, textAlign: 'center', fontSize: on ? 14.5 : 13, fontWeight: 800, paddingRight: 30 }}>{r.cat.name}</span>
                  </div>
                </div>
              );
            }
            const picked = sel.includes(r.it.name);
            const f = freqs[r.it.name] || { k: 1, unit: '日', n: 1 };
            return (
              <div key={r.key} onClick={() => tap(r, i)} style={{ height: ROW_I, display: 'flex', alignItems: 'center', padding: on ? '0 22px 0 26px' : '0 30px 0 38px', scrollSnapAlign: 'center', boxSizing: 'border-box', cursor: 'pointer' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, height: on ? 52 : 46, background: '#fcfaf3', borderRadius: 10, overflow: 'hidden', padding: '0 8px', boxShadow: on ? '0 4px 14px rgba(27,27,24,.16)' : '0 1px 2px rgba(27,27,24,.05)' }}>
                  <span style={{ position: 'absolute', left: 0, top: 0, width: 36, height: 36, background: r.cat.color, clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
                  <span style={{ position: 'relative', flex: '0 0 auto' }}><Emo e={r.it.glyph} size={on ? 28 : 24} /></span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: on ? 15 : 14, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.it.name}</span>
                  {picked && <button onClick={(e) => { e.stopPropagation(); setPop(r.it.name); }} style={{ flex: '0 0 auto', border: '1px solid #1b1b18', background: '#fff', borderRadius: 999, padding: '3px 8px', fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>{freqText(f)}</button>}
                  <button onClick={(e) => { e.stopPropagation(); v.obToggle(k, r.it.name); }} aria-label={mark} style={{ flex: '0 0 auto', width: 34, height: 30, borderRadius: 999, border: 'none', background: picked ? '#1b1b18' : '#efece3', color: picked ? '#fff' : '#1b1b18', fontSize: 14, fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit' }}>{mark}</button>
                </div>
              </div>
            );
          })}
          <div style={{ height: '50%' }} />
        </div>
        {pop && (
          <div onClick={() => setPop(null)} style={{ position: 'absolute', inset: 0, zIndex: 5, background: 'rgba(27,27,24,.3)' }}>
            <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', left: 0, right: 0, bottom: 72, height: 120 }}>
              <FreqPop key={pop} label={(k === 'req' ? '生活に必要なこと' : 'やりたいこと') + '・' + pop} value={freqs[pop] || { k: 1, unit: '日', n: 1 }}
                onSave={(f) => { v.obSetFreq(k, pop, f); setPop(null); }} onDelete={() => { v.obToggle(k, pop); setPop(null); }} onClose={() => setPop(null)} />
            </div>
          </div>
        )}
      </div>
      <div style={{ padding: '10px 24px 24px' }}>
        <button onClick={v.obNext} style={{ ...nextBtn, marginTop: 0 }}>{sel.length ? '次へ →（' + sel.length + '）' : 'とばす →'}</button>
      </div>
    </div>
  );
}

// 行動を複数選ぶ（欠かさずやること・やりたいこと）
function ActPick({ v, k, icon, q, sub }) {
  const sel = v.obSel[k] || [];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Head icon={icon} q={q} sub={sub} />
      <div style={{ marginTop: 14 }}>
        {v.obCats.map(c => (
          <div key={c.id} style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#8a8a82', marginBottom: 6 }}>{c.glyph} {c.name}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {c.items.map(t => {
                const on = sel.includes(t.name);
                return <button key={t.name} onClick={() => v.obToggle(k, t.name)} style={chip(on)}><span>{t.glyph}</span>{t.name}</button>;
              })}
            </div>
          </div>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <button onClick={v.obNext} style={{ ...nextBtn, position: 'sticky', bottom: 0, boxShadow: '0 -8px 16px #f7f4ec' }}>{sel.length ? '次へ →' : 'とばす →'}</button>
    </div>
  );
}

// 非表示にするカテゴリを選ぶ（職業のおすすめが初期値）
function HideCats({ v }) {
  const sel = v.obSel.hide || [];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Head icon="🙈" q="使わないカテゴリは？" sub="選んだカテゴリは非表示になります（あとで変更できます）" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginTop: 18 }}>
        {v.obCats.map(c => {
          const on = sel.includes(c.id);
          return (
            <button key={c.id} onClick={() => v.obToggle('hide', c.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, border: on ? '2px solid #1b1b18' : '1.5px solid #e4e1d8', background: on ? '#eeece4' : '#fff', borderRadius: 14, padding: '13px 12px', fontSize: 13.5, fontWeight: on ? 900 : 700, color: on ? '#8a8a82' : '#1b1b18', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ fontSize: 18 }}>{c.glyph}</span>
              <span style={{ flex: 1, textDecoration: on ? 'line-through' : 'none' }}>{c.name}</span>
              {on && <span style={{ fontFamily: 'Material Symbols Rounded', fontSize: 18 }}>visibility_off</span>}
            </button>
          );
        })}
      </div>
      <div style={{ flex: 1 }} />
      <button onClick={v.obNext} style={nextBtn}>次へ →</button>
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
      {v.obIsFemale && (
        <div style={{ width: '100%', marginTop: 16, background: '#fff', borderRadius: 14, padding: '13px 15px', boxShadow: '0 1px 3px rgba(27,27,24,.05)', textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🌙</span>
            <div style={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>生理の反映</div>
            {v.cycleEnabled && <span style={{ ...mono, fontSize: 10, fontWeight: 700, background: '#eef7cc', color: '#5a7500', borderRadius: 6, padding: '2px 8px' }}>設定済み</span>}
          </div>
          <div style={{ fontSize: 11.5, color: '#8a8a82', marginTop: 6, lineHeight: 1.6 }}>生理前・生理中の疲れやすさを反映できます。あとでマイページからでもOK。</div>
          <button onClick={v.openCycleFromOnboard} style={{ width: '100%', marginTop: 10, border: '1.5px solid #1b1b18', borderRadius: 12, background: '#fff', color: '#1b1b18', fontWeight: 700, fontSize: 13, padding: '11px 0', cursor: 'pointer' }}>{v.cycleEnabled ? '設定を見直す' : 'いま設定する'}</button>
        </div>
      )}
      <div style={{ fontSize: 11.5, color: '#b4b2a8', marginTop: 12 }}>いつでも <b>マイページ</b> から調整できます。</div>
      <button onClick={v.finishOnboard} style={{ width: '100%', marginTop: 18, border: 'none', borderRadius: 14, background: '#c4f000', color: '#2f3a00', fontWeight: 700, fontSize: 16, padding: 16, cursor: 'pointer' }}>ほどほどふぉーとをはじめる</button>
    </div>
  );
}
