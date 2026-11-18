import React from 'react';
import Emo from './fluent';
import { FACES, TEXT_MAX, sendPost } from './posts';
import { Post } from './screens/Home';

const APP_URL = 'https://shaka-shaka.vercel.app'; // ほどほどふぉーと（Webアプリ）

/* スマホの投稿画面（QRコードから開く /?post）。本体のつぶやき画面（MoodPopup）の見た目を流用し、
   顔・つぶやきだけにしたもの */
const mono = { fontFamily: "'Space Mono',monospace" };
const line = { border: 'none', borderBottom: '1px solid #1b1b18', background: 'transparent', outline: 'none', fontFamily: 'inherit', color: '#1b1b18', padding: '6px 4px', boxSizing: 'border-box' };

export default function PostForm() {
  const [face, setFace] = React.useState(3);
  const [text, setText] = React.useState('');
  const [state, setState] = React.useState('edit'); // edit | confirm | sending | done | error
  const [err, setErr] = React.useState('');
  const canSave = state === 'edit' && (text.trim() || face !== 3);
  const icon = FACES.find(f => f.face === face).g;
  const f = FACES.find(x => x.face === face);
  // 確認のポップアップに出す、展示のホームでの見え方（その投稿だけ）
  const now = new Date();
  const preview = { glyph: icon, head: 'つぶやき', time: now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0'), main: text.trim(), isNote: true,
    sumText: (f.rec ? '−' : '+') + f.n, cond: { mind: face, mindArrow: '' } };
  const send = async () => {
    if (state !== 'confirm') return;
    setState('sending');
    try { await sendPost({ face, text: text.trim() }); setState('done'); } catch (e) { setErr((e && e.code) || ''); setState('error'); }
  };

  if (state === 'done') {
    return (
      <div style={{ minHeight: '100dvh', background: '#f7f4ec', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <Emo e={icon} size={64} />
        <div style={{ fontSize: 22, fontWeight: 900 }}>ありがとう！</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 18, background: '#fff', borderRadius: 20, padding: '20px 28px', boxShadow: '0 2px 10px rgba(27,27,24,.06)' }}>
          <img src="/icon/kamepace-icon-180.png" alt="" style={{ width: 64, height: 64, borderRadius: 15 }} />
          <div style={{ fontSize: 16, fontWeight: 900 }}>ほどほどふぉーと</div>
          <a href={APP_URL} style={{ marginTop: 4, borderRadius: 12, background: '#c4f000', color: '#2f3a00', fontSize: 15, fontWeight: 800, padding: '12px 22px', textDecoration: 'none' }}>Webアプリはこちらから</a>
        </div>
      </div>
    );
  }
  return (
    <div style={{ minHeight: '100dvh', background: '#f7f4ec', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'calc(14px + env(safe-area-inset-top)) 16px 4px' }}>
        <div style={{ fontSize: 15.5, fontWeight: 700, flex: 1 }}>つぶやき</div>
        <button onClick={() => canSave && setState('confirm')} style={{ border: 'none', borderRadius: 8, background: canSave ? '#1b1b18' : '#aeaeae', color: '#fff', fontSize: 15, fontWeight: 700, padding: '7px 16px', cursor: canSave ? 'pointer' : 'default', fontFamily: 'inherit' }}>投稿</button>
      </div>
      <div style={{ flex: 1, padding: '14px 32px 30px 36px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}><Emo e={icon} size={44} /></div>
        {(
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
            {FACES.map(f => (
              <button key={f.face} onClick={() => setFace(f.face)} style={{ width: 48, height: 48, borderRadius: '50%', border: face === f.face ? '2px solid #1b1b18' : '1px solid transparent', background: face === f.face ? '#fcfaf3' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}><Emo e={f.g} size={32} /></button>
            ))}
          </div>
        )}
        <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, TEXT_MAX))} placeholder="つぶやき……" rows={3}
          style={{ ...line, display: 'block', width: '100%', marginTop: 12, resize: 'none', fontSize: 16, lineHeight: 1.55 }} />
        <div style={{ ...mono, fontSize: 10, color: '#8a8a82', textAlign: 'right', marginTop: 4 }}>{text.length}/{TEXT_MAX}</div>
        {state === 'error' && (
          <div style={{ marginTop: 20, fontSize: 13, color: '#c0395e', fontWeight: 700 }}>
            送れませんでした{err && <span style={{ ...mono, fontSize: 10, fontWeight: 400, marginLeft: 6 }}>{err}</span>} <button onClick={() => setState('edit')} style={{ marginLeft: 8, border: '1px solid #bab5a7', background: '#fcfaf3', borderRadius: 8, padding: '4px 10px', fontFamily: 'inherit', cursor: 'pointer' }}>もどる</button>
          </div>
        )}
      </div>
      {/* これでいい？（展示のホームに出る見た目で、この投稿だけ） */}
      {(state === 'confirm' || state === 'sending') && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10, background: 'rgba(27,27,24,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
          <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 22, padding: '18px 0 16px', boxShadow: '0 24px 60px rgba(27,27,24,.35)' }}>
            <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 900, marginBottom: 14 }}>これでいい？</div>
            <div style={{ borderBottom: '1px solid #bab5a7' }}><Post p={preview} /></div>
            <div style={{ display: 'flex', gap: 10, padding: '16px 16px 0' }}>
              <button onClick={() => setState('edit')} disabled={state === 'sending'} style={{ flex: 1, border: '2px solid #e4e1d8', borderRadius: 13, background: '#fff', color: '#55554e', fontWeight: 700, fontSize: 15, padding: '13px 0', cursor: 'pointer', fontFamily: 'inherit' }}>なおす</button>
              <button onClick={send} disabled={state === 'sending'} style={{ flex: 1.5, border: 'none', borderRadius: 13, background: '#1b1b18', color: '#fff', fontWeight: 700, fontSize: 15, padding: '13px 0', cursor: 'pointer', fontFamily: 'inherit' }}>{state === 'sending' ? '送信中' : '投稿する'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
