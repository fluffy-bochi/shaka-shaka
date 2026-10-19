import React from 'react';

/* ホーム画面に追加の帯（画面の上）。
   Android・PC の Chrome など: ブラウザの合図（beforeinstallprompt）が来たら「追加」で追加の確認を出す。
   iPhone・iPad: 合図がないので、共有ボタン→「ホーム画面に追加」を案内する。
   ホーム画面から開いているとき・✕で閉じてから7日間は出さない */
const KEY = 'kame_install_x';
const WAIT = 7 * 864e5;
const standalone = () => { try { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; } catch (e) { return false; } };
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const closedRecently = () => { try { return Date.now() - Number(localStorage.getItem(KEY) || 0) < WAIT; } catch (e) { return false; } };

export default function Install() {
  const [evt, setEvt] = React.useState(() => window.__installEvt || null);
  const [hide, setHide] = React.useState(() => standalone() || closedRecently());
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    const on = () => setEvt(window.__installEvt || null);
    const done = () => setHide(true);
    window.addEventListener('kame-installable', on);
    window.addEventListener('appinstalled', done);
    const t = setTimeout(() => setReady(true), 1500); // 開いてすぐは出さない
    return () => { window.removeEventListener('kame-installable', on); window.removeEventListener('appinstalled', done); clearTimeout(t); };
  }, []);
  const ios = isIOS();
  if (hide || !ready || (!evt && !ios)) return null;
  const close = () => { try { localStorage.setItem(KEY, String(Date.now())); } catch (e) { /* ignore */ } setHide(true); };
  const add = async () => {
    try { evt.prompt(); const r = await evt.userChoice; window.__installEvt = null; if (r && r.outcome === 'accepted') setHide(true); else close(); } catch (e) { close(); }
  };
  return (
    <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top) + 8px)', left: 10, right: 10, zIndex: 30, display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderRadius: 16, padding: '9px 10px 9px 10px', boxShadow: '0 8px 24px rgba(27,27,24,.18)', animation: 'pop .25s ease' }}>
      <img src="/icon/kamepace-icon-180.png" alt="" style={{ width: 38, height: 38, borderRadius: 9, flex: '0 0 auto' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 900, color: '#1b1b18' }}>ホーム画面に追加</div>
        {!evt && <div style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11.5, fontWeight: 700, color: '#55554e', marginTop: 2, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'Material Symbols Rounded', fontSize: 16 }}>ios_share</span>→「ホーム画面に追加」
        </div>}
      </div>
      {evt && <button onClick={add} style={{ flex: '0 0 auto', border: 'none', borderRadius: 999, background: '#c4f000', color: '#2f3a00', fontSize: 13, fontWeight: 900, padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit' }}>追加</button>}
      <button onClick={close} aria-label="閉じる" style={{ flex: '0 0 auto', border: 'none', background: 'none', padding: 2, cursor: 'pointer', display: 'flex' }}><span style={{ fontFamily: 'Material Symbols Rounded', fontSize: 22, color: '#8a8a82' }}>close</span></button>
    </div>
  );
}
