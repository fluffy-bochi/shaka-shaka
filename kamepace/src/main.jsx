import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './app.css';

/* PC表示: 左上にロゴ、中央にスマホ枠、右にQR。モバイルではアプリが全画面（枠・ロゴ・QRは非表示） */
function Shell() {
  return (
    <div className="shell">
      <header className="shell-head">
        <img src="/icon/kamepace-icon-180.png" alt="かめペース" />
        <span>かめペース</span>
      </header>
      <div className="shell-body">
        <div className="phone">
          <App />
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
