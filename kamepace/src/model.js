/* データモデル: 旧本番（reference/index.html）と同期互換の entries/tasks を正とし、
   時間帯スロットは entries の from 時刻によるバケツ分けの「見え方」。 */
import { ACT_EMOJI, guessAct, slotOfEntry } from './data';

/* ---- date helpers（旧本番と同一） ---- */
export function pad2(n) { return String(n).padStart(2, '0'); }
export function dateToStr(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
export function strToDate(s) { const [y, m, dd] = s.split('-').map(Number); return new Date(y, m - 1, dd); }
export function todayStr() { return dateToStr(new Date()); }
export function shiftDate(s, days) { const d = strToDate(s); d.setDate(d.getDate() + days); return dateToStr(d); }
const MON_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WD_ABBR = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
export function formatDateCaps(s) { const d = strToDate(s); return d.getFullYear() + ' · ' + MON_ABBR[d.getMonth()] + ' ' + d.getDate() + ' · ' + WD_ABBR[d.getDay()]; }
export function formatDateShort(s) { const d = strToDate(s); return MON_ABBR[d.getMonth()] + ' ' + d.getDate() + ' · ' + WD_ABBR[d.getDay()]; }

export function hmToTsOn(dateStr, hm) {
  const d = strToDate(dateStr || todayStr());
  const [h, m] = (hm || '0:0').split(':').map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return d.getTime();
}
export function entryStartTs(e) { return hmToTsOn(e.date, e.from); }
export function entryEndTs(e) { return hmToTsOn(e.date, e.to); }

/* 現時点で「降っているべき」個数（from→to を疲労度ぶんに等分）— 旧本番と同一 */
export function planUnitsDue(e, now) {
  const N = Math.abs(e.delta);
  if (N <= 0) return 0;
  const fromTs = entryStartTs(e), toTs = entryEndTs(e);
  if (now < fromTs) return 0;
  if (toTs <= fromTs) return now >= toTs ? N : 0;
  const interval = (toTs - fromTs) / N;
  return Math.max(0, Math.min(N, Math.floor((now - fromTs) / interval)));
}

/* ---- entry → 表示用 record ---- */
export function entryGlyph(e) { return e.glyph || ACT_EMOJI[e.act] || '✨'; }
export function entryMin(e) {
  if (typeof e.min === 'number') return e.min;
  const d = Math.round((entryEndTs(e) - entryStartTs(e)) / 60000);
  return d > 0 ? d : 0;
}
export function entryToRecord(e) {
  return {
    name: e.title, glyph: entryGlyph(e), min: entryMin(e), fat: e.delta,
    plan: e.plan, after: e.after, planned: e.planned, dropped: e.dropped,
    from: e.from, to: e.to, _new: e._new, slot: slotOfEntry(e),
    // カレンダー取り込みの「枠」（タイトルだけ・行動待ち）
    frame: !!e.needsSetup && !e.delta,
  };
}

/* ---- 保存フォーマット（旧本番 schema 2 互換・親子構造） ----
   users/{uid} を「日にち → entries/tasks」の入れ子で持つ。
   customCats/customPlans/customActions は新アプリの追加フィールド（旧アプリは無視する）。 */
export function serialize(st) {
  const days = {};
  const bucket = (d) => { if (!days[d]) days[d] = { entries: [], tasks: [] }; return days[d]; };
  (st.entries || []).forEach(e => {
    const { date, _new, ...rest } = e;
    bucket(date || todayStr()).entries.push(rest);
  });
  (st.tasks || []).forEach(t => {
    const { date, ...rest } = t;
    bucket(date || todayStr()).tasks.push(rest);
  });
  return {
    schema: 2,
    days,
    collected: st.collected || [],
    collectedSeen: st.collectedSeen || 0,
    templates: st.templates || {},
    sortMode: !!st.sortMode,
    consumed: st.consumed || 0,
    sampleDay: st.sampleDay || null,
    customCats: st.customCats || [],
    customPlans: st.customPlans || [],
    customActions: st.customActions || [],
    prefs: st.prefs || {},
    slotHours: st.slotHours || null,
    hiddenCats: st.hiddenCats || [],
    bodyFatCoef: st.bodyFatCoef || 1,
    mindFatCoef: st.mindFatCoef || 1,
    bodyRecCoef: st.bodyRecCoef || 1,
    mindRecCoef: st.mindRecCoef || 1,
    updatedAt: Date.now(),
  };
}

export function deserialize(data) {
  let loaded = null;
  if (data && data.days && typeof data.days === 'object') {
    const entries = [], tasks = [];
    Object.keys(data.days).forEach(d => {
      const day = data.days[d] || {};
      (day.entries || []).forEach(e => entries.push({ ...e, date: d }));
      (day.tasks || []).forEach(t => tasks.push({ ...t, date: d }));
    });
    loaded = { entries, tasks };
  } else if (data && Array.isArray(data.entries)) {
    // 旧フラット形式 → 新形式へ移行
    loaded = {
      entries: data.entries.map(e => ({ ...e, date: e.date || todayStr() })),
      tasks: Array.isArray(data.tasks) ? data.tasks.map(t => ({ ...t, date: t.date || todayStr() })) : [],
    };
  }
  if (!loaded) return freshState();
  return {
    entries: loaded.entries,
    tasks: loaded.tasks,
    sortMode: !!data.sortMode,
    collected: Array.isArray(data.collected) ? data.collected.map(c => ({ ...c })) : [],
    collectedSeen: typeof data.collectedSeen === 'number' ? data.collectedSeen : 0,
    templates: (data.templates && typeof data.templates === 'object') ? data.templates : {},
    consumed: typeof data.consumed === 'number' ? data.consumed : 0,
    sampleDay: data.sampleDay || null,
    customCats: Array.isArray(data.customCats) ? data.customCats : [],
    customPlans: Array.isArray(data.customPlans) ? data.customPlans : [],
    customActions: Array.isArray(data.customActions) ? data.customActions : [],
    prefs: (data.prefs && typeof data.prefs === 'object') ? data.prefs : {},
    slotHours: (Array.isArray(data.slotHours) && data.slotHours.length === 4) ? data.slotHours : null,
    hiddenCats: Array.isArray(data.hiddenCats) ? data.hiddenCats : [],
    // 体・心それぞれの個人係数。旧1軸フィールド(fatigueCoef/recoverCoef)からの移行も受ける
    bodyFatCoef: typeof data.bodyFatCoef === 'number' ? data.bodyFatCoef : (typeof data.fatigueCoef === 'number' ? data.fatigueCoef : 1),
    mindFatCoef: typeof data.mindFatCoef === 'number' ? data.mindFatCoef : (typeof data.fatigueCoef === 'number' ? data.fatigueCoef : 1),
    bodyRecCoef: typeof data.bodyRecCoef === 'number' ? data.bodyRecCoef : (typeof data.recoverCoef === 'number' ? data.recoverCoef : 1),
    mindRecCoef: typeof data.mindRecCoef === 'number' ? data.mindRecCoef : (typeof data.recoverCoef === 'number' ? data.recoverCoef : 1),
  };
}

export function freshState() {
  return {
    entries: [], tasks: [], sortMode: false,
    collected: [], collectedSeen: 0, templates: {}, consumed: 0, sampleDay: null,
    customCats: [], customPlans: [], customActions: [], prefs: {},
    slotHours: null, hiddenCats: [],
    bodyFatCoef: 1, mindFatCoef: 1, bodyRecCoef: 1, mindRecCoef: 1,
  };
}

export function sortEntries(entries) {
  return [...entries].sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.from || '').localeCompare(b.from || ''));
}

/* ---- templates（あすけん方式: 同じ予定は同じ疲労度）---- */
export function normTitle(t) { return (t || '').trim().replace(/\s+/g, ' ').toLowerCase(); }
export function getTemplate(templates, title) { const k = normTitle(title); return (templates && templates[k]) || null; }

/* 新規 entry の共通フィールド（旧アプリ互換: act/mood/exp を必ず持たせる） */
export function baseEntry(title, delta, date) {
  return { title, act: guessAct(title), mood: '🙂', delta, exp: false, date: date || todayStr() };
}
