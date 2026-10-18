import React from 'react';
import Emo from '../fluent';
import { Speaker } from './Wake';
import { GoalActButton, GoalActPicker } from './GoalAct';

/* 週間レポート（日曜の夜の就寝記録のあと・月曜の朝・本棚の週の段から）。
   上から いこいさん → 今週の目標 → がんばりタイプ（7日分と1日の割合） → 体調と心の調子 → 必須 → やりたいこと → 来週の目標 */
const mono = { fontFamily: "'Space Mono',monospace" };
const INK = '#1b1b18', LIME = '#c4f000', LIME_INK = '#2f3a00';
const ZCOL = { yuttari: '#bfe0a3', hodohodo: '#f2cf6b', michimichi: '#e8836f' }; // 研究データと同じ色
const ZNAME = { yuttari: 'ゆったり', hodohodo: 'ほどほど', michimichi: 'みちみち' };
const LINE = '1px solid #bab5a7';
const card = { borderTop: LINE, padding: '14px 16px 16px' }; // ホームと同じく線で区切る
const ttl = { fontSize: 14, fontWeight: 900, marginBottom: 10 };

function smoothPath(pts) {
  if (pts.length < 2) return '';
  let d = 'M' + pts[0][0] + ',' + pts[0][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ' C' + c1[0].toFixed(1) + ',' + c1[1].toFixed(1) + ' ' + c2[0].toFixed(1) + ',' + c2[1].toFixed(1) + ' ' + p2[0].toFixed(1) + ',' + p2[1].toFixed(1);
  }
  return d;
}

/* ① がんばりタイプ: 上にその日のタイプ、下に1日の中のゆったり・ほどほど・みちみちの割合（積み上げ棒） */
function Types({ r }) {
  const BH = 120;
  return (
    <div style={card}>
      <div style={ttl}>がんばりタイプ</div>
      {r.top && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          {r.top.id === 'michimichi' ? <img src="/wake/fireball.svg" alt="" style={{ width: 34, height: 34 }} /> : <Emo e={r.top.glyph} size={32} />}
          <span style={{ fontSize: 18, fontWeight: 900 }}>{r.top.name}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#55554e' }}><span style={{ ...mono, fontSize: 16 }}>{r.top.n}</span>日</span>
        </div>
      )}
      <div style={{ display: 'flex', gap: 6 }}>
        {r.days.map(d => {
          const z = d.zone, tot = z.yuttari + z.hodohodo + z.michimichi;
          return (
            <div key={d.d} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {d.has ? (d.type.id === 'michimichi' ? <img src="/wake/fireball.svg" alt="" style={{ width: 26, height: 26 }} /> : <Emo e={d.type.glyph} size={24} />) : <span style={{ fontSize: 13, color: '#c9c5b8', fontWeight: 800 }}>—</span>}
              </div>
              <div style={{ width: '100%', height: BH, marginTop: 4, borderRadius: 7, overflow: 'hidden', background: '#e9e6dc', display: 'flex', flexDirection: 'column-reverse' }}>
                {tot > 0 && ['yuttari', 'hodohodo', 'michimichi'].map(k => {
                  const p = z[k] / tot, h = BH * p;
                  return h > 0 ? (
                    <div key={k} style={{ height: h, background: ZCOL[k], display: 'flex', alignItems: 'center', justifyContent: 'center', ...mono, fontSize: 8.5, fontWeight: 700, color: '#55554e' }}>{h >= 15 ? Math.round(p * 100) : ''}</div>
                  ) : null;
                })}
              </div>
              <div style={{ marginTop: 5, fontSize: 11.5, fontWeight: 800, color: d.today ? LIME_INK : INK, background: d.today ? LIME : 'transparent', borderRadius: 6, padding: '0 5px' }}>{d.wd}</div>
              <div style={{ ...mono, fontSize: 8.5, color: '#8a8a82' }}>{d.md}</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
        {['yuttari', 'hodohodo', 'michimichi'].map(k => <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 700, color: '#55554e' }}><span style={{ width: 10, height: 10, borderRadius: 3, background: ZCOL[k] }} />{ZNAME[k]}</span>)}
        <span style={{ flex: 1 }} />
        <span style={{ ...mono, fontSize: 9, color: '#a5a39a' }}>%</span>
      </div>
      {r.typeCount.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
          {r.typeCount.map(t => (
            <span key={t.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px 2px 0', fontSize: 12, fontWeight: 800 }}>
              <Emo e={t.glyph} size={18} />{t.name.replace('タイプ', '')}<span style={{ ...mono, fontSize: 12 }}>{t.n}</span>日
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ② 体調と心の調子（1〜5）: 7日分の折れ線。起床・就寝は丸、つぶやきは小さい点 */
const SER = [{ k: 'cond', name: '体調', color: INK, avg: 'avgCond', prev: 'prevCond' }, { k: 'mood', name: '気分', color: '#ff5fa2', avg: 'avgMood', prev: 'prevMood' }];
function Cond({ r }) {
  const c = r.cond, W = 320, H = 150, PL = 18, PR = 8, PT = 10, PB = 22;
  const X = (x) => PL + (x / 7) * (W - PL - PR), Y = (v) => PT + (1 - (v - 1) / 4) * (H - PT - PB);
  const diff = (a, b) => (a == null || b == null ? null : Math.round((a - b) * 10) / 10);
  return (
    <div style={card}>
      <div style={ttl}>体調と心の調子</div>
      {!c.pts.length ? <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#a5a39a' }}>記録なし</div> : (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
          {r.days.map((d, i) => <rect key={i} x={X(i)} y={PT - 4} width={X(1) - X(0)} height={H - PT - PB + 8} fill={i % 2 ? '#efece3' : 'transparent'} />)}
          {[1, 3, 5].map(v => <g key={v}><line x1={PL} x2={W - PR} y1={Y(v)} y2={Y(v)} stroke="#e9e6dc" strokeWidth="1" /><text x={PL - 5} y={Y(v) + 3} textAnchor="end" fontSize="8" fill="#a5a39a" style={mono}>{v}</text></g>)}
          {r.days.map((d, i) => <text key={'l' + i} x={X(i + 0.5)} y={H - 7} textAnchor="middle" fontSize="9.5" fontWeight="700" fill={d.today ? '#7a9a00' : '#55554e'}>{d.wd}</text>)}
          {SER.map(s => {
            const pts = c.pts.filter(p => p[s.k] != null);
            const main = pts.map(p => [X(p.x), Y(p[s.k])]);
            return (
              <g key={s.k}>
                {main.length > 1 && <path d={smoothPath(main)} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinecap="round" />}
                {pts.map((p, i) => p.kind === 'tweet'
                  ? <circle key={i} cx={X(p.x)} cy={Y(p[s.k])} r="2.4" fill={s.color} />
                  : <circle key={i} cx={X(p.x)} cy={Y(p[s.k])} r="3.6" fill="#fff" stroke={s.color} strokeWidth="2" />)}
              </g>
            );
          })}
        </svg>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        {SER.map(s => {
          const a = c[s.avg], d = diff(a, c[s.prev]);
          return (
            <div key={s.k} style={{ flex: 1, padding: '2px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: '#55554e' }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: s.color }} />{s.name}の平均</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                <span style={{ ...mono, fontSize: 20, fontWeight: 700 }}>{a == null ? '—' : a.toFixed(1)}</span>
                {d != null && <span style={{ fontSize: 11, fontWeight: 800, color: d > 0 ? '#7a9a00' : d < 0 ? '#c0395e' : '#8a8a82' }}>先週より{d > 0 ? '↑' + d : d < 0 ? '↓' + Math.abs(d) : '→'}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ③④ 必須・やりたいこと（今週の目標の関連する行動も同じ行で出す）*/
function FreqRow({ x, fav, first }) {
  const hasT = !fav && x.target != null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: first ? 'none' : '1px solid #e4e1d8' }}>
      <Emo e={x.glyph} size={28} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.name}</span>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#8a8a82', whiteSpace: 'nowrap' }}>{x.freq}</span>
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
          {x.dots.map((on, i) => <span key={i} style={{ width: 11, height: 11, borderRadius: '50%', background: on ? (fav ? '#ff5fa2' : '#7a9a00') : '#e9e6dc' }} />)}
        </div>
      </div>
      <div style={{ flex: '0 0 auto', textAlign: 'right' }}>
        <div style={{ ...mono, fontSize: 15, fontWeight: 700 }}>{x.scope === 'month' ? <span style={{ fontSize: 10, fontWeight: 700, color: '#8a8a82', marginRight: 3, fontFamily: 'inherit' }}>今月</span> : null}{x.count}{hasT && <span style={{ fontSize: 11, color: '#8a8a82' }}>/{x.target}</span>}<span style={{ fontSize: 10.5, fontFamily: 'inherit', fontWeight: 700 }}>回</span></div>
        {hasT && (x.ok
          ? <span style={{ display: 'inline-block', marginTop: 2, fontSize: 10.5, fontWeight: 800, color: LIME_INK, background: LIME, borderRadius: 6, padding: '1px 7px' }}>達成</span>
          : <span style={{ display: 'inline-block', marginTop: 2, fontSize: 10.5, fontWeight: 800, color: '#b86a1e' }}>あと{x.target - x.count}回</span>)}
      </div>
    </div>
  );
}

/* 必須・やりたいこと（fav は「あと〇回」を出さない） */
function Freq({ title, rows, fav }) {
  return (
    <div style={card}>
      <div style={ttl}>{title}</div>
      {!rows.length && <div style={{ fontSize: 12, color: '#a5a39a', padding: '4px 0 2px' }}>登録なし</div>}
      {rows.map(x => <FreqRow key={x.k} x={x} fav={fav} />)}
    </div>
  );
}

const EVALS = [['done', 'できた'], ['half', '半分くらい'], ['not', 'できなかった']];
function GoalThis({ r, v }) {
  const g = r.goal;
  return (
    <div style={card}>
      <div style={ttl}>今週の目標</div>
      {g.text ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 800 }}>
            {g.act && <Emo e={g.act.glyph} size={26} />}<span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.text}</span>
          </div>
          {g.row && <div style={{ marginTop: 6 }}><FreqRow x={g.row} first /></div>}
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            {EVALS.map(([k, lb]) => (
              <button key={k} onClick={() => v.setWeekEval(r.key, k)} style={{ flex: 1, border: g.eval === k ? 'none' : '1.5px solid #e4e1d8', borderRadius: 12, background: g.eval === k ? INK : '#fff', color: g.eval === k ? '#fff' : '#55554e', fontSize: 13, fontWeight: 800, padding: '9px 0', cursor: 'pointer', fontFamily: 'inherit' }}>{lb}</button>
            ))}
          </div>
        </>
      ) : <div style={{ fontSize: 12.5, color: '#a5a39a' }}>決めていませんでした</div>}
    </div>
  );
}

function GoalNext({ r, v }) {
  const [pick, setPick] = React.useState(false);
  const n = r.next;
  const [txt, setTxt] = React.useState(n.text);
  React.useEffect(() => { setTxt(n.text); }, [n.key]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = () => { if (txt !== n.text) v.setWeekGoal(txt, n.key); };
  return (
    <>
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 8 }}>
          <span style={{ ...ttl, marginBottom: 0, flex: 1 }}>{n.isThisWeek ? '今週の目標' : '来週の目標'}</span>
          <span style={{ ...mono, fontSize: 11, color: '#a5a39a' }}>{[...txt].length}/{v.weekGoalMax}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GoalActButton glyph={n.act && n.act.glyph} onClick={() => setPick(true)} />
          <input value={txt} maxLength={v.weekGoalMax} onChange={(e) => setTxt(e.target.value)} onBlur={save} placeholder="例: 夜は0時までにねる"
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) e.target.blur(); }}
            style={{ flex: 1, minWidth: 0, height: 38, boxSizing: 'border-box', border: '1.5px solid #e4e1d8', borderRadius: 10, padding: '0 12px', fontSize: 16, fontWeight: 700, fontFamily: 'inherit', color: INK, background: '#fff', outline: 'none' }} />
        </div>
      </div>
      {pick && <GoalActPicker cats={v.goalActCats} value={n.act && n.act.id} onPick={(id) => v.setWeekGoalAct(id, n.key)} onClose={() => setPick(false)} />}
    </>
  );
}

export default function WeekReport({ v }) {
  const r = v.weekReport;
  const from = v.weekReportFrom;
  return (
    <div style={{ position: 'relative', flex: 1, minHeight: 0, background: '#f7f4ec', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 16px 8px' }}>
        <button onClick={v.closeWeekReport} aria-label="もどる" style={{ width: 38, height: 38, borderRadius: 10, border: 'none', background: '#e4e1d8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><span style={{ fontFamily: 'Material Symbols Rounded', fontSize: 24, color: INK }}>arrow_back</span></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 900 }}>週間レポート</div>
          <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: '#8a8a82' }}>{r.label}</div>
        </div>
      </div>
      <div className="nos" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 8 }}>
        <Speaker text={r.ikoi} size={110} onEdit={v.editIkoiLine} />
        <GoalThis r={r} v={v} />
        <Types r={r} />
        <Cond r={r} />
        <Freq title="必須にした行動" rows={r.req} />
        <Freq title="やりたいこと" rows={r.fav} fav />
        <GoalNext r={r} v={v} />
        <div style={{ borderTop: LINE }} />
      </div>
      <div style={{ flex: '0 0 auto', display: 'flex', gap: 12, padding: '10px 20px calc(16px + env(safe-area-inset-bottom))' }}>
        <button onClick={v.closeWeekReport} style={{ flex: 1, border: 'none', borderRadius: 16, background: LIME, color: LIME_INK, fontWeight: 800, fontSize: 16, padding: '16px 0', cursor: 'pointer', boxShadow: '0 6px 18px rgba(122,154,0,.3)', fontFamily: 'inherit' }}>{from === 'wake' ? 'つぎへ' : from === 'bookshelf' ? '本棚へ' : 'ホームへ'}</button>
      </div>
    </div>
  );
}
