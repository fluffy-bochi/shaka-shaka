import React from 'react';
import { researchLoadAll, loadResearchConfig, saveResearchConfig, createParticipantAccount } from '../firebase';
import { adherence, csvFiles, downloadText, freqText, demoParticipants } from '../research';

/* 研究者用（開発者モード）: 参加者ごとの疲労度の推移・生活必須行動/やりたいことの実行率と、CSV の書き出し。
   PC（幅900px以上）ではスマホ枠を外して画面いっぱいに、参加者一覧＋比較グラフ＋選んだ参加者の詳細を並べる。
   「デモ」で5人ぶんの架空データを表示（保存しない）。 */
const INK = '#1b1b18', SUB = '#55554e', MUTED = '#8a8a82', LINE = '#efece3', GREEN = '#7a9a00', LIME = '#c4f000';
const PCOL = ['#5b8fd4', '#d97a6a', '#7a9a00', '#b07bc4', '#c58b3d', '#4fa88a', '#d98ba0', '#6f8fbf']; // 参加者ごとの色
const mono = { fontFamily: "'Space Mono',monospace" };
const card = { background: '#fff', borderRadius: 16, padding: '14px 16px', boxShadow: '0 1px 3px rgba(27,27,24,.05)' };
const h3 = { fontSize: 14, fontWeight: 900, margin: '0 0 8px' };
const pct = (r) => (r == null ? '—' : Math.round(r * 100) + '%');
const md = (d) => Number(d.slice(5, 7)) + '/' + Number(d.slice(8));
const btn = (main) => ({ border: main ? 'none' : '1.5px solid #e4e1d8', background: main ? INK : '#fff', color: main ? '#fff' : INK, borderRadius: 10, padding: '7px 12px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' });

/* 全体の実行率: 行動ごとの実行率（100%で頭打ち）の平均。やりすぎた行動で、ほかの未達が隠れないように */
function overallRate(days) {
  const r = adherence(days).map(x => x.rate).filter(x => x != null);
  return r.length ? r.reduce((a, b) => a + Math.min(1, b), 0) / r.length : null;
}
/* 体調・気分（朝と夜の記録、1〜5）の平均 */
function meanOf(days, key) {
  const v = [];
  Object.values(days).forEach(s => ['wake', 'bed'].forEach(w => { if (s[w] && s[w][key] != null) v.push(s[w][key]); }));
  return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : null;
}
function useWide() {
  const q = () => window.innerWidth >= 900;
  const [w, setW] = React.useState(q);
  React.useEffect(() => { const f = () => setW(q()); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  return w;
}

/* 日ごとの疲労度（最高の線・最低の線と、その間の帯） */
function FatigueChart({ days, W = 320, H = 150 }) {
  const ds = Object.keys(days).sort().filter(d => days[d].fatMax);
  if (!ds.length) return <div style={{ fontSize: 12, color: MUTED, padding: '20px 0', textAlign: 'center' }}>疲労度の記録がありません</div>;
  const PX = 26, PT = 10, PB = 24;
  const X = (i) => (ds.length === 1 ? W / 2 : PX + i * (W - 2 * PX) / (ds.length - 1));
  const Y = (v) => PT + (1 - v / 100) * (H - PT - PB);
  const hi = (d) => days[d].fatMax.v, lo = (d) => (days[d].fatMin ? days[d].fatMin.v : hi(d));
  const top = ds.map((d, i) => [X(i), Y(hi(d))]), bot = ds.map((d, i) => [X(i), Y(lo(d))]);
  const band = top.concat([...bot].reverse());
  const step = Math.max(1, Math.ceil(ds.length / (W > 400 ? 10 : 6)));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      {[0, 40, 80, 100].map(v => <g key={v}><line x1={PX} x2={W - PX} y1={Y(v)} y2={Y(v)} stroke={LINE} /><text x={PX - 5} y={Y(v) + 3} textAnchor="end" fontSize="8" fill={MUTED} style={mono}>{v}</text></g>)}
      <path d={'M' + band.map(p => p.join(',')).join(' L') + ' Z'} fill={LIME} opacity=".35" />
      {top.length > 1 && <path d={'M' + top.map(p => p.join(',')).join(' L')} fill="none" stroke={GREEN} strokeWidth="2" strokeLinejoin="round" />}
      {bot.length > 1 && <path d={'M' + bot.map(p => p.join(',')).join(' L')} fill="none" stroke={GREEN} strokeWidth="1.2" strokeDasharray="3 3" strokeLinejoin="round" />}
      {top.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2.4" fill={GREEN}><title>{md(ds[i])} 最高{hi(ds[i])}（{days[ds[i]].fatMax.t}）・最低{lo(ds[i])}</title></circle>)}
      {ds.map((d, i) => ((i % step === 0 && i <= ds.length - 1 - step) || i === ds.length - 1) && <text key={d} x={X(i)} y={H - 8} textAnchor="middle" fontSize="8.5" fill={MUTED} style={mono}>{md(d)}</text>)}
    </svg>
  );
}

/* 体調・気分（1〜5）の推移: 体調＝黒・気分＝ピンク、朝＝実線・夜＝点線 */
function CondMoodChart({ days, W = 320, H = 140 }) {
  const ds = Object.keys(days).sort();
  const has = ds.some(d => ['wake', 'bed'].some(w => days[d][w] && (days[d][w].cond != null || days[d][w].mood != null)));
  if (!has) return <div style={{ fontSize: 12, color: MUTED, padding: '16px 0', textAlign: 'center' }}>体調・気分の記録がありません</div>;
  const PX = 26, PT = 10, PB = 24;
  const X = (i) => (ds.length === 1 ? W / 2 : PX + i * (W - 2 * PX) / (ds.length - 1));
  const Y = (v) => PT + (1 - (v - 1) / 4) * (H - PT - PB);
  const step = Math.max(1, Math.ceil(ds.length / (W > 400 ? 10 : 6)));
  const lines = [['cond', 'wake', INK, ''], ['cond', 'bed', INK, '3 3'], ['mood', 'wake', '#ff5fa2', ''], ['mood', 'bed', '#ff5fa2', '3 3']];
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
        {[1, 3, 5].map(v => <g key={v}><line x1={PX} x2={W - PX} y1={Y(v)} y2={Y(v)} stroke={LINE} /><text x={PX - 5} y={Y(v) + 3} textAnchor="end" fontSize="8" fill={MUTED} style={mono}>{v}</text></g>)}
        {lines.map(([k, w, col, dash]) => {
          const pts = ds.map((d, i) => [X(i), days[d][w] ? days[d][w][k] : null]).filter(p => p[1] != null).map(p => [p[0], Y(p[1])]);
          return pts.length > 0 && <g key={k + w}>
            {pts.length > 1 && <path d={'M' + pts.map(q => q.join(',')).join(' L')} fill="none" stroke={col} strokeWidth={dash ? 1.4 : 2} strokeDasharray={dash || undefined} strokeLinejoin="round" />}
            {!dash && pts.map((q, i) => <circle key={i} cx={q[0]} cy={q[1]} r="2" fill={col} />)}
          </g>;
        })}
        {ds.map((d, i) => ((i % step === 0 && i <= ds.length - 1 - step) || i === ds.length - 1) && <text key={d} x={X(i)} y={H - 8} textAnchor="middle" fontSize="8.5" fill={MUTED} style={mono}>{md(d)}</text>)}
      </svg>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', fontSize: 10.5, color: SUB, fontWeight: 700, marginTop: 2 }}>
        <span><span style={{ display: 'inline-block', width: 14, height: 2, background: INK, verticalAlign: 'middle', marginRight: 4 }} />体調</span>
        <span><span style={{ display: 'inline-block', width: 14, height: 2, background: '#ff5fa2', verticalAlign: 'middle', marginRight: 4 }} />気分</span>
        <span>実線＝朝・点線＝夜</span>
      </div>
    </>
  );
}

/* 参加者の比較: 1日の最高疲労度の推移（人ごとの線） */
function CompareFatigue({ parts, sel, onSel }) {
  const all = [...new Set(parts.flatMap(p => Object.keys(p.days)))].sort();
  if (!all.length) return null;
  const W = 620, H = 210, PX = 28, PT = 10, PB = 24;
  const X = (d) => (all.length === 1 ? W / 2 : PX + all.indexOf(d) * (W - 2 * PX) / (all.length - 1));
  const Y = (v) => PT + (1 - v / 100) * (H - PT - PB);
  const step = Math.max(1, Math.ceil(all.length / 12));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      {[0, 40, 80, 100].map(v => <g key={v}><line x1={PX} x2={W - PX} y1={Y(v)} y2={Y(v)} stroke={LINE} /><text x={PX - 5} y={Y(v) + 3} textAnchor="end" fontSize="8" fill={MUTED} style={mono}>{v}</text></g>)}
      {parts.map((p, i) => {
        const pts = Object.keys(p.days).sort().filter(d => p.days[d].fatMax).map(d => [X(d), Y(p.days[d].fatMax.v)]);
        const on = !sel || sel === p.code;
        return pts.length > 1 && <path key={p.code} onClick={() => onSel(p.code)} d={'M' + pts.map(q => q.join(',')).join(' L')} fill="none" stroke={PCOL[i % PCOL.length]} strokeWidth={sel === p.code ? 3 : 1.8} opacity={on ? 1 : 0.25} strokeLinejoin="round" style={{ cursor: 'pointer' }}><title>{p.code}</title></path>;
      })}
      {all.map((d, i) => ((i % step === 0 && i <= all.length - 1 - step) || i === all.length - 1) && <text key={d} x={X(d)} y={H - 8} textAnchor="middle" fontSize="8.5" fill={MUTED} style={mono}>{md(d)}</text>)}
    </svg>
  );
}

/* 参加者の比較: 全体の実行率（横棒） */
function CompareRate({ parts, sel, onSel }) {
  return (
    <div>
      {parts.map((p, i) => {
        const r = overallRate(p.days);
        return (
          <button key={p.code} onClick={() => onSel(p.code)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', border: 'none', background: sel === p.code ? '#f7f4ec' : 'none', borderRadius: 8, padding: '5px 6px', cursor: 'pointer', fontFamily: 'inherit' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: PCOL[i % PCOL.length], flex: '0 0 auto' }} />
            <span style={{ ...mono, fontSize: 12, fontWeight: 900, width: 36, textAlign: 'left' }}>{p.code}</span>
            <div style={{ flex: 1, height: 10, borderRadius: 5, background: LINE, overflow: 'hidden' }}><div style={{ height: '100%', width: Math.min(100, (r || 0) * 100) + '%', background: (r || 0) >= 0.8 ? GREEN : LIME }} /></div>
            <span style={{ ...mono, fontSize: 12, fontWeight: 800, width: 40, textAlign: 'right' }}>{pct(r)}</span>
          </button>
        );
      })}
    </div>
  );
}

/* 行動ごとの実行率 */
function Adherence({ days, cols = 1 }) {
  const adh = adherence(days);
  if (!adh.length) return <div style={{ fontSize: 12, color: MUTED }}>生活必須行動・やりたいことの設定がありません</div>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: '0 22px' }}>
      {adh.map(a => (
        <div key={a.key} style={{ padding: '9px 0', borderTop: '1px solid ' + LINE }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 900, color: '#fff', background: a.kind === 'req' ? INK : '#d97aa6', borderRadius: 5, padding: '1px 5px' }}>{a.kind === 'req' ? '必須' : '♡'}</span>
            <span style={{ fontSize: 13.5, fontWeight: 800, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
            <span style={{ fontSize: 11, color: MUTED }}>{freqText(a.freq)}</span>
            <span style={{ ...mono, fontSize: 14, fontWeight: 900, minWidth: 44, textAlign: 'right' }}>{pct(a.rate)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: LINE, overflow: 'hidden' }}><div style={{ height: '100%', width: Math.min(100, (a.rate || 0) * 100) + '%', background: (a.rate || 0) >= 1 ? GREEN : LIME }} /></div>
            <span style={{ ...mono, fontSize: 10.5, color: SUB }}>{a.done}/{a.target}</span>
          </div>
          <div style={{ display: 'flex', gap: 3, marginTop: 6, alignItems: 'flex-end', height: 30 }}>
            {a.weeks.map(w => (
              <div key={w.week} title={'週 ' + w.week + '：' + w.done + '/' + w.target + '（' + pct(w.rate) + '）'} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <div style={{ width: '100%', height: 20, background: LINE, borderRadius: 3, display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}><div style={{ width: '100%', height: Math.min(100, (w.rate || 0) * 100) + '%', background: (w.rate || 0) >= 1 ? GREEN : LIME }} /></div>
                <span style={{ fontSize: 7.5, color: MUTED, ...mono }}>{md(w.week)}</span>
              </div>
            ))}
          </div>
          {a.both && <div style={{ fontSize: 10, color: MUTED, marginTop: 3 }}>やりたいことにも設定あり（目標は生活必須行動の頻度）</div>}
        </div>
      ))}
    </div>
  );
}

function TypeDays({ days }) {
  const types = { yuttari: 0, hodohodo: 0, michimichi: 0 };
  Object.values(days).forEach(s => { if (types[s.type] != null) types[s.type]++; });
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
      {[['yuttari', 'ゆったり'], ['hodohodo', 'ほどほど'], ['michimichi', 'みちみち']].map(([k, n]) => (
        <div key={k} style={{ flex: 1, background: '#f7f4ec', borderRadius: 10, padding: '6px 10px' }}>
          <div style={{ fontSize: 10.5, color: MUTED, fontWeight: 700 }}>{n}</div>
          <div style={{ fontSize: 16, fontWeight: 900 }}>{types[k]}<span style={{ fontSize: 10.5, color: MUTED }}>日</span></div>
        </div>
      ))}
    </div>
  );
}

/* 参加者の一覧（表） */
function PeopleTable({ parts, sel, onSel }) {
  const cols = '1.1fr .6fr .7fr .7fr .8fr 1.3fr';
  const last = (ts) => { if (!ts) return '—'; const d = new Date(ts); return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); };
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '0 6px', fontSize: 10.5, color: MUTED, fontWeight: 700, padding: '4px 6px', borderBottom: '1px solid ' + LINE }}>
        <span>コード</span><span>日数</span><span>体調</span><span>気分</span><span>実行率</span><span>最終送信</span>
      </div>
      {parts.map((x, i) => (
        <button key={x.code} onClick={() => onSel(x.code)} style={{ display: 'grid', gridTemplateColumns: cols, gap: '0 6px', width: '100%', alignItems: 'center', border: 'none', borderBottom: '1px solid ' + LINE, background: sel === x.code ? '#f7f4ec' : 'none', padding: '9px 6px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}>
          <span style={{ ...mono, fontSize: 13, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: PCOL[i % PCOL.length] }} />{x.code}{!x.active && <span style={{ fontSize: 9, color: '#b4645a' }}>停止</span>}</span>
          <span style={{ ...mono, fontSize: 12 }}>{Object.keys(x.days).length}</span>
          <span style={{ ...mono, fontSize: 12 }}>{meanOf(x.days, 'cond') ?? '—'}</span>
          <span style={{ ...mono, fontSize: 12 }}>{meanOf(x.days, 'mood') ?? '—'}</span>
          <span style={{ ...mono, fontSize: 12, fontWeight: 800 }}>{pct(overallRate(x.days))}</span>
          <span style={{ ...mono, fontSize: 10.5, color: SUB }}>{last(x.updatedAt)}</span>
        </button>
      ))}
    </>
  );
}

/* 参加者のアカウントを作る（実験番号＋パスワード）。参加者はログイン画面の「実験番号」でログインする */
function AccountMaker({ onClose }) {
  const [code, setCode] = React.useState('');
  const [msg, setMsg] = React.useState('');
  const [made, setMade] = React.useState([]);
  const [busy, setBusy] = React.useState(false);
  const inp = { height: 38, border: '1.5px solid #e4e1d8', borderRadius: 9, fontSize: 15, fontWeight: 800, padding: '0 10px', fontFamily: "'Space Mono',monospace", boxSizing: 'border-box' };
  const go = async () => {
    const c = code.trim().toUpperCase();
    if (!/^[A-Z][0-9]{2}$/.test(c)) { setMsg('実験番号はアルファベット1文字＋数字2桁です（例: A01）'); return; }
    setBusy(true); setMsg('');
    try { await createParticipantAccount(c); setMade(m => [...m, { c }]); setCode(''); setMsg(c + ' を作りました'); }
    catch (e) { setMsg(e && e.code === 'auth/email-already-in-use' ? c + ' はもう作られています' : '作れませんでした（' + ((e && e.code) || '') + '）'); }
    setBusy(false);
  };
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'rgba(27,27,24,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 460, background: '#fff', borderRadius: 18, padding: '18px 18px 16px', boxShadow: '0 20px 50px rgba(27,27,24,.3)' }}>
        <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 12 }}>参加者アカウントを作る</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !busy) go(); }} placeholder="A01" autoCapitalize="characters" style={{ ...inp, width: 110 }} />
          <span style={{ flex: 1 }} />
          <button onClick={busy ? undefined : go} style={btn(true)}>{busy ? '作成中…' : '作る'}</button>
        </div>
        {msg && <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 8, color: msg.endsWith('作りました') ? GREEN : '#b4645a' }}>{msg}</div>}
        {made.length > 0 && (
          <div style={{ marginTop: 12, background: '#f7f4ec', borderRadius: 10, padding: '8px 10px' }}>
            {made.map(m => <div key={m.c} style={{ ...mono, fontSize: 13, fontWeight: 800, padding: '2px 0' }}>{m.c}</div>)}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}><button onClick={onClose} style={btn(false)}>閉じる</button></div>
      </div>
    </div>
  );
}

/* 期間の設定（参加者コードの頭のアルファベットごと: 名前・開始日・終了日） */
function PeriodEditor({ periods, onSave, onClose, readOnly }) {
  const [rows, setRows] = React.useState(() => {
    const ks = Object.keys(periods || {}).sort();
    const base = ks.length ? ks : ['A', 'B', 'C'];
    const def = { A: '自分', B: '身近な人', C: '本番' };
    return base.map(k => ({ k, label: (periods[k] && periods[k].label) || def[k] || '', start: (periods[k] && periods[k].start) || '', end: (periods[k] && periods[k].end) || '' }));
  });
  const [busy, setBusy] = React.useState(false);
  const setRow = (i, patch) => setRows(rs => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const nextK = () => { for (let c = 65; c <= 90; c++) { const k = String.fromCharCode(c); if (!rows.some(r => r.k === k)) return k; } return null; };
  const inp = { height: 34, border: '1.5px solid #e4e1d8', borderRadius: 8, fontSize: 13, fontWeight: 700, padding: '0 8px', fontFamily: 'inherit', boxSizing: 'border-box' };
  const save = async () => { setBusy(true); const ps = {}; rows.forEach(r => { ps[r.k] = { label: r.label, start: r.start, end: r.end }; }); await onSave(ps); setBusy(false); };
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'rgba(27,27,24,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, background: '#fff', borderRadius: 18, padding: '18px 18px 16px', boxShadow: '0 20px 50px rgba(27,27,24,.3)' }}>
        <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 4 }}>期間の設定</div>
        <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 12, lineHeight: 1.6 }}>参加者コードの頭のアルファベットが期間です（例: A01）。期間の外の日は送られません。</div>
        <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 130px 130px 28px', gap: 8, alignItems: 'center', fontSize: 10.5, color: MUTED, fontWeight: 700, marginBottom: 6 }}>
          <span /><span>名前</span><span>開始日</span><span>終了日</span><span />
        </div>
        {rows.map((r, i) => (
          <div key={r.k} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 130px 130px 28px', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <span style={{ ...mono, fontSize: 18, fontWeight: 900 }}>{r.k}</span>
            <input value={r.label} disabled={readOnly} onChange={(e) => setRow(i, { label: e.target.value })} style={inp} />
            <input type="date" value={r.start} disabled={readOnly} onChange={(e) => setRow(i, { start: e.target.value })} style={inp} />
            <input type="date" value={r.end} disabled={readOnly} onChange={(e) => setRow(i, { end: e.target.value })} style={inp} />
            {!readOnly && <button onClick={() => setRows(rs => rs.filter((_, j) => j !== i))} aria-label="消す" style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, fontFamily: 'Material Symbols Rounded', fontSize: 19, color: '#b4645a' }}>delete</button>}
          </div>
        ))}
        {!readOnly && nextK() && <button onClick={() => setRows(rs => [...rs, { k: nextK(), label: '', start: '', end: '' }])} style={{ ...btn(false), marginTop: 2 }}>＋ 期間を追加</button>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
          <button onClick={onClose} style={btn(false)}>{readOnly ? '閉じる' : 'キャンセル'}</button>
          {!readOnly && <button onClick={busy ? undefined : save} style={btn(true)}>{busy ? '保存中…' : '保存'}</button>}
        </div>
        {readOnly && <div style={{ fontSize: 10.5, color: MUTED, marginTop: 8 }}>デモの期間は変えられません</div>}
      </div>
    </div>
  );
}

export default function ResearchAdmin({ v }) {
  const wide = useWide();
  const [real, setReal] = React.useState(null);
  const [err, setErr] = React.useState('');
  const [demo, setDemo] = React.useState(false);
  const [sel, setSel] = React.useState(null);
  const demoData = React.useMemo(() => demoParticipants(), []);
  const [cfg, setCfg] = React.useState({ periods: {} }); // 期間（config/research）
  const [per, setPer] = React.useState(''); // 表示する期間（''＝すべて）
  const [editPer, setEditPer] = React.useState(false);
  const [mkAcc, setMkAcc] = React.useState(false); // 参加者アカウントを作る
  React.useEffect(() => { loadResearchConfig().then(setCfg).catch(() => {}); }, []);
  // PC では画面いっぱいに（スマホ枠を外す）
  React.useEffect(() => { document.body.classList.toggle('kame-wide', wide); return () => document.body.classList.remove('kame-wide'); }, [wide]);
  // 開発サーバーでは window.__researchMock（参加者の配列）があればそれを表示（見た目の確認用）
  const src = () => (import.meta.env.DEV && window.__researchMock ? Promise.resolve(window.__researchMock) : researchLoadAll());
  const load = () => { setErr(''); setReal(null); src().then(ps => setReal(ps.sort((a, b) => a.code.localeCompare(b.code)))).catch(e => setErr(e && e.code === 'permission-denied' ? '読み取りの権限がありません（Firestore のルールと、開発者アカウントでのログインを確認）' : '読み込めませんでした')); };
  React.useEffect(load, []);
  const periods = (demo ? demoData.periods : cfg.periods) || {};
  // 参加者は、コードのアルファベットの期間の日だけを使う（期間が未設定なら全部）
  const clip = (x) => { const pp = periods[x.code[0]]; if (!pp) return x; const days = {}; Object.keys(x.days).forEach(d => { if ((!pp.start || d >= pp.start) && (!pp.end || d <= pp.end)) days[d] = x.days[d]; }); return { ...x, days }; };
  const allParts = (demo ? demoData.parts : real);
  const parts = allParts && allParts.filter(x => !per || x.code[0] === per).map(clip);
  const letters = [...new Set([...Object.keys(periods), ...((allParts || []).map(x => x.code[0]))])].sort();
  const savePeriods = async (ps) => { try { await saveResearchConfig({ periods: ps }); setCfg({ periods: ps }); setEditPer(false); } catch (e) { setErr('期間を保存できませんでした（ルール・ログインを確認）'); } };
  const p = parts && (parts.find(x => x.code === sel) || (wide ? parts[0] : null));
  const csvAll = () => { const f = csvFiles(parts); Object.entries(f).forEach(([n, t]) => downloadText((demo ? 'デモ_' : '') + (per ? '期間' + per + '_' : '全員_') + n, t)); };
  const csvOne = (x) => { const f = csvFiles([x]); Object.entries(f).forEach(([n, t]) => downloadText((demo ? 'デモ_' : '') + x.code + '_' + n, t)); };
  const pick = (c) => setSel(c);

  const header = (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: wide ? '14px 28px' : '4px 20px 10px', borderBottom: wide ? '1px solid #e4e1d8' : 'none', background: wide ? '#fff' : 'none' }}>
      <button onClick={v.goMypage} style={{ background: 'none', border: 'none', fontSize: 19, color: MUTED, cursor: 'pointer' }}>‹</button>
      <div style={{ fontSize: wide ? 18 : 16, fontWeight: wide ? 900 : 700, flex: 1 }}>研究データ{demo && <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', background: '#d97a6a', borderRadius: 6, padding: '2px 7px', marginLeft: 8, verticalAlign: 'middle' }}>デモ</span>}</div>
      <button onClick={() => { setDemo(!demo); setSel(null); }} style={btn(false)}>{demo ? '実データに戻す' : 'デモ'}</button>
      {!demo && <button onClick={() => setMkAcc(true)} style={btn(false)}>参加者アカウントを作る</button>}
      <button onClick={() => setEditPer(true)} style={btn(false)}>期間の設定</button>
      {parts && parts.length > 0 && <button onClick={csvAll} style={btn(true)}>{per ? '期間' + per + 'のCSV' : '全員のCSV'}</button>}
      {!demo && <button onClick={load} aria-label="読み込み直す" style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'Material Symbols Rounded', fontSize: 20, color: SUB }}>refresh</button>}
    </div>
  );
  // 期間の切り替え（すべて／A／B／C…）
  const fmtP = (pp) => (pp && (pp.start || pp.end) ? (pp.start ? md(pp.start) : '') + '〜' + (pp.end ? md(pp.end) : '') : '期間未設定');
  const periodBar = (
    <div className="nos" style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 14 }}>
      {['', ...letters].map(k => {
        const on = per === k, n = (allParts || []).filter(x => !k || x.code[0] === k).length, pp = periods[k];
        return (
          <button key={k || 'all'} onClick={() => { setPer(k); setSel(null); }} style={{ flex: '0 0 auto', border: 'none', borderRadius: 12, background: on ? INK : '#fff', color: on ? '#fff' : INK, padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', boxShadow: '0 1px 3px rgba(27,27,24,.06)' }}>
            <div style={{ fontSize: 13.5, fontWeight: 900 }}>{k ? k + ' ' + ((pp && pp.label) || '') : 'すべて'}<span style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, marginLeft: 6 }}>{n}人</span></div>
            {k && <div style={{ fontSize: 10.5, fontWeight: 700, opacity: 0.7, ...mono }}>{fmtP(pp)}</div>}
          </button>
        );
      })}
    </div>
  );
  const status = (
    <>
      {periodBar}
      {!demo && err && <div style={{ ...card, color: '#b4645a', fontSize: 12.5, fontWeight: 700, marginBottom: 12 }}>{err}</div>}
      {!demo && !err && !real && <div style={{ textAlign: 'center', color: MUTED, fontSize: 12.5, padding: 30 }}>読み込み中…</div>}
      {parts && !parts.length && <div style={{ ...card, fontSize: 12.5, color: MUTED }}>{per ? 'この期間の参加者はまだいません。' : 'まだ参加者がいません。「デモ」で見た目を確認できます。'}</div>}
      {editPer && <PeriodEditor periods={periods} readOnly={demo} onSave={savePeriods} onClose={() => setEditPer(false)} />}
      {mkAcc && <AccountMaker onClose={() => setMkAcc(false)} />}
    </>
  );
  const detailHead = (x) => {
    const ds = Object.keys(x.days).sort();
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        {!wide && <button onClick={() => setSel(null)} style={{ border: 'none', background: 'none', fontSize: 19, color: MUTED, cursor: 'pointer' }}>‹</button>}
        <span style={{ ...mono, fontSize: 20, fontWeight: 900 }}>{x.code}</span>
        <span style={{ fontSize: 12.5, color: MUTED }}>{ds.length ? md(ds[0]) + '〜' + md(ds[ds.length - 1]) + '・' + ds.length + '日' : '記録なし'}</span>
        <span style={{ flex: 1 }} />
        <button onClick={() => csvOne(x)} style={btn(false)}>この人のCSV</button>
      </div>
    );
  };

  /* ---------- PC ---------- */
  if (wide) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: '#f7f4ec' }}>
        {header}
        <div className="nos" style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 40px' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            {status}
            {parts && parts.length > 0 && <>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(380px, 1fr) minmax(0, 1.6fr) minmax(260px, .9fr)', gap: 16, marginBottom: 16 }}>
                <div style={card}><div style={h3}>参加者（{parts.length}人）</div><PeopleTable parts={parts} sel={p && p.code} onSel={pick} /></div>
                <div style={card}><div style={h3}>1日の最高疲労度の比較</div><CompareFatigue parts={parts} sel={p && p.code} onSel={pick} /></div>
                <div style={card}><div style={h3}>全体の実行率</div><CompareRate parts={parts} sel={p && p.code} onSel={pick} /><div style={{ fontSize: 10.5, color: MUTED, marginTop: 8, lineHeight: 1.6 }}>行動ごとの実行率（100%で頭打ち）の平均</div></div>
              </div>
              {p && (
                <div style={card}>
                  {detailHead(p)}
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)', gap: 24 }}>
                    <div>
                      <div style={h3}>疲労度の推移 <span style={{ fontSize: 11, color: MUTED, fontWeight: 700 }}>実線＝1日の最高・点線＝最低</span></div>
                      <FatigueChart days={p.days} W={640} H={240} />
                      <TypeDays days={p.days} />
                      <div style={{ ...h3, marginTop: 18 }}>体調・気分の推移 <span style={{ fontSize: 11, color: MUTED, fontWeight: 700 }}>朝・夜の記録（1〜5）</span></div>
                      <CondMoodChart days={p.days} W={640} H={190} />
                    </div>
                    <div>
                      <div style={h3}>実行率（実施／目標）</div>
                      <Adherence days={p.days} />
                    </div>
                  </div>
                </div>
              )}
            </>}
          </div>
        </div>
      </div>
    );
  }

  /* ---------- スマホ ---------- */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: '#f7f4ec' }}>
      {header}
      <div className="nos" style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px' }}>
        {status}
        {parts && parts.length > 0 && (p ? <>
          {detailHead(p)}
          <div style={{ ...card, marginBottom: 12 }}>
            <div style={h3}>疲労度の推移</div>
            <div style={{ fontSize: 10.5, color: MUTED, marginBottom: 6 }}>実線＝1日の最高・点線＝最低</div>
            <FatigueChart days={p.days} />
            <TypeDays days={p.days} />
          </div>
          <div style={{ ...card, marginBottom: 12 }}><div style={h3}>体調・気分の推移</div><CondMoodChart days={p.days} /></div>
          <div style={card}><div style={h3}>実行率（実施／目標）</div><Adherence days={p.days} /></div>
        </> : (
          <div style={card}><div style={h3}>参加者（{parts.length}人）</div><PeopleTable parts={parts} sel={null} onSel={pick} /></div>
        ))}
      </div>
    </div>
  );
}
