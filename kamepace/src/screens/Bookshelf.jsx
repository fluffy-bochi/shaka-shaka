import React, { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { todayStr, strToDate, pad2 } from '../model';
import {
  buildDay, buildMonth, monthsWithData, nameMap, daySlots, dayChart,
  placeMain, placeSplit, placeNet, GEO_PORT, GEO_LAND,
} from '../bookshelf';

const MONO = "'Space Mono', monospace";
const WD = ['日', '月', '火', '水', '木', '金', '土'];

/* ---------- 小物 ---------- */
const Pile = ({ pts, w, fs, ghost }) => pts.map((p, i) => (
  <div key={i} style={{
    position: 'absolute', width: w, textAlign: 'center', fontSize: fs, lineHeight: 1,
    left: p.x, bottom: p.bottom, transform: `rotate(${p.rot}deg)`,
    ...(ghost ? { opacity: 0.3, filter: 'grayscale(.85)' } : { filter: 'drop-shadow(0 1px 1px rgba(27,27,24,.12))' }),
  }}>{p.e}</div>
));

const Glass = () => (<>
  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(255,255,255,.4),rgba(255,255,255,.08))', boxShadow: 'inset -3px 0 5px rgba(27,27,24,.07),inset 2px 0 0 rgba(255,255,255,.45)', zIndex: 2, pointerEvents: 'none' }} />
  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, background: 'linear-gradient(90deg,#f1ede3,#fbf9f3 60%,#efe9dd)', borderBottom: '1px solid rgba(27,27,24,.07)', zIndex: 2 }} />
</>);

function Chart({ chart }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ position: 'relative', width: 74, height: 74, flex: '0 0 auto', borderRadius: '50%', background: chart.grad }}>
        <div style={{ position: 'absolute', inset: 23, background: '#fffdf8', borderRadius: '50%' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {chart.items.map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, flex: '0 0 auto', background: c.color }} />
            <span style={{ fontSize: 12, lineHeight: 1 }}>{c.e}</span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 11, fontWeight: 700, color: '#55554e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
            <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: '#1b1b18' }}>×{c.n}</span>
          </div>
        ))}
        {!chart.items.length && <span style={{ fontSize: 11, color: '#9d9b91' }}>まだ記録がありません</span>}
      </div>
    </div>
  );
}

function Timeline({ slots }) {
  if (!slots.length) return <div style={{ fontSize: 12, color: '#9d9b91', padding: '10px 0' }}>この日の記録はまだありません。</div>;
  return slots.map((sl, si) => (
    <div key={si} style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 13 }}>{sl.icon}</span>
        <span style={{ fontSize: 11.5, fontWeight: 900 }}>{sl.name}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {sl.rows.map((r, ri) => (
          <div key={ri} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 2px', borderBottom: '1px solid #f1efe8', opacity: r.ghost ? 0.45 : 1 }}>
            <span style={{ fontSize: 15, filter: r.ghost ? 'grayscale(.85)' : 'none' }}>{r.glyph}</span>
            <span style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>{r.name}</span>
            <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: r.rec ? '#7a9a00' : '#e8842c' }}>{r.f}</span>
          </div>
        ))}
      </div>
    </div>
  ));
}

function Ranking({ title, rows }) {
  return (<>
    <div style={{ fontSize: 11, fontWeight: 700, color: '#55554e', margin: '14px 0 2px' }}>{title}</div>
    {rows.length ? rows.map((r, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 2px', borderBottom: '1px solid #f1efe8' }}>
        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: '#9d9b91', width: 14, flex: '0 0 auto' }}>{r.rank}</span>
        <span style={{ fontSize: 15 }}>{r.e}</span>
        <span style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>{r.name}</span>
        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: r.color }}>×{r.n}</span>
      </div>
    )) : <div style={{ fontSize: 11, color: '#9d9b91', padding: '6px 2px' }}>まだありません</div>}
  </>);
}

/* お気に入り付箋 */
function Fusen({ on, onClick }) {
  return (
    <div onClick={onClick} title="付箋をつける" style={{
      position: 'absolute', top: -14, right: 26, width: 20, height: 46, borderRadius: 2, transform: 'rotate(3deg)',
      cursor: 'pointer', userSelect: 'none', zIndex: 3,
      background: on ? 'linear-gradient(180deg,#ff8fbe,#ff5fa2)' : '#f3f0e4',
      border: on ? '1px solid #f04b91' : '1px dashed #cfcaba', boxShadow: '0 2px 5px rgba(27,27,24,.15)',
    }}>
      <div style={{ position: 'absolute', left: 2, right: 2, top: 2, height: 8, background: on ? 'rgba(255,255,255,.35)' : 'transparent' }} />
    </div>
  );
}

/* ノート（その日／その月の中身）— 縦のシート・横の右ページ共通 */
function NoteBody({ isMonth, day, month, names, slotHours, diary, onDiary, footLabel }) {
  if (isMonth) {
    return (<>
      <div style={{ padding: '8px 20px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 900 }}>{month.year}年{month.label}</span>
          {month.cur && <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: '#2f3a00', background: '#eef7cc', borderRadius: 6, padding: '2px 6px' }}>今月</span>}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: '#9d9b91', marginTop: 2 }}>この月のまとめ</div>
      </div>
      <div className="nos" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 20px 14px' }}>
        <Ranking title="疲労ランキング TOP5" rows={month.fatTop} />
        <Ranking title="回復ランキング TOP5" rows={month.recTop} />
        <div style={{ fontSize: 11, fontWeight: 700, color: '#55554e', margin: '14px 0 8px' }}>絵文字のかず</div>
        <Chart chart={month.chart} />
      </div>
    </>);
  }
  const slots = daySlots(day, slotHours);
  const chart = dayChart(day, names);
  return (<>
    <div style={{ padding: '8px 20px 8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16, fontWeight: 900 }}>{day.label} {day.wd}曜</span>
        {day.today && <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: '#2f3a00', background: '#eef7cc', borderRadius: 6, padding: '2px 6px' }}>今日</span>}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 10, color: '#9d9b91', marginTop: 2 }}>この本の中身</div>
    </div>
    <div className="nos" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 20px 14px' }}>
      <Timeline slots={slots} />
      <div style={{ fontSize: 11, fontWeight: 700, color: '#55554e', margin: '14px 0 8px' }}>絵文字のかず</div>
      <Chart chart={chart} />
      <div style={{ fontSize: 11, fontWeight: 700, color: '#55554e', margin: '14px 0 6px' }}>日記</div>
      <textarea value={diary} onChange={onDiary} placeholder="この日のことをメモ" style={{ width: '100%', minHeight: 56, resize: 'vertical', background: '#fbfaf6', border: '1px solid #eee9dc', borderRadius: 10, padding: '8px 10px', fontFamily: 'inherit', fontSize: 12, lineHeight: 1.6, color: '#1b1b18', outline: 'none' }} />
    </div>
  </>);
}

/* ---------- 本体 ---------- */
export default function Bookshelf({ v }) {
  const today = todayStr();
  const rootRef = useRef(null);
  const [autoLand, setAutoLand] = useState(false);   // 端末の向き（実寸 w>h）
  const [manualOrient, setManualOrient] = useState(null); // 手動: null=自動 / 'land' / 'port'
  const land = manualOrient != null ? manualOrient === 'land' : autoLand;
  const breakout = manualOrient === 'land'; // 縦フレームでも横を見たい時は全画面化
  const [view, setView] = useState('day');        // 'day' | 'month'
  const [monthYm, setMonthYm] = useState(today.slice(0, 7));
  const [sort, setSort] = useState('date');        // 'date' | 'more' | 'less'
  const [flood, setFlood] = useState('all');       // 'all' | 'over' | 'ok'
  const [favFilter, setFavFilter] = useState(false);
  const [disp, setDisp] = useState('both');        // 'both' | 'net'（横・日別）
  const [selKey, setSelKey] = useState(today);
  const [selMonYm, setSelMonYm] = useState(today.slice(0, 7));
  const [sheet, setSheet] = useState(false);

  const entries = v.bookEntries || [];
  const slotHours = v.bookSlotHours;
  const fav = v.bookFav || {};
  const diaries = v.bookDiary || {};

  /* 向き＝本棚の実寸で判定（縦フレーム=縦持ち, 横に広い=横持ち） */
  useLayoutEffect(() => {
    const el = rootRef.current; if (!el) return;
    const update = () => setAutoLand(el.clientWidth > el.clientHeight);
    update();
    const ro = new ResizeObserver(update); ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const RotateBtn = () => (
    <div onClick={() => setManualOrient(land ? 'port' : 'land')} title="むきを変える" style={{ cursor: 'pointer', userSelect: 'none', width: 26, height: 26, flex: '0 0 auto', borderRadius: '50%', background: '#fff', border: '1px solid #e3e0d5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontFamily: 'Material Symbols Rounded', fontSize: 15, color: '#55554e' }}>screen_rotation</span>
    </div>
  );
  // 縦フレーム内で横向きを見たい時はビューポート全体に広げる
  const breakoutStyle = breakout ? { position: 'fixed', inset: 0, zIndex: 40, width: '100vw', height: '100dvh' } : null;

  const names = useMemo(() => nameMap(entries), [entries]);
  const months = useMemo(() => monthsWithData(entries), [entries]);

  /* 日別: 選択月の1日〜末日 */
  const monthDays = useMemo(() => {
    const [y, m] = monthYm.split('-').map(Number);
    const last = new Date(y, m, 0).getDate();
    const arr = [];
    for (let i = 1; i <= last; i++) arr.push(buildDay(entries, y + '-' + pad2(m) + '-' + pad2(i)));
    return arr;
  }, [entries, monthYm]);

  const filtered = useMemo(() => {
    let r = monthDays.filter((d) => (flood === 'all' || (flood === 'over') === d.over) && (!favFilter || fav[d.dateStr]));
    if (sort === 'more') r = r.slice().sort((a, b) => b.total - a.total);
    else if (sort === 'less') r = r.slice().sort((a, b) => a.total - b.total);
    return r;
  }, [monthDays, flood, favFilter, fav, sort]);

  /* 縦: 週ごとの段（月曜始まり） */
  const weeks = useMemo(() => {
    const out = [];
    if (sort === 'date') {
      let row = null;
      filtered.forEach((d) => {
        if (!row || d.dow === 0) { row = { days: [], wk: d.wk, padPx: 8 + d.dow * 47 }; out.push(row); }
        row.days.push(d);
      });
    } else {
      for (let i = 0; i < filtered.length; i += 7) out.push({ days: filtered.slice(i, i + 7), wk: '', padPx: 8 });
    }
    return out;
  }, [filtered, sort]);

  const monthObjs = useMemo(() => months.map((ym) => {
    const [y, m] = ym.split('-').map(Number);
    const mo = buildMonth(entries, y, m, names);
    mo.cur = ym === today.slice(0, 7);
    return mo;
  }), [entries, months, names, today]);

  const selDay = useMemo(() => buildDay(entries, selKey), [entries, selKey]);
  const selMonth = useMemo(() => {
    const found = monthObjs.find((m) => m.ym === selMonYm);
    if (found) return found;
    const [y, m] = selMonYm.split('-').map(Number);
    const mo = buildMonth(entries, y, m, names); mo.cur = selMonYm === today.slice(0, 7); return mo;
  }, [monthObjs, selMonYm, entries, names, today]);

  const isMonth = view === 'month';
  const footLabel = isMonth ? 'この月を見る' : 'この日を見る';

  /* ---------- スクロール位置 ---------- */
  const portRef = useRef(null), landRef = useRef(null);
  const centerToday = (el) => {
    if (!el) return false;
    const t = el.querySelector('[data-today="1"]');
    if (!t) return false;
    const r = t.getBoundingClientRect(), sr = el.getBoundingClientRect();
    el.scrollLeft += (r.left + r.width / 2 - sr.left) - sr.width / 2;
    return true;
  };
  const scrollPortToToday = (el) => {
    if (!el) return;
    const t = el.querySelector('[data-today="1"]');
    if (t) { const r = t.getBoundingClientRect(), sr = el.getBoundingClientRect(); el.scrollTop += (r.top - sr.top) - sr.height * 0.55; }
    else el.scrollTop = el.scrollHeight;
  };
  useEffect(() => {
    if (land) { const el = landRef.current; if (el && !centerToday(el)) el.scrollLeft = 0; }
    else scrollPortToToday(portRef.current);
  }, [land, view, monthYm, sort, flood, favFilter, disp]);

  const jumpToday = () => {
    setView('day'); setMonthYm(today.slice(0, 7)); setSelKey(today);
    requestAnimationFrame(() => {
      if (land) { const el = landRef.current; if (el) centerToday(el); }
      else scrollPortToToday(portRef.current);
    });
  };

  const selectDay = (d) => { setSelKey(d.dateStr); if (!land) setSheet(true); };
  const selectMonth = (mo) => { setSelMonYm(mo.ym); if (!land) setSheet(true); };

  /* ---------- パーツ描画 ---------- */
  const monthOptions = months.map((ym) => {
    const [y, m] = ym.split('-').map(Number);
    return { ym, label: (y === strToDate(today).getFullYear() ? '' : y + '/') + m + '月' };
  });

  const Segment = () => (
    <div style={{ display: 'flex', background: '#eceadd', borderRadius: 999, padding: 2, flex: '0 0 auto' }}>
      {[['day', '日別'], ['month', '月別']].map(([k, lb]) => (
        <div key={k} onClick={() => setView(k)} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', fontFamily: MONO, fontSize: 10, fontWeight: 700, borderRadius: 999, padding: '3px 10px', background: view === k ? '#1b1b18' : 'transparent', color: view === k ? '#fff' : '#55554e' }}>{lb}</div>
      ))}
    </div>
  );
  const TodayBtn = () => (
    <div onClick={jumpToday} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', fontFamily: MONO, fontSize: 10, fontWeight: 700, color: '#2f3a00', background: '#eef7cc', border: '1px solid #d9ecab', borderRadius: 999, padding: '4px 9px' }}>今日</div>
  );
  const selStyle = { fontFamily: MONO, fontSize: 10, fontWeight: 700, color: '#55554e', background: '#fff', border: '1px solid #e3e0d5', borderRadius: 8, padding: '4px 5px', outline: 'none' };
  const MonthSel = () => (
    <select value={monthYm} onChange={(e) => setMonthYm(e.target.value)} style={selStyle}>
      {monthOptions.map((o) => <option key={o.ym} value={o.ym}>{o.label}</option>)}
    </select>
  );
  const SortSel = () => (
    <select value={sort} onChange={(e) => setSort(e.target.value)} style={selStyle}>
      <option value="date">日付順</option><option value="more">多い順</option><option value="less">少ない順</option>
    </select>
  );
  const FloodSel = () => (
    <select value={flood} onChange={(e) => setFlood(e.target.value)} style={selStyle}>
      <option value="all">すべての日</option><option value="over">あふれた日</option><option value="ok">おさまった日</option>
    </select>
  );
  const FavFilter = ({ round }) => (
    <div onClick={() => setFavFilter((s) => !s)} style={{ cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: MONO, fontSize: 10, fontWeight: 700, border: '1px solid ' + (favFilter ? '#ff5fa2' : '#e3e0d5'), background: favFilter ? '#ff5fa2' : '#fff', color: favFilter ? '#fff' : '#8a8a82', borderRadius: round ? 999 : 8, padding: '4px 9px', userSelect: 'none' }}>付箋の日</div>
  );
  const DispPill = () => (
    <div style={{ display: 'flex', gap: 4, flex: '0 0 auto' }}>
      {[['both', '疲労と回復'], ['net', '寝るまえの量']].map(([k, lb]) => (
        <div key={k} onClick={() => setDisp(k)} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', fontFamily: MONO, fontSize: 10, fontWeight: 700, border: '1px solid #e3e0d5', borderRadius: 999, padding: '4px 8px', background: disp === k ? '#1b1b18' : '#fff', color: disp === k ? '#fff' : '#55554e' }}>{lb}</div>
      ))}
    </div>
  );

  /* --- 縦の本（41×168） --- */
  const PortBook = ({ day }) => {
    const b = placeMain(day, GEO_PORT);
    return (
      <div data-today={day.today ? '1' : undefined} onClick={() => selectDay(day)} style={{ position: 'relative', cursor: 'pointer', width: 41, height: 168, background: day.today ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.16)', border: day.today ? '2px solid #c4f000' : '1px solid rgba(27,27,24,.18)', borderRadius: '3px 3px 1px 1px', overflow: 'hidden', boxShadow: '0 3px 5px rgba(27,27,24,.1)' }}>
        <Glass />
        <div style={{ position: 'absolute', top: 9, left: 0, right: 0, textAlign: 'center', fontFamily: MONO, fontSize: 8.5, fontWeight: 700, color: day.today ? '#5a7a00' : '#7a786f', letterSpacing: '-.02em', zIndex: 3 }}>{day.label}</div>
        <div style={{ position: 'absolute', top: 19, left: 0, right: 0, textAlign: 'center', fontSize: 8, fontWeight: day.today ? 700 : 500, color: day.today ? '#7a9a00' : '#a7a59b', zIndex: 3 }}>{day.wd}</div>
        {fav[day.dateStr] && <div style={{ position: 'absolute', top: 0, right: 6, width: 8, height: 17, background: '#ff5fa2', clipPath: 'polygon(0 0,100% 0,100% 100%,50% 76%,0 100%)', zIndex: 3 }} />}
        <Pile pts={b.solid} w={18} fs={17} />
        <Pile pts={b.ghost} w={18} fs={17} ghost />
        {day.dateStr === selKey && <div style={{ position: 'absolute', inset: 0, border: '2px solid #ff5fa2', borderRadius: '3px 3px 1px 1px', pointerEvents: 'none', zIndex: 4 }} />}
      </div>
    );
  };

  /* --- 横の本（66×250）--- */
  const LandBook = ({ day }) => {
    const split = disp === 'both';
    const sp = split ? placeSplit(day, GEO_LAND) : null;
    const net = split ? null : placeNet(day);
    return (
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', paddingBottom: 16 }} onClick={() => selectDay(day)}>
        {day.isMon && sort === 'date' && <div style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', fontFamily: MONO, fontSize: 8.5, fontWeight: 700, color: '#e8b23a', whiteSpace: 'nowrap', zIndex: 3 }}>{day.wk}</div>}
        {day.today && <div data-today="1" style={{ position: 'absolute', top: 2, left: '50%', transform: 'translateX(-50%)', fontFamily: MONO, fontSize: 8.5, fontWeight: 700, color: '#2f3a00', background: '#c4f000', borderRadius: 999, padding: '1px 7px', whiteSpace: 'nowrap', zIndex: 5 }}>今日</div>}
        <div style={{ position: 'relative', width: 66, height: 250, marginTop: 20, background: 'rgba(255,255,255,.16)', border: '1px solid rgba(27,27,24,.18)', borderRadius: '4px 4px 2px 2px', overflow: 'hidden', boxShadow: '0 3px 6px rgba(27,27,24,.12)' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(255,255,255,.4),rgba(255,255,255,.08))', boxShadow: 'inset -4px 0 6px rgba(27,27,24,.07),inset 2px 0 0 rgba(255,255,255,.45)', zIndex: 2, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 9, background: 'linear-gradient(90deg,#f1ede3,#fbf9f3 60%,#efe9dd)', borderBottom: '1px solid rgba(27,27,24,.07)', zIndex: 2 }} />
          <div style={{ position: 'absolute', top: 16, left: 0, right: 0, textAlign: 'center', fontFamily: MONO, fontSize: 12, fontWeight: 700, color: '#7a786f', zIndex: 3 }}>{day.label}</div>
          <div style={{ position: 'absolute', top: 31, left: 0, right: 0, textAlign: 'center', fontSize: 11, fontWeight: 500, color: '#a7a59b', zIndex: 3 }}>{day.wd}</div>
          {split ? (<>
            <div style={{ position: 'absolute', top: 46, left: 0, width: '50%', textAlign: 'center', fontSize: 8, fontWeight: 700, color: '#c9c5b8', zIndex: 3 }}>疲労</div>
            <div style={{ position: 'absolute', top: 46, right: 0, width: '50%', textAlign: 'center', fontSize: 8, fontWeight: 700, color: '#c9c5b8', zIndex: 3 }}>回復</div>
            <div style={{ position: 'absolute', top: 58, bottom: 6, left: '50%', width: 1, background: 'rgba(27,27,24,.12)' }} />
            <Pile pts={sp.fh.solid} w={20} fs={18} /><Pile pts={sp.fh.ghost} w={20} fs={18} ghost />
            <Pile pts={sp.rh.solid} w={20} fs={18} /><Pile pts={sp.rh.ghost} w={20} fs={18} ghost />
          </>) : (<Pile pts={net} w={24} fs={20} />)}
          {fav[day.dateStr] && <div style={{ position: 'absolute', top: 0, right: 9, width: 9, height: 20, background: '#ff5fa2', clipPath: 'polygon(0 0,100% 0,100% 100%,50% 76%,0 100%)', zIndex: 3 }} />}
          {day.today && <div style={{ position: 'absolute', inset: 0, border: '3px solid #c4f000', borderRadius: '4px 4px 2px 2px', pointerEvents: 'none', zIndex: 4 }} />}
          {day.dateStr === selKey && !day.today && <div style={{ position: 'absolute', inset: 0, border: '3px solid #ff5fa2', borderRadius: '4px 4px 2px 2px', pointerEvents: 'none', zIndex: 4 }} />}
        </div>
      </div>
    );
  };

  /* --- 月の表紙 --- */
  const Cover = ({ mo, w, h }) => (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', paddingBottom: 16 }} onClick={() => selectMonth(mo)}>
      {mo.cur && <div style={{ position: 'absolute', top: 2, left: '50%', transform: 'translateX(-50%)', fontFamily: MONO, fontSize: 8.5, fontWeight: 700, color: '#2f3a00', background: '#c4f000', borderRadius: 999, padding: '1px 7px', whiteSpace: 'nowrap', zIndex: 5 }}>今月</div>}
      <div style={{ position: 'relative', width: w, height: h, marginTop: 20, background: 'linear-gradient(180deg,rgba(255,255,255,.6),rgba(255,255,255,.18))', border: '1px solid rgba(27,27,24,.18)', borderRadius: '4px 10px 10px 4px', overflow: 'hidden', boxShadow: 'inset 6px 0 8px rgba(27,27,24,.08),inset 2px 0 0 rgba(255,255,255,.45),0 4px 8px rgba(27,27,24,.14)' }}>
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 10, width: 1, background: 'rgba(27,27,24,.14)' }} />
        <div style={{ position: 'absolute', top: 10, left: 0, right: 0, textAlign: 'center', zIndex: 2 }}><span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: '#7a786f', background: 'rgba(251,249,243,.85)', borderRadius: 6, padding: '1px 8px' }}>{mo.label}</span></div>
        <Pile pts={mo.pile} w={13} fs={11} />
        <Pile pts={mo.pileG} w={13} fs={11} ghost />
        {mo.cur && <div style={{ position: 'absolute', inset: 0, border: '3px solid #c4f000', borderRadius: '4px 10px 10px 4px', pointerEvents: 'none' }} />}
        {mo.ym === selMonYm && !mo.cur && <div style={{ position: 'absolute', inset: 0, border: '3px solid #ff5fa2', borderRadius: '4px 10px 10px 4px', pointerEvents: 'none' }} />}
      </div>
    </div>
  );

  const shelfBoard = (wk) => (
    <div style={{ height: 13, background: 'linear-gradient(180deg,#4a3120,#2a190f)', boxShadow: '0 5px 9px rgba(27,27,24,.22)', position: 'relative', zIndex: 1 }}>
      {wk && <div style={{ position: 'absolute', left: 10, top: 1, fontFamily: MONO, fontSize: 8.5, fontWeight: 700, color: '#e8b23a', letterSpacing: '.04em' }}>{wk}</div>}
    </div>
  );

  /* 内蔵ナビ（縦=下タブ / 横=左レール）。本棚 screen では全体Navを隠す代わりにこれを出す。 */
  const navItems = [
    { icon: 'auto_stories', label: '本棚', on: true, go: v.goBookshelf },
    { icon: 'home', label: 'ホーム', on: false, go: v.goHome },
    { icon: 'blur_on', label: 'シャカ', on: false, go: v.goShaka },
    { icon: 'person', label: 'マイ', on: false, go: v.goMypage },
  ];
  const NavItem = ({ it, size }) => (
    <button onClick={it.go} style={{ flex: 1, background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, cursor: 'pointer' }}>
      <span style={{ fontFamily: 'Material Symbols Rounded', fontVariationSettings: `'FILL' ${it.on ? 1 : 0}`, fontSize: size, color: it.on ? '#1b1b18' : '#8a8a82' }}>{it.icon}</span>
      <span style={{ fontSize: size >= 23 ? 10 : 9, fontWeight: 700, color: it.on ? '#1b1b18' : '#8a8a82' }}>{it.label}</span>
    </button>
  );

  const fusen = (day) => <Fusen on={!!fav[day.dateStr]} onClick={() => v.setBookFav(day.dateStr)} />;
  const noteProps = {
    isMonth, day: selDay, month: selMonth, names, slotHours,
    diary: diaries[selKey] || '', onDiary: (e) => v.setBookDiary(selKey, e.target.value), footLabel,
  };

  /* ======================= 縦持ち（1a） ======================= */
  if (!land) {
    return (
      <div ref={rootRef} style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#f7f4ec' }}>
        <div style={{ padding: '4px 22px 10px' }}>
          <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '.16em', textTransform: 'uppercase', color: '#9d9b91' }}>BOOKSHELF</div>
          <div style={{ fontSize: 21, fontWeight: 900, marginTop: 2, letterSpacing: '-.01em' }}>がんばりの本棚</div>
          <div style={{ fontSize: 12, color: '#8a8a82', marginTop: 4 }}>下の段ほど最近。今日は本棚の一番下にある。</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <Segment /><TodayBtn /><RotateBtn />{!isMonth && <><MonthSel /><SortSel /></>}
          </div>
        </div>

        <div ref={portRef} className="nos" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <div style={{ position: 'relative', padding: '10px 0 20px' }}>
            <div style={{ height: 13, background: 'linear-gradient(180deg,#5a3d27,#33200f)', position: 'relative', zIndex: 2, boxShadow: '0 3px 6px rgba(27,27,24,.2)' }} />
            {!isMonth ? weeks.map((week, wi) => (
              <div key={wi} style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start', gap: 6, padding: `16px 8px 0 ${week.padPx}px`, position: 'relative', zIndex: 1 }}>
                  {week.days.map((d) => <PortBook key={d.dateStr} day={d} />)}
                </div>
                {shelfBoard(week.wk)}
              </div>
            )) : (() => {
              const rows = []; for (let i = 0; i < monthObjs.length; i += 2) rows.push(monthObjs.slice(i, i + 2));
              return rows.map((row, ri) => (
                <div key={ri} style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start', gap: 12, padding: '20px 8px 0', position: 'relative', zIndex: 1 }}>
                    {row.map((mo) => <Cover key={mo.ym} mo={mo} w={158} h={260} />)}
                  </div>
                  {shelfBoard()}
                </div>
              ));
            })()}
          </div>
        </div>

        {/* その日バー */}
        <div style={{ flex: '0 0 auto', position: 'relative', zIndex: 3 }}>
          <div onClick={() => setSheet(true)} style={{ cursor: 'pointer', position: 'absolute', top: -25, left: 18, width: 70, height: 26, background: '#fffdf8', border: '1px solid #e7e2d3', borderBottom: 'none', borderRadius: '10px 10px 0 0', boxShadow: '0 -5px 10px rgba(27,27,24,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <span style={{ fontFamily: 'Material Symbols Rounded', fontSize: 14, color: '#1b1b18' }}>menu_book</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#55554e', letterSpacing: '.08em' }}>{isMonth ? 'その月' : 'その日'}</span>
          </div>
          <div onClick={() => setSheet(true)} style={{ cursor: 'pointer', background: '#fffdf8', borderTop: '1px solid #e7e2d3', boxShadow: '0 -10px 24px rgba(27,27,24,.1)', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 900 }}>{isMonth ? `${selMonth.year}年${selMonth.label}` : `${selDay.label} ${selDay.wd}曜`}</span>
            {!isMonth && selDay.today && <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: '#2f3a00', background: '#eef7cc', borderRadius: 6, padding: '2px 6px' }}>今日</span>}
            {isMonth && selMonth.cur && <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: '#2f3a00', background: '#eef7cc', borderRadius: 6, padding: '2px 6px' }}>今月</span>}
            <span style={{ flex: 1 }} />
            <div style={{ fontSize: 12, fontWeight: 700, color: '#2f3a00', background: '#c4f000', borderRadius: 999, padding: '8px 14px' }}>{footLabel}</div>
          </div>
        </div>

        {/* 内蔵ナビ（下タブ） */}
        <div style={{ flex: '0 0 auto', minHeight: 64, paddingBottom: 'env(safe-area-inset-bottom)', display: 'flex', alignItems: 'stretch', background: '#fff', borderTop: '1px solid #efece3' }}>
          {navItems.map((it, i) => <NavItem key={i} it={it} size={23} />)}
        </div>

        {/* その日/その月シート（下からスライドイン・タブバーは覆わない） */}
        {sheet && (<>
          <div onClick={() => setSheet(false)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 64, background: 'rgba(27,27,24,.35)', zIndex: 9 }} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 64, height: '66%', background: '#fffdf8', border: '1px solid #e7e2d3', borderBottom: 'none', borderRadius: '22px 22px 0 0', boxShadow: '0 -18px 44px rgba(27,27,24,.3)', zIndex: 10, display: 'flex', flexDirection: 'column', animation: 'sheetUp .3s cubic-bezier(.2,.8,.3,1)' }}>
            {!isMonth && fusen(selDay)}
            <div style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'center', padding: '8px 0 0' }}><div style={{ width: 40, height: 4, borderRadius: 999, background: '#e3dfd2' }} /></div>
            <NoteBody {...noteProps} />
            <div style={{ flex: '0 0 auto', padding: '10px 20px', borderTop: '1px solid #f1efe8' }}><div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#1b1b18', background: '#f7f4ec', borderRadius: 12, padding: 9 }}>{footLabel}</div></div>
          </div>
        </>)}
      </div>
    );
  }

  /* ======================= 横持ち（3a） ======================= */
  return (
    <div ref={rootRef} style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', background: '#f7f4ec', ...breakoutStyle }}>
      {/* 左レールナビ */}
      <div style={{ flex: '0 0 58px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 17, background: '#fff', borderRight: '1px solid #efece3' }}>
        {navItems.map((it, i) => (
          <button key={i} onClick={it.go} style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, cursor: 'pointer' }}>
            <span style={{ fontFamily: 'Material Symbols Rounded', fontVariationSettings: `'FILL' ${it.on ? 1 : 0}`, fontSize: 21, color: it.on ? '#1b1b18' : '#8a8a82' }}>{it.icon}</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: it.on ? '#1b1b18' : '#8a8a82' }}>{it.label}</span>
          </button>
        ))}
      </div>

      {/* 中央: 棚 */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px 0', flexWrap: 'wrap' }}>
          <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: '-.01em', whiteSpace: 'nowrap', flex: '0 1 auto', overflow: 'hidden', textOverflow: 'ellipsis' }}>がんばりの本棚</div>
          <Segment /><TodayBtn /><RotateBtn />
          {!isMonth && <DispPill />}
        </div>
        {!isMonth && (
          <div className="nos" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 22px 0', overflowX: 'auto' }}>
            <MonthSel /><FloodSel /><SortSel /><FavFilter round={false} />
          </div>
        )}
        {!isMonth ? (
          <div ref={landRef} className="nos" style={{ flex: 1, minHeight: 0, overflowX: 'auto', overflowY: 'hidden' }}>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'flex-end', gap: 11, height: '100%', padding: '0 40px' }}>
              {filtered.map((d) => <LandBook key={d.dateStr} day={d} />)}
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 14, background: 'linear-gradient(180deg,#4a3120,#241509)', borderRadius: 2, boxShadow: '0 5px 10px rgba(27,27,24,.28)', zIndex: 2 }} />
            </div>
          </div>
        ) : (
          <div className="nos" style={{ flex: 1, minHeight: 0, overflowX: 'auto', overflowY: 'hidden' }}>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'flex-end', gap: 22, height: '100%', padding: '0 40px' }}>
              {monthObjs.map((mo) => <Cover key={mo.ym} mo={mo} w={170} h={280} />)}
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 14, background: 'linear-gradient(180deg,#4a3120,#241509)', borderRadius: 2, boxShadow: '0 5px 10px rgba(27,27,24,.28)', zIndex: 2 }} />
            </div>
          </div>
        )}
      </div>

      {/* 右: 本のページ */}
      <div style={{ position: 'relative', flex: '0 0 clamp(200px, 38%, 300px)', display: 'flex', flexDirection: 'column', padding: '22px 12px 14px 4px' }}>
        <div style={{ position: 'relative', flex: 1, minHeight: 0, background: '#fffdf8', border: '1px solid #e7e2d3', borderRadius: '10px 16px 16px 10px', boxShadow: '3px 3px 0 #efeadb,6px 6px 0 #e2dccb,0 16px 34px rgba(27,27,24,.18)', display: 'flex', flexDirection: 'column' }}>
          {!isMonth && fusen(selDay)}
          <div style={{ position: 'absolute', left: -26, top: 26, width: 26, height: 66, background: '#fff', borderRadius: '10px 0 0 10px', boxShadow: '-6px 4px 12px rgba(27,27,24,.12)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
            <span style={{ fontFamily: 'Material Symbols Rounded', fontSize: 18, color: '#1b1b18' }}>menu_book</span>
            <span style={{ writingMode: 'vertical-rl', fontSize: 9, fontWeight: 700, color: '#55554e', letterSpacing: '.1em' }}>{isMonth ? 'その月' : 'その日'}</span>
          </div>
          <NoteBody {...noteProps} />
          <div style={{ flex: '0 0 auto', padding: '12px 20px', borderTop: '1px solid #f1efe8' }}><div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#1b1b18', background: '#f7f4ec', borderRadius: 12, padding: 10 }}>{footLabel}</div></div>
        </div>
      </div>
    </div>
  );
}
