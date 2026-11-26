/* 卒展: ESP32（Wi-Fi＋WebSocket）のボタンで操作する。
   ESP32 から {"type":"button","id":"B1","state":"down"|"up"} が届いたら、キーを押した／離したのと同じ事件（keydown / keyup）を window に送る。
   画面の側は今までのキー操作のまま（gamepad.js の I/J/K/L＝カーソル、Interactive.jsx の R・Enter）。
     B1＝R（シャカシャカ）／B4＝Enter（記録する・決定）／UP・DOWN・LEFT・RIGHT＝I・K・J・L（カーソル。記録画面では ↑↓←→）
   つなぐ先: ?esp32=192.168.4.1 で開くと使いはじめる（端末に覚える）。?esp32=off でやめる。ESP32 から配信されたページなら自動。
   https のページからは ws:// につなげない（混在コンテンツ）ので、http で配信すること。
   ESP32 のスケッチ: ~/Documents/4th/卒業研究/展示/工作/esp32_input_test/
   実機なしの確認: 開発ツールのコンソールで esp32.down('B1') / esp32.up('B1') */

const MAP = {
  B1: { key: 'r', code: 'KeyR' },
  B4: { key: 'Enter', code: 'Enter' },
  UP: { key: 'i', code: 'KeyI' },
  DOWN: { key: 'k', code: 'KeyK' },
  LEFT: { key: 'j', code: 'KeyJ' },
  RIGHT: { key: 'l', code: 'KeyL' },
};
const PORT = 81, RETRY_MS = 2000, LS = 'sotsuten_esp32';

const fire = (type, m) => window.dispatchEvent(new KeyboardEvent(type, { key: m.key, code: m.code, bubbles: true, cancelable: true }));

function pickHost() {
  let q = null;
  try { q = new URLSearchParams(location.search).get('esp32'); } catch (e) { /* noop */ }
  try {
    if (q === 'off') { localStorage.removeItem(LS); return null; }
    if (q != null) { const h = q || '192.168.4.1'; localStorage.setItem(LS, h); return h; }
    const saved = localStorage.getItem(LS);
    if (saved) return saved;
  } catch (e) { if (q && q !== 'off') return q; }
  if (location.hostname === '192.168.4.1') return location.hostname; // ESP32 から配信されたとき
  return null;
}

export function startEsp32() {
  const host = pickHost();
  if (!host || location.protocol === 'https:') return () => {};
  const held = {};
  let ws = null, timer = 0, stopped = false;

  // 接続状態の小さな点（右下）
  const dot = document.createElement('div');
  Object.assign(dot.style, { position: 'fixed', right: '6px', bottom: '6px', width: '8px', height: '8px', borderRadius: '50%', zIndex: 99999, pointerEvents: 'none', background: '#d9534f', opacity: '0.7' });
  dot.title = 'ESP32 ' + host;
  document.body.appendChild(dot);
  const setOk = (ok) => { dot.style.background = ok ? '#2fb36d' : '#d9534f'; };

  const down = (id) => {
    const m = MAP[id]; if (!m || held[id]) return; // up が来るまでの2回目の down は無視
    held[id] = true; fire('keydown', m);
  };
  const up = (id) => {
    const m = MAP[id]; if (!m || !held[id]) return;
    held[id] = false; fire('keyup', m);
  };
  const releaseAll = () => Object.keys(held).forEach(up);

  const connect = () => {
    if (stopped) return;
    clearTimeout(timer);
    try { ws = new WebSocket(`ws://${host}:${PORT}/`); } catch (e) { timer = setTimeout(connect, RETRY_MS); return; }
    ws.onopen = () => { setOk(true); console.info('[esp32] 接続', host); };
    ws.onclose = () => { setOk(false); releaseAll(); if (!stopped) timer = setTimeout(connect, RETRY_MS); };
    ws.onerror = () => {};
    ws.onmessage = (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.type !== 'button') return;
      console.debug('[esp32]', m.id, m.state);
      if (m.state === 'down') down(m.id); else up(m.id);
    };
  };
  const onVis = () => { if (!document.hidden && (!ws || ws.readyState > 1)) connect(); };
  document.addEventListener('visibilitychange', onVis);
  window.esp32 = { down, up, host }; // 疑似ボタン（デバッグ用）
  connect();

  return () => {
    stopped = true; clearTimeout(timer); releaseAll();
    document.removeEventListener('visibilitychange', onVis);
    if (ws) { ws.onclose = null; ws.close(); }
    dot.remove(); delete window.esp32;
  };
}
