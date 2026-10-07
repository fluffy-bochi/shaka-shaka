import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './app.css';

/* 画面の描画でエラーが出ても真っ白にしない: 復旧画面を出し、「ひらきなおす」で一時データ（実行中のタスクなど）を消して読み込み直す。
   記録などのデータ（ゲストの shaka_guest・ログイン中のクラウド）は消さない */
class Guard extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err) { console.error('[kamepace] render error', err); }
  recover = () => {
    try { ['kame_run', 'kame_ikoi_draft', 'shaka_pile_layout'].forEach(k => localStorage.removeItem(k)); } catch (e) { /* ignore */ }
    window.location.reload();
  };
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, textAlign: 'center', background: '#f7f4ec', fontFamily: 'inherit' }}>
        <div style={{ fontSize: 40 }}>🐢</div>
        <div style={{ fontSize: 16, fontWeight: 900 }}>画面をひらけませんでした</div>
        <div style={{ fontSize: 12.5, color: '#55554e', lineHeight: 1.7 }}>記録は消えていません。</div>
        <button onClick={this.recover} style={{ border: 'none', borderRadius: 14, background: '#c4f000', color: '#2f3a00', fontWeight: 900, fontSize: 15, padding: '13px 28px', cursor: 'pointer' }}>ひらきなおす</button>
        <div style={{ fontSize: 10, color: '#a5a39a', maxWidth: 280, wordBreak: 'break-all' }}>{String(this.state.err && this.state.err.message || this.state.err)}</div>
      </div>
    );
  }
}

/* PC表示: 左上にロゴ、中央にスマホ枠、右にQR。モバイルではアプリが全画面（枠・ロゴ・QRは非表示） */
function Shell() {
  return (
    <div className="shell">
      <header className="shell-head">
        <img src="/icon/kamepace-icon-180.png" alt="ほどほどふぉーと" />
        <span>ほどほどふぉーと</span>
      </header>
      <div className="shell-body">
        <div className="phone">
          <Guard><App /></Guard>
        </div>
        <aside className="shell-side">
          <div className="qr-card">
            <img src="/qr_kame-pace.png" alt="QRコード" />
            <div className="qr-caption">スマホで読み取って開く</div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* 実際の可視高さ(システムのステータスバー・下部ナビを除いた領域)を測ってCSS変数に。
   Android(▼●■)・iOS(ホームインジケータ)・URLバーの出入りに追従して、常に1画面に収める */
function setAppVH() {
  // innerHeight = システムバー(Android下部ナビ等)を除いた領域。キーボードでは縮まないので画面がガタつかない
  const h = Math.round(window.innerHeight || 0);
  if (h) document.documentElement.style.setProperty('--app-vh', h + 'px');
}
setAppVH();
window.addEventListener('resize', setAppVH);
window.addEventListener('orientationchange', () => setTimeout(setAppVH, 250));

createRoot(document.getElementById('root')).render(<Shell />);
