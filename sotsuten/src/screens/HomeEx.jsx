import React from 'react';
import { Post } from './Home';
import { cutout } from '../cutout';

/* 卒展のホーム（Figma「卒展/ホーム」node 2227:1474）。
   上: 日付＋時期のひとこと（展示まであと◯日 など）・右に時刻。真ん中: 投稿の行（本体のタイムラインと同じ見た目・時間帯の区切りはなし・新しいものが上）。
   ∧ ∨（キーの ↑ ↓）で行をめくる。右下にやるきーぬとテキストウィンドウ（ゲージと同じ見た目）。 */
const ROWS = 5; // 1画面に出す投稿の行
const ROW_H = 166; // 行の高さ（Figma 170・枠線ぶん少し詰める）
const POST_ZOOM = 1.55; // 本体の投稿（スマホの大きさ）を iPad の行に合わせて拡大

export default function HomeEx({ v }) {
  const posts = React.useMemo(() => v.homeFeed.filter(p => !p.divider && !p.addRec).slice().reverse(), [v.homeFeed]);
  const [top, setTop] = React.useState(0);
  const maxTop = Math.max(0, posts.length - ROWS);
  React.useEffect(() => { setTop(t => Math.min(t, maxTop)); }, [maxTop]);
  React.useEffect(() => { setTop(0); }, [v.homeDate]);
  const up = () => setTop(t => Math.max(0, t - 1));
  const down = () => setTop(t => Math.min(maxTop, t + 1));
  // 物理ボタン（↑ ↓）で行をめくる
  const fn = React.useRef({}); fn.current = { up, down };
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowUp') { fn.current.up(); e.preventDefault(); }
      else if (e.key === 'ArrowDown') { fn.current.down(); e.preventDefault(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const [dog, setDog] = React.useState('');
  React.useEffect(() => { cutout('/chara/dog_normal.png').then(setDog); }, []);
  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const shown = posts.slice(top, top + ROWS);
  while (shown.length < ROWS) shown.push(null); // 投稿が少ないときも行の線は出す
  const chev = (dir, on, onClick) => (
    <div onClick={onClick} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, height: 64, cursor: on ? 'pointer' : 'default', opacity: on ? 1 : 0.18 }}>
      <img src={dir < 0 ? '/chara/chev_up.svg' : '/chara/chev_down.svg'} alt={dir < 0 ? '上へ' : '下へ'} style={{ width: 198, height: 46, transform: dir > 0 ? 'scaleY(-1)' : undefined }} />
      <span className="keyhint">{dir < 0 ? '↑' : '↓'}</span>
    </div>
  );
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#f7f4ec', color: '#1b1b18', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* 日付・時期のひとこと・時刻 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '68px 64px 0 64px' }}>
        <div>
          <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.2 }}>{v.homeDateM}月{v.homeDateD}日（{v.homeDateWd}）</div>
          {v.exhibitDay && <div style={{ fontSize: 28, fontWeight: 700, color: '#55554e', marginTop: 6 }}>{v.exhibitDay}</div>}
        </div>
        <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 68, lineHeight: 1 }}>{now.getHours()}:{String(now.getMinutes()).padStart(2, '0')}</div>
      </div>
      <div style={{ marginTop: 18 }}>{chev(-1, top > 0, up)}</div>
      {/* 投稿の行（本体の投稿の見た目をそのまま拡大） */}
      <div style={{ borderTop: '3px solid #1b1b18' }}>
        {shown.map((p, i) => (
          <div key={p ? p.key : 'empty' + i} style={{ height: ROW_H, borderBottom: '3px solid #1b1b18', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
            {p && <div style={{ width: '100%', zoom: POST_ZOOM }}><Post p={{ ...p, past: false, onMenu: undefined, noBorder: true }} /></div>}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 'auto', marginBottom: 20 }}>{chev(1, top < maxTop, down)}</div>
      {/* やるきーぬ＋テキストウィンドウ（右下・行の上にかぶさる） */}
      {dog && <img src={dog} alt="" style={{ position: 'absolute', right: -60, bottom: 70, height: 520, width: 'auto', pointerEvents: 'none', filter: 'drop-shadow(0 6px 10px rgba(27,27,24,.15))' }} />}
      <div className="dog-say" style={{ position: 'absolute', left: 64, right: 40, top: 'auto', bottom: 96, width: 'auto', maxWidth: 'none', minHeight: 140, background: 'rgba(255,255,255,.94)' /* 下の行が透けないように */ }}>
        <div className="dog-say-name">やるきーぬ</div>
        <div className="dog-say-text" style={{ fontSize: 24 }}>{v.homeComment}</div>
      </div>
    </div>
  );
}
