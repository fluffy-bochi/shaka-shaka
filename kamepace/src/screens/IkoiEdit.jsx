import React from 'react';
import { Speaker } from './Wake';
import * as Ikoi from '../ikoi';
import { fill } from '../ikoi';
import { publishIkoi, revertIkoi, loadIkoi } from '../firebase';

/* 開発者用「いこいさん編集」: シチュエーションを選ぶと、いつもの見た目でいこいさんがしゃべる。
   セリフの文・表情を編集／追加／削除／並べ替えでき、編集は下書き（この端末だけ）に自動で保存される。
   「みんなに反映」で Firestore の config/ikoi に書き、全員のアプリに反映する。 */
const INK = '#1b1b18', LIME = '#c4f000', LIME_INK = '#2f3a00', SUB = '#55554e', LINE = '#e4e1d8';
const ms = (size, color) => ({ fontFamily: 'Material Symbols Rounded', fontSize: size, color, lineHeight: 1 });

const GROUPS = [
  { id: 'home', label: 'ホーム', size: 140, items: [
    { key: 'HOME_MORNING_NOWAKE', label: '朝・まだ起床の記録がない' },
    { key: 'HOME_BEDTIME', label: '寝る時間が近い（いつもの就寝の1時間前〜）' },
    { key: 'AFTER_FATIGUE', label: '記録直後（疲れる記録）' },
    { key: 'AFTER_RECOVER', label: '記録直後（回復の記録）' },
    { key: 'HOME_ZONE0', label: 'がんばりゲージ 0〜40' },
    { key: 'HOME_ZONE1', label: 'がんばりゲージ 41〜59' },
    { key: 'REST_INTRO', label: 'がんばりゲージ 60〜' },
    { key: 'REST_TIPS', label: 'おすすめの休み方' },
    { key: 'TPL_REST_TIP', label: 'おすすめの文', vars: ['休み方'] },
    { key: 'TPL_NEXT_OVER', label: '次の予定・やるとゲージが80超え', vars: ['予定', '時刻'] },
    { key: 'TPL_NEXT_MIND_HUGE', label: '次の予定・心の疲労がとても大きい（40〜）', vars: ['予定', '時刻'] },
    { key: 'TPL_NEXT_BODY_HUGE', label: '次の予定・体の疲労がとても大きい（40〜）', vars: ['予定', '時刻'] },
    { key: 'TPL_NEXT_MIND_BIG', label: '次の予定・心の疲労が大きい（20〜）', vars: ['予定', '時刻'] },
    { key: 'TPL_NEXT_BODY_BIG', label: '次の予定・体の疲労が大きい（20〜）', vars: ['予定', '時刻'] },
    { key: 'TPL_NEXT_REC', label: '次の予定・回復', vars: ['予定', '時刻'] },
    { key: 'TPL_HOME_NEXT', label: '次の予定・どれにも当てはまらない', vars: ['予定', '時刻'] },
  ] },
  { id: 'tap', label: 'タップ', size: 140, items: [
    { key: 'TAP_morning', label: '朝（5〜10時）' },
    { key: 'TAP_noon', label: '昼（11〜13時）' },
    { key: 'TAP_afternoon', label: '午後（14〜16時）' },
    { key: 'TAP_evening', label: '夕方〜夜（17〜20時）' },
    { key: 'TAP_night', label: '寝る前（21〜23時）' },
    { key: 'TAP_late', label: '深夜（0〜4時）' },
    { key: 'TAP_DATE', label: '日付の話題', date: true },
    { key: 'TAP_OCTOBER', label: '10月の話題' },
    { key: 'TAP_CHAT', label: '雑談' },
    { key: 'TAP_ANNOY', label: '連打されたとき' },
  ] },
  { id: 'bed', label: '就寝記録', size: 130, items: [
    ...[['yuttari', 'ゆったり'], ['hodohodo', 'ほどほど'], ['michimichi', 'みちみち'], ['none', '記録なし']].flatMap(([k, n]) => [
      { key: 'REVIEW_BASE_' + k, label: n + '・最初の一言' },
      { key: 'REVIEW_CLOSER_' + k, label: n + '・しめの一言' },
    ]),
    { key: 'TPL_REVIEW_UP', label: '力を入れた行動', vars: ['行動'] },
    { key: 'TPL_REVIEW_REC', label: '一番回復した行動', vars: ['行動'] },
    { key: 'TPL_REVIEW_YUTTARI_REC', label: 'ゆったりの日の回復', vars: ['行動'] },
  ] },
  { id: 'wake', label: '起床記録', size: 130, items: [
    { key: 'TPL_PLAN_HAS', label: '予定がある日', vars: ['件数', '最初の予定'] },
    { key: 'TPL_PLAN_NONE', label: '予定がない日' },
    { key: 'TPL_PLAN_TASKS', label: 'タスクの件数', vars: ['件数'] },
    { key: 'PLAN_CLOSER', label: 'しめの一言' },
  ] },
];

/* プレビュー用: 選んだセリフを、実際の画面と同じつなぎ方で1つの吹き出しにする（例の値を差し込む） */
const EX = { 行動: 'レポート・課題', 回復: '入浴', 予定: '1限 デザイン史', 時刻: '14:00', 件数: 3, 最初の予定: '1限 デザイン史' };
function compose(key, line, L) {
  const f0 = (k, vals) => fill(L(k)[0] || '', vals || {});
  const tip = (t) => fill(L('TPL_REST_TIP')[0] || '', { 休み方: t });
  const mid = (type) => (type === 'yuttari' ? f0('TPL_REVIEW_YUTTARI_REC', { 行動: EX.回復 })
    : type === 'none' ? '' : f0('TPL_REVIEW_UP', { 行動: EX.行動 }) + f0('TPL_REVIEW_REC', { 行動: EX.回復 }));
  const plan = (has, tasks, closer) => has + tasks + closer;
  let m;
  if ((m = key.match(/^REVIEW_BASE_(\w+)$/))) return line + mid(m[1]) + (L('REVIEW_CLOSER_' + m[1])[0] || '');
  if ((m = key.match(/^REVIEW_CLOSER_(\w+)$/))) return (L('REVIEW_BASE_' + m[1])[0] || '') + mid(m[1]) + line;
  switch (key) {
    case 'HOME_ZONE0': case 'HOME_ZONE1': return line + f0('TPL_HOME_NEXT', { 予定: EX.予定, 時刻: EX.時刻 });
    case 'TPL_HOME_NEXT': case 'TPL_NEXT_OVER': case 'TPL_NEXT_MIND_HUGE': case 'TPL_NEXT_BODY_HUGE':
    case 'TPL_NEXT_MIND_BIG': case 'TPL_NEXT_BODY_BIG': case 'TPL_NEXT_REC':
      return (L('HOME_ZONE' + (key === 'TPL_NEXT_OVER' ? 1 : 0))[0] || '') + fill(line, EX);
    case 'REST_INTRO': return line + tip(L('REST_TIPS')[0] || '');
    case 'REST_TIPS': return (L('REST_INTRO')[0] || '') + tip(line);
    case 'TPL_REST_TIP': return (L('REST_INTRO')[0] || '') + fill(line, { 休み方: L('REST_TIPS')[0] || '' });
    case 'TPL_REVIEW_UP': return (L('REVIEW_BASE_hodohodo')[0] || '') + fill(line, EX) + f0('TPL_REVIEW_REC', { 行動: EX.回復 }) + (L('REVIEW_CLOSER_hodohodo')[0] || '');
    case 'TPL_REVIEW_REC': return (L('REVIEW_BASE_hodohodo')[0] || '') + f0('TPL_REVIEW_UP', { 行動: EX.行動 }) + fill(line, { 行動: EX.回復 }) + (L('REVIEW_CLOSER_hodohodo')[0] || '');
    case 'TPL_REVIEW_YUTTARI_REC': return (L('REVIEW_BASE_yuttari')[0] || '') + fill(line, { 行動: EX.回復 }) + (L('REVIEW_CLOSER_yuttari')[0] || '');
    case 'TPL_PLAN_HAS': return plan(fill(line, EX), f0('TPL_PLAN_TASKS', { 件数: 2 }), L('PLAN_CLOSER')[0] || '');
    case 'TPL_PLAN_NONE': return plan(line, '', L('PLAN_CLOSER')[0] || '');
    case 'TPL_PLAN_TASKS': return plan(f0('TPL_PLAN_HAS', EX), fill(line, { 件数: 2 }), L('PLAN_CLOSER')[0] || '');
    case 'PLAN_CLOSER': return plan(f0('TPL_PLAN_HAS', EX), f0('TPL_PLAN_TASKS', { 件数: 2 }), line);
    default: return line;
  }
}

/* 画像を縮小して dataURL に（長い辺 360px・webp） */
function shrink(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      const k = Math.min(1, 360 / Math.max(im.width, im.height));
      const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      let d = c.toDataURL('image/webp', 0.85);
      if (!d.startsWith('data:image/webp')) d = c.toDataURL('image/png');
      res(d);
    };
    im.onerror = rej; im.src = url;
  });
}

/* 反映前の確認用: みんなに反映されている版との違いを、シチュエーションごとに並べる */
const LABEL_OF = Object.fromEntries(GROUPS.flatMap(g => g.items.filter(i => !i.date).map(i => [i.key, g.label + '・' + i.label])));
const labelOf = (k) => (k.startsWith('TAP_DATE:') ? 'タップ・日付の話題（' + Number(k.slice(9, 11)) + '/' + Number(k.slice(12)) + '）' : LABEL_OF[k] || k);
function diffIkoi(base, next) {
  const faceName = (f, faces) => (f ? (faces[f] || base.faces[f] || { label: '?' }).label : '自動');
  const out = [];
  const keys = [...new Set([...Object.keys(base.lines), ...Object.keys(next.lines)])];
  keys.forEach(k => {
    const a = base.lines[k] || [], b = next.lines[k] || [];
    const at = a.map(x => x.t), bt = b.map(x => x.t), ch = [];
    const removed = a.filter(x => !bt.includes(x.t)), added = b.filter(x => !at.includes(x.t));
    // 同じ位置で消えた文と増えた文は「書き換え」として1つにまとめる
    const used = new Set();
    removed.forEach(r => {
      const i = at.indexOf(r.t), m = added.find(x => !used.has(x) && bt.indexOf(x.t) === i);
      if (m) { used.add(m); ch.push({ kind: 'edit', from: r.t, to: m.t }); } else ch.push({ kind: 'del', to: r.t });
    });
    added.filter(x => !used.has(x)).forEach(x => ch.push({ kind: 'add', to: x.t, face: x.f ? faceName(x.f, next.faces) : '' }));
    b.forEach(x => { const o = a.find(y => y.t === x.t); if (o && (o.f || '') !== (x.f || '')) ch.push({ kind: 'face', to: x.t, from: faceName(o.f, base.faces), face: faceName(x.f, next.faces) }); });
    if (!ch.length && at.join('\n') !== bt.join('\n')) ch.push({ kind: 'order' });
    if (ch.length) out.push({ label: labelOf(k), ch });
  });
  const newFaces = Object.keys(next.faces).filter(k => !base.faces[k]).map(k => next.faces[k].label);
  if (newFaces.length) out.push({ label: '表情', ch: newFaces.map(n => ({ kind: 'newface', to: n })) });
  return out;
}

const customFaces = (faces) => Object.fromEntries(Object.entries(faces).filter(([k]) => !Ikoi.DEFAULT_FACES[k]));

export default function IkoiEdit({ v }) {
  const [data, setData] = React.useState(() => Ikoi.snapshot()); // 編集中の全セリフ・全表情
  // ホーム・記録画面の編集マークから来たときは、そのセリフを選んだ状態で開く
  const t0 = v.ikoiTarget, isDate0 = t0 && t0.key.startsWith('TAP_DATE:');
  const g0 = t0 ? GROUPS.find(g => g.items.some(i => (isDate0 ? i.date : i.key === t0.key))) : null;
  const [gid, setGid] = React.useState(g0 ? g0.id : 'home');
  const [key, setKey] = React.useState(g0 ? (isDate0 ? 'TAP_DATE' : t0.key) : 'AFTER_FATIGUE');
  const [date, setDate] = React.useState(() => (isDate0 ? t0.key.slice(9) : (Ikoi.dateKeys().sort()[0] || '10-31')));
  const [sel, setSel] = React.useState(g0 ? t0.idx : 0);
  const [picker, setPicker] = React.useState(null); // 表情を選ぶ行の番号
  const [newFace, setNewFace] = React.useState(null); // { src, label } 追加中の表情
  const [busy, setBusy] = React.useState('');
  const [confirm, setConfirm] = React.useState(false);
  const [hasPrev, setHasPrev] = React.useState(false);
  const taRefs = React.useRef([]);
  const caret = React.useRef(0);

  React.useEffect(() => { loadIkoi().then(d => setHasPrev(!!(d && d.hasPrev))).catch(() => {}); }, []);
  // 編集は少し待ってから下書きに保存（アプリ全体の表示にも反映される）
  const dirty = React.useRef(false);
  React.useEffect(() => {
    if (!dirty.current) return undefined;
    const t = setTimeout(() => Ikoi.setDraft({ lines: data.lines, faces: customFaces(data.faces) }), 300);
    return () => clearTimeout(t);
  }, [data]);

  const group = GROUPS.find(g => g.id === gid);
  const item = group.items.find(i => i.key === key) || group.items[0];
  const lkey = item.date ? 'TAP_DATE:' + date : item.key;
  const list = data.lines[lkey] || [];
  const L = (k) => (data.lines[k] || []).map(x => x.t);
  const update = (fn) => { dirty.current = true; setData(d => { const lines = { ...d.lines }; lines[lkey] = fn([...(lines[lkey] || [])]); return { ...d, lines }; }); };
  const cur = list[Math.min(sel, list.length - 1)];
  const preview = cur ? compose(item.key, cur.t, L) : '';
  const previewSrc = cur && cur.f && data.faces[cur.f] ? data.faces[cur.f].src : null;
  const dates = Object.keys(data.lines).filter(k => k.startsWith('TAP_DATE:')).map(k => k.slice(9)).sort();

  const pickGroup = (g) => { setGid(g); setKey(GROUPS.find(x => x.id === g).items[0].key); setSel(0); };
  const insertVar = (name) => {
    const i = Math.min(sel, list.length - 1); if (i < 0) return;
    const t = list[i].t, at = Math.min(caret.current, t.length);
    update(a => { a[i] = { ...a[i], t: t.slice(0, at) + '{' + name + '}' + t.slice(at) }; return a; });
  };
  const addDate = (e) => {
    const val = e.target.value; if (!val) return;
    const md = val.slice(5); dirty.current = true;
    setData(d => ({ ...d, lines: { ...d.lines, ['TAP_DATE:' + md]: d.lines['TAP_DATE:' + md] || [{ t: '' }] } }));
    setDate(md); setSel(0);
  };
  const onFile = async (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f) return;
    try { setNewFace({ src: await shrink(f), label: '' }); } catch (err) { /* 読めない画像 */ }
  };
  const saveNewFace = () => {
    const k = 'c' + Date.now().toString(36);
    dirty.current = true;
    setData(d => ({ ...d, faces: { ...d.faces, [k]: { label: newFace.label || '表情' + (Object.keys(d.faces).length + 1), src: newFace.src } } }));
    if (picker != null) update(a => { a[picker] = { ...a[picker], f: k }; return a; });
    setNewFace(null); setPicker(null);
  };
  const discard = () => { Ikoi.setDraft(null); dirty.current = false; setData(Ikoi.snapshot()); setSel(0); };
  const publish = async () => {
    setConfirm(false); setBusy('反映中…');
    try {
      await publishIkoi({ lines: data.lines, faces: customFaces(data.faces) });
      Ikoi.setPublished(await loadIkoi()); Ikoi.setDraft(null); dirty.current = false; setHasPrev(true);
      setBusy('みんなに反映しました');
    } catch (err) { setBusy(err && err.code === 'permission-denied' ? '反映する権限がありません' : '反映できませんでした'); }
    setTimeout(() => setBusy(''), 2500);
  };
  const revert = async () => {
    setBusy('戻しています…');
    try {
      await revertIkoi(); Ikoi.setPublished(await loadIkoi()); Ikoi.setDraft(null); dirty.current = false; setData(Ikoi.snapshot()); setSel(0);
      setBusy('1つ前に戻しました');
    } catch (err) { setBusy('戻せませんでした'); }
    setTimeout(() => setBusy(''), 2500);
  };

  const chip = (on) => ({ flex: '0 0 auto', border: 'none', borderRadius: 999, padding: '7px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer', background: on ? INK : '#fff', color: on ? '#fff' : SUB, fontFamily: 'inherit' });
  const icoBtn = { width: 30, height: 30, border: 'none', borderRadius: 9, background: '#efece3', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' };
  const hasDraft = !!Ikoi.getDraft() || dirty.current;

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: '#f7f4ec' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 20px 8px' }}>
        <button onClick={v.closeIkoiEdit} style={{ background: 'none', border: 'none', fontSize: 19, color: '#8a8a82', cursor: 'pointer' }}>‹</button>
        <div style={{ fontSize: 16, fontWeight: 700, flex: 1 }}>いこいさん編集</div>
        <span style={{ fontSize: 11, fontWeight: 700, color: hasDraft ? '#b4645a' : '#8a8a82' }}>{hasDraft ? '下書き' : '反映済み'}</span>
      </div>
      {/* シチュエーション */}
      <div className="nos" style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 16px 6px' }}>
        {GROUPS.map(g => <button key={g.id} onClick={() => pickGroup(g.id)} style={chip(g.id === gid)}>{g.label}</button>)}
      </div>
      <div style={{ padding: '0 16px 4px' }}>
        <select value={item.key} onChange={(e) => { setKey(e.target.value); setSel(0); }} style={{ width: '100%', height: 38, borderRadius: 10, border: '1.5px solid ' + LINE, background: '#fff', fontSize: 14, fontWeight: 700, padding: '0 10px', fontFamily: 'inherit', color: INK }}>
          {group.items.map(i => <option key={i.key} value={i.key}>{i.label}</option>)}
        </select>
        {item.date && (
          <div className="nos" style={{ display: 'flex', gap: 6, overflowX: 'auto', marginTop: 6, alignItems: 'center' }}>
            {dates.map(md => <button key={md} onClick={() => { setDate(md); setSel(0); }} style={chip(md === date)}>{Number(md.slice(0, 2))}/{Number(md.slice(3))}</button>)}
            <label style={{ ...chip(false), display: 'inline-flex', alignItems: 'center', gap: 2, position: 'relative' }}>
              <span style={ms(16, SUB)}>add</span>日付
              <input type="date" onChange={addDate} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
            </label>
          </div>
        )}
      </div>
      {/* プレビュー（いつもの見た目） */}
      <div style={{ padding: '8px 0 10px', borderBottom: '1px solid ' + LINE }}>
        {preview ? <Speaker text={preview} size={group.size} src={previewSrc} /> : <div style={{ height: group.size }} />}
      </div>
      {/* セリフの一覧 */}
      <div className="nos" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 16px 12px' }}>
        {item.vars && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            {item.vars.map(n => <button key={n} onClick={() => insertVar(n)} style={{ ...chip(false), border: '1.5px dashed #c9c7bf', padding: '5px 10px' }}>{'{' + n + '}'}</button>)}
          </div>
        )}
        {list.map((x, i) => {
          const on = i === Math.min(sel, list.length - 1), face = x.f && data.faces[x.f];
          return (
            <div key={i} onClick={() => setSel(i)} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: '#fff', borderRadius: 12, padding: 8, marginBottom: 8, boxShadow: on ? '0 0 0 2px ' + INK : '0 1px 2px rgba(27,27,24,.05)' }}>
              <button onClick={() => { setSel(i); setPicker(i); }} aria-label="表情" style={{ ...icoBtn, width: 44, height: 44, background: '#f7f4ec', overflow: 'hidden' }}>
                {face ? <img src={face.src} alt="" style={{ width: 44, height: 44, objectFit: 'contain', mixBlendMode: 'multiply' }} /> : <span style={{ fontSize: 10, fontWeight: 800, color: '#8a8a82' }}>自動</span>}
              </button>
              <textarea ref={el => { taRefs.current[i] = el; }} value={x.t} rows={Math.max(2, Math.ceil(x.t.length / 18))}
                onFocus={() => setSel(i)} onSelect={(e) => { caret.current = e.target.selectionStart; }}
                onChange={(e) => { caret.current = e.target.selectionStart; const t = e.target.value; update(a => { a[i] = { ...a[i], t }; return a; }); }}
                style={{ flex: 1, minWidth: 0, border: 'none', resize: 'none', fontSize: 14, lineHeight: 1.6, fontFamily: 'inherit', color: INK, background: 'transparent', outline: 'none', padding: '2px 0' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button onClick={(e) => { e.stopPropagation(); if (i > 0) { update(a => { [a[i - 1], a[i]] = [a[i], a[i - 1]]; return a; }); setSel(i - 1); } }} aria-label="上へ" style={icoBtn}><span style={ms(18, SUB)}>arrow_upward</span></button>
                <button onClick={(e) => { e.stopPropagation(); if (i < list.length - 1) { update(a => { [a[i + 1], a[i]] = [a[i], a[i + 1]]; return a; }); setSel(i + 1); } }} aria-label="下へ" style={icoBtn}><span style={ms(18, SUB)}>arrow_downward</span></button>
                <button onClick={(e) => { e.stopPropagation(); if (list.length > 1 || item.date) { update(a => { a.splice(i, 1); return a; }); setSel(Math.max(0, i - 1)); } }} aria-label="削除" style={{ ...icoBtn, opacity: list.length > 1 || item.date ? 1 : 0.35 }}><span style={ms(18, '#b4645a')}>delete</span></button>
              </div>
            </div>
          );
        })}
        <button onClick={() => { update(a => [...a, { t: '' }]); setSel(list.length); setTimeout(() => { const el = taRefs.current[list.length]; if (el) el.focus(); }, 50); }} style={{ width: '100%', border: '1.5px dashed #c9c7bf', borderRadius: 12, background: 'transparent', padding: '12px 0', fontSize: 14, fontWeight: 800, color: SUB, cursor: 'pointer', fontFamily: 'inherit' }}>＋ セリフを追加</button>
      </div>
      {/* 反映 */}
      <div style={{ flex: '0 0 auto', display: 'flex', gap: 8, padding: '10px 16px calc(14px + env(safe-area-inset-bottom))', borderTop: '1px solid ' + LINE, background: '#f7f4ec' }}>
        {busy ? <div style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 800, padding: '13px 0' }}>{busy}</div> : confirm ? <>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 800, padding: '13px 0', color: '#8a8a82' }}>変更点を確認中</div>
        </> : <>
          {hasDraft && <button onClick={discard} style={{ flex: 1, border: '2px solid ' + LINE, borderRadius: 14, background: '#fff', color: SUB, fontWeight: 800, fontSize: 13, padding: '12px 0', cursor: 'pointer' }}>下書きを捨てる</button>}
          {!hasDraft && hasPrev && <button onClick={revert} style={{ flex: 1, border: '2px solid ' + LINE, borderRadius: 14, background: '#fff', color: SUB, fontWeight: 800, fontSize: 13, padding: '12px 0', cursor: 'pointer' }}>1つ前に戻す</button>}
          <button onClick={() => setConfirm(true)} disabled={!hasDraft || !v.user} style={{ flex: 1.6, border: 'none', borderRadius: 14, background: hasDraft && v.user ? LIME : '#e4e1d8', color: hasDraft && v.user ? LIME_INK : '#a5a39a', fontWeight: 900, fontSize: 14, padding: '12px 0', cursor: hasDraft && v.user ? 'pointer' : 'default' }}>みんなに反映</button>
        </>}
      </div>
      {/* 反映前の確認: 変更点の一覧 → 本当に反映しますか？ */}
      {confirm && (() => {
        const diff = diffIkoi(Ikoi.publishedSnapshot(), data);
        const tag = { edit: '変更', add: '追加', del: '削除', face: '表情', order: '並び順', newface: '新しい表情' };
        const tagColor = { edit: '#5b8fd4', add: '#58a34d', del: '#b4645a', face: '#b07bc4', order: SUB, newface: '#b07bc4' };
        return (
          <div style={{ position: 'absolute', inset: 0, zIndex: 12, background: 'rgba(27,27,24,.45)', display: 'flex', alignItems: 'flex-end' }}>
            <div style={{ width: '100%', maxHeight: '85%', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '22px 22px 0 0' }}>
              <div style={{ fontSize: 15, fontWeight: 900, textAlign: 'center', padding: '16px 16px 8px' }}>変更点（{diff.reduce((n, d) => n + d.ch.length, 0)}件）</div>
              <div className="nos" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 16px' }}>
                {diff.length === 0 && <div style={{ textAlign: 'center', fontSize: 13, color: '#8a8a82', padding: '20px 0' }}>変更はありません</div>}
                {diff.map((d, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: SUB, margin: '0 2px 6px' }}>{d.label}</div>
                    {d.ch.map((c, j) => (
                      <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: '#f7f4ec', borderRadius: 10, padding: '8px 10px', marginBottom: 5, fontSize: 12.5, lineHeight: 1.6 }}>
                        <span style={{ flex: '0 0 auto', fontSize: 10.5, fontWeight: 900, color: '#fff', background: tagColor[c.kind], borderRadius: 6, padding: '1px 6px', marginTop: 2 }}>{tag[c.kind]}</span>
                        <div style={{ flex: 1, minWidth: 0, wordBreak: 'break-all' }}>
                          {c.kind === 'edit' && <><div style={{ color: '#a5a39a', textDecoration: 'line-through' }}>{c.from}</div><div>{c.to}</div></>}
                          {(c.kind === 'add' || c.kind === 'newface') && <div>{c.to}</div>}
                          {c.kind === 'add' && c.face && <div style={{ color: SUB }}>表情：{c.face}</div>}
                          {c.kind === 'del' && <div style={{ color: '#a5a39a', textDecoration: 'line-through' }}>{c.to}</div>}
                          {c.kind === 'face' && <><div>{c.to}</div><div style={{ color: SUB }}>{c.from} → {c.face}</div></>}
                          {c.kind === 'order' && <div>セリフの並び順</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 14, fontWeight: 900, textAlign: 'center', padding: '10px 16px 0' }}>本当に反映しますか？</div>
              <div style={{ display: 'flex', gap: 8, padding: '10px 16px calc(16px + env(safe-area-inset-bottom))' }}>
                <button onClick={() => setConfirm(false)} style={{ flex: 1, border: '2px solid ' + LINE, borderRadius: 14, background: '#fff', color: SUB, fontWeight: 800, fontSize: 14, padding: '12px 0', cursor: 'pointer' }}>やめる</button>
                <button onClick={publish} disabled={!diff.length} style={{ flex: 1.6, border: 'none', borderRadius: 14, background: diff.length ? LIME : '#e4e1d8', color: diff.length ? LIME_INK : '#a5a39a', fontWeight: 900, fontSize: 14, padding: '12px 0', cursor: diff.length ? 'pointer' : 'default' }}>反映する</button>
              </div>
            </div>
          </div>
        );
      })()}
      {/* 表情を選ぶ */}
      {picker != null && (
        <div onClick={() => { setPicker(null); setNewFace(null); }} style={{ position: 'absolute', inset: 0, zIndex: 12, background: 'rgba(27,27,24,.45)', display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxHeight: '75%', overflowY: 'auto', background: '#fff', borderRadius: '22px 22px 0 0', padding: '16px 16px calc(18px + env(safe-area-inset-bottom))' }}>
            {newFace ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <img src={newFace.src} alt="" style={{ width: 140, height: 140, objectFit: 'contain', mixBlendMode: 'multiply', background: '#f7f4ec', borderRadius: 14 }} />
                <input value={newFace.label} onChange={(e) => setNewFace({ ...newFace, label: e.target.value })} placeholder="表情の名前" style={{ width: '100%', height: 42, borderRadius: 10, border: '1.5px solid ' + LINE, fontSize: 15, padding: '0 12px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                  <button onClick={() => setNewFace(null)} style={{ flex: 1, border: '2px solid ' + LINE, borderRadius: 14, background: '#fff', color: SUB, fontWeight: 800, fontSize: 14, padding: '12px 0', cursor: 'pointer' }}>やめる</button>
                  <button onClick={saveNewFace} style={{ flex: 1.6, border: 'none', borderRadius: 14, background: LIME, color: LIME_INK, fontWeight: 900, fontSize: 14, padding: '12px 0', cursor: 'pointer' }}>追加して使う</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {[['', { label: '自動', src: null }], ...Object.entries(data.faces)].map(([k, f]) => {
                  const on = (list[picker] && (list[picker].f || '')) === k;
                  return (
                    <button key={k || 'auto'} onClick={() => { update(a => { const n = { ...a[picker] }; if (k) n.f = k; else delete n.f; a[picker] = n; return a; }); setPicker(null); }}
                      style={{ border: 'none', borderRadius: 12, background: on ? '#eef7cc' : '#f7f4ec', boxShadow: on ? '0 0 0 2px ' + INK : 'none', padding: '6px 2px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, fontFamily: 'inherit' }}>
                      {f.src ? <img src={f.src} alt="" style={{ width: 56, height: 56, objectFit: 'contain', mixBlendMode: 'multiply' }} /> : <span style={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#8a8a82' }}>自動</span>}
                      <span style={{ fontSize: 10, fontWeight: 700, color: SUB }}>{f.label}</span>
                    </button>
                  );
                })}
                <label style={{ borderRadius: 12, border: '1.5px dashed #c9c7bf', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, cursor: 'pointer', minHeight: 80 }}>
                  <span style={ms(26, SUB)}>add_photo_alternate</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: SUB }}>追加</span>
                  <input type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />
                </label>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
