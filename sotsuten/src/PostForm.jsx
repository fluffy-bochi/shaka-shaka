import React from 'react';
import Emo from './fluent';
import { FACES, MOODS, TEXT_MAX, sendPost } from './posts';

/* スマホの投稿画面（QRコードから開く /?post）。本体のつぶやき画面（MoodPopup）の見た目を流用し、
   顔・つぶやき・きもちだけにしたもの */
const mono = { fontFamily: "'Space Mono',monospace" };
const line = { border: 'none', borderBottom: '1px solid #1b1b18', background: 'transparent', outline: 'none', fontFamily: 'inherit', color: '#1b1b18', padding: '6px 4px', boxSizing: 'border-box' };
const lab = { fontSize: 12.5, fontWeight: 800, color: '#1b1b18', marginTop: 22 };
const chip = (on) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, border: on ? '1.5px solid #1b1b18' : '1px solid #bab5a7', background: on ? '#1b1b18' : '#fcfaf3', color: on ? '#fff' : '#1b1b18', borderRadius: 14, padding: '4px 10px 4px 6px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' });

export default function PostForm() {
  const [face, setFace] = React.useState(3);
  const [mood, setMood] = React.useState('');
  const [text, setText] = React.useState('');
  const [state, setState] = React.useState('edit'); // edit | sending | done | error
  const canSave = state === 'edit' && (text.trim() || mood || face !== 3);
  const icon = mood ? MOODS.find(m => m.id === mood).g : FACES.find(f => f.face === face).g;
  const send = async () => {
    if (!canSave) return;
    setState('sending');
    try { await sendPost({ face, mood, text: text.trim() }); setState('done'); } catch (e) { setState('error'); }
  };
  const again = () => { setFace(3); setMood(''); setText(''); setState('edit'); };

  if (state === 'done') {
    return (
      <div style={{ minHeight: '100dvh', background: '#f7f4ec', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 24 }}>
        <Emo e={icon} size={72} />
        <div style={{ fontSize: 17, fontWeight: 800 }}>とどきました</div>
        <button onClick={again} style={{ border: 'none', borderRadius: 10, background: '#1b1b18', color: '#fff', fontSize: 15, fontWeight: 700, padding: '10px 22px', cursor: 'pointer', fontFamily: 'inherit' }}>もう一度つぶやく</button>
      </div>
    );
  }
  return (
    <div style={{ minHeight: '100dvh', background: '#f7f4ec', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'calc(14px + env(safe-area-inset-top)) 16px 4px' }}>
        <div style={{ fontSize: 15.5, fontWeight: 700, flex: 1 }}>きもち・できごと</div>
        <button onClick={send} style={{ border: 'none', borderRadius: 8, background: canSave ? '#1b1b18' : '#aeaeae', color: '#fff', fontSize: 15, fontWeight: 700, padding: '7px 16px', cursor: canSave ? 'pointer' : 'default', fontFamily: 'inherit' }}>{state === 'sending' ? '送信中' : '投稿'}</button>
      </div>
      <div style={{ flex: 1, padding: '14px 32px 30px 36px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}><Emo e={icon} size={44} /></div>
        {!mood && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
            {FACES.map(f => (
              <button key={f.face} onClick={() => setFace(f.face)} style={{ width: 48, height: 48, borderRadius: '50%', border: face === f.face ? '2px solid #1b1b18' : '1px solid transparent', background: face === f.face ? '#fcfaf3' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}><Emo e={f.g} size={32} /></button>
            ))}
          </div>
        )}
        <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, TEXT_MAX))} placeholder="つぶやき……" rows={3}
          style={{ ...line, display: 'block', width: '100%', marginTop: 12, resize: 'none', fontSize: 16, lineHeight: 1.55 }} />
        <div style={{ ...mono, fontSize: 10, color: '#8a8a82', textAlign: 'right', marginTop: 4 }}>{text.length}/{TEXT_MAX}</div>
        <div style={lab}>きもち<span style={{ fontSize: 10.5, color: '#8a8a82', marginLeft: 6 }}>あれば</span></div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {MOODS.map(m => <button key={m.id} onClick={() => setMood(mood === m.id ? '' : m.id)} style={chip(mood === m.id)}><Emo e={m.g} size={18} />{m.name}<span style={{ fontSize: 10, opacity: 0.7 }}>{m.bad ? '＋' : '−'}</span></button>)}
        </div>
        {state === 'error' && (
          <div style={{ marginTop: 20, fontSize: 13, color: '#c0395e', fontWeight: 700 }}>
            送れませんでした <button onClick={() => setState('edit')} style={{ marginLeft: 8, border: '1px solid #bab5a7', background: '#fcfaf3', borderRadius: 8, padding: '4px 10px', fontFamily: 'inherit', cursor: 'pointer' }}>もどる</button>
          </div>
        )}
      </div>
    </div>
  );
}
