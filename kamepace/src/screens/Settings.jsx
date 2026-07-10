import React from 'react';

const mono = { fontFamily: "'Space Mono',monospace" };
const msIcon = (size, color) => ({ fontFamily: 'Material Symbols Rounded', fontVariationSettings: "'FILL' 1", fontSize: size, color });
const card = { background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(27,27,24,.05)', overflow: 'hidden' };

function Page({ v, title, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: '#f7f4ec' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 20px 12px' }}>
        <button onClick={v.goMypage} style={{ background: 'none', border: 'none', fontSize: 19, color: '#8a8a82', cursor: 'pointer' }}>‹</button>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
      </div>
      <div className="nos" style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px' }}>{children}</div>
    </div>
  );
}

/* 枠のじかん: 各時間帯の開始時刻を±1h */
export function SlotTimes({ v }) {
  return (
    <Page v={v} title="🕘 枠のじかん">
      <div style={card}>
        {v.slotTimeRows.map((s, i) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderBottom: i < 3 ? '1px solid #f1efe8' : 'none' }}>
            <span style={{ fontSize: 18 }}>{s.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{s.name}</div>
              <div style={{ ...mono, fontSize: 10.5, color: '#8a8a82', marginTop: 1 }}>{s.rangeText}</div>
            </div>
            <button onClick={s.onDec} style={{ width: 30, height: 30, borderRadius: '50%', border: '1.5px solid #1b1b18', background: '#fff', fontSize: 15, color: '#1b1b18', cursor: 'pointer' }}>−</button>
            <span style={{ ...mono, fontSize: 14, fontWeight: 700, minWidth: 52, textAlign: 'center' }}>{s.startText}</span>
            <button onClick={s.onInc} style={{ width: 30, height: 30, borderRadius: '50%', border: '1.5px solid #1b1b18', background: '#fff', fontSize: 15, color: '#1b1b18', cursor: 'pointer' }}>＋</button>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: '#b4b2a8', margin: '10px 6px 0', lineHeight: 1.7 }}>各枠のはじまる時刻を1時間ずつ動かせます。記録の振り分けと、時間帯を選んだときの配置に使われます。</div>
    </Page>
  );
}

/* カテゴリの管理: 表示/非表示トグル＋自作カテゴリの削除 */
export function CatsManage({ v }) {
  return (
    <Page v={v} title="🏷 カテゴリの管理">
      <div style={card}>
        {v.catRows.map((c, i) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 15px', borderBottom: i < v.catRows.length - 1 ? '1px solid #f1efe8' : 'none', opacity: c.hidden ? 0.55 : 1 }}>
            <span style={{ ...msIcon(21, c.color), width: 24, textAlign: 'center' }}>{c.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{c.name}</div>
              <div style={{ ...mono, fontSize: 10.5, color: '#8a8a82', marginTop: 1 }}>{c.sub}</div>
            </div>
            {c.onDelete && (
              <button onClick={c.onDelete} style={{ border: 'none', background: 'none', fontSize: 12, fontWeight: 700, color: '#b4645a', cursor: 'pointer', flex: '0 0 auto' }}>削除</button>
            )}
            <button onClick={c.onToggle} style={{ width: 44, height: 26, borderRadius: 999, border: 'none', background: c.hidden ? '#e4e1d8' : '#c4f000', position: 'relative', cursor: 'pointer', flex: '0 0 auto' }}>
              <span style={{ position: 'absolute', top: 3, left: c.hidden ? 3 : 22, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.25)' }} />
            </button>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: '#b4b2a8', margin: '10px 6px 0', lineHeight: 1.7 }}>非表示にしても消えません。検索やこれまでの記録からは引き続き使えます。</div>
    </Page>
  );
}

/* テンプレート: 保存済みテンプレの一覧・削除 */
export function Templates({ v }) {
  return (
    <Page v={v} title="📋 テンプレート">
      {v.templateRows.length === 0 && (
        <div style={{ textAlign: 'center', fontSize: 12.5, color: '#b4b2a8', lineHeight: 1.8, padding: '48px 24px' }}>
          まだテンプレはありません。<br />記録すると自動でたまり、カレンダー取り込みの枠に行動を入れたときも保存されます。
        </div>
      )}
      {v.templateRows.length > 0 && (
        <div style={card}>
          {v.templateRows.map((t, i) => (
            <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 15px', borderBottom: i < v.templateRows.length - 1 ? '1px solid #f1efe8' : 'none' }}>
              <span style={{ fontSize: 16 }}>📋</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{t.name}</div>
                <div style={{ ...mono, fontSize: 10.5, color: '#8a8a82', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.sub}</div>
              </div>
              <button onClick={t.onDelete} style={{ border: 'none', background: 'none', fontSize: 12, fontWeight: 700, color: '#b4645a', cursor: 'pointer', flex: '0 0 auto' }}>削除</button>
            </div>
          ))}
        </div>
      )}
      <div style={{ fontSize: 11, color: '#b4b2a8', margin: '10px 6px 0', lineHeight: 1.7 }}>同じ名前の予定・行動を記録するとき、テンプレの疲労と行動構成が自動で使われます。</div>
    </Page>
  );
}

/* 疲れやすさの調整: 体・心それぞれの個人係数（疲れやすさ／回復しやすさ）5段階 */
export function Sensitivity({ v }) {
  const section = (label, opts) => (
    <React.Fragment key={label}>
      <div style={{ fontSize: 13, fontWeight: 700, margin: '16px 4px 8px' }}>{label}</div>
      <div style={{ ...card, padding: 6 }}>
        {opts.map((o, i) => (
          <button key={i} onClick={o.onPick} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 10, background: o.on ? '#fbfdf0' : '#fff', border: 'none', borderRadius: 10, padding: '11px 12px', cursor: 'pointer', textAlign: 'left' }}>
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: o.on ? 900 : 500, color: '#1b1b18' }}>{o.text}</span>
            <span style={{ ...mono, fontSize: 11, color: '#8a8a82' }}>×{o.v.toFixed(1)}</span>
            {o.on && <span style={{ fontFamily: 'Material Symbols Rounded', fontSize: 17, color: '#7a9a00' }}>check</span>}
          </button>
        ))}
      </div>
    </React.Fragment>
  );
  return (
    <Page v={v} title="💪 疲れやすさの調整">
      <div style={{ fontSize: 11.5, color: '#8a8a82', margin: '4px 6px 0', lineHeight: 1.7 }}>行動ごとの「体」「心」のつかれに、それぞれの係数がかかります（例: 接客＝体5＋心8）。</div>
      {v.sensSections.map(s => section(s.label, s.opts))}
      <div style={{ fontSize: 11, color: '#b4b2a8', margin: '12px 6px 0', lineHeight: 1.7 }}>これからの記録に反映されます（過去の記録は変わりません）。</div>
    </Page>
  );
}
