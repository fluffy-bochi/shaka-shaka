import React from 'react';
import { researchLoadAll } from '../firebase';
import { adherence, csvFiles, downloadText, freqText } from '../research';

/* 研究者用（開発者モード）: 参加者ごとの疲労度の推移・生活必須行動/やりたいことの実行率と、CSV の書き出し */
const INK = '#1b1b18', SUB = '#55554e', MUTED = '#8a8a82', LINE = '#efece3', GREEN = '#7a9a00', LIME = '#c4f000';
const mono = { fontFamily: "'Space Mono',monospace" };
const card = { background: '#fff', borderRadius: 16, padding: '12px 14px', boxShadow: '0 1px 3px rgba(27,27,24,.05)', marginBottom: 12 };
const pct = (r) => (r == null ? '—' : Math.round(r * 100) + '%');
const md = (d) => Number(d.slice(5, 7)) + '/' + Number(d.slice(8));

/* 全体の実行率: 行動ごとの実行率（100%で頭打ち）の平均。やりすぎた行動で、ほかの未達が隠れないように */
function overallRate(days) {
  const r = adherence(days).map(x => x.rate).filter(x => x != null);
  return r.length ? r.reduce((a, b) => a + Math.min(1, b), 0) / r.length : null;
}
function meanFatigue(days) {
  const v = Object.values(days).map(s => s.fatAvg).filter(x => x != null);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
}

/* 日ごとの疲労度（最高〜最低の帯＋平均の線） */
function FatigueChart({ days }) {
  const ds = Object.keys(days).sort().filter(d => days[d].fatMax || days[d].fatAvg != null);
  if (!ds.length) return <div style={{ fontSize: 12, color: MUTED, padding: '20px 0', textAlign: 'center' }}>疲労度の記録がありません</div>;
  const W = 320, H = 150, PX = 22, PT = 10, PB = 24;
  const X = (i) => (ds.length === 1 ? W / 2 : PX + i * (W - 2 * PX) / (ds.length - 1));
  const Y = (v) => PT + (1 - v / 100) * (H - PT - PB);
  const band = ds.map((d, i) => [X(i), Y(days[d].fatMax ? days[d].fatMax.v : days[d].fatAvg)]).concat(ds.map((d, i) => [X(i), Y(days[d].fatMin ? days[d].fatMin.v : days[d].fatAvg)]).reverse());
  const avg = ds.map((d, i) => [X(i), days[d].fatAvg]).filter(p => p[1] != null).map(p => [p[0], Y(p[1])]);
  const step = Math.max(1, Math.ceil(ds.length / 7));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      {[0, 40, 80, 100].map(v => <g key={v}><line x1={PX} x2={W - PX} y1={Y(v)} y2={Y(v)} stroke={LINE} /><text x={PX - 4} y={Y(v) + 3} textAnchor="end" fontSize="7.5" fill={MUTED} style={mono}>{v}</text></g>)}
      <path d={'M' + band.map(p => p.join(',')).join(' L') + ' Z'} fill={LIME} opacity=".35" />
      {avg.length > 1 && <path d={'M' + avg.map(p => p.join(',')).join(' L')} fill="none" stroke={GREEN} strokeWidth="2" strokeLinejoin="round" />}
      {avg.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2.2" fill={GREEN} />)}
      {ds.map((d, i) => (i % step === 0 || i === ds.length - 1) && <text key={d} x={X(i)} y={H - 8} textAnchor="middle" fontSize="8" fill={MUTED} style={mono}>{md(d)}</text>)}
    </svg>
  );
}

function Participant({ p, onBack }) {
  const days = p.days, ds = Object.keys(days).sort();
  const types = { yuttari: 0, hodohodo: 0, michimichi: 0 };
  ds.forEach(d => { if (types[days[d].type] != null) types[days[d].type]++; });
  const adh = adherence(days);
  const csv = () => { const f = csvFiles([p]); Object.entries(f).forEach(([n, t]) => downloadText(p.code + '_' + n, t)); };
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <button onClick={onBack} style={{ border: 'none', background: 'none', fontSize: 19, color: MUTED, cursor: 'pointer' }}>‹</button>
        <span style={{ ...mono, fontSize: 18, fontWeight: 900 }}>{p.code}</span>
        <span style={{ fontSize: 12, color: MUTED }}>{ds.length ? md(ds[0]) + '〜' + md(ds[ds.length - 1]) + '・' + ds.length + '日' : '記録なし'}</span>
        <span style={{ flex: 1 }} />
        <button onClick={csv} style={{ border: '1.5px solid #e4e1d8', background: '#fff', borderRadius: 10, padding: '6px 10px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>CSV</button>
      </div>
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 4 }}>疲労度の推移</div>
        <div style={{ fontSize: 10.5, color: MUTED, marginBottom: 6 }}>線＝1日の平均・帯＝最高〜最低</div>
        <FatigueChart days={days} />
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {[['yuttari', 'ゆったり'], ['hodohodo', 'ほどほど'], ['michimichi', 'みちみち']].map(([k, n]) => (
            <div key={k} style={{ flex: 1, background: '#f7f4ec', borderRadius: 10, padding: '6px 8px' }}>
              <div style={{ fontSize: 10, color: MUTED, fontWeight: 700 }}>{n}</div>
              <div style={{ fontSize: 15, fontWeight: 900 }}>{types[k]}<span style={{ fontSize: 10, color: MUTED }}>日</span></div>
            </div>
          ))}
        </div>
      </div>
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 8 }}>実行率（実施／目標）</div>
        {!adh.length && <div style={{ fontSize: 12, color: MUTED }}>生活必須行動・やりたいことの設定がありません</div>}
        {adh.map(a => (
          <div key={a.key} style={{ padding: '8px 0', borderTop: '1px solid ' + LINE }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 900, color: '#fff', background: a.kind === 'req' ? INK : '#d97aa6', borderRadius: 5, padding: '1px 5px' }}>{a.kind === 'req' ? '必須' : '♡'}</span>
              <span style={{ fontSize: 13.5, fontWeight: 800, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
              <span style={{ fontSize: 11, color: MUTED }}>{freqText(a.freq)}</span>
              <span style={{ ...mono, fontSize: 14, fontWeight: 900, minWidth: 42, textAlign: 'right' }}>{pct(a.rate)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: LINE, overflow: 'hidden' }}><div style={{ height: '100%', width: Math.min(100, (a.rate || 0) * 100) + '%', background: (a.rate || 0) >= 1 ? GREEN : LIME }} /></div>
              <span style={{ ...mono, fontSize: 10.5, color: SUB }}>{a.done}/{a.target}</span>
            </div>
            {/* 週ごと */}
            <div style={{ display: 'flex', gap: 3, marginTop: 6, alignItems: 'flex-end', height: 30 }}>
              {a.weeks.map(w => (
                <div key={w.week} title={w.week + ' ' + w.done + '/' + w.target} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                  <div style={{ width: '100%', height: 20, background: LINE, borderRadius: 3, display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}><div style={{ width: '100%', height: Math.min(100, (w.rate || 0) * 100) + '%', background: (w.rate || 0) >= 1 ? GREEN : LIME }} /></div>
                  <span style={{ fontSize: 7, color: MUTED, ...mono }}>{md(w.week)}</span>
                </div>
              ))}
            </div>
            {a.both && <div style={{ fontSize: 10, color: MUTED, marginTop: 3 }}>やりたいことにも設定あり（目標は生活必須行動の頻度）</div>}
          </div>
        ))}
      </div>
    </>
  );
}

export default function ResearchAdmin({ v }) {
  const [parts, setParts] = React.useState(null);
  const [err, setErr] = React.useState('');
  const [sel, setSel] = React.useState(null);
  // 開発サーバーでは window.__researchMock（参加者の配列）があればそれを表示（見た目の確認用）
  const src = () => (import.meta.env.DEV && window.__researchMock ? Promise.resolve(window.__researchMock) : researchLoadAll());
  const load = () => { setErr(''); setParts(null); src().then(ps => setParts(ps.sort((a, b) => a.code.localeCompare(b.code)))).catch(e => setErr(e && e.code === 'permission-denied' ? '読み取りの権限がありません（Firestore のルールと、開発者アカウントでのログインを確認）' : '読み込めませんでした')); };
  React.useEffect(load, []);
  const csvAll = () => { const f = csvFiles(parts); Object.entries(f).forEach(([n, t]) => downloadText('全員_' + n, t)); };
  const p = sel && parts && parts.find(x => x.code === sel);
  const last = (ts) => { if (!ts) return '—'; const d = new Date(ts); return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: '#f7f4ec' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 20px 10px' }}>
        <button onClick={v.goMypage} style={{ background: 'none', border: 'none', fontSize: 19, color: MUTED, cursor: 'pointer' }}>‹</button>
        <div style={{ fontSize: 16, fontWeight: 700, flex: 1 }}>研究データ</div>
        <button onClick={load} aria-label="読み込み直す" style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'Material Symbols Rounded', fontSize: 20, color: SUB }}>refresh</button>
      </div>
      <div className="nos" style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px' }}>
        {err && <div style={{ ...card, color: '#b4645a', fontSize: 12.5, fontWeight: 700 }}>{err}</div>}
        {!err && !parts && <div style={{ textAlign: 'center', color: MUTED, fontSize: 12.5, padding: 30 }}>読み込み中…</div>}
        {parts && (p ? <Participant p={p} onBack={() => setSel(null)} /> : <>
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 900, flex: 1 }}>参加者（{parts.length}人）</span>
              {parts.length > 0 && <button onClick={csvAll} style={{ border: 'none', background: INK, color: '#fff', borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>全員のCSV</button>}
            </div>
            {!parts.length && <div style={{ fontSize: 12, color: MUTED, padding: '10px 0' }}>まだ参加者がいません</div>}
            {parts.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr .8fr .9fr .9fr 1.2fr', gap: '0 6px', fontSize: 10, color: MUTED, fontWeight: 700, padding: '4px 0', borderBottom: '1px solid ' + LINE }}>
                <span>コード</span><span>日数</span><span>平均疲労</span><span>実行率</span><span>最終送信</span>
              </div>
            )}
            {parts.map(x => (
              <button key={x.code} onClick={() => setSel(x.code)} style={{ display: 'grid', gridTemplateColumns: '1.1fr .8fr .9fr .9fr 1.2fr', gap: '0 6px', width: '100%', alignItems: 'center', border: 'none', borderBottom: '1px solid ' + LINE, background: 'none', padding: '9px 0', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}>
                <span style={{ ...mono, fontSize: 13, fontWeight: 900 }}>{x.code}{!x.active && <span style={{ fontSize: 9, color: '#b4645a', marginLeft: 3 }}>停止</span>}</span>
                <span style={{ ...mono, fontSize: 12 }}>{Object.keys(x.days).length}</span>
                <span style={{ ...mono, fontSize: 12 }}>{meanFatigue(x.days) ?? '—'}</span>
                <span style={{ ...mono, fontSize: 12, fontWeight: 800 }}>{pct(overallRate(x.days))}</span>
                <span style={{ ...mono, fontSize: 10.5, color: SUB }}>{last(x.updatedAt)}</span>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10.5, color: MUTED, lineHeight: 1.7, padding: '0 4px' }}>CSV: 日ごと・疲労度の推移・行動・週ごとの実行率・カテゴリ の5ファイル</div>
        </>)}
      </div>
    </div>
  );
}
