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
        <aside className="shell-side">
          <img className="questionnaire" src="/questionnaire.png" alt="適度に頑張るための支援ツール開発のためのアンケート" />
        </aside>
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

createRoot(document.getElementById('root')).render(<Shell />);
