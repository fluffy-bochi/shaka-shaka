import React from 'react';
import Emo from '../fluent';
import { CATS } from '../data';
import Dog3D from '../DogModel';

/* 卒展の記録（Figma「卒展/入力モード」1〜4）。物理ボタン（キーの ↑↓←→ と Enter）だけで操作する。
   1 気分 → 2 行動（カテゴリの段と行動の段・↑↓で段を切りかえ） → 3 がんばりタイプ → 4 確認して「記録する」。
   戻るは Esc（Backspace でも）・1のときは閉じる。キーの表示（.keyhint）は PC モードのときだけ出る（app.css）。記録したものは onDone に渡し、ゲージに降らせる */
export const MOODS5 = [
  { face: 1, g: '😫', n: 2 },
  { face: 2, g: '😟', n: 1 },
  { face: 3, g: '😐', n: 1 },
  { face: 4, g: '🙂', n: 1, rec: true },
  { face: 5, g: '😆', n: 1, rec: true },
];
// Figma のカテゴリ（生活・休憩・移動・勉強・仕事）→ 本体の行動データ（data.js CATS）
const CAT_PICK = [['生活', 'house'], ['休憩', 'rest'], ['移動', 'idou'], ['勉強', 'school'], ['仕事', 'work']];
export const REC_CATS = CAT_PICK.map(([label, id]) => ({ label, items: (CATS.find(c => c.id === id) || { items: [] }).items }));
export const TYPES = [
  { id: 'yuttari', name: 'ゆったり', g: '🌿', color: '#c4f000', ink: '#2f3a00', mult: 1, say: 'おやすみ上手さん発見！' },
  { id: 'hodohodo', name: 'ほどほど', g: '☀️', color: '#f0c24b', ink: '#5a4300', mult: 1.5, say: 'がんばり上手さん発見！' },
  { id: 'michimichi', name: 'みちみち', svg: '/chara/fireball.svg', color: '#ef4b3c', ink: '#fff', mult: 2, say: 'おつかれさまー！明日は絶対休みにすること！' },
];
const WD = ['日', '月', '火', '水', '木', '金', '土'];
const INK = '#1b1b18', LIME = '#c4f000';

/* 行動1つぶんの、降らせる絵文字の数（疲れの目安 ÷5・1〜3個）×がんばりタイプ。回復はマイナス */
export function actDrop(a, type) {
  const est = Math.max(1, Math.round(Math.abs(a.fh) * (a.defMin || 30) / 60));
  return { g: a.glyph, n: Math.min(6, Math.round(Math.max(1, Math.min(3, Math.round(est / 5))) * (type ? type.mult : 1))), rec: a.fh < 0 };
}

const Arrow = ({ dir, on, onClick, size = 34 }) => (
  <button onClick={onClick} aria-label={dir < 0 ? '左' : '右'} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', opacity: on ? 1 : 0.25, fontFamily: 'Material Symbols Rounded', fontSize: size, color: INK, lineHeight: 1 }}>{dir < 0 ? 'chevron_left' : 'chevron_right'}</button>
);

function TypeBadge({ t, size }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: t.color, color: t.ink, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: size * 0.02, flex: '0 0 auto' }}>
      <span style={{ fontSize: Math.round(size * 0.12), fontWeight: 800 }}>{t.name}</span>
      {t.svg ? <img src={t.svg} alt="" style={{ width: size * 0.45, height: size * 0.45, filter: 'brightness(0) invert(1)' /* Figma どおり白い炎 */ }} /> : <Emo e={t.g} size={Math.round(size * 0.42)} />}
    </div>
  );
}

export default function Record({ onDone, onClose }) {
  const [step, setStep] = React.useState(1);
  const [mood, setMood] = React.useState(2); // 真ん中（😐）から
  const [cat, setCat] = React.useState(0);
  const [act, setAct] = React.useState(0);
  const [row, setRow] = React.useState(0); // 行動の画面: 0=カテゴリの段（ここから選ぶ） 1=行動の段
  const [type, setType] = React.useState(1);
  const items = REC_CATS[cat].items;
  const now = new Date();

  const st = React.useRef({}); st.current = { step, mood, cat, act, row, type, items };
  const next = () => {
    const s = st.current;
    if (s.step === 2 && s.row === 0) { setRow(1); return; } // カテゴリで Enter → 行動のカルーセルへ（次の画面には行かない）
    if (s.step === 1) setRow(0); // 行動の画面はカテゴリから
    if (s.step < 4) setStep(s.step + 1); else onDone({ mood: MOODS5[s.mood], act: s.items[s.act], type: TYPES[s.type] });
  };
  const back = () => {
    const s = st.current;
    if (s.step === 2 && s.row === 1) { setRow(0); return; } // 行動のカルーセルから戻る → カテゴリへ
    if (s.step === 3) setRow(1);
    if (s.step > 1) setStep(s.step - 1); else onClose();
  };
  const fnRef = React.useRef({}); fnRef.current = { next, back };
  React.useEffect(() => {
    const onKey = (e) => {
      const s = st.current, k = e.key;
      const move = (d) => {
        if (s.step === 1) setMood(m => Math.max(0, Math.min(4, m + d)));
        else if (s.step === 2 && s.row === 0) { setCat(c => Math.max(0, Math.min(REC_CATS.length - 1, c + d))); setAct(0); } // カテゴリは回さない（端で止まる）
        else if (s.step === 2) setAct(a => Math.max(0, Math.min(s.items.length - 1, a + d)));
        else if (s.step === 3) setType(t => Math.max(0, Math.min(2, t + d)));
      };
      const { next, back } = fnRef.current; // eslint-disable-line no-shadow
      if (k === 'ArrowLeft') move(-1);
      else if (k === 'ArrowRight') move(1);
      else if (k === 'ArrowUp' || k === 'ArrowDown') { if (s.step === 2) setRow(k === 'ArrowUp' ? 0 : 1); }
      else if (k === 'Enter') next();
      else if (k === 'Backspace' || k === 'Escape') back();
      else return;
      e.preventDefault(); e.stopPropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onDone, onClose]);

  const title = (t) => <div style={{ textAlign: 'center', fontSize: 34, fontWeight: 900, lineHeight: 1.35, whiteSpace: 'pre-line', marginTop: 74 }}>{t}</div>;
  // やるきーぬ: 空いている高さに合わせて縮む（最大 h）
  const dogPic = (h, wave = false) => <Dog3D key={wave ? 'w' : 's'} wave={wave} style={{ height: '100%', maxHeight: h }} />; // 手をふるのはまとめだけ・ほかは止めた3D
  const enterBtn = (label) => (
    <div onClick={next} style={{ alignSelf: 'center', marginBottom: 64, background: LIME, color: '#2f3a00', borderRadius: 999, padding: '14px 48px', fontSize: 30, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
      {label}<span className="keyhint">Enter</span>
    </div>
  );
  // ← → などの操作キー（PC モードだけ表示）
  const hint = (t) => <div style={{ textAlign: 'center', marginTop: 6, height: 20 }}><span className="keyhint">{t}</span></div>;
  const ring = (on) => ({ border: on ? '5px solid ' + LIME : '5px solid transparent', borderRadius: '50%', padding: 5, display: 'flex' });
  const circle = (size, children, bg = '#fff') => <div style={{ width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(27,27,24,.06)' }}>{children}</div>;
  const wrap = (children) => (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(247,244,236,.62)', WebkitBackdropFilter: 'blur(14px)', backdropFilter: 'blur(14px)' /* 後ろに今のゲージをぼかして */, display: 'flex', flexDirection: 'column', fontFamily: "'Zen Kaku Gothic New', system-ui, sans-serif", color: INK }}>
      {/* 戻る（1の画面では閉じる） */}
      <div onClick={back} style={{ position: 'absolute', left: 28, top: 28, zIndex: 2, display: 'flex', alignItems: 'center', gap: 6, background: '#fff', borderRadius: 999, padding: '8px 18px 8px 10px', fontSize: 20, fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 8px rgba(27,27,24,.08)' }}>
        <span style={{ fontFamily: 'Material Symbols Rounded', fontSize: 26, lineHeight: 1 }}>chevron_left</span>{step === 1 ? 'とじる' : '戻る'}<span className="keyhint">Esc</span>
      </div>
      {children}
    </div>
  );

  if (step === 1) return wrap(<>
    {title('今の気分を教えて')}
    <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '12px 0' }}>{dogPic(480)}</div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 56 }}>
      <Arrow dir={-1} on={mood > 0} onClick={() => setMood(m => Math.max(0, m - 1))} />
      {MOODS5.map((m, i) => <div key={m.face} onClick={() => setMood(i)} style={{ ...ring(i === mood), cursor: 'pointer' }}><div style={{ width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Emo e={m.g} size={i === mood ? 88 : 72} /></div></div>)}
      <Arrow dir={1} on={mood < 4} onClick={() => setMood(m => Math.min(4, m + 1))} />
    </div>
    <div style={{ marginTop: -46, marginBottom: 26 }}>{hint('← →')}</div>
    {enterBtn('決定')}
  </>);

  if (step === 2) {
    // 行動の段: 選んでいるものを真ん中に、離れるほど小さく
    const span = 4;
    const visible = [];
    for (let d = -span; d <= span; d++) { const i = act + d; visible.push(i >= 0 && i < items.length ? { i, d, a: items[i] } : { i: null, d }); }
    const sizeOf = (d) => (d === 0 ? 96 : Math.abs(d) === 1 ? 76 : Math.abs(d) === 2 ? 56 : 46);
    return wrap(<>
      {title('最近した行動を教えて！')}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '12px 0' }}>{dogPic(400)}</div>
      {/* カテゴリの段（5つとも並べたまま、選んでいるものに枠） */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: row === 0 ? 1 : 0.55 }}>
        <Arrow dir={-1} on={row === 0 && cat > 0} onClick={() => { setRow(0); setCat(c => Math.max(0, c - 1)); setAct(0); }} />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          {REC_CATS.map((c, i) => (
            <div key={c.label} onClick={() => { setRow(0); setCat(i); setAct(0); }} style={{ flex: '0 0 auto', cursor: 'pointer', fontSize: 26, fontWeight: 800, padding: '8px 18px', borderRadius: 16, background: '#fff', border: i === cat ? '4px solid ' + (row === 0 ? LIME : '#bab5a7') : '4px solid transparent', boxShadow: '0 2px 8px rgba(27,27,24,.06)' }}>{c.label}</div>
          ))}
        </div>
        <Arrow dir={1} on={row === 0 && cat < REC_CATS.length - 1} onClick={() => { setRow(0); setCat(c => Math.min(REC_CATS.length - 1, c + 1)); setAct(0); }} />
      </div>
      {/* 行動の段 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 22, opacity: row === 1 ? 1 : 0.55 }}>
        <Arrow dir={-1} on={row === 1 && act > 0} onClick={() => { setRow(1); setAct(a => Math.max(0, a - 1)); }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: 600, justifyContent: 'center', height: 120 }}>
          {visible.map(({ i, d, a }) => (
            <div key={d} onClick={() => { if (i != null) { setRow(1); setAct(i); } }} style={{ flex: '0 0 auto', cursor: i != null ? 'pointer' : 'default', padding: d === 0 ? 6 : 0, borderRadius: 20, border: d === 0 ? '4px solid ' + (row === 1 ? LIME : '#bab5a7') : 'none', visibility: i == null ? 'hidden' : 'visible' }}>
              {circle(sizeOf(d), a ? <Emo e={a.glyph} size={Math.round(sizeOf(d) * 0.66)} /> : null)}
            </div>
          ))}
        </div>
        <Arrow dir={1} on={row === 1 && act < items.length - 1} onClick={() => { setRow(1); setAct(a => Math.min(items.length - 1, a + 1)); }} />
      </div>
      <div style={{ textAlign: 'center', fontSize: 22, fontWeight: 800, marginTop: 8, height: 32 }}>{items[act] ? items[act].name : ''}</div>
      {hint('↑ ↓ 段をかえる　← → えらぶ')}
      {enterBtn('決定')}
    </>);
  }

  if (step === 3) return wrap(<>
    {title('最近のがんばりタイプ\n教えて！')}
    <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '12px 0' }}>{dogPic(440)}</div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 48 }}>
      <Arrow dir={-1} on={type > 0} onClick={() => setType(t => Math.max(0, t - 1))} />
      {TYPES.map((t, i) => <div key={t.id} onClick={() => setType(i)} style={{ ...ring(i === type), cursor: 'pointer' }}><TypeBadge t={t} size={i === type ? 186 : 166} /></div>)}
      <Arrow dir={1} on={type < 2} onClick={() => setType(t => Math.min(2, t + 1))} />
    </div>
    <div style={{ marginTop: -38, marginBottom: 18 }}>{hint('← →')}</div>
    {enterBtn('決定')}
  </>);

  // 4 確認: 気分・行動・タイプを同じ大きさで（気分と行動は絵文字だけ・行動の名前は下に）。やるきーぬはタイプに合わせてひとこと
  const m = MOODS5[mood], a = items[act], t = TYPES[type];
  const S = 140;
  const label = { fontSize: 34, fontWeight: 900, width: 140 };
  return wrap(<>
    <div style={{ textAlign: 'center', marginTop: 64 }}>
      <div style={{ fontSize: 34, fontWeight: 800 }}>{now.getMonth() + 1}月{now.getDate()}日（{WD[now.getDay()]}）</div>
      <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 118, lineHeight: 1, marginTop: 6 }}>{now.getHours()}:{String(now.getMinutes()).padStart(2, '0')}</div>
    </div>
    <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', padding: '0 40px 0 80px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}><span style={label}>気分</span><div style={{ width: S, display: 'flex', justifyContent: 'center' }}><Emo e={m.g} size={S} /></div></div>
        <div style={{ display: 'flex', alignItems: 'center' }}><span style={label}>行動</span>
          <div style={{ width: S, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {a ? <Emo e={a.glyph} size={S} /> : null}
            <div style={{ fontSize: 20, fontWeight: 800, textAlign: 'center', marginTop: 2, width: 220 }}>{a ? a.name : ''}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}><span style={label}>タイプ</span><TypeBadge t={t} size={S} /></div>
      </div>
      {/* やるきーぬ＋ひとこと（やるきーぬはテキストウィンドウの上に立つ） */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', alignSelf: 'stretch', paddingBottom: 40 }}>
        <div style={{ flex: '0 1 auto', minHeight: 0, display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>{dogPic(380, true)}</div>
        <div className="dog-say" style={{ position: 'relative', left: 'auto', top: 'auto', maxWidth: 300 }}>
          <div className="dog-say-name">やるきーぬ</div>
          <div className="dog-say-text">{t.say}</div>
        </div>
      </div>
    </div>
    {enterBtn('記録する')}
  </>);
}
