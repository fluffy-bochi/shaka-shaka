/* かめペース 本番アプリ
   UI/挙動: かめペース プロトタイプ.dc.html の Component クラスを1:1移植。
   データ: 旧本番(reference/index.html)互換の entries/tasks を正とし、
   時間帯スロット(朝/午前/午後/夜)は from 時刻のバケツ分けによる「見え方」(CLAUDE.md §G)。 */
import React from 'react';
import Matter from 'matter-js';
import {
  SLOTS, CATS, PLANS, SEARCH_DB, KW_PLACEHOLDERS, ACT_EMOJI, EMOJI_ACT, BUFFS, MOODS, MOOD_STRENGTHS,
  CAT_ICON_CHOICES, CAT_COLOR_CHOICES, COMPARE_STEPS,
  guessAct, slotOfEntry, slotForNow, IMPORT_DEFAULT_DELTA, DEFAULT_SLOT_HOURS,
} from './data';
import {
  todayStr, shiftDate, strToDate, formatDateCaps, formatDateShort, pad2, hmToTsOn,
  entryToRecord, entryGlyph, entryMin, planUnitsDue, entryEndTs,
  serialize, deserialize, freshState, sortEntries, normTitle, getTemplate, baseEntry,
} from './model';
import {
  watchAuth, loginGoogle, loginEmail, signupEmail, logout,
  cloudSave, loadUserData, fetchGoogleData, jpError,
} from './firebase';
import { initShakaSound, attachCollisionSound } from './sound';
import { appendGlyph } from './fluent';
import Home from './screens/Home';
import Record from './screens/Record';
import Sleep from './screens/Sleep';
import Shaka from './screens/Shaka';
import Collect from './screens/Collect';
import MyPage from './screens/MyPage';
import Nav from './screens/Nav';
import Trash from './screens/Trash';
import BuffLog from './screens/BuffLog';
import { SlotTimes, CatsManage, Templates, Sensitivity } from './screens/Settings';
import Help from './screens/Help';
import Tutorial from './screens/Tutorial';
import Onboard from './screens/Onboard';
import Cycle from './screens/Cycle';
import Bookshelf from './screens/Bookshelf';

export default class App extends React.Component {
  state = {
    screen: 'shaka',
    /* ---- 同期されるデータ（旧本番互換） ---- */
    ...freshState(),
    /* ---- UIステート ---- */
    slotId: null,
    catId: null,
    cart: {},
    degreeItem: null,
    degreeIdx: 1,
    residual: 0,
    dayOffset: 0,
    homeDate: todayStr(), // ホームで閲覧中の日付
    toast: null,
    sleepAnim: false,
    moons: [],
    catAddOpen: false,
    newCatName: '',
    newCatIcon: 'category',
    newCatGlyph: '⭐',
    /* 行動をつくる（コピー式） */
    actAddOpen: false,
    actSrcId: null,
    actName: '',
    actGlyph: 'std',
    actBodyIdx: 2,
    actMindIdx: 2,
    planDetailId: null,
    planAddOpen: false,
    newPlanName: '',
    newPlanTasks: [],
    planSync: true,
    searchStep: null,
    keywords: [''],
    searchCart: [],
    resolvedIdx: [],
    moreKw: null,
    moreFilter: 0,
    intensityId: null,
    searchTotalMin: 30,
    searchFracs: [],
    confirmOrigin: 'search',
    confirmMode: 'duration',
    startTime: '',
    endTime: '',
    homeMotion: (() => { try { return localStorage.getItem('shaka_home_motion') === '1'; } catch (e) { return false; } })(),
    slotMenuOpen: false,
    /* ---- auth ---- */
    /* ---- 記録の編集（確認画面フローで置き換える対象の entries インデックス） ---- */
    editIdxs: null,
    /* ヘルプで表示中のペルソナ */
    helpPersona: 0,
    /* オンボーディング（1..9） */
    obStep: 1,
    obSel: {},
    /* 月経周期 設定フォーム（オンボ・マイページ共用） */
    cycForm: null,
    /* テンプレにまとめる */
    tplOpen: false,
    tplName: '',
    /* きもち・できごと（時間なしの心イベント） */
    moodOpen: false,
    moodId: null,
    moodStrength: 'b',
    moodNote: '',
    /* いまの調子（バフ・デバフ）シート */
    buffOpen: false,
    buffCheckOpen: false,
    symAdjust: null,
    buffCfgId: null,
    buffCfgTitle: '',
    buffCfgKey: 'none',
    /* 検索で見つからない→新しくつくる */
    newActOpen: false,
    newActKwIndex: null,
    newActName: '',
    newActCatId: null,
    newActGlyph: 'std',
    /* 操作チュートリアル（0=オフ、1〜12=ステップ）。実データは退避して終了時に復元 */
    tutorial: 0,
    tutFlags: {},
    /* カレンダー枠に行動を入れているとき、その枠のタイトル（テンプレ保存キー） */
    framePlan: null,
    user: null,
    authOpen: false,
    authEmail: '',
    authPass: '',
    authErr: '',
    authBusy: false,
    booted: false,
  };

  set(patch) { this.setState(patch); }

  /* ================= persistence / auth ================= */
  dataState() {
    const s = this.state;
    return {
      entries: s.entries, tasks: s.tasks, collected: s.collected, collectedSeen: s.collectedSeen,
      templates: s.templates, sortMode: s.sortMode, consumed: s.consumed, sampleDay: s.sampleDay,
      customCats: s.customCats, customPlans: s.customPlans, customActions: s.customActions,
      customItems: s.customItems,
      prefs: s.prefs, slotHours: s.slotHours, hiddenCats: s.hiddenCats,
      onboardDone: s.onboardDone, profile: s.profile, lastMins: s.lastMins, activeBuffs: s.activeBuffs, buffLog: s.buffLog, cycle: s.cycle, lastBuffCheck: s.lastBuffCheck, mainScreen: s.mainScreen,
      bodyFatCoef: s.bodyFatCoef, mindFatCoef: s.mindFatCoef,
      bodyRecCoef: s.bodyRecCoef, mindRecCoef: s.mindRecCoef,
      bookFav: s.bookFav, bookDiary: s.bookDiary,
    };
  }
  save() {
    if (this.state.tutorial) return; // チュートリアル中はサンプルデータを保存しない
    // set() 直後に呼ばれるため、反映後の state で保存する
    setTimeout(() => {
      const data = this.dataState();
      if (this.state.user) cloudSave(data);
      else { try { localStorage.setItem('shaka_guest', JSON.stringify(serialize(data))); } catch (e) { /* ignore */ } }
    }, 0);
  }
  /* ゲスト用サンプル: 大学生の1日。毎日その日の日付で作り直す（いつ開いても同じ1日が見える） */
  guestSamples() {
    const t = todayStr();
    const S = (from, to, title, glyph, min, delta, slot) => ({
      from, to, title, act: guessAct(title), mood: '🙂', delta, exp: false,
      date: t, glyph, min, slot, sample: true,
    });
    return [
      S('07:40', '08:10', '通学（電車バス）', '🚃', 30, 5, 'asa'),
      S('09:00', '10:30', '講義（聞く中心）', '📖', 90, 11, 'am'),
      S('10:40', '11:40', '自習', '📚', 60, 9, 'am'),
      S('13:00', '14:00', 'レポート・課題', '📝', 60, 9, 'pm'),
      S('14:10', '15:10', 'グループワーク', '👥', 60, 10, 'pm'),
      S('17:30', '20:30', 'バイト接客', '🙋', 180, 39, 'yoru'),
      S('21:00', '21:30', '帰宅（電車バス）', '🚃', 30, 5, 'yoru'),
      S('21:40', '22:40', 'ゲーム', '🎮', 60, -7, 'yoru'),
    ];
  }
  /* 日付が変わっていたらサンプルを今日ぶんに作り直す（当日中の編集は保持＝旧本番と同じ） */
  refreshGuestSamples(data) {
    const t = todayStr();
    if (data.sampleDay === t) return { data, changed: false };
    const removed = (data.entries || []).filter(e => e.sample);
    const kept = (data.entries || []).filter(e => !e.sample);
    // 消えるサンプルの正の疲労ぶんは consumed からも引く（翌日のサンプルが埋もれないように）
    const removedPos = removed.reduce((a, e) => a + (e.delta > 0 && !e.exp ? (e.planned ? (e.dropped || 0) : e.delta) : 0), 0);
    return {
      data: {
        ...data,
        entries: sortEntries([...kept, ...this.guestSamples()]),
        consumed: Math.max(0, (data.consumed || 0) - removedPos),
        sampleDay: t,
      },
      changed: true,
    };
  }
  loadGuest() {
    let g = null;
    try { const s = localStorage.getItem('shaka_guest'); if (s) g = JSON.parse(s); } catch (e) { /* ignore */ }
    const { data, changed } = this.refreshGuestSamples(deserialize(g));
    this.set({ ...data, booted: true, screen: data.mainScreen || 'shaka' });
    if (changed) { this._pileLayout = null; this.save(); }
    setTimeout(() => this.advancePlans(), 0); // アプリを閉じている間に進んだ予定をキャッチアップ
    setTimeout(() => this.sweepExpiredBuffs(), 0);
    // 初回はオンボーディング（9問）→ 記録のないゲストはそのあとチュートリアル。
    // ログアウトで戻ってきた同一セッションでは出さない（起動時の1回だけ判定）
    if (!this._autoTutChecked) {
      this._autoTutChecked = true;
      const hasData = (data.entries || []).some(e => !e.sample)
        || (data.collected && data.collected.length > 0);
      if (!data.onboardDone) {
        this._tutorialAfterOnboard = !hasData;
        setTimeout(() => { if (!this.state.user) this.set({ screen: 'onboard', obStep: 1, obSel: {} }); }, 200);
      } else if (!hasData) {
        setTimeout(() => { if (!this.state.tutorial && !this.state.user) this.startTutorial(); }, 400);
      }
    }
  }
  async loadCloud() {
    try {
      const data = await loadUserData();
      // オンボ判定は「読み込んだデータ」で行う（this.set は非同期で this.state に即反映されないため）
      let onboardDone;
      if (data) {
        const dd = deserialize(data);
        this.set({ ...dd, booted: true, screen: dd.mainScreen || 'shaka' });
        onboardDone = dd.onboardDone;
      } else {
        // 新規ユーザー（初めての登録）: ゲストデータがあれば引き継いで保存
        this.set({ booted: true });
        this.save();
        onboardDone = this.state.onboardDone; // ゲスト時に済ませていれば true
      }
      setTimeout(() => this.advancePlans(), 0);
      // 既にオンボ済みのログインユーザーには出さない。初回（未オンボ）だけ出す
      if (!onboardDone) setTimeout(() => this.set({ screen: 'onboard', obStep: 1, obSel: {} }), 200);
    } catch (err) {
      console.warn('[kamepace] load failed', err);
      this.set({ booted: true });
    }
  }

  /* ================= derived: entries → slots ================= */
  homeDateStr() { return this.state.homeDate || todayStr(); }
  todayEntries() { const t = this.homeDateStr(); return sortEntries(this.state.entries).filter(e => e.date === t && !e.exp); }
  slotRecords() {
    const out = { asa: [], am: [], pm: [], yoru: [] };
    const t = this.homeDateStr();
    // 編集用に state.entries 内のインデックスを添えて、from 順で各スロットへ
    const rows = this.state.entries
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => e.date === t && !e.exp)
      .sort((a, b) => (a.e.from || '').localeCompare(b.e.from || ''));
    rows.forEach(({ e, i }) => {
      const sid = this.slotOf(e);
      const r = entryToRecord(e);
      r._i = i;
      (out[sid] || out.yoru).push(r);
    });
    return out;
  }
  /* 枠のじかん（マイページで変更可・同期） */
  slotHoursArr() {
    const h = this.state.slotHours;
    return (Array.isArray(h) && h.length === 4) ? h : DEFAULT_SLOT_HOURS;
  }
  slotDefs() {
    const h = this.slotHoursArr();
    return SLOTS.map((s, i) => ({
      ...s,
      fromH: h[i],
      toH: i < 3 ? h[i + 1] : h[0] + 24,
      base: pad2(Math.min(h[i] + 1, 23)) + ':00', // 通常記録の配置基準＝枠開始+1h
    }));
  }
  slotDef(id) { const d = this.slotDefs(); return d.find(s => s.id === id) || d[0]; }
  slotOf(e) { return e.slot || slotOfEntry(e, this.slotHoursArr()); }
  slotNow() { return slotForNow(this.slotHoursArr()); }
  /* スロット基準時刻＋累積分 → "HH:MM"（通常記録の配置。CLAUDE.md §G） */
  slotHm(slot, offsetMin) {
    const [bh, bm] = slot.base.split(':').map(Number);
    let t = bh * 60 + bm + offsetMin; t = ((t % 1440) + 1440) % 1440;
    return pad2(Math.floor(t / 60)) + ':' + pad2(t % 60);
  }
  slotUsedMin(slotId) {
    return this.todayEntries()
      .filter(e => this.slotOf(e) === slotId && !e.planned)
      .reduce((a, e) => a + entryMin(e), 0);
  }
  /* 日付ナビ */
  homePrevDay = () => this.set({ homeDate: shiftDate(this.homeDateStr(), -1) });
  homeNextDay = () => this.set({ homeDate: shiftDate(this.homeDateStr(), 1) });
  setHomeDate = (e) => { const v = e.target.value; if (v) this.set({ homeDate: v }); };
  goToday = () => this.set({ homeDate: todayStr() });
  hmToTs(hm) { const [h, m] = (hm || '0:0').split(':').map(Number); const d = new Date(); d.setHours(h || 0, m || 0, 0, 0); return d.getTime(); }
  tsToHm(ts) { const d = new Date(ts); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
  timeSpanMin() { const s = this.hmToTs(this.state.startTime), t = this.hmToTs(this.state.endTime); const d = Math.round((t - s) / 60000); return d < 1 ? 1 : d; }

  /* ================= categories / plans / search pools ================= */
  allCats() {
    const extra = this.state.customItems || {};
    return [...CATS, ...(this.state.customCats || [])].map(c => (
      extra[c.id] && extra[c.id].length ? { ...c, items: [...c.items, ...extra[c.id]] } : c
    ));
  }
  allItems() {
    const out = [];
    this.allCats().forEach(c => c.items.forEach(it => out.push({ ...it, color: c.color, catId: c.id })));
    return out;
  }
  itemById(id) { return this.allItems().find(t => t.id === id); }
  allPlans() {
    const tplPlans = Object.entries(this.state.templates || {})
      .filter(([, t]) => t && Array.isArray(t.tasks) && t.tasks.length)
      .map(([key, t]) => ({ id: 'tpl:' + key, name: key, tasks: t.tasks }));
    return [...PLANS, ...(this.state.customPlans || []), ...tplPlans];
  }
  planById(id) { return this.allPlans().find(p => p.id === id); }
  planMeta(p) {
    const min = p.tasks.reduce((a, t) => a + (t.min || 0), 0);
    const fat = p.tasks.reduce((a, t) => a + (t.fat || 0), 0);
    return { min, fat, minText: this.fmtMin(min), fatText: (fat >= 0 ? '+' + fat : '' + fat), metaText: p.tasks.length + '件 · ' + this.fmtMin(min) };
  }
  searchPool() { return SEARCH_DB.concat(this.state.customActions || []); }
  /* 前回つかった時間（行動名ごとに学習）。あれば標準所要時間より優先 */
  lastMinOf(name) {
    const m = (this.state.lastMins || {})[normTitle(name)];
    return (typeof m === 'number' && m > 0) ? m : null;
  }
  initialMinOf(item) { return this.lastMinOf(item.name) || item.defMin || 30; }
  searchHits(kw) {
    const q = (kw || '').toLowerCase().trim();
    return this.searchPool().filter(e => e.name.toLowerCase().includes(q) || (e.kw || []).some(t => t.toLowerCase().includes(q) || q.includes(t.toLowerCase())));
  }
  searchDB(kw) { const h = this.searchHits(kw); return h.length ? h : [{ name: kw, glyph: '⭐', fh: 6, kw: [kw] }]; }

  /* ================= 強度チップ（あすけん分量入力相当） ================= */
  /* 強度チップは時間と独立な密度・心理系のみ（「長さ」「量」は時間で表す = v3） */
  intensityQuestions(item) {
    const kw = item.kw || []; const nm = item.name || '';
    const has = (t) => kw.includes(t) || nm.includes(t);
    if (has('通勤') || has('移動') || has('電車') || has('バス') || has('運転') || has('自転車')) {
      return [
        { key: 'crowd', label: '混み具合', opts: ['すいてた', 'ふつう', '混雑'], mult: [0.8, 1, 1.3] },
        { key: 'seat', label: '座れた？', opts: ['座れた', '立ち'], mult: [0.85, 1.15] },
      ];
    }
    if (has('仕事') || has('会議') || has('作業') || has('資料')) {
      return [
        { key: 'stress', label: '気疲れ', opts: ['少ない', 'ふつう', '多い'], mult: [0.85, 1, 1.25] },
      ];
    }
    if (has('育児') || has('子供')) return [{ key: 'mood', label: 'きげん', opts: ['ごきげん', 'ふつう', 'ぐずり'], mult: [0.85, 1, 1.3] }];
    if (has('運動')) return [{ key: 'intensity', label: '強度', opts: ['軽め', 'ふつう', 'ハード'], mult: [0.8, 1, 1.4] }];
    if (item.symptom) return [{ key: 'level', label: 'つらさ', opts: ['軽い', 'ふつう', '強い'], mult: [0.7, 1, 1.4] }];
    return [];
  }
  effFh(item) {
    const qs = this.intensityQuestions(item); let m = 1;
    (item.picks || []).forEach((p, idx) => { if (qs[idx] && qs[idx].mult[p] != null) m *= qs[idx].mult[p]; });
    // 好き嫌い（行動ごとに永続）: 嫌い=疲れやすい×1.3 / 好き=軽減×0.7。回復系は逆（好きな休憩ほどよく回復）
    const pref = (this.state.prefs || {})[normTitle(item.name)];
    if (pref) {
      const mult = item.fh >= 0 ? { dislike: 1.3, like: 0.7 } : { dislike: 0.7, like: 1.3 };
      if (mult[pref]) m *= mult[pref];
    }
    // 体・心の2軸: 行動の（体, 心）固有値に軸別の個人係数×バフ・デバフを掛けて合算
    // 例) 接客(体5, 心8)・心の疲れやすさ×1.2 → 5×1.0 + 8×1.2 = 14.6/h
    const st = this.state;
    const recover = item.fh < 0;
    const bm = this.buffMult();
    const bc = recover ? (st.bodyRecCoef || 1) * bm.bodyRec : (st.bodyFatCoef || 1) * bm.bodyFat;
    const mc = recover ? (st.mindRecCoef || 1) * bm.mindRec : (st.mindFatCoef || 1) * bm.mindFat;
    let base;
    if (typeof item.body === 'number' && typeof item.mind === 'number') {
      base = (item.body * bc + item.mind * mc) * (recover ? -1 : 1);
    } else {
      // 2軸を持たない行動（旧データ・検索の新規登録など）は体・心半々とみなす
      base = item.fh * (bc + mc) / 2;
    }
    return base * m;
  }
  /* ===== 月経周期（cycle: {last, cycleLen, periodLen, preMult:{bodyFat,mindFat}, periodMult:{...}, preDays}） ===== */
  cyclePhase() {
    const c = this.state.cycle;
    if (!c || !c.enabled || !c.last) return null;
    const cycleLen = c.cycleLen || 28;
    const periodLen = c.periodLen || 5;
    const preDays = c.preDays || 4; // 生理前（PMS）とみなす日数
    const start = strToDate(c.last).getTime();
    const now = strToDate(todayStr()).getTime();
    let day = Math.floor((now - start) / 86400000) % cycleLen;
    if (day < 0) day += cycleLen;
    if (day < periodLen) return { phase: 'period', dayInPhase: day + 1 };
    if (day >= cycleLen - preDays) return { phase: 'pre', dayInPhase: day - (cycleLen - preDays) + 1 };
    return { phase: 'normal', dayInPhase: 0 };
  }
  cycleMult() {
    const out = { bodyFat: 1, mindFat: 1, bodyRec: 1, mindRec: 1 };
    const ph = this.cyclePhase();
    if (!ph) return out;
    const c = this.state.cycle;
    const m = ph.phase === 'period' ? (c.periodMult || {}) : ph.phase === 'pre' ? (c.preMult || {}) : {};
    Object.keys(out).forEach(k => { if (m[k]) out[k] *= m[k]; });
    return out;
  }

  /* バフ・デバフ（いまの調子）。要素は {id, title, until(YYYY-MM-DD|null), key}。
     旧形式（idの文字列）も受ける。期限切れは自動で無効 */
  buffEntries() {
    const t = todayStr();
    return (this.state.activeBuffs || [])
      .map(x => (typeof x === 'string' ? { id: x, title: null, until: null, key: 'none' } : x))
      .filter(x => x && x.id && (!x.until || x.until >= t));
  }
  buffMult() {
    const out = { bodyFat: 1, mindFat: 1, bodyRec: 1, mindRec: 1 };
    this.buffEntries().forEach(en => {
      const m = en.mult || (BUFFS.find(x => x.id === en.id) || {}).mult;
      if (m) Object.keys(out).forEach(k => { if (m[k]) out[k] *= m[k]; });
    });
    const cm = this.cycleMult();
    Object.keys(out).forEach(k => { out[k] *= cm[k]; });
    return out;
  }
  BUFF_PERIODS = [
    { key: 'today', label: 'きょうだけ', days: 0 },
    { key: 'd3', label: '3日間', days: 2 },
    { key: 'd7', label: '1週間', days: 6 },
    { key: 'd14', label: '2週間', days: 13 },
    { key: 'none', label: 'ずっと', days: null },
  ];
  toggleBuff = (id) => {
    const cur = this.buffEntries();
    const en = cur.find(x => x.id === id);
    if (en) {
      // オフ = 履歴に確定（endは今日）
      this.set({ activeBuffs: cur.filter(x => x.id !== id), buffLog: this.pushBuffLog(en, todayStr()) });
      this.save();
    } else {
      this.openBuffCfg(id); // ONにするときはタイトル・期間を設定
    }
  };
  /* 履歴へ確定。同じ from/id の既存ログは更新（重複防止） */
  pushBuffLog(en, end) {
    const log = (this.state.buffLog || []).filter(l => !(l.id === en.id && l.from === en.from));
    return [...log, { id: en.id, title: en.title, from: en.from || todayStr(), end, key: en.key }];
  }
  /* 期限切れになったバフを履歴へ移す（起動時に1回） */
  sweepExpiredBuffs() {
    const t = todayStr();
    const raw = (this.state.activeBuffs || []).map(x => (typeof x === 'string' ? { id: x, title: null, until: null, key: 'none' } : x));
    const expired = raw.filter(x => x && x.until && x.until < t);
    if (!expired.length) return;
    let log = this.state.buffLog || [];
    expired.forEach(en => { log = [...log.filter(l => !(l.id === en.id && l.from === en.from)), { id: en.id, title: en.title, from: en.from || en.until, end: en.until, key: en.key }]; });
    this.set({ activeBuffs: raw.filter(x => !(x.until && x.until < t)), buffLog: log });
    this.save();
  }
  openBuffCfg = (id) => {
    const b = BUFFS.find(x => x.id === id);
    const existing = this.buffEntries().find(x => x.id === id);
    this.set({
      buffCfgId: id,
      buffCfgTitle: (existing && existing.title) || (b ? b.name : ''),
      buffCfgKey: (existing && existing.key) || 'none',
    });
  };
  closeBuffCfg = () => this.set({ buffCfgId: null });
  onBuffCfgTitle = (e) => this.set({ buffCfgTitle: e.target.value });
  pickBuffCfgKey = (key) => this.set({ buffCfgKey: key });
  saveBuffCfg = () => {
    const id = this.state.buffCfgId;
    if (!id) return;
    const period = this.BUFF_PERIODS.find(pp => pp.key === this.state.buffCfgKey) || this.BUFF_PERIODS[4];
    const until = period.days == null ? null : shiftDate(todayStr(), period.days);
    const b = BUFFS.find(x => x.id === id);
    const title = (this.state.buffCfgTitle || '').trim() || (b ? b.name : '');
    const prev = this.buffEntries().find(x => x.id === id);
    const entry = { id, title, until, key: period.key, from: (prev && prev.from) || todayStr() };
    const rest = this.buffEntries().filter(x => x.id !== id);
    this.set({ activeBuffs: [...rest, entry], buffCfgId: null });
    this.save();
  };
  /* ===== きもち・できごと ===== */
  openMood = () => this.set({ moodOpen: true, moodId: null, moodStrength: 'b', moodNote: '' });
  closeMood = () => this.set({ moodOpen: false });
  pickMood = (id) => this.set({ moodId: id });
  pickMoodStrength = (key) => this.set({ moodStrength: key });
  onMoodNote = (e) => this.set({ moodNote: e.target.value });
  commitMood = () => {
    const mood = MOODS.find(m => m.id === this.state.moodId);
    if (!mood) return;
    const base = (MOOD_STRENGTHS.find(x => x.key === this.state.moodStrength) || MOOD_STRENGTHS[1]).v;
    const recover = mood.kind === 'good';
    const isBody = mood.axis === 'body'; // あつい・さむい＝体、きもち＝心
    const bm = this.buffMult();
    // 体/心それぞれの個人係数×バフ×周期を掛ける
    const coef = recover
      ? (isBody ? (this.state.bodyRecCoef || 1) * bm.bodyRec : (this.state.mindRecCoef || 1) * bm.mindRec)
      : (isBody ? (this.state.bodyFatCoef || 1) * bm.bodyFat : (this.state.mindFatCoef || 1) * bm.mindFat);
    const val = Math.max(1, Math.round(base * coef));
    const delta = recover ? -val : val;
    const recDate = this.homeDateStr();
    const slotId = this.state.slotId || this.slotNow();
    const slot = this.slotDef(slotId);
    const off = this.slotUsedMin(slotId);
    const note = (this.state.moodNote || '').trim();
    const e = {
      ...baseEntry(note || mood.name, delta, recDate),
      glyph: mood.glyph, min: 0, mood: 'event', event: true, _new: true,
      slot: slotId, from: this.slotHm(slot, off), to: this.slotHm(slot, off),
    };
    const entries = sortEntries([...this.state.entries, e]);
    const immediate = delta > 0;
    this.set({
      entries, moodOpen: false, moodId: null, moodNote: '',
      screen: 'shaka', dayOffset: 0,
      toast: isBody ? 'からだを記録' : (recover ? 'きもちを記録（回復）' : 'きもちを記録'),
    });
    this.save();
    this.stopPhysics();
    if (delta < 0) this._pendingNeg = [...(this._pendingNeg || []), mood.glyph];
    requestAnimationFrame(() => { const el = document.getElementById('shakacase'); if (el) this.startPhysics(el); });
    clearTimeout(this._t); this._t = setTimeout(() => this.set({ toast: null }), 1600);
  };
  openBuffs = () => this.set({ buffOpen: true });
  closeBuffs = () => this.set({ buffOpen: false });

  /* ===== 月経周期の設定フォーム ===== */
  CYC_STEPS = { none: 1.0, slight: 1.1, some: 1.2, much: 1.35 };
  defaultCycForm() {
    const c = this.state.cycle || {};
    return {
      last: c.last || todayStr(),
      cycleLen: c.cycleLen || 28,
      periodLen: c.periodLen || 5,
      preDays: c.preDays || 4,
      preBody: c.preMult ? (c.preMult.bodyFat || 1) : 1.1,
      preMind: c.preMult ? (c.preMult.mindFat || 1) : 1.2,
      periodBody: c.periodMult ? (c.periodMult.bodyFat || 1) : 1.25,
      periodMind: c.periodMult ? (c.periodMult.mindFat || 1) : 1.15,
    };
  }
  openCycle = (fromOnboard) => this.set({ cycForm: this.defaultCycForm(), cycFromOnboard: !!fromOnboard, screen: 'cycle' });
  onCycField = (k, val) => this.set({ cycForm: { ...this.state.cycForm, [k]: val } });
  saveCycle = () => {
    const f = this.state.cycForm || this.defaultCycForm();
    const cycle = {
      enabled: true, last: f.last,
      cycleLen: Math.max(15, Math.min(45, parseInt(f.cycleLen, 10) || 28)),
      periodLen: Math.max(1, Math.min(10, parseInt(f.periodLen, 10) || 5)),
      preDays: Math.max(0, Math.min(10, parseInt(f.preDays, 10) || 4)),
      preMult: { bodyFat: f.preBody, mindFat: f.preMind },
      periodMult: { bodyFat: f.periodBody, mindFat: f.periodMind },
    };
    this.set({ cycle, cycForm: null, screen: this.state.cycFromOnboard ? 'onboard' : 'mypage' });
    this.save();
    if (this.state.cycFromOnboard) { this.set({ obStep: 9 }); }
  };
  cancelCycle = () => this.set({ cycForm: null, screen: this.state.cycFromOnboard ? 'onboard' : 'mypage' });
  disableCycle = () => { this.set({ cycle: { ...(this.state.cycle || {}), enabled: false }, cycForm: null, screen: 'mypage' }); this.save(); };

  setPref = (name, val) => {
    const k = normTitle(name);
    if (!k) return;
    const prefs = { ...(this.state.prefs || {}) };
    if (val === 'normal') delete prefs[k]; else prefs[k] = val;
    this.set({ prefs });
    this.save();
  };
  intensitySummary(item) {
    const qs = this.intensityQuestions(item);
    return (item.picks || []).map((p, idx) => qs[idx] ? qs[idx].opts[p] : '').filter(Boolean).join('・');
  }

  /* ================= 検索フロー ================= */
  remainingKw(resolved) {
    return this.state.keywords.map((k, i) => ({ k: (k || '').trim(), i })).filter(x => x.k && !resolved.includes(x.i));
  }
  searchGroupsData() {
    return this.remainingKw(this.state.resolvedIdx).map(({ k, i }) => { const res = this.searchHits(k); return { i, kw: k, count: res.length, items: res, noHit: res.length === 0 }; });
  }
  openSearch = () => this.set({ searchStep: 'input', keywords: Array(10).fill(''), searchCart: [], resolvedIdx: [], moreKw: null });
  closeSearch = () => this.set({ searchStep: null });
  setKeyword = (i, val) => {
    const k = [...this.state.keywords]; k[i] = val;
    if (i === k.length - 1 && val.trim() && k.length < 10) k.push('');
    this.set({ keywords: k });
  };
  clearKeyword = (i) => { const k = [...this.state.keywords]; if (k.length > 1) k.splice(i, 1); else k[0] = ''; this.set({ keywords: k }); };
  runSearch = () => { if (!this.state.keywords.some(k => (k || '').trim())) return; this.set({ searchStep: 'results', resolvedIdx: [] }); };
  goSearchConfirm = () => { if (this.state.searchCart.length) this.set({ searchStep: 'confirm', confirmOrigin: this.state.confirmOrigin === 'edit' ? 'edit' : 'search' }); };
  setConfirmMode = (mode) => {
    if (mode === 'time' && this.state.confirmMode !== 'time') {
      const now = new Date();
      const startHm = pad2(now.getHours()) + ':' + pad2(now.getMinutes());
      const endHm = this.tsToHm(now.getTime() + (this.state.searchTotalMin || 30) * 60000);
      this.set({ confirmMode: 'time', startTime: startHm, endTime: endHm });
    } else { this.set({ confirmMode: mode }); }
  };
  onStartTime = (e) => this.set({ startTime: e.target.value });
  onEndTime = (e) => this.set({ endTime: e.target.value });
  backFromConfirm = () => {
    if (this.state.confirmOrigin === 'edit') this.set({ searchStep: null, searchCart: [], screen: 'home', editIdxs: null, confirmOrigin: 'search', confirmMode: 'duration', framePlan: null });
    else if (this.state.confirmOrigin === 'search') this.set({ searchStep: 'results' });
    else if (this.state.confirmOrigin === 'cat') this.set({ searchStep: null });
    else this.set({ searchStep: null, searchCart: [], catId: null, cart: {} });
  };
  selectSearchItem = (kwIndex, item) => {
    const picks = this.intensityQuestions(item).map(q => Math.floor(q.opts.length / 2));
    const id = 'sc' + Date.now() + Math.floor(Math.random() * 1000);
    const cart = [...this.state.searchCart, { id, name: item.name, glyph: item.glyph, fh: item.fh, body: item.body, mind: item.mind, defMin: this.initialMinOf(item), kw: item.kw, picks, symId: item.id, symptom: item.symptom, buffLv: item.buffLv }];
    const resolved = kwIndex == null ? this.state.resolvedIdx : [...this.state.resolvedIdx, kwIndex];
    const remaining = this.remainingKw(resolved);
    // 初期時間は各行動の標準所要時間（defaultMin）の合計・配分もその比率（v3）
    const mins = cart.map(c => c.defMin || 30);
    const total = mins.reduce((a, b) => a + b, 0);
    this.set({ searchCart: cart, resolvedIdx: resolved, moreKw: null, searchStep: remaining.length ? 'results' : 'confirm', searchTotalMin: total, searchFracs: mins.map(m => m / total) });
  };
  /* 検索で見つからないとき: タイトル・大カテゴリ・絵文字を選んでつくる */
  addNewAction = (kwIndex, name) => {
    const visible = this.allCats().filter(c => !(this.state.hiddenCats || []).includes(c.id));
    this.set({
      newActOpen: true, newActKwIndex: kwIndex, newActName: name,
      newActCatId: visible[0] ? visible[0].id : null, newActGlyph: 'std',
    });
  };
  closeNewAct = () => this.set({ newActOpen: false });
  onNewActName = (e) => this.set({ newActName: e.target.value });
  pickNewActCat = (id) => this.set({ newActCatId: id });
  pickNewActGlyph = (g) => this.set({ newActGlyph: g });
  createNewAct = () => {
    const cat = this.allCats().find(c => c.id === this.state.newActCatId);
    const name = (this.state.newActName || '').trim();
    if (!cat || !name) { this.set({ newActOpen: false }); return; }
    // 疲労の初期値はそのカテゴリの行動の平均（あとで強度・時間で調整できる）
    const items = cat.items.length ? cat.items : [{ body: 3, mind: 3, fh: 6, defMin: 30 }];
    const avg = (f) => Math.max(1, Math.round(items.reduce((a, t) => a + Math.abs(f(t) || 0), 0) / items.length));
    const body = avg(t => t.body != null ? t.body : Math.abs(t.fh) / 2);
    const mind = avg(t => t.mind != null ? t.mind : Math.abs(t.fh) / 2);
    const recover = (items[0].fh || 0) < 0;
    // 時間は中央値（合宿480分のような外れ値に引っ張られないように）
    const minsSorted = items.map(t => t.defMin || 30).sort((a, b) => a - b);
    const median = minsSorted[Math.floor((minsSorted.length - 1) / 2)];
    const defMin = Math.max(5, Math.round(median / 5) * 5);
    const glyph = this.state.newActGlyph === 'std' ? (cat.glyph || '⭐') : this.state.newActGlyph;
    const fh = (recover ? -1 : 1) * (body + mind);
    const est = Math.max(1, Math.round((body + mind) * defMin / 60));
    const id = 'act' + Date.now();
    const item = {
      id, glyph, icon: cat.icon, name, body, mind, fh, defMin,
      last: `目安 ${recover ? '−' : '+'}${est}（${this.fmtMin(defMin)}）`,
      kw: [cat.name, name],
    };
    const customItems = { ...(this.state.customItems || {}) };
    customItems[cat.id] = [...(customItems[cat.id] || []), item];
    const searchEntry = { name, glyph, fh, body, mind, defMin, kw: item.kw };
    this.set({
      customItems,
      customActions: [...(this.state.customActions || []), searchEntry],
      newActOpen: false,
    });
    this.save();
    this.selectSearchItem(this.state.newActKwIndex, item);
  };
  addRoughAction = (kwIndex, name) => this.selectSearchItem(kwIndex, { name, glyph: '🌀', fh: 6, body: 3, mind: 3, defMin: 30, kw: [name] });
  addTotal = (d) => this.set({ searchTotalMin: Math.max(1, Math.round((this.state.searchTotalMin || 30) + d)) });
  /* キーボード入力: 合計分を直接指定 */
  setTotalMin = (m) => {
    const v = Math.max(1, Math.round(Number(m) || 0) || 1);
    this.set({ searchTotalMin: v });
  };
  /* キーボード入力: 行の分を直接指定（他の行の分は維持し、合計を作り直す） */
  setRowMin = (idx, m) => {
    const items = this.state.searchCart;
    const n = items.length;
    if (!n || idx < 0 || idx >= n) return;
    const fr = (this.state.searchFracs && this.state.searchFracs.length === n) ? this.state.searchFracs : Array(n).fill(1 / n);
    const total = this.state.searchTotalMin || (n * 30);
    const mins = fr.map(f => Math.max(1, Math.round(f * total)));
    mins[idx] = Math.max(1, Math.round(Number(m) || 0) || 1);
    const newTotal = mins.reduce((a, b) => a + b, 0);
    this.set({ searchTotalMin: newTotal, searchFracs: mins.map(x => x / newTotal) });
  };
  onFracDrag = (k) => (e) => {
    if (e.type === 'pointermove' && e.buttons === 0) return;
    const rect = e.currentTarget.parentElement.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const fr = [...(this.state.searchFracs || [])];
    if (k + 1 >= fr.length) return;
    const total = this.state.searchTotalMin || 30;
    const minF = 1 / total;
    let before = 0; for (let j = 0; j < k; j++) before += fr[j];
    const pairSum = fr[k] + fr[k + 1];
    const nk = Math.max(minF, Math.min(pairSum - minF, frac - before));
    fr[k] = nk; fr[k + 1] = pairSum - nk;
    this.set({ searchFracs: fr });
  };
  openMore = (kwIndex, kw) => this.set({ searchStep: 'more', moreKw: { i: kwIndex, kw }, moreFilter: 0 });
  closeMore = () => this.set({ searchStep: 'results' });
  setMoreFilter = (f) => this.set({ moreFilter: f });
  removeSearchItem = (id) => {
    const cart = this.state.searchCart.filter(x => x.id !== id);
    const mins = cart.map(c => c.defMin || 30);
    const total = Math.max(1, mins.reduce((a, b) => a + b, 0));
    this.set({ searchCart: cart, searchTotalMin: total, searchFracs: cart.length ? mins.map(m => m / total) : [] });
  };
  addMoreMenu = () => this.set({ searchStep: 'input', keywords: Array(10).fill(''), resolvedIdx: [] });
  openIntensity = (id) => this.set({ intensityId: id });
  closeIntensity = () => this.set({ intensityId: null });
  setIntensityPick = (qIdx, optIdx) => {
    const cart = this.state.searchCart.map(it => {
      if (it.id !== this.state.intensityId) return it;
      const picks = [...(it.picks || [])]; picks[qIdx] = optIdx; return { ...it, picks };
    });
    this.set({ searchCart: cart });
  };

  /* ================= 記録の確定（統一確認UI → entries へ） ================= */
  commitSearch = () => {
    const items = this.state.searchCart;
    // 編集モード: 元の記録を取り除いたうえで置き換える
    const isEdit = this.state.confirmOrigin === 'edit' && Array.isArray(this.state.editIdxs);
    const editSet = isEdit ? new Set(this.state.editIdxs) : null;
    const baseEntries = editSet ? this.state.entries.filter((_, i) => !editSet.has(i)) : this.state.entries;
    if (!items.length) {
      if (isEdit) this.trashOriginal(); // カートを空にして確定 = ゴミ箱へ
      else this.set({ searchStep: null });
      return;
    }
    const n = items.length;
    const fr = (this.state.searchFracs && this.state.searchFracs.length === n) ? this.state.searchFracs : Array(n).fill(1 / n);
    const timeMode = this.state.confirmMode === 'time';
    const totalMin = timeMode ? this.timeSpanMin() : (this.state.searchTotalMin || (n * 30));
    const mins = fr.map(f => Math.max(1, Math.round(f * totalMin)));
    const d = totalMin - mins.reduce((a, b) => a + b, 0); mins[n - 1] = Math.max(1, mins[n - 1] + d);
    const now = Date.now();
    const slotId = this.state.slotId || this.slotNow();
    const slot = this.slotDef(slotId);
    let cursor = timeMode ? this.hmToTs(this.state.startTime) : null;
    // 記録先＝ホームで見ている日付（過去日のつけ忘れ・未来日の下書きにも対応）。
    // 編集フローは元の記録の日付を維持する
    let recDate = this.homeDateStr();
    if (isEdit && Array.isArray(this.state.editIdxs) && this.state.editIdxs.length) {
      const oe = this.state.entries[this.state.editIdxs[0]];
      if (oe && oe.date) recDate = oe.date;
    }
    const isToday = recDate === todayStr();
    // 通常記録の配置位置: 同スロットの使用済み分（編集中は元の記録を除いて数える）
    let slotOffset = baseEntries
      .filter(e => e.date === recDate && !e.exp && !e.planned && this.slotOf(e) === slotId)
      .reduce((a, e) => a + entryMin(e), 0);
    const newEntries = items.map((t, i) => {
      const fat = Math.round(this.effFh(t) * (mins[i] / 60));
      const e = {
        ...baseEntry(t.name, fat, recDate),
        glyph: t.glyph, min: mins[i], _new: true,
      };
      // 枠に入れているときは枠タイトルでグループ化（既製の予定経由でも枠が勝つ）
      if (this.state.framePlan) e.plan = this.state.framePlan;
      else if (t.plan) e.plan = t.plan;
      if (t.after) e.after = Math.round(t.after * (mins[i] / 60));
      if (timeMode) {
        const fromTs = cursor, toTs = cursor + mins[i] * 60000;
        e.from = this.tsToHm(fromTs); e.to = this.tsToHm(toTs); cursor = toTs;
        // 予定（時間どおりに降る）は今日を見ているときだけ。過去/未来日は即記録
        if (isToday && toTs > now) { e.planned = true; e.dropped = planUnitsDue({ ...e, date: todayStr() }, now); e._new = e.dropped > 0; }
      } else {
        // 通常記録＝選んだ時間帯の基準時刻に配置（CLAUDE.md §G）
        e.slot = slotId;
        e.from = this.slotHm(slot, slotOffset); e.to = this.slotHm(slot, slotOffset + mins[i]);
        slotOffset += mins[i];
      }
      // 体調・症状: あとで自動デバフ＋後続時間帯へ複製するための情報を残す
      if (t.symptom && t.symId) { e.symptom = true; e.symId = t.symId; e.level = (t.picks && t.picks[0] != null) ? t.picks[0] : 1; e.buffLv = t.buffLv; }
      return e;
    });
    // 前回つかった時間を学習（次回の初期値になる）
    const lastMins = { ...(this.state.lastMins || {}) };
    items.forEach((t, i) => { const k = normTitle(t.name); if (k) lastMins[k] = mins[i]; });
    // テンプレは自動保存しない（確認画面の「テンプレにまとめる」ボタンで明示的に保存）
    const framePlan = this.state.framePlan;
    // 編集で症状のつらさ(level)が変わったら、あとでデバフ倍率の確認を出す
    let symLevelChange = null;
    if (isEdit) {
      items.forEach((t) => {
        if (t.symptom && t.symId && t._origLevel != null && t.picks && t.picks[0] != null && t.picks[0] !== t._origLevel) {
          const active = this.buffEntries().find(x => x.id === 'sym:' + t.symId);
          if (active) symLevelChange = { symId: t.symId, name: t.name, level: t.picks[0], buffLv: t.buffLv };
        }
      });
    }
    // 体調・症状を記録したら、自動デバフをオン＋その日の後続時間帯にも同じ症状を入れる
    const sym = this.applySymptomEffects(newEntries, recDate, slotId);
    if (sym.extraEntries.length) newEntries.push(...sym.extraEntries);
    const entries = sortEntries([...baseEntries, ...newEntries]);
    const anyImmediate = newEntries.some(r => !r.planned);
    const toastMsg = isEdit ? 'へんこうしました' : (anyImmediate ? 'きろくしました' : '予定を追加した（時間どおりに記録）');
    // マイナス（回復）の記録は山から引かず、そのぶんの絵文字をシャカで降らせて衝突で消す
    const negGlyphs = [];
    newEntries.forEach(e => {
      if (!e.planned && e.delta < 0) { for (let i = 0; i < -e.delta; i++) negGlyphs.push(e.glyph || entryGlyph(e)); }
    });
    this.set({
      entries, lastMins, screen: anyImmediate ? 'shaka' : 'home', dayOffset: 0, searchStep: null, searchCart: [], keywords: [''], resolvedIdx: [], cart: {}, catId: null, confirmMode: 'duration', editIdxs: null, confirmOrigin: 'search', framePlan: null,
      toast: sym.buffAdded ? '記録＋「' + sym.buffAdded + '」を今の調子に追加' : toastMsg,
      activeBuffs: sym.activeBuffs,
      // 編集で山が縮んだ場合に consumed が超過しないように
      consumed: Math.min(this.state.consumed || 0, this.pilePositiveTotal(entries)),
      // 症状のつらさが変わったら、デバフの強さも合わせるか確認
      symAdjust: symLevelChange,
    });
    this.save();
    if (anyImmediate) {
      this.stopPhysics();
      if (negGlyphs.length) this._pendingNeg = [...(this._pendingNeg || []), ...negGlyphs];
      requestAnimationFrame(() => { const el = document.getElementById('shakacase'); if (el) this.startPhysics(el); });
    }
    clearTimeout(this._t); this._t = setTimeout(() => this.set({ toast: null }), 1800);
  };

  /* 体調・症状の副作用: 自動デバフのオン＋その日の後続時間帯へ同じ症状を複製 */
  applySymptomEffects(newEntries, recDate, slotId) {
    const out = { activeBuffs: this.state.activeBuffs || [], extraEntries: [], buffAdded: null };
    const symEntries = newEntries.filter(e => e.symptom && e.symId);
    if (!symEntries.length) return out;
    let buffs = [...(this.state.activeBuffs || [])];
    const slotIdx = SLOTS.findIndex(x => x.id === slotId);
    const seen = new Set();
    symEntries.forEach(e => {
      if (seen.has(e.symId)) return;
      seen.add(e.symId);
      const lv = e.level != null ? e.level : 1;
      const mult = (e.buffLv && e.buffLv[lv]) || { bodyFat: 1.2, mindFat: 1.15 };
      const id = 'sym:' + e.symId;
      const nm = e.title || e.name;
      // 自動デバフをオン（既にあれば mult/level を更新）
      const norm = buffs.map(x => (typeof x === 'string' ? { id: x } : x));
      const exists = norm.find(x => x.id === id);
      const entry = { id, title: nm, glyph: e.glyph, mult, symptom: true, symId: e.symId, level: lv, from: recDate, until: null, key: 'symptom' };
      buffs = norm.filter(x => x.id !== id).concat(entry);
      if (!exists) out.buffAdded = nm;
      // 後続の時間帯にも同じ症状を自動で入れる（まだその症状が無い時間帯のみ・当日のみ）
      if (slotIdx >= 0 && recDate === todayStr()) {
        for (let k = slotIdx + 1; k < SLOTS.length; k++) {
          const sd = SLOTS[k];
          const has = [...this.state.entries, ...newEntries, ...out.extraEntries]
            .some(x => x.date === recDate && !x.exp && x.symId === e.symId && this.slotOf(x) === sd.id);
          if (has) continue;
          const def = this.slotDefs()[k];
          const min = Math.max(15, Math.round((e.min || 30) * 0.6));
          const fat = Math.max(1, Math.round((e.delta || 4) * 0.6));
          out.extraEntries.push({
            ...baseEntry(nm, fat, recDate),
            glyph: e.glyph, min, slot: sd.id, symptom: true, symId: e.symId, level: lv, buffLv: e.buffLv, autoSym: true,
            from: this.slotHm(def, 0), to: this.slotHm(def, min),
          });
        }
      }
    });
    out.activeBuffs = buffs;
    return out;
  }

  /* ---- テンプレにまとめる（確認画面の明示ボタン。自動では保存しない） ---- */
  openTplSave = () => {
    const first = this.state.searchCart[0];
    this.set({ tplOpen: true, tplName: this.state.framePlan || (first ? first.name : '') });
  };
  closeTpl = () => this.set({ tplOpen: false });
  onTplName = (e) => this.set({ tplName: e.target.value });
  saveTpl = () => {
    const items = this.state.searchCart;
    if (!items.length) { this.set({ tplOpen: false }); return; }
    const name = (this.state.tplName || '').trim() || (this.state.framePlan || items[0].name);
    const k = normTitle(name);
    if (!k) { this.set({ tplOpen: false }); return; }
    const n = items.length;
    const fr = (this.state.searchFracs && this.state.searchFracs.length === n) ? this.state.searchFracs : Array(n).fill(1 / n);
    const timeMode = this.state.confirmMode === 'time';
    const totalMin = timeMode ? this.timeSpanMin() : (this.state.searchTotalMin || (n * 30));
    const mins = fr.map(f => Math.max(1, Math.round(f * totalMin)));
    const d = totalMin - mins.reduce((a, b) => a + b, 0); mins[n - 1] = Math.max(1, mins[n - 1] + d);
    const tasks = items.map((t, i) => ({ name: t.name, glyph: t.glyph, min: mins[i], fat: Math.round(this.effFh(t) * (mins[i] / 60)) }));
    const templates = { ...(this.state.templates || {}) };
    templates[k] = { act: guessAct(name) || '', delta: tasks.reduce((a, t) => a + t.fat, 0), tasks };
    this.set({ templates, tplOpen: false });
    this.save();
    this.toast('「' + name + '」をテンプレにまとめました');
  };

  /* ================= home / pile（疲労は日をまたいで持ち越す） ================= */
  r2(x) { return Math.round(x * 2) / 2; }
  fmtMD(d) { if (!d) return ''; const p = d.split('-'); return parseInt(p[1], 10) + '/' + parseInt(p[2], 10); }
  fmtMin(m) { m = Math.round(m); if (m < 60) return m + '分'; const h = Math.floor(m / 60), r = m % 60; return r ? h + '時間' + r + '分' : h + '時間'; }
  groupRecords(records) {
    const out = []; const planIdx = {};
    records.forEach(r => {
      const target = Math.abs(r.fat);
      const soFar = r.planned ? (r.dropped || 0) : target;
      const signedSoFar = (r.fat >= 0 ? 1 : -1) * soFar;
      const isPlanned = !!r.planned && (r.dropped || 0) < target;
      if (r.plan) {
        if (planIdx[r.plan] == null) { planIdx[r.plan] = out.length; out.push({ glyph: '📋', title: r.plan, _signed: 0, _planned: false, _count: 0, isPlan: true, idxs: [] }); }
        const g = out[planIdx[r.plan]];
        g._signed += signedSoFar; g._count += 1; if (isPlanned) g._planned = true;
        if (r.frame) g._frame = true;
        if (r._i != null) g.idxs.push(r._i);
      } else {
        out.push({
          glyph: r.glyph, title: r.name + (r.after ? ' ⏰' : ''), subText: '', hasSub: false, planned: isPlanned,
          fatText: isPlanned ? ((r.dropped || 0) + '/' + target) : (r.fat >= 0 ? '+' + r.fat : '' + r.fat),
          fatColor: isPlanned ? '#a5a39a' : '#f5994e',
          idx: r._i,
        });
      }
    });
    out.forEach(g => {
      if (!g.isPlan) return;
      if (g._frame && g._count === 1) {
        // 行動待ちの枠（カレンダー取り込み・初回）
        g.isFrame = true; g.subText = 'タップして行動を入れる'; g.hasSub = true;
        g.planned = true; g.fatText = ''; g.fatColor = '#a5a39a';
      } else {
        g.subText = g._count + '件のタスク'; g.hasSub = true; g.planned = g._planned;
        g.fatText = (g._signed >= 0 ? '+' + g._signed : '' + g._signed);
        g.fatColor = g._planned ? '#a5a39a' : '#f5994e';
      }
    });
    return out;
  }

  /* 画面サイズ: 実際のアプリ画面要素を実測（PC表示のスマホ枠にも追従） */
  _screenRef = React.createRef();
  screenW() { const el = this._screenRef.current; return (el && el.clientWidth) || Math.min(480, window.innerWidth || 372); }
  screenH() { const el = this._screenRef.current; return ((el && el.clientHeight) || window.innerHeight || 812) - 104; }
  // 100個で画面全体を埋めるサイズ。100を超えたら縮小して画面に収める（あふれ対策）
  calcR(w, h, count) {
    const area = Math.max(1, w) * Math.max(1, h);
    let r = Math.sqrt(area * 0.6 / (100 * Math.PI));
    const n = count || 100;
    if (n > 100) r *= Math.sqrt(100 / n);
    return Math.max(8, Math.min(r, 60));
  }
  /* 今この画面で積む絵文字の数（シャカ・ホーム・睡眠で共通） */
  pileCount() {
    return (this.state.dayOffset === 0 ? this.pileGlyphs().length : this.currentBag().length);
  }

  /* 積む絵文字（旧本番 createPileBag と同じ考え方）:
     山＝全日付の正の疲労だけ。マイナス（回復）記録は山から直接引かず、
     マイナスの絵文字が降ってプラスにぶつかったぶん（consumed）だけ古い順に減る。 */
  pileSource() {
    const stack = [];
    sortEntries(this.state.entries).forEach(r => {
      if (r.exp) return;
      if (r.delta > 0) {
        const n = r.planned ? (r.dropped || 0) : r.delta;
        for (let i = 0; i < n; i++) stack.push({ g: entryGlyph(r), isNew: !!r._new });
      }
    });
    const consumed = Math.min(this.state.consumed || 0, stack.length);
    return stack.slice(consumed);
  }
  /* 山の正の合計（consumed のキャップ用・旧本番 pilePositiveTotal） */
  pilePositiveTotal(entries) {
    return (entries || this.state.entries).reduce((a, e) => a + (e.delta > 0 && !e.exp ? (e.planned ? (e.dropped || 0) : e.delta) : 0), 0);
  }
  pileGlyphs() { return this.pileSource().map(x => x.g); }
  // old/new を分け、新しく記録した分だけ上から降らせる
  pileGlyphsMarked() {
    const kept = this.pileSource();
    const old = kept.filter(x => !x.isNew), nw = kept.filter(x => x.isNew);
    return [...old, ...nw];
  }
  clearNewFlags() {
    if (!this.state.entries.some(e => e._new)) return;
    const entries = this.state.entries.map(e => e._new ? { ...e, _new: false } : e);
    this.set({ entries });
  }

  /* 積む絵文字の配置（ホーム背景・睡眠画面で共通に使う唯一の生成元）。
     y は画面下端からの高さ（Sleep/Home は bottom:y で配置）。 */
  makePile(seed) {
    const W = this.screenW(), H = this.screenH();
    const count = this.pileCount();
    const r = this.calcR(W, H, count);
    const d = r * 2, font = Math.round(r * 1.6);
    // 振って変わった形が保存されていればそれを背景にも使う（勝手に整列しない）
    let saved = this._pileLayout;
    if (saved && saved.length) {
      // 山が減っていたら（睡眠・ゴミ箱）古い側から間引いて量を合わせる
      const target = this.pileGlyphs().length;
      if (saved.length > target) saved = saved.slice(saved.length - target);
      return saved.slice(0, 160).map(sp => ({
        e: sp.g,
        x: Math.round(sp.x * W - r),
        y: Math.round(H - sp.y * H - r),
        r2: Math.round(((sp.a || 0) * 180) / Math.PI),
        s: font,
      }));
    }
    const glyphs = this.pileGlyphs().slice(-160); // 上限は新しい側を残す
    let s = seed; const rng = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const cols = Math.max(1, Math.floor(W / d)), out = [];
    const n = glyphs.length;
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / cols), col = i % cols;
      const x = Math.round(col * d + (row % 2 ? d / 2 : 0) + (rng() - 0.5) * (d * 0.35));
      out.push({
        e: glyphs[i % glyphs.length],
        x: Math.max(-8, Math.min(W - d + 8, x)),
        y: Math.max(-6, Math.round(row * d * 0.82 + (rng() - 0.5) * (d * 0.25))),
        r2: Math.round((rng() - 0.5) * 54),
        s: font,
      });
    }
    return out;
  }

  cartItems() { return this.allItems().filter(t => this.state.cart[t.id]); }

  /* 過去日のシャカ: その日の entries から絵文字の袋を作る */
  currentBag() {
    if (this.state.dayOffset === 0) return this.pileGlyphs();
    const date = shiftDate(todayStr(), this.state.dayOffset);
    const g = [];
    sortEntries(this.state.entries).filter(e => e.date === date && !e.exp).forEach(r => {
      if (r.delta > 0) { const n = r.planned ? (r.dropped || 0) : r.delta; for (let i = 0; i < n; i++) g.push(entryGlyph(r)); }
    });
    return g;
  }
  rebuildPhysics() {
    this.stopPhysics();
    requestAnimationFrame(() => {
      const el = document.getElementById('shakacase');
      if (el && !this.engine) this.startPhysics(el);
    });
  }
  prevDay = () => { if (this.state.dayOffset <= -3) return; this.set({ dayOffset: this.state.dayOffset - 1 }); this.rebuildPhysics(); };
  nextDay = () => { if (this.state.dayOffset >= 0) return; this.set({ dayOffset: this.state.dayOffset + 1 }); this.rebuildPhysics(); };

  /* ================= navigation ================= */
  goHome = () => this.set({ screen: 'home' });
  goShaka = () => { this.set({ screen: 'shaka' }); requestAnimationFrame(() => { const el = document.getElementById('shakacase'); if (el && !this.engine) this.startPhysics(el); }); };
  goRecordNow = () => this.openRecord(this.slotNow());
  setMainScreen = (v) => { this.set({ mainScreen: v }); this.save(); };
  goMypage = () => this.set({ screen: 'mypage' });
  goBookshelf = () => this.set({ screen: 'bookshelf' });
  setBookFav = (key) => {
    const bookFav = { ...(this.state.bookFav || {}) };
    if (bookFav[key]) delete bookFav[key]; else bookFav[key] = true;
    this.set({ bookFav }); this.save();
  };
  setBookDiary = (key, val) => {
    const bookDiary = { ...(this.state.bookDiary || {}) };
    if (val) bookDiary[key] = val; else delete bookDiary[key];
    this.set({ bookDiary }); this.save();
  };
  goSleep = () => {
    // 翌朝＝睡眠記録のタイミングで、続いている調子（バフ・デバフ）をまだ続いているか確認
    if (this.buffEntries().length && this.state.lastBuffCheck !== todayStr()) {
      this.set({ buffCheckOpen: true });
      return;
    }
    this._enterSleep();
  };
  _enterSleep() {
    this._sleepPile = null;
    const n = this.sleepCount(); // 表示上限(160)を反映した実数
    this.set({ screen: 'sleep', residual: n, buffCheckOpen: false });
  }
  /* 継続確認シート */
  buffCheckKeep = (id) => { /* 維持＝何もしない */ void id; };
  buffCheckEnd = (id) => {
    const en = this.buffEntries().find(x => x.id === id);
    const rest = this.buffEntries().filter(x => x.id !== id);
    this.set({ activeBuffs: rest, buffLog: en ? this.pushBuffLog(en, todayStr()) : this.state.buffLog });
    this.save();
  };
  finishBuffCheck = () => { this.set({ lastBuffCheck: todayStr() }); this.save(); this._enterSleep(); };
  /* 症状のつらさ変更に合わせてデバフ倍率を更新するか */
  applySymAdjust = () => {
    const sa = this.state.symAdjust;
    if (!sa) return;
    const mult = (sa.buffLv && sa.buffLv[sa.level]) || { bodyFat: 1.2, mindFat: 1.15 };
    const buffs = this.buffEntries().map(x => x.id === 'sym:' + sa.symId ? { ...x, mult, level: sa.level } : x);
    this.set({ activeBuffs: buffs, symAdjust: null });
    this.save();
    this.toast('「' + sa.name + '」のデバフも調整しました');
  };
  dismissSymAdjust = () => this.set({ symAdjust: null });
  openRecord(id) { this.set({ slotMenuOpen: false, screen: 'record', slotId: id, catId: null, cart: {}, degreeItem: null, planDetailId: null, planAddOpen: false, searchStep: null, keywords: [''], searchCart: [], resolvedIdx: [], moreKw: null, intensityId: null, editIdxs: null, confirmOrigin: 'search', framePlan: null }); }
  toggleSlotMenu = () => this.set({ slotMenuOpen: !this.state.slotMenuOpen });
  pickSlot = (id) => this.set({ slotId: id, slotMenuOpen: false });
  selectCat = (id) => this.set({ catId: id });
  backToCats = () => this.set({ catId: null });

  /* ================= カテゴリ追加 ================= */
  openCatAdd = () => this.set({ catAddOpen: true, newCatName: '', newCatIcon: 'category', newCatGlyph: '⭐' });
  closeCatAdd = () => this.set({ catAddOpen: false });
  onCatName = (e) => this.set({ newCatName: e.target.value });
  pickCatIcon = (icon) => this.set({ newCatIcon: icon });
  pickCatGlyph = (g) => this.set({ newCatGlyph: g });
  addCat = () => {
    const name = (this.state.newCatName || '').trim() || '新しいカテゴリ';
    const id = 'cust' + Date.now();
    const color = CAT_COLOR_CHOICES[(this.state.customCats || []).length % CAT_COLOR_CHOICES.length];
    const glyph = this.state.newCatGlyph || '⭐';
    const cat = { id, icon: this.state.newCatIcon, color, glyph, name, sub: 'じぶんで追加', items: [
      { id: id + '_a', glyph, icon: this.state.newCatIcon, name, last: '目安 +6/h', fh: 6, body: 3, mind: 3 },
    ] };
    this.set({ customCats: [...(this.state.customCats || []), cat], catAddOpen: false, catId: id });
    this.save();
  };

  /* ================= 行動をつくる（コピー式・設計書§2） =================
     コピー元を選ぶ → 「くらべてどう？」（体・心それぞれ5段階）→ 名前・絵文字 → 保存 */
  openActAdd = () => {
    const cat = this.allCats().find(c => c.id === this.state.catId);
    const first = cat && cat.items[0];
    this.set({ actAddOpen: true, actSrcId: first ? first.id : null, actName: '', actGlyph: 'std', actBodyIdx: 2, actMindIdx: 2 });
  };
  closeActAdd = () => this.set({ actAddOpen: false });
  pickActSrc = (id) => this.set({ actSrcId: id });
  onActName = (e) => this.set({ actName: e.target.value });
  pickActGlyph = (g) => this.set({ actGlyph: g });
  /* コピー元×倍率から新しい行動の（体, 心）を計算 */
  actAddCalc() {
    const src = this.state.actSrcId ? this.itemById(this.state.actSrcId) : null;
    if (!src) return null;
    const bm = COMPARE_STEPS[this.state.actBodyIdx].m;
    const mm = COMPARE_STEPS[this.state.actMindIdx].m;
    const sb = typeof src.body === 'number' ? src.body : Math.abs(src.fh) / 2;
    const sm = typeof src.mind === 'number' ? src.mind : Math.abs(src.fh) / 2;
    let body = Math.round(sb * bm);
    let mind = Math.round(sm * mm);
    if (body + mind < 1) { if (sm >= sb) mind = 1; else body = 1; }
    const recover = src.fh < 0;
    return { src, body, mind, fh: (recover ? -1 : 1) * (body + mind), recover };
  }
  addAction = () => {
    const cat = this.allCats().find(c => c.id === this.state.catId);
    const calc = this.actAddCalc();
    if (!cat || !calc) { this.set({ actAddOpen: false }); return; }
    const name = (this.state.actName || '').trim() || (calc.src.name + 'のコピー');
    const glyph = this.state.actGlyph === 'std' ? (cat.glyph || calc.src.glyph || '⭐') : this.state.actGlyph;
    const id = 'act' + Date.now();
    const defMin = calc.src.defMin || 30;
    const est = Math.max(1, Math.round((calc.body + calc.mind) * defMin / 60));
    const item = {
      id, glyph, icon: calc.src.icon, name,
      body: calc.body, mind: calc.mind, fh: calc.fh, defMin,
      last: `目安 ${calc.recover ? '−' : '+'}${est}（${this.fmtMin(defMin)}）`,
      kw: [...(calc.src.kw || []), name],
      copiedFrom: calc.src.id,
    };
    const customItems = { ...(this.state.customItems || {}) };
    customItems[cat.id] = [...(customItems[cat.id] || []), item];
    // 検索からも見つかるように候補プールへ
    const searchEntry = { name, glyph, fh: calc.fh, body: calc.body, mind: calc.mind, defMin, kw: item.kw };
    this.set({
      customItems,
      customActions: [...(this.state.customActions || []), searchEntry],
      actAddOpen: false,
    });
    this.save();
    this.toast('「' + name + '」をつくりました');
  };

  /* ================= 予定 ================= */
  planToConfirm(plan) {
    const totalMin = plan.tasks.reduce((a, t) => a + (t.min || 0), 0) || plan.tasks.length * 30;
    const cart = plan.tasks.map((t, i) => { const fh = t.min ? (t.fat * 60 / t.min) : t.fat; return { id: 'scp' + Date.now() + i, name: t.name, glyph: t.glyph, fh, kw: [plan.name, t.name], picks: [], plan: plan.name }; });
    const fracs = plan.tasks.map(t => (t.min || 30) / totalMin);
    this.set({ screen: 'record', searchStep: 'confirm', searchCart: cart, searchTotalMin: totalMin, searchFracs: fracs, planDetailId: null, planAddOpen: false, confirmOrigin: this.state.confirmOrigin === 'edit' ? 'edit' : 'plan' });
  }
  openPlan = (id) => { const p = this.planById(id); if (p) this.planToConfirm(p); };
  closePlan = () => this.set({ planDetailId: null });
  openPlanAdd = () => this.set({ planAddOpen: true, newPlanName: '', newPlanTasks: [] });
  closePlanAdd = () => this.set({ planAddOpen: false });
  onPlanName = (e) => this.set({ newPlanName: e.target.value });
  togglePlanTask = (id) => {
    const cur = this.state.newPlanTasks || [];
    this.set({ newPlanTasks: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] });
  };
  togglePlanSync = () => this.set({ planSync: !this.state.planSync });
  addPlan = () => {
    const name = (this.state.newPlanName || '').trim() || '新しい予定';
    const picks = (this.state.newPlanTasks || []);
    const tasks = picks.map(id => { const it = this.itemById(id); return { glyph: it.glyph, name: it.name, min: 15, fat: Math.max(1, Math.round(Math.abs(it.fh) * 0.25)) * (it.fh < 0 ? -1 : 1) }; });
    if (!tasks.length) tasks.push({ glyph: '⭐', name, min: 30, fat: 6 });
    const id = 'plan' + Date.now();
    const plan = { id, name, tasks };
    this.set({ customPlans: [...(this.state.customPlans || []), plan], planAddOpen: false });
    this.save();
    this.planToConfirm(plan);
  };

  /* ================= 小カテゴリの選択・程度 ================= */
  tapItem = (item) => {
    if (this.state.cart[item.id]) { const c = { ...this.state.cart }; delete c[item.id]; this.set({ cart: c }); return; }
    if (item.degree) { this.set({ degreeItem: item.id, degreeIdx: 1 }); return; }
    this.set({ cart: { ...this.state.cart, [item.id]: { degIdx: null } } });
  };
  setDegree = (i) => this.set({ degreeIdx: i });
  closeDegree = () => this.set({ degreeItem: null });
  confirmDegree = () => {
    const id = this.state.degreeItem;
    this.set({ cart: { ...this.state.cart, [id]: { degIdx: this.state.degreeIdx } }, degreeItem: null });
  };
  cartFh(item) { const e = this.state.cart[item.id]; if (e && e.degIdx != null && item.degFh) return item.degFh[e.degIdx]; return item.fh; }
  goConfirm = () => {
    const items = this.cartItems();
    if (!items.length) return;
    const durOf = (t) => this.initialMinOf(t); // 前回の時間 > 標準所要時間（v3）
    const totalMin = items.reduce((a, t) => a + durOf(t), 0);
    const cart = items.map((t, i) => {
      // 程度（degFh）で fh が変わる場合は体・心も同じ比率でスケール
      const f = this.cartFh(t);
      const ratio = t.fh ? f / t.fh : 1;
      return {
        id: 'scc' + Date.now() + i, name: t.name, glyph: t.glyph, fh: f,
        body: t.body != null ? t.body * ratio : undefined,
        mind: t.mind != null ? t.mind * ratio : undefined,
        defMin: this.initialMinOf(t),
        kw: [...(t.kw || []), t.name], picks: this.intensityQuestions(t).map(q => Math.floor(q.opts.length / 2)),
        after: t.after || 0, symId: t.id, symptom: t.symptom, buffLv: t.buffLv,
      };
    });
    const fracs = items.map(t => durOf(t) / totalMin);
    this.set({ screen: 'record', searchStep: 'confirm', searchCart: cart, searchTotalMin: totalMin, searchFracs: fracs, confirmOrigin: this.state.confirmOrigin === 'edit' ? 'edit' : 'cat' });
  };
  toggleTemplateToast = () => {
    this.set({ toast: 'テンプレに保存しました' });
    clearTimeout(this._t); this._t = setTimeout(() => this.set({ toast: null }), 1600);
  };

  /* ================= 記録の編集 =================
     記録フローと同じ「登録を確認」画面に、元の記録をカートとして積んで入り直す。
     確定時に元の entries を置き換えるので、選び直した絵文字が山にもそのまま反映される。 */
  openEditFlow = (g) => {
    const idxs = g.isPlan ? (g.idxs || []) : (g.idx != null ? [g.idx] : []);
    if (!idxs.length) return;
    const entries = this.state.entries;
    const mins = idxs.map(i => entryMin(entries[i]) || 30);
    const total = mins.reduce((a, b) => a + b, 0) || idxs.length * 30;
    const items = idxs.map((i, k) => {
      const e = entries[i];
      const min = entryMin(e) || 30;
      const fh = min ? (e.delta * 60 / min) : e.delta;
      const it = { id: 'sce' + Date.now() + k, name: e.title, glyph: entryGlyph(e), fh, kw: [e.act, e.title].filter(Boolean), picks: [] };
      if (e.plan) it.plan = e.plan;
      if (e.after) it.after = min ? (e.after * 60 / min) : e.after;
      // 症状: つらさ(level)を強度チップで再編集できるよう引き継ぐ
      if (e.symptom && e.symId) {
        it.symId = e.symId; it.symptom = true; it.buffLv = e.buffLv;
        it.picks = [e.level != null ? e.level : 1];
        it._origLevel = e.level != null ? e.level : 1;
      }
      return it;
    });
    const first = entries[idxs[0]], last = entries[idxs[idxs.length - 1]];
    const anyPlanned = idxs.some(i => !!entries[i].planned);
    this.set({
      screen: 'record', slotId: this.slotOf(first),
      searchStep: 'confirm', confirmOrigin: 'edit', editIdxs: idxs,
      searchCart: items, searchTotalMin: total, searchFracs: mins.map(m => m / total),
      confirmMode: anyPlanned ? 'time' : 'duration',
      startTime: anyPlanned ? (first.from || '') : '',
      endTime: anyPlanned ? (last.to || '') : '',
      catId: null, cart: {}, keywords: [''], resolvedIdx: [], moreKw: null, intensityId: null, slotMenuOpen: false,
    });
  };

  /* ================= ゴミ箱 =================
     完全削除せず exp:true にする（旧本番も exp は疲労計算から除外＝同期互換）。 */
  trashOriginal = () => {
    const idxs = this.state.editIdxs;
    if (!Array.isArray(idxs) || !idxs.length) return;
    const set = new Set(idxs);
    const entries = this.state.entries.map((e, i) => set.has(i) ? { ...e, exp: true, trashedAt: Date.now() } : e);
    this.set({
      entries, searchStep: null, screen: 'home', editIdxs: null, confirmOrigin: 'search',
      confirmMode: 'duration', searchCart: [], framePlan: null,
      consumed: Math.min(this.state.consumed || 0, this.pilePositiveTotal(entries)),
    });
    this.save();
    this.toast('ゴミ箱に移動しました');
  };
  goTrash = () => this.set({ screen: 'trash' });
  goBuffLog = () => this.set({ screen: 'buffLog' });

  /* ================= オンボーディング =================
     初回起動（onboardDone が立っていない）で表示する9問ウィザード。
     職業→カテゴリの初期表示、疲れやすさ4問→個人係数に反映 */
  COEF_BY_LABEL = {
    'とても疲れやすい': 1.2, '疲れやすい': 1.1, 'ふつう': 1.0, '疲れにくい': 0.9, 'とても疲れにくい': 0.8,
    'とても回復しやすい': 1.2, '回復しやすい': 1.1, '回復しにくい': 0.9, 'とても回復しにくい': 0.8,
  };
  OCC_HIDDEN = {
    '学生': ['work', 'house'],
    '会社員（デスクワーク）': ['baito', 'school', 'study', 'club'],
    '立ち仕事・接客': ['baito', 'school', 'study', 'club'],
    '医療・介護': ['baito', 'school', 'study', 'club'],
    '主婦・主夫': ['work', 'baito', 'school', 'study', 'club'],
    'その他': [],
  };
  obPick = (k, val) => {
    const obSel = { ...this.state.obSel, [k]: val };
    this.set({ obSel });
    // 選択したら少し待って自動で次へ（あすけん式）
    clearTimeout(this._obT);
    this._obT = setTimeout(() => { if (this.state.obStep < 9) this.set({ obStep: this.state.obStep + 1 }); }, 260);
  };
  obNext = () => { if (this.state.obStep < 9) this.set({ obStep: this.state.obStep + 1 }); };
  obBack = () => { if (this.state.obStep > 1) this.set({ obStep: this.state.obStep - 1 }); };
  skipOnboard = () => this.applyOnboard(true);
  finishOnboard = () => this.applyOnboard(false);
  applyOnboard(skipped) {
    const sel = this.state.obSel || {};
    const coef = (label) => this.COEF_BY_LABEL[label] || 1;
    const patch = {
      onboardDone: true,
      profile: { age: sel.age || null, gender: sel.gender || null, occupation: sel.occupation || null },
      screen: 'home', obStep: 1,
    };
    if (!skipped) {
      patch.bodyFatCoef = coef(sel.bodyFat);
      patch.bodyRecCoef = coef(sel.bodyRec);
      patch.mindFatCoef = coef(sel.mindFat);
      patch.mindRecCoef = coef(sel.mindRec);
      if (sel.occupation && this.OCC_HIDDEN[sel.occupation]) patch.hiddenCats = this.OCC_HIDDEN[sel.occupation];
    }
    this.set(patch);
    this.save();
    // 自分の記録がまだ無いゲストは、続けてチュートリアルへ
    if (this._tutorialAfterOnboard) {
      this._tutorialAfterOnboard = false;
      setTimeout(() => { if (!this.state.tutorial && !this.state.user) this.startTutorial(); }, 450);
    }
  }

  /* ================= 操作チュートリアル =================
     実データを退避 → 学生の1日サンプルで実際のUIを操作して学ぶ → 終了/スキップで復元 */
  startTutorial = () => {
    this.stopPhysics(); // 先に止める（stopPhysics は _pileLayout を上書きするため）
    this._tutBackup = JSON.parse(JSON.stringify(this.dataState()));
    this._tutLayoutBackup = this._pileLayout || null;
    this._pileLayout = null;
    const t = todayStr();
    // 学生サンプル: 午前まで記入済み
    const entries = [
      { from: '07:40', to: '08:10', title: '通学（電車バス）', act: '通勤', mood: '🙂', delta: 5, exp: false, date: t, glyph: '🚃', min: 30, slot: 'asa' },
      { from: '09:00', to: '10:30', title: '講義（聞く中心）', act: '勉強', mood: '🙂', delta: 10, exp: false, date: t, glyph: '📖', min: 90, slot: 'am' },
      { from: '10:40', to: '11:40', title: '自習', act: '勉強', mood: '🙂', delta: 6, exp: false, date: t, glyph: '📚', min: 60, slot: 'am' },
    ];
    this.set({
      ...freshState(), entries,
      tutorial: 1, tutFlags: {},
      screen: 'home', dayOffset: 0, slotId: null, catId: null, cart: {},
      searchStep: null, searchCart: [], keywords: [''], resolvedIdx: [],
      editIdxs: null, confirmOrigin: 'search', framePlan: null, confirmMode: 'duration',
    });
  };
  endTutorial = () => {
    this.stopPhysics(); // 先に止める（stopPhysics は _pileLayout を上書きするため）
    const b = this._tutBackup;
    this._tutBackup = null;
    this._pileLayout = this._tutLayoutBackup || null;
    this._tutLayoutBackup = null;
    this.set({
      ...(b || {}),
      tutorial: 0, tutFlags: {},
      screen: 'home', dayOffset: 0, slotId: null, catId: null, cart: {},
      searchStep: null, searchCart: [], keywords: [''], resolvedIdx: [],
      editIdxs: null, confirmOrigin: 'search', framePlan: null, confirmMode: 'duration',
    });
  };
  /* ステップ移動（入るときの仕込みもここで） */
  gotoTutStep = (n) => {
    const patch = { tutorial: n, tutFlags: {} };
    if (n === 7) {
      // 1日分のサンプルを足してホームへ
      const t = todayStr();
      const evening = [
        { from: '18:00', to: '20:00', title: 'バイト接客', act: '仕事', mood: '🙂', delta: 26, exp: false, date: t, glyph: '🙋', min: 120, slot: 'yoru' },
        { from: '21:00', to: '21:30', title: '帰宅（電車バス）', act: '通勤', mood: '🙂', delta: 5, exp: false, date: t, glyph: '🚃', min: 30, slot: 'yoru' },
      ];
      patch.entries = sortEntries([...this.state.entries, ...evening]);
      patch.screen = 'home';
    }
    if (n === 8) {
      // 翌日に移動: サンプルの日付を昨日にして持ち越しを見せる
      const y = shiftDate(todayStr(), -1);
      patch.entries = this.state.entries.map(e => ({ ...e, date: y, _new: false }));
      patch.screen = 'home';
      this._pileLayout = null;
    }
    if (n === 9) patch.screen = 'home';
    if (n === 10) patch.tutFlags = { res0: this.state.residual };
    this.set(patch);
  };
  tutNext = () => {
    const t = this.state.tutorial;
    if (t >= 12) { this.endTutorial(); return; }
    this.gotoTutStep(t + 1);
  };
  /* 操作の検知（componentDidUpdate から呼ばれる） */
  checkTutorial(prev) {
    const s = this.state;
    const t = s.tutorial;
    if (!t) return;
    switch (t) {
      case 1:
        if (s.screen === 'record' && s.slotId === 'pm') this.gotoTutStep(2);
        break;
      case 2:
        if (s.searchCart.some(it => /課題/.test(it.name))) this.gotoTutStep(3);
        break;
      case 3:
        if (s.searchCart.length >= 4) this.gotoTutStep(4);
        break;
      case 4: {
        if (s.screen === 'shaka') { this.gotoTutStep(6); break; } // 先に保存した
        const f = { ...s.tutFlags };
        let changed = false;
        const picks = (c) => JSON.stringify((c || []).map(i => i.picks));
        if (!f.int && picks(prev.searchCart) !== picks(s.searchCart)) { f.int = true; changed = true; }
        if (!f.time && (prev.searchTotalMin !== s.searchTotalMin || prev.searchFracs !== s.searchFracs)) { f.time = true; changed = true; }
        if (f.int && f.time) { this.gotoTutStep(5); break; }
        if (changed) this.set({ tutFlags: f });
        break;
      }
      case 5:
        if (s.screen === 'shaka') this.gotoTutStep(6);
        break;
      case 6:
        // 🔀を押したら shake() が tutFlags.shaken を立てる → カードに「次へ」が出る
        break;
      case 9:
        if (s.screen === 'sleep') this.gotoTutStep(10);
        break;
      case 10:
        if (s.tutFlags.res0 != null && s.residual !== s.tutFlags.res0) this.gotoTutStep(11);
        break;
      case 11:
        if (!s.tutFlags.slept && prev.screen === 'sleep' && s.screen !== 'sleep') this.set({ tutFlags: { ...s.tutFlags, slept: true } });
        break;
      default:
        break;
    }
  }

  /* ================= マイページの設定サブ画面 ================= */
  goSlotTimes = () => this.set({ screen: 'slotTimes' });
  goHelp = () => this.set({ screen: 'help' });
  setHelpPersona = (i) => this.set({ helpPersona: i });
  goCatsManage = () => this.set({ screen: 'catsManage' });
  goTemplates = () => this.set({ screen: 'templates' });
  goSensitivity = () => this.set({ screen: 'sensitivity' });
  /* 枠の開始時刻を±1h（前後の枠と最低1時間の間隔を保つ） */
  adjustSlotHour = (i, d) => {
    const h = [...this.slotHoursArr()];
    const nv = h[i] + d;
    const min = i === 0 ? 0 : h[i - 1] + 1;
    const max = i === 3 ? 23 : h[i + 1] - 1;
    if (nv < min || nv > max) return;
    h[i] = nv;
    this.set({ slotHours: h });
    this.save();
  };
  toggleCatHidden = (id) => {
    const cur = this.state.hiddenCats || [];
    this.set({ hiddenCats: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] });
    this.save();
  };
  deleteCustomCat = (id) => {
    const customItems = { ...(this.state.customItems || {}) };
    delete customItems[id];
    this.set({ customCats: (this.state.customCats || []).filter(c => c.id !== id), customItems });
    this.save();
    this.toast('カテゴリを削除しました');
  };
  deleteTemplate = (key) => {
    const templates = { ...(this.state.templates || {}) };
    delete templates[key];
    this.set({ templates });
    this.save();
    this.toast('テンプレを削除しました');
  };
  setAxisCoef = (key, v) => { this.set({ [key]: v }); this.save(); };
  restoreTrash = (idx) => {
    const entries = this.state.entries.map((e, i) => i === idx ? { ...e, exp: false, trashedAt: null } : e);
    this.set({ entries });
    this.save();
    this.toast('もどしました');
  };
  purgeTrash = (idx) => {
    const entries = this.state.entries.filter((_, i) => i !== idx);
    this.set({ entries, consumed: Math.min(this.state.consumed || 0, this.pilePositiveTotal(entries)) });
    this.save();
    this.toast('完全に削除しました');
  };

  /* カレンダー枠に行動を入れる: 記録フローの入口から選ばせ、確定時に枠を置き換えてテンプレ保存 */
  openFrameFill = (g) => {
    const idx = g.idxs && g.idxs[0];
    const e = idx != null ? this.state.entries[idx] : null;
    if (!e) return;
    this.set({
      screen: 'record', slotId: this.slotOf(e),
      searchStep: null, catId: null, cart: {},
      confirmOrigin: 'edit', editIdxs: [idx], framePlan: e.plan || e.title,
      confirmMode: 'time', startTime: e.from || '', endTime: e.to || '',
      keywords: [''], searchCart: [], resolvedIdx: [], moreKw: null, intensityId: null,
      slotMenuOpen: false, degreeItem: null, planDetailId: null, planAddOpen: false,
    });
  };

  /* ================= 睡眠（回復は consumed に積む＝日をまたいで持ち越し） ================= */
  onSleepDrag = (e) => {
    if (this.state.sleepAnim) return;
    if (e.type === 'pointermove' && e.buttons === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const N = this.sleepCount();
    const frac = 1 - (e.clientY - rect.top) / rect.height;
    const r = Math.max(0, Math.min(N, Math.round(frac * N)));
    this.set({ residual: r });
  };
  /* 睡眠画面の山＝ホーム/シャカと完全に同じ配置（makePile）。
     下から積まれた順（y昇順）に rank を振り、残量ぶんを下から残す演出に使う。 */
  makeSleepPile() {
    if (this._sleepPile) return this._sleepPile;
    const pile = this.makePile(7).map(p => ({ ...p }));
    // y は下端からの高さ。小さい＝下＝先に積まれた
    const order = pile.map((p, i) => ({ i, y: p.y })).sort((a, b) => a.y - b.y);
    order.forEach((o, rank) => { pile[o.i].rank = rank; });
    this._sleepPile = pile;
    this._sleepN = pile.length;
    this._sleepYByRank = order.map(o => o.y); // rank→y（ライン位置に使う）
    this._sleepFont = pile[0] ? pile[0].s : 40;
    return pile;
  }
  sleepCount() { this.makeSleepPile(); return this._sleepN; }
  finishSleep = () => {
    const recovered = Math.max(0, this.sleepCount() - this.state.residual);
    if (recovered <= 0) { this.set({ screen: 'home' }); return; }
    // 他の回復と同じ: 🌙をシャカに降らせて、プラスの絵文字に触れたぶんだけ消す
    // （consumed・ためた回復への加算は衝突時に行われる）。多いときは複数回に分けて降らす
    this._pendingNeg = [...(this._pendingNeg || []), ...Array.from({ length: Math.min(recovered, 160) }, () => '🌙')];
    this.set({ screen: 'shaka', dayOffset: 0 });
    this.stopPhysics();
    requestAnimationFrame(() => { const el = document.getElementById('shakacase'); if (el) this.startPhysics(el); });
  };

  /* ================= 予定の時間進行（旧本番と統一） ================= */
  advancePlans() {
    const now = Date.now(); let changed = false; const drops = []; const negDrops = [];
    const entries = this.state.entries.map(e => {
      if (!e.planned || e.exp) return e;
      const N = Math.abs(e.delta); const due = planUnitsDue(e, now); let ne = e;
      // シャカ画面以外で進んだ分も、次のシャカ表示で降るように _new を立てる
      if (due > (e.dropped || 0)) {
        const add = due - (e.dropped || 0);
        if (e.delta > 0) { for (let i = 0; i < add; i++) drops.push(entryGlyph(e)); }
        else { for (let i = 0; i < add; i++) negDrops.push(entryGlyph(e)); }
        ne = { ...e, dropped: due, _new: true }; changed = true;
      }
      if ((ne.dropped || 0) >= N) { ne = { ...ne, planned: false, dropped: N }; changed = true; }
      return ne;
    });
    if (changed) {
      this.set({ entries });
      this.save();
      if (this.state.screen === 'shaka' && drops.length) this.addFallingBodies(drops);
      if (negDrops.length) this.dropNegativeBodies(negDrops); // シャカ以外なら保留→次のシャカ表示で降る
    }
  }

  /* ================= matter.js physics ================= */
  PR = 18;
  /* スイカゲーム風の「硬い」物理: 跳ねない・よく噛む・沈まない */
  BODY_OPTS = { restitution: 0.12, friction: 0.4, frictionStatic: 0.6, frictionAir: 0.012, density: 0.01, slop: 0.01, sleepThreshold: 30 };
  _tuneEngine(engine) {
    engine.positionIterations = 16; // めり込み解消の反復を増やす（沈み防止の要）
    engine.velocityIterations = 10;
    // 静止した絵文字は完全にスリープさせ、山の圧縮クリープ（じわじわ沈む）を止める
    engine.enableSleeping = true;
  }
  componentDidMount() {
    initShakaSound();
    // 前回の山の散らばり（振って変わった形）を復元
    try {
      const s = localStorage.getItem('shaka_pile_layout');
      if (s) this._pileLayout = JSON.parse(s);
    } catch (e) { /* ignore */ }
    // 旧本番と同じ外部フック（デバッグ・検証用）
    window.__importEvents = (items) => this.importEvents(items);
    this._unwatch = watchAuth((user) => {
      this.set({ user, authOpen: false, authPass: '' });
      if (user) this.loadCloud(); else this.loadGuest();
    });
    this._tick = setInterval(() => {
      const shakaEl = document.getElementById('shakacase');
      const collectStack = document.getElementById('collectstack');
      const collectScroll = document.getElementById('collectscroll');
      if (this.state.screen === 'shaka') {
        if (shakaEl && !this.engine) this.startPhysics(shakaEl);
        if (this.collectEngine) this.stopCollectPhysics();
      } else if (this.state.screen === 'collect') {
        if (collectStack && collectScroll && !this.collectEngine) this.startCollectPhysics(collectStack, collectScroll);
        if (this.engine) this.stopPhysics();
      } else {
        if (this.engine) this.stopPhysics();
        if (this.collectEngine) this.stopCollectPhysics();
      }
    }, 160);
    this._planT = setInterval(() => this.advancePlans(), 1000);
    // シャカ画面のロック画面風時計（旧本番 tickClock 相当）
    this._clockT = setInterval(() => {
      const hm = this.tsToHm(Date.now());
      if (hm !== this.state.clockHm) this.set({ clockHm: hm });
    }, 1000);
    this.set({ clockHm: this.tsToHm(Date.now()) });
  }
  componentDidUpdate(prevProps, prevState) {
    if (this.state.tutorial) this.checkTutorial(prevState);
  }
  componentWillUnmount() {
    clearInterval(this._tick); clearInterval(this._planT); clearInterval(this._clockT);
    if (this._unwatch) this._unwatch();
    if (this._motionOn) window.removeEventListener('devicemotion', this._onDeviceMotion);
    this.stopPhysics(); this.stopCollectPhysics();
  }

  startPhysics(el) {
    if (!el || this.engine) return;
    const { Engine, World, Bodies, Runner } = Matter;
    const rect = el.getBoundingClientRect();
    const W = rect.width || 350, H = rect.height || 700;
    const r = this.calcR(W, H, this.pileCount()); // ホーム/睡眠と同じ個数基準で縮小
    this.PR = r;
    this.engine = Engine.create();
    this.engine.world.gravity.y = 1.2;
    this._tuneEngine(this.engine);
    attachCollisionSound(this.engine);
    const t = 80;
    World.add(this.engine.world, [
      Bodies.rectangle(W / 2, H + t / 2, W + t * 2, t, { isStatic: true }),
      Bodies.rectangle(-t / 2, H / 2, t, H + t * 2, { isStatic: true }),
      Bodies.rectangle(W + t / 2, H / 2, t, H + t * 2, { isStatic: true }),
    ]);
    this.bodies = [];
    // 表示上限は新しい側（末尾）を残す。画面に収まるのは約100個で、
    // それを超えたぶんは「あふれて」見える（=頑張りすぎの信号）。
    let marks;
    if (this.state.dayOffset === 0) marks = this.pileGlyphsMarked().slice(-160);
    else marks = this.currentBag().slice(-160).map(g => ({ g, isNew: false }));
    const newCount = marks.filter(m => m.isNew).length;
    const oldCount = marks.length - newCount;
    const perRow = Math.max(1, Math.floor(W / (2 * r)));
    // 前回保存した散らばり（振って変わった形）。今日の山のときだけ使う
    let saved = (this.state.dayOffset === 0 && this._pileLayout && this._pileLayout.length) ? this._pileLayout : null;
    // 山が減っていたら古い側から間引いて既存分と揃える
    if (saved && saved.length > oldCount) saved = saved.slice(saved.length - oldCount);
    marks.forEach((m, idx) => {
      const glyph = m.g;
      const isNew = idx >= oldCount;
      let x, y, angle = 0;
      if (isNew) {
        x = r + Math.random() * (W - 2 * r);
        y = -r - Math.random() * (H * 0.6);
      } else if (saved && saved[idx]) {
        // 保存した位置・角度を復元（勝手に整列し直さない）
        x = Math.max(r, Math.min(W - r, saved[idx].x * W));
        y = Math.max(r, Math.min(H - r, saved[idx].y * H));
        angle = saved[idx].a || 0;
      } else {
        const row = Math.floor(idx / perRow), col = idx % perRow;
        x = r + col * (2 * r) + (Math.random() - 0.5) * r * 0.5;
        y = H - r - row * (2 * r * 0.92) + (Math.random() - 0.5) * r * 0.3;
      }
      const body = Bodies.circle(x, y, r, this.BODY_OPTS);
      if (angle) Matter.Body.setAngle(body, angle);
      World.add(this.engine.world, body);
      const d = document.createElement('div');
      d.style.cssText = 'position:absolute;top:0;left:0;display:flex;align-items:center;justify-content:center;will-change:transform;pointer-events:none;filter:drop-shadow(0 4px 5px rgba(27,27,24,.2))';
      d.style.width = d.style.height = (2 * r) + 'px';
      d.style.fontSize = Math.round(r * 1.6) + 'px';
      appendGlyph(d, glyph, Math.round(r * 1.9));
      el.appendChild(d);
      this.bodies.push({ body, el: d, glyph });
    });
    this.negBodies = [];
    this.runner = Runner.create();
    Runner.run(this.runner, this.engine);
    this._running = true;
    if (newCount > 0) { clearTimeout(this._newT); this._newT = setTimeout(() => this.clearNewFlags(), 2600); }
    this._startLoop();
    // 保留中のマイナス絵文字（回復記録・予定の進行分）を降らせる
    if (this._pendingNeg && this._pendingNeg.length) {
      const pend = this._pendingNeg.splice(0);
      this.dropNegativeBodies(pend);
    }
    // 固定モードなら落下が落ち着いてから演算を止める（絵文字は積もったまま静止）
    clearTimeout(this._settleT);
    if (!this.state.homeMotion) this._settleT = setTimeout(() => this._maybeFreeze(), 2000);
  }
  _startLoop() {
    this._phys = true;
    const loop = () => {
      if (!this._phys) return;
      const rr = this.PR;
      this.bodies.forEach(({ body, el }) => {
        el.style.transform = `translate(${body.position.x - rr}px, ${body.position.y - rr}px) rotate(${body.angle}rad)`;
      });
      if (this.negBodies && this.negBodies.length) {
        this.negBodies.forEach(({ body, el, consumed }) => {
          if (!consumed) el.style.transform = `translate(${body.position.x - rr}px, ${body.position.y - rr}px) rotate(${body.angle}rad)`;
        });
        this.checkNegativeCollisions();
      }
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }
  /* 固定モードの停止判定: マイナス絵文字が残っている間・まだ動いている絵文字がある間は止めない
     （振りすぎたとき空中で固まらないように、静止を確認してから凍結する） */
  _maybeFreeze(tries = 0) {
    if (this.state.homeMotion) return;
    if ((this.negBodies || []).some(n => !n.consumed)) {
      this._settleT = setTimeout(() => this._maybeFreeze(), 1000);
      return;
    }
    const moving = (this.bodies || []).some(({ body }) => {
      const vel = body.velocity;
      return (vel.x * vel.x + vel.y * vel.y) > 0.08 || Math.abs(body.angularVelocity) > 0.05;
    });
    // 30秒粘っても静まらない場合はほぼ静止とみなして止める（引っかかり対策）
    if (moving && tries < 50) {
      this._settleT = setTimeout(() => this._maybeFreeze(tries + 1), 600);
      return;
    }
    this.freezeMotion();
  }
  /* 山の散らばりを保存（振って変わった形を維持する）。今日の山のときだけ */
  _savePileLayout() {
    if (this.state.dayOffset !== 0) return;
    if (!this.bodies || !this.bodies.length) return;
    const el = document.getElementById('shakacase');
    const rect = el ? el.getBoundingClientRect() : null;
    const W = (rect && rect.width) || 350, H = (rect && rect.height) || 700;
    const layout = this.bodies.map(({ body, el: d, glyph }) => ({
      g: glyph || d.textContent,
      x: Math.max(0, Math.min(1, body.position.x / W)),
      y: Math.max(0, Math.min(1, body.position.y / H)),
      a: Math.round(body.angle * 100) / 100,
    }));
    this._pileLayout = layout;
    if (!this.state.tutorial) {
      try { localStorage.setItem('shaka_pile_layout', JSON.stringify(layout)); } catch (e) { /* ignore */ }
    }
  }
  freezeMotion() {
    if (!this.runner || !this._running) return;
    this._running = false;
    Matter.Runner.stop(this.runner);
    this._savePileLayout();
  }
  resumeMotion() { if (!this.engine || this._running) return; this._running = true; Matter.Runner.run(this.runner, this.engine); if (!this._phys) this._startLoop(); }
  setMotion = (on) => {
    if (this.state.homeMotion === on) return;
    this.set({ homeMotion: on });
    try { localStorage.setItem('shaka_home_motion', on ? '1' : '0'); } catch (e) { /* ignore */ }
    if (this.state.screen === 'shaka') {
      if (on) { clearTimeout(this._settleT); this.resumeMotion(); }
      else this.freezeMotion();
    }
  };
  addFallingBodies(glyphs) {
    if (!this.engine) return;
    const { World, Bodies } = Matter;
    const el = document.getElementById('shakacase'); if (!el) return;
    const rect = el.getBoundingClientRect(); const W = rect.width || 350, H = rect.height || 700; const r = this.PR;
    this.resumeMotion();
    glyphs.slice(0, 40).forEach(g => {
      const x = r + Math.random() * (W - 2 * r); const y = -r - Math.random() * (H * 0.4);
      const body = Bodies.circle(x, y, r, this.BODY_OPTS);
      World.add(this.engine.world, body);
      const d = document.createElement('div');
      d.style.cssText = 'position:absolute;top:0;left:0;display:flex;align-items:center;justify-content:center;pointer-events:none;filter:drop-shadow(0 4px 5px rgba(27,27,24,.2))';
      d.style.width = d.style.height = (2 * r) + 'px'; d.style.fontSize = Math.round(r * 1.6) + 'px';
      appendGlyph(d, g, Math.round(r * 1.9));
      el.appendChild(d);
      this.bodies.push({ body, el: d, glyph: g });
    });
    clearTimeout(this._settleT);
    if (!this.state.homeMotion) this._settleT = setTimeout(() => this._maybeFreeze(), 2000);
  }
  /* ---- マイナス（回復）絵文字: 降らせて、プラスに触れたら両方消して「ためた回復」へ ---- */
  dropNegativeBodies(glyphs) {
    if (!glyphs || !glyphs.length) return;
    const el = document.getElementById('shakacase');
    if (!this.engine || !el) {
      // シャカ画面が開いていなければ、次に開いたときに降らせる
      this._pendingNeg = [...(this._pendingNeg || []), ...glyphs];
      return;
    }
    const { World, Bodies } = Matter;
    const rect = el.getBoundingClientRect();
    const W = rect.width || 350, H = rect.height || 700, r = this.PR;
    this.resumeMotion();
    glyphs.slice(0, 160).forEach(g => {
      const x = r + Math.random() * (W - 2 * r);
      const y = -r - Math.random() * (H * 0.6);
      const body = Bodies.circle(x, y, r, this.BODY_OPTS);
      body.isNegative = true;
      World.add(this.engine.world, body);
      const d = document.createElement('div');
      d.style.cssText = 'position:absolute;top:0;left:0;display:flex;align-items:center;justify-content:center;will-change:transform;pointer-events:none;filter:drop-shadow(0 4px 5px rgba(27,27,24,.2))';
      d.style.width = d.style.height = (2 * r) + 'px';
      d.style.fontSize = Math.round(r * 1.6) + 'px';
      appendGlyph(d, g, Math.round(r * 1.9));
      el.appendChild(d);
      const neg = { body, el: d, consumed: false, glyph: g };
      this.negBodies.push(neg);
      // 30秒ぶつからなければフェードアウト（旧本番と同じ）
      setTimeout(() => {
        if (neg.consumed) return;
        neg.consumed = true;
        d.style.transition = 'opacity .4s';
        d.style.opacity = '0';
        try { World.remove(this.engine.world, body); } catch (e) { /* engine already gone */ }
        setTimeout(() => d.remove(), 400);
      }, 30000);
    });
    clearTimeout(this._settleT);
    if (!this.state.homeMotion) this._settleT = setTimeout(() => this._maybeFreeze(), 2500);
  }
  /* 距離判定: マイナスがプラスに触れたら両方消して collected へ・consumed を加算（旧本番と同一挙動） */
  checkNegativeCollisions() {
    if (!this.negBodies || !this.negBodies.length || !this.bodies || !this.engine) return;
    const el = document.getElementById('shakacase');
    const r = this.PR, hitDist2 = (r * 2) * (r * 2);
    const collectedAdd = [];
    let hits = 0;
    for (let ni = this.negBodies.length - 1; ni >= 0; ni--) {
      const neg = this.negBodies[ni];
      if (neg.consumed) continue;
      const np = neg.body.position;
      for (let pi = this.bodies.length - 1; pi >= 0; pi--) {
        const pos = this.bodies[pi];
        const dx = np.x - pos.body.position.x, dy = np.y - pos.body.position.y;
        if (dx * dx + dy * dy < hitDist2) {
          const cx = (np.x + pos.body.position.x) / 2, cy = (np.y + pos.body.position.y) / 2;
          Matter.World.remove(this.engine.world, pos.body);
          Matter.World.remove(this.engine.world, neg.body);
          neg.consumed = true;
          this.bodies.splice(pi, 1);
          collectedAdd.push(neg.glyph, pos.glyph || pos.el.textContent); // 使った回復＋消えたプラスの記録
          hits++;
          // パッと消える＋リングのポップエフェクト
          pos.el.style.transition = 'opacity .15s'; pos.el.style.opacity = '0';
          neg.el.style.transition = 'opacity .15s'; neg.el.style.opacity = '0';
          if (el) {
            const fx = document.createElement('div');
            fx.className = 'pop-fx';
            fx.style.left = cx + 'px'; fx.style.top = cy + 'px';
            el.appendChild(fx);
            setTimeout(() => fx.remove(), 450);
          }
          const pe = pos.el, ne = neg.el;
          setTimeout(() => { pe.remove(); ne.remove(); }, 400);
          break;
        }
      }
    }
    this.negBodies = this.negBodies.filter(n => !n.consumed);
    if (hits) {
      const now = Date.now();
      const add = collectedAdd.map(g => ({ act: EMOJI_ACT[g] || '', glyph: g, amount: 1, ts: now }));
      this.set({
        collected: [...this.state.collected, ...add],
        // マイナスで消したぶんを永続化（山を再構築しても戻らないように）
        consumed: Math.min((this.state.consumed || 0) + hits, this.pilePositiveTotal()),
      });
      this.save();
    }
  }
  stopPhysics() {
    if (this.engine) this._savePileLayout(); // 画面を離れるときの形を覚えておく
    this._phys = false; this._running = false; clearTimeout(this._settleT);
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this.runner) Matter.Runner.stop(this.runner);
    if (this.engine) { Matter.World.clear(this.engine.world); Matter.Engine.clear(this.engine); }
    if (this.bodies) this.bodies.forEach(({ el }) => el.remove());
    if (this.negBodies) this.negBodies.forEach(({ el }) => el.remove());
    const caseEl = document.getElementById('shakacase');
    if (caseEl) caseEl.innerHTML = '';
    this.engine = null; this.runner = null; this.bodies = []; this.negBodies = [];
  }
  /* 絵文字に散らばる勢いを与える（k=強さ） */
  shakeImpulse(k) {
    if (!this.bodies || !this.engine) return;
    this.resumeMotion();
    this.bodies.forEach(({ body }) => {
      Matter.Sleeping.set(body, false); // スリープ中でも起こして飛ばす
      Matter.Body.setVelocity(body, { x: (Math.random() - 0.5) * 2 * k, y: -Math.random() * k * 0.9 });
      Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.4);
    });
    clearTimeout(this._settleT);
    if (!this.state.homeMotion) this._settleT = setTimeout(() => this._maybeFreeze(), 2000);
  }
  shake = () => {
    if (!this.bodies) return;
    if (this.state.tutorial === 6 && !this.state.tutFlags.shaken) this.set({ tutFlags: { ...this.state.tutFlags, shaken: true } });
    this.enableMotion(); // 🔀タップ＝ユーザー操作のタイミングでセンサー許可を取る（iOS）
    this.shakeImpulse(16);
  };

  /* ---- スマホの加速度センサーで振る（旧本番 enableMotion/onMotion を移植） ---- */
  enableMotion() {
    if (this._motionOn) return;
    if (typeof DeviceMotionEvent === 'undefined') return; // 非対応端末では何もしない
    const attach = () => {
      window.addEventListener('devicemotion', this._onDeviceMotion);
      this._motionOn = true;
      this.toast('📳 本体を振ってもシャカシャカできます');
    };
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      // iOS はユーザー操作起点で許可が必要
      DeviceMotionEvent.requestPermission()
        .then(r => { if (r === 'granted') attach(); else this.toast('⚠️ 振動検知の許可が必要です'); })
        .catch(() => { /* 拒否・非対応は無視 */ });
    } else {
      attach();
    }
  }
  _onDeviceMotion = (event) => {
    const a = event.acceleration || event.accelerationIncludingGravity;
    if (!a || a.x == null) return;
    const lm = this._lastMotion;
    if (lm && lm.x != null) {
      const d = Math.abs(a.x - lm.x) + Math.abs(a.y - lm.y) + Math.abs(a.z - lm.z);
      const now = performance.now();
      // シャカ画面表示中だけ反応（150msスロットルで暴走防止）
      if (d > 16 && this.state.screen === 'shaka' && (!this._lastSensorShake || now - this._lastSensorShake > 150)) {
        this._lastSensorShake = now;
        if (this.state.tutorial === 6 && !this.state.tutFlags.shaken) this.set({ tutFlags: { ...this.state.tutFlags, shaken: true } });
        this.shakeImpulse(10);
      }
    }
    this._lastMotion = { x: a.x, y: a.y, z: a.z };
  };

  /* ---------- collected (ためた回復) tall scroll world ---------- */
  collectedGlyphs() {
    const g = [];
    (this.state.collected || []).forEach(c => {
      const glyph = c.glyph || ACT_EMOJI[c.act] || '✨';
      for (let i = 0; i < (c.amount || 0); i++) g.push(glyph);
    });
    return g;
  }
  collectedTotal() { return (this.state.collected || []).reduce((a, c) => a + (c.amount || 0), 0); }
  goCollect = () => {
    this.set({ screen: 'collect' });
    requestAnimationFrame(() => {
      const stackEl = document.getElementById('collectstack');
      const scrollEl = document.getElementById('collectscroll');
      if (stackEl && scrollEl && !this.collectEngine) this.startCollectPhysics(stackEl, scrollEl);
    });
  };
  startCollectPhysics(stackEl, scrollEl) {
    if (!stackEl || !scrollEl || this.collectEngine) return;
    const W = scrollEl.clientWidth || 350, Hv = scrollEl.clientHeight || 700;
    const r = this.calcR(W, Hv), itemPx = r * 2;
    const UNIT = 100;
    const glyphs = this.collectedGlyphs();
    const total = glyphs.length;
    const screens = Math.max(1, Math.ceil(total / UNIT) + 1);
    const worldH = Math.max(Hv, screens * Hv);
    stackEl.style.height = worldH + 'px';
    const levels = Math.ceil(worldH / Hv);
    for (let k = 1; k <= levels; k++) {
      const y = worldH - k * Hv;
      if (y < -2) continue;
      const line = document.createElement('div');
      line.style.cssText = `position:absolute;left:0;right:0;top:${y}px;border-top:1px dashed #e4e1d8`;
      stackEl.appendChild(line);
    }
    if (total === 0) {
      const em = document.createElement('div');
      em.style.cssText = 'position:absolute;left:24px;right:24px;bottom:24px;font-size:12.5px;line-height:1.8;color:#b4b2a8;text-align:center';
      em.textContent = 'まだ何も。睡眠・休憩で回復すると、ここに積もっていきます。';
      stackEl.appendChild(em);
      scrollEl.scrollTop = Math.max(0, worldH - Hv);
      return;
    }
    const { Engine, World, Bodies, Runner } = Matter;
    this.collectEngine = Engine.create();
    this.collectEngine.gravity.y = 1.2;
    this._tuneEngine(this.collectEngine);
    const wt = 140;
    World.add(this.collectEngine.world, [
      Bodies.rectangle(W / 2, worldH + wt / 2, W + wt * 2, wt, { isStatic: true }),
      Bodies.rectangle(-wt / 2, worldH / 2, wt, worldH * 2 + wt, { isStatic: true }),
      Bodies.rectangle(W + wt / 2, worldH / 2, wt, worldH * 2 + wt, { isStatic: true }),
    ]);
    this.collectBodies = [];
    glyphs.slice(-160).forEach(glyph => {
      const x = r + Math.random() * (W - 2 * r);
      const y = worldH - 60 - Math.random() * (worldH * 0.7);
      const body = Bodies.circle(x, y, r, this.BODY_OPTS);
      World.add(this.collectEngine.world, body);
      const d = document.createElement('div');
      d.style.cssText = 'position:absolute;top:0;left:0;display:flex;align-items:center;justify-content:center;will-change:transform;pointer-events:none';
      d.style.width = d.style.height = itemPx + 'px';
      d.style.fontSize = Math.round(r * 1.6) + 'px';
      appendGlyph(d, glyph, Math.round(r * 1.9));
      stackEl.appendChild(d);
      this.collectBodies.push({ body, el: d });
    });
    this.collectRunner = Runner.create();
    Runner.run(this.collectRunner, this.collectEngine);
    this._collectPhys = true;
    const loop = () => {
      if (!this._collectPhys) return;
      this.collectBodies.forEach(({ body, el }) => {
        el.style.transform = `translate(${body.position.x - r}px, ${body.position.y - r}px) rotate(${body.angle}rad)`;
      });
      this._collectRaf = requestAnimationFrame(loop);
    };
    this._collectRaf = requestAnimationFrame(loop);
    scrollEl.scrollTop = Math.max(0, worldH - Hv);
    this.set({ collectedSeen: Date.now() });
    this.save();
  }
  stopCollectPhysics() {
    this._collectPhys = false;
    if (this._collectRaf) cancelAnimationFrame(this._collectRaf);
    if (this.collectRunner) Matter.Runner.stop(this.collectRunner);
    if (this.collectEngine) { Matter.World.clear(this.collectEngine.world); Matter.Engine.clear(this.collectEngine); }
    if (this.collectBodies) this.collectBodies.forEach(({ el }) => el.remove());
    const stackEl = document.getElementById('collectstack');
    if (stackEl) stackEl.innerHTML = '';
    this.collectEngine = null; this.collectRunner = null; this.collectBodies = [];
  }

  /* ================= auth / calendar UI actions ================= */
  openAuth = () => this.set({ authOpen: true, authErr: '' });
  closeAuth = () => this.set({ authOpen: false });
  onAuthEmail = (e) => this.set({ authEmail: e.target.value });
  onAuthPass = (e) => this.set({ authPass: e.target.value });
  doLoginGoogle = async () => {
    this.set({ authErr: '', authBusy: true });
    try { await loginGoogle(); } catch (e) { this.set({ authErr: jpError(e && e.code) }); }
    this.set({ authBusy: false });
  };
  doLoginEmail = async () => {
    this.set({ authErr: '', authBusy: true });
    try { await loginEmail(this.state.authEmail.trim(), this.state.authPass); } catch (e) { this.set({ authErr: jpError(e && e.code) }); }
    this.set({ authBusy: false });
  };
  doSignupEmail = async () => {
    this.set({ authErr: '', authBusy: true });
    try { await signupEmail(this.state.authEmail.trim(), this.state.authPass); } catch (e) { this.set({ authErr: jpError(e && e.code) }); }
    this.set({ authBusy: false });
  };
  doLogout = async () => { await logout(); this.toast('ログアウトしました'); };
  toast(text, ms = 1800) {
    this.set({ toast: text });
    clearTimeout(this._t); this._t = setTimeout(() => this.set({ toast: null }), ms);
  }

  /* Googleカレンダー/ToDo 取り込み（旧本番と同一の entries 形式で追加） */
  doCalendarSync = async () => {
    if (!this.state.user) { this.openAuth(); return; }
    this.toast('⏳ 取り込み中…', 6000);
    try {
      const { cal, tasks } = await fetchGoogleData();
      const nCal = this.importEvents(cal);
      const nTask = this.importTasks(tasks);
      const n = nCal + nTask;
      this.toast(n > 0 ? `🗓️ 予定${nCal}件・ToDo${nTask}件` : '新しい予定はなし');
    } catch (e) {
      console.warn('[kamepace] sync failed', e);
      this.toast('⚠️ 取り込み失敗: ' + jpError((e && e.code) || ''));
    }
  };
  /* "HH:MM" に分を足す */
  addHm(hm, add) {
    const [h, m] = (hm || '0:0').split(':').map(Number);
    const t = (((h || 0) * 60 + (m || 0) + add) % 1440 + 1440) % 1440;
    return pad2(Math.floor(t / 60)) + ':' + pad2(t % 60);
  }
  /* カレンダーの予定は「枠」（タイトルだけ）として取り込む。
     - テンプレ（タスク構成つき）があれば自動適用: 枠の時間をタスクに配分して記録
     - 初めてのタイトルは行動待ちの枠として置く（ホームでタップして行動を入れる → テンプレ保存） */
  importEvents(items) {
    if (!Array.isArray(items)) return 0;
    // srcId は「cal:<id>#<タスク番号>」にもなるため、基部で重複判定
    const existing = new Set(this.state.entries.filter(e => e.srcId).map(e => String(e.srcId).split('#')[0]));
    let added = 0;
    const newEntries = [];
    const now = Date.now();
    items.forEach(it => {
      if (!it || !it.srcId || existing.has(it.srcId)) return; // 重複防止
      const title = it.title || '(無題)';
      const date = it.date || todayStr();
      const from = it.from || '00:00';
      const to = it.to || '23:59';
      const tmpl = getTemplate(this.state.templates, title);
      if (tmpl && Array.isArray(tmpl.tasks) && tmpl.tasks.length) {
        // テンプレ自動適用: 枠の時間をテンプレのタスク構成比で配分（日またぎは+24h補正）
        let spanMin = Math.round((hmToTsOn(date, to) - hmToTsOn(date, from)) / 60000);
        if (spanMin <= 0) spanMin += 1440;
        spanMin = Math.max(1, spanMin);
        const tmplTotal = tmpl.tasks.reduce((a, t) => a + (t.min || 0), 0) || tmpl.tasks.length * 30;
        let cursorMin = 0;
        tmpl.tasks.forEach((task, k) => {
          const last = k === tmpl.tasks.length - 1;
          const min = Math.max(1, last ? spanMin - cursorMin : Math.round(spanMin * (task.min || 30) / tmplTotal));
          const fh = task.min ? (task.fat * 60 / task.min) : (task.fat || 0);
          const delta = Math.round(fh * min / 60);
          const e = {
            from: this.addHm(from, cursorMin), to: this.addHm(from, cursorMin + min),
            title: task.name, act: guessAct(task.name) || tmpl.act || '', mood: '🙂',
            delta, exp: false, date, glyph: task.glyph, min, plan: title,
            srcId: it.srcId + '#' + k, _new: true,
          };
          cursorMin += min;
          if (hmToTsOn(date, e.to) > now) { e.planned = true; e.dropped = 0; }
          newEntries.push(e);
        });
      } else if (tmpl) {
        // 旧形式テンプレ（単発の act/delta）→ 従来どおり1件で記録
        const planned = entryEndTs({ date, to }) > now;
        newEntries.push({ from, to, title, act: tmpl.act, mood: '🙂', delta: tmpl.delta, exp: false, date, planned, dropped: 0, srcId: it.srcId, plan: title, _new: true });
      } else {
        // 初めての予定: 行動待ちの「枠」として置く（疲労0・ホームでタップして行動を入れる）
        newEntries.push({ from, to, title, act: guessAct(title), mood: '🙂', delta: 0, exp: false, date, planned: false, srcId: it.srcId, needsSetup: true, plan: title });
      }
      existing.add(it.srcId);
      added++;
    });
    if (added) {
      this.set({ entries: sortEntries([...this.state.entries, ...newEntries]) });
      setTimeout(() => this.advancePlans(), 0);
      this.save();
    }
    return added;
  }
  importTasks(items) {
    if (!Array.isArray(items)) return 0;
    const tasks = Array.isArray(this.state.tasks) ? [...this.state.tasks] : [];
    const existing = new Set(tasks.map(t => t.srcId));
    let added = 0;
    items.forEach(it => {
      if (!it || !it.srcId || existing.has(it.srcId)) return;
      tasks.push({ srcId: it.srcId, title: it.title || '(無題)', done: false, date: todayStr() });
      existing.add(it.srcId);
      added++;
    });
    if (added) { this.set({ tasks }); this.save(); }
    return added;
  }

  /* ================= renderVals（プロトタイプの renderVals を移植） ================= */
  renderVals() {
    const st = this.state;
    const slotRecs = this.slotRecords();
    const slots = SLOTS.map(sd => {
      const records = slotRecs[sd.id] || [];
      const sum = records.reduce((a, r) => a + (r.planned ? (r.fat >= 0 ? 1 : -1) * (r.dropped || 0) : r.fat), 0);
      const empty = records.length === 0;
      return {
        id: sd.id, emoji: sd.emoji, name: sd.name,
        empty, hasRecords: !empty,
        sumText: empty ? '' : (sum >= 0 ? '+' + sum : '' + sum),
        circleBg: empty ? '#eef0e6' : '#eaf5c9',
        nameColor: empty ? '#8a8a82' : '#1b1b18',
        groups: this.groupRecords(records).map(g => ({ ...g, onTap: () => (g.isFrame ? this.openFrameFill(g) : this.openEditFlow(g)) })),
        onAdd: () => this.openRecord(sd.id),
      };
    });

    const activeCat = this.allCats().find(c => c.id === st.catId);
    const hiddenCats = st.hiddenCats || [];
    // 非表示カテゴリはリストから隠すだけ（検索・既存記録からは到達可能）
    const cats = this.allCats().filter(c => !hiddenCats.includes(c.id)).map(c => ({ id: c.id, name: c.name, sub: c.sub, icon: c.icon, color: c.color, onSelect: () => this.selectCat(c.id) }));
    const plans = this.allPlans().map(p => { const m = this.planMeta(p); return { id: p.id, name: p.name, meta: m.metaText, onOpen: () => this.openPlan(p.id) }; });
    const detailPlan = st.planDetailId ? this.planById(st.planDetailId) : null;
    const detailMeta = detailPlan ? this.planMeta(detailPlan) : null;
    const planTasks = detailPlan ? detailPlan.tasks.map(t => ({ glyph: t.glyph, name: t.name, minText: this.fmtMin(t.min || 0), fatText: (t.fat >= 0 ? '+' + t.fat : '' + t.fat) })) : [];
    const planItemChoices = this.allItems().map(it => { const on = (st.newPlanTasks || []).includes(it.id); return { id: it.id, name: it.name, glyph: it.glyph, onToggle: () => this.togglePlanTask(it.id), border: on ? '2px solid #1b1b18' : '1.5px solid #e4e1d8', bg: on ? '#fbfdf0' : '#fff', mark: on ? '✓' : '＋', markColor: on ? '#2f3a00' : '#8a8a82' }; });

    /* ---- 検索フロー ---- */
    const ss = st.searchStep;
    const scPalette = ['#6f8fbf', '#c58b3d', '#4fa88a', '#b07bc4', '#d97a6a', '#7a9a00'];
    const fatOf = (fh) => { const v = Math.round(fh * 0.5); return v >= 0 ? '+' + v : '' + v; };
    const keywordRows = st.keywords.map((val, i) => ({
      val, i,
      onInput: (e) => this.setKeyword(i, e.target.value),
      onClear: () => this.clearKeyword(i),
      hasVal: !!(val && val.trim()),
      placeholder: KW_PLACEHOLDERS[i % KW_PLACEHOLDERS.length],
    }));
    const canSearch = st.keywords.some(k => (k || '').trim());
    const searchGroups = this.searchGroupsData().map(g => ({
      i: g.i, kw: g.kw, noHit: g.noHit, countText: g.noHit ? '見つかりません' : g.count + '件',
      onMore: () => this.openMore(g.i, g.kw), hasMore: g.count > 5,
      onAddNew: () => this.addNewAction(g.i, g.kw), onAddRough: () => this.addRoughAction(g.i, g.kw),
      items: g.items.slice(0, 5).map(it => ({ name: it.name, glyph: it.glyph, fatText: fatOf(it.fh), onAdd: () => this.selectSearchItem(g.i, it) })),
    }));
    const mk = st.moreKw;
    let moreData = { kw: '', countText: '', items: [] };
    if (mk) {
      const res = this.searchDB(mk.kw);
      moreData = { kw: mk.kw, countText: res.length + '件', items: res.map(it => ({ name: it.name, glyph: it.glyph, fatText: fatOf(it.fh), onAdd: () => this.selectSearchItem(mk.i, it) })) };
    }
    const moreFilters = ['おすすめ順', 'からだ', 'こころ'].map((t, idx) => { const on = st.moreFilter === idx; return { text: t, onPick: () => this.setMoreFilter(idx), border: on ? '#c4f000' : '#cfe08a', bg: on ? '#c4f000' : '#fff', color: on ? '#2f3a00' : '#7a9a00' }; });
    const scItems = st.searchCart;
    const scCount = scItems.length;
    const fr0 = (st.searchFracs && st.searchFracs.length === scCount && scCount) ? st.searchFracs : Array(scCount).fill(scCount ? 1 / scCount : 0);
    const timeMode = st.confirmMode === 'time';
    const totalMin = timeMode ? this.timeSpanMin() : (st.searchTotalMin || (scCount * 30) || 30);
    const mins = fr0.map(f => Math.max(1, Math.round(f * totalMin)));
    if (mins.length) { const d = totalMin - mins.reduce((a, b) => a + b, 0); mins[mins.length - 1] = Math.max(1, mins[mins.length - 1] + d); }
    const searchCartRows = scItems.map((it, idx) => {
      const fat = Math.round(this.effFh(it) * (mins[idx] / 60));
      return {
        id: it.id, name: it.name, glyph: it.glyph,
        intensityText: this.intensitySummary(it) || '強度',
        fatText: (fat >= 0 ? '+' + fat : '' + fat),
        onRemove: () => this.removeSearchItem(it.id),
        onIntensity: () => this.openIntensity(it.id),
      };
    });
    let segCursor = timeMode ? this.hmToTs(st.startTime) : 0;
    const allocSegs = scItems.map((it, idx) => {
      const fat = Math.round(this.effFh(it) * (mins[idx] / 60));
      let timeText = '';
      if (timeMode) { const f = segCursor, t = f + mins[idx] * 60000; timeText = this.tsToHm(f) + '–' + this.tsToHm(t); segCursor = t; }
      return {
        color: scPalette[idx % scPalette.length], widthPct: (fr0[idx] * 100) + '%', name: it.name,
        minText: timeMode ? timeText : this.fmtMin(mins[idx]), fatText: (fat >= 0 ? '+' + fat : '' + fat),
        rawMin: mins[idx],
        onSetMin: timeMode ? null : (m) => this.setRowMin(idx, m),
      };
    });
    const allocHandles = [];
    { let cum = 0; for (let k = 0; k < scCount - 1; k++) { cum += fr0[k]; allocHandles.push({ leftPct: (cum * 100) + '%', onDrag: this.onFracDrag(k) }); } }
    const searchTotalFat = scItems.reduce((a, it, idx) => a + Math.round(this.effFh(it) * (mins[idx] / 60)), 0);
    const intItem = st.intensityId ? scItems.find(x => x.id === st.intensityId) : null;
    const intQuestions = intItem ? this.intensityQuestions(intItem).map((q, qi) => ({
      label: q.label,
      opts: q.opts.map((o, oi) => { const on = (intItem.picks || [])[qi] === oi; return { text: o, onPick: () => this.setIntensityPick(qi, oi), border: on ? '#1b1b18' : '#e4e1d8', bg: on ? '#fbfdf0' : '#fff', color: on ? '#1b1b18' : '#55554e', weight: on ? '900' : '700' }; }),
    })) : [];
    const intFat = intItem ? Math.round(this.effFh(intItem) * ((mins[scItems.indexOf(intItem)] || 30) / 60)) : 0;
    // 好き嫌い（行動ごとに永続・強度ポップアップで設定）
    const curPref = intItem ? ((st.prefs || {})[normTitle(intItem.name)] || 'normal') : 'normal';
    const prefOpts = intItem ? [
      { key: 'dislike', text: '嫌い' }, { key: 'normal', text: 'ふつう' }, { key: 'like', text: '好き' },
    ].map(o => {
      const on = curPref === o.key;
      return { text: o.text, onPick: () => this.setPref(intItem.name, o.key), border: on ? '#1b1b18' : '#e4e1d8', bg: on ? '#fbfdf0' : '#fff', color: on ? '#1b1b18' : '#55554e', weight: on ? '900' : '700' };
    }) : [];
    const catIconChoices = CAT_ICON_CHOICES.map(ic => ({ icon: ic, onPick: () => this.pickCatIcon(ic), border: st.newCatIcon === ic ? '2px solid #1b1b18' : '1.5px solid #e4e1d8', bg: st.newCatIcon === ic ? '#fbfdf0' : '#fff' }));

    /* ---- 行動をつくる（コピー式） ---- */
    const actCat = activeCat;
    const actCalc = st.actAddOpen ? this.actAddCalc() : null;
    const actIsRecover = !!(actCalc && actCalc.recover);
    const actSrcChoices = (actCat ? actCat.items : []).map(it2 => ({
      id: it2.id, glyph: it2.glyph, name: it2.name,
      on: st.actSrcId === it2.id,
      onPick: () => this.pickActSrc(it2.id),
    }));
    // コピー元が回復系なら「回復の量」で比べる文言に
    const REC_CMP_LABELS = ['かなり少ない', '少し少ない', '同じ', '少し多い', 'かなり多い'];
    const cmpRow = (curIdx, onPick) => COMPARE_STEPS.map((c, i) => ({
      text: actIsRecover ? REC_CMP_LABELS[i] : c.label, on: curIdx === i, onPick: () => onPick(i),
    }));
    const actBodyOpts = cmpRow(st.actBodyIdx, (i) => this.set({ actBodyIdx: i }));
    const actMindOpts = cmpRow(st.actMindIdx, (i) => this.set({ actMindIdx: i }));
    const actStdGlyph = actCat ? (actCat.glyph || '⭐') : '⭐';
    const actEstText = actCalc ? `${actCalc.recover ? '−' : '+'}${actCalc.body + actCalc.mind}/h（体${actCalc.body} 心${actCalc.mind}）` : '';
    const subItems = (activeCat ? activeCat.items : []).map(t => {
      const e = st.cart[t.id]; const sel = !!e;
      const lm = this.lastMinOf(t.name);
      const lastText = lm
        ? `前回 ${t.fh < 0 ? '−' : '+'}${Math.max(1, Math.round(Math.abs(t.fh) * lm / 60))}（${this.fmtMin(lm)}）`
        : t.last;
      const degTag = (e && e.degIdx != null && t.degLabels)
        ? ('（' + [t.degLabels[0], 'ふつう', t.degLabels[1]][e.degIdx] + '）') : '';
      return {
        id: t.id, icon: t.icon, color: activeCat.color, name: t.name,
        degreeTag: degTag, last: lastText,
        weight: sel ? '700' : '400',
        rowBg: sel ? '#fbfdf0' : 'transparent',
        btnBorder: sel ? 'none' : '1.5px solid #1b1b18',
        btnBg: sel ? '#c4f000' : 'transparent',
        btnColor: sel ? '#2f3a00' : '#1b1b18',
        btnLabel: sel ? '✓' : '＋',
        onTap: () => this.tapItem({ ...t, color: activeCat.color }),
      };
    });
    const degItem = st.degreeItem ? this.itemById(st.degreeItem) : null;
    const degCat = degItem ? CATS.find(c => c.items.some(x => x.id === degItem.id)) : null;
    const degFh = degItem && degItem.degFh ? degItem.degFh[st.degreeIdx] : 0;
    const degOn = (i) => st.degreeIdx === i;

    const items = this.cartItems();
    const count = items.length;
    const cartFat = items.reduce((a, t) => a + Math.round(this.cartFh(t) * ((t.defMin || 30) / 60)), 0);

    const sleepN = this.sleepCount();
    const recovered = Math.max(0, sleepN - st.residual);

    const activeSlot = this.slotDef(st.slotId || this.slotNow());
    const viewDateStr = shiftDate(todayStr(), st.dayOffset);

    const isEditFlow = st.confirmOrigin === 'edit';

    /* ---- マイページの設定サブ画面 ---- */
    const sh = this.slotHoursArr();
    const slotDefs = this.slotDefs();
    const slotTimeRows = slotDefs.map((s, i) => ({
      id: s.id, emoji: s.emoji, name: s.name,
      rangeText: s.fromH + ':00 – ' + (i < 3 ? sh[i + 1] + ':00' : '翌' + sh[0] + ':00'),
      startText: pad2(s.fromH) + ':00',
      onDec: () => this.adjustSlotHour(i, -1),
      onInc: () => this.adjustSlotHour(i, 1),
    }));
    const slotTimesSub = sh.map(x => x).join(' / ');
    const catRows = this.allCats().map(c => {
      const hidden = hiddenCats.includes(c.id);
      const isCustom = (st.customCats || []).some(x => x.id === c.id);
      return {
        id: c.id, name: c.name, icon: c.icon, color: c.color,
        sub: c.items.length + '件の行動' + (isCustom ? ' ・ じぶんで追加' : ''),
        hidden, isCustom,
        onToggle: () => this.toggleCatHidden(c.id),
        onDelete: isCustom ? () => this.deleteCustomCat(c.id) : null,
      };
    });
    const templateRows = Object.entries(st.templates || {}).map(([key, t]) => ({
      key, name: key,
      sub: (t.tasks && t.tasks.length)
        ? t.tasks.map(x => (x.glyph || '') + x.name).join(' ・ ')
        : ((t.act || 'その他') + ' ・ ' + (t.delta >= 0 ? '+' + t.delta : t.delta)),
      onDelete: () => this.deleteTemplate(key),
    }));
    const COEF_STEPS = [0.8, 0.9, 1, 1.1, 1.2];
    const coefOpts = (key, labels) => COEF_STEPS.map((v, i) => ({
      text: labels[i], v,
      on: Math.abs((st[key] || 1) - v) < 0.001,
      onPick: () => this.setAxisCoef(key, v),
    }));
    const FAT_LABELS = ['かなり疲れにくい', '疲れにくい', 'ふつう', '疲れやすい', 'かなり疲れやすい'];
    const REC_LABELS = ['回復しにくい', 'やや回復しにくい', 'ふつう', 'やや回復しやすい', '回復しやすい'];
    const sensSections = [
      { label: '体の疲れやすさ', opts: coefOpts('bodyFatCoef', FAT_LABELS) },
      { label: '心の疲れやすさ', opts: coefOpts('mindFatCoef', FAT_LABELS) },
      { label: '体の回復しやすさ', opts: coefOpts('bodyRecCoef', REC_LABELS) },
      { label: '心の回復しやすさ', opts: coefOpts('mindRecCoef', REC_LABELS) },
    ];

    /* ---- ゴミ箱 ---- */
    const trashRows = st.entries
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => e.exp)
      .sort((a, b) => (b.e.trashedAt || 0) - (a.e.trashedAt || 0) || (b.e.date || '').localeCompare(a.e.date || ''))
      .map(({ e, i }) => ({
        i, glyph: entryGlyph(e), name: e.title,
        meta: (e.date || '') + (e.from ? ' · ' + e.from : '') + ' · ' + this.fmtMin(entryMin(e)),
        fatText: (e.delta >= 0 ? '+' + e.delta : '' + e.delta),
        onRestore: () => this.restoreTrash(i),
        onPurge: () => this.purgeTrash(i),
      }));

    return {
      screenBg: st.screen === 'record' ? '#ffffff' : '#f7f4ec',
      isHome: st.screen === 'home', isRecord: st.screen === 'record',
      isSleep: st.screen === 'sleep', isShaka: st.screen === 'shaka', isMypage: st.screen === 'mypage',
      isTrash: st.screen === 'trash', isBuffLog: st.screen === 'buffLog',
      isBookshelf: st.screen === 'bookshelf',
      isSlotTimes: st.screen === 'slotTimes', isCatsManage: st.screen === 'catsManage',
      isTemplates: st.screen === 'templates', isSensitivity: st.screen === 'sensitivity',
      isHelp: st.screen === 'help', helpPersona: st.helpPersona || 0,
      goHelp: this.goHelp, setHelpPersona: this.setHelpPersona,
      isOnboard: st.screen === 'onboard',
      isCycle: st.screen === 'cycle',
      cycForm: st.cycForm || this.defaultCycForm(),
      cycFromOnboard: !!st.cycFromOnboard,
      onCycField: this.onCycField, saveCycle: this.saveCycle, cancelCycle: this.cancelCycle, disableCycle: this.disableCycle,
      cycStrengthOpts: (cur, k) => [
        { label: '変わらない', v: 1.0 }, { label: '少し', v: 1.1 }, { label: 'まあまあ', v: 1.2 }, { label: 'かなり', v: 1.35 },
      ].map(o => ({ ...o, on: Math.abs((cur || 1) - o.v) < 0.001, onPick: () => this.onCycField(k, o.v) })),
      obStep: st.obStep || 1, obSel: st.obSel || {},
      obPick: this.obPick, obNext: this.obNext, obBack: this.obBack,
      skipOnboard: this.skipOnboard, finishOnboard: this.finishOnboard,
      redoOnboard: () => this.set({ screen: 'onboard', obStep: 1, obSel: {} }),
      obIsFemale: (st.obSel && st.obSel.gender) === '女性',
      openCycleFromOnboard: () => this.openCycle(true),
      cycleEnabled: !!(st.cycle && st.cycle.enabled),
      obSummary: [
        { icon: '💼', label: '職業・活動', value: (st.obSel && st.obSel.occupation) || '—' },
        { icon: '💪', label: '体の疲れやすさ', value: (st.obSel && st.obSel.bodyFat) || 'ふつう' },
        { icon: '💪', label: '体の回復しやすさ', value: (st.obSel && st.obSel.bodyRec) || 'ふつう' },
        { icon: '🧠', label: '心の疲れやすさ', value: (st.obSel && st.obSel.mindFat) || 'ふつう' },
        { icon: '🧠', label: '心の回復しやすさ', value: (st.obSel && st.obSel.mindRec) || 'ふつう' },
      ],
      tutorial: st.tutorial, tutFlags: st.tutFlags,
      startTutorial: this.startTutorial, endTutorial: this.endTutorial, tutNext: this.tutNext,
      isCollect: st.screen === 'collect', collectedTotal: this.collectedTotal(),
      goCollect: this.goCollect, goRecordNow: this.goRecordNow, finishSleep: this.finishSleep,
      navHomeColor: ['home', 'record', 'sleep'].includes(st.screen) ? '#1b1b18' : '#8a8a82',
      navHomeFill: ['home', 'record', 'sleep'].includes(st.screen) ? 1 : 0,
      navShakaColor: ['shaka', 'collect'].includes(st.screen) ? '#1b1b18' : '#8a8a82',
      navShakaFill: ['shaka', 'collect'].includes(st.screen) ? 1 : 0,
      navBookColor: st.screen === 'bookshelf' ? '#1b1b18' : '#8a8a82',
      navBookFill: st.screen === 'bookshelf' ? 1 : 0,
      goBookshelf: this.goBookshelf,
      bookEntries: st.entries, bookSlotHours: st.slotHours,
      bookFav: st.bookFav || {}, bookDiary: st.bookDiary || {},
      setBookFav: this.setBookFav, setBookDiary: this.setBookDiary,
      navMypageColor: ['mypage', 'trash', 'slotTimes', 'catsManage', 'templates', 'sensitivity', 'help', 'buffLog'].includes(st.screen) ? '#1b1b18' : '#8a8a82',
      navMypageFill: ['mypage', 'trash', 'slotTimes', 'catsManage', 'templates', 'sensitivity', 'help', 'buffLog'].includes(st.screen) ? 1 : 0,
      homeDate: this.homeDateStr(),
      homeIsToday: this.homeDateStr() === todayStr(),
      homeDateY: strToDate(this.homeDateStr()).getFullYear(),
      homeDateM: strToDate(this.homeDateStr()).getMonth() + 1,
      homeDateD: strToDate(this.homeDateStr()).getDate(),
      homeDateWd: ['日', '月', '火', '水', '木', '金', '土'][strToDate(this.homeDateStr()).getDay()],
      homeDateLabel: this.homeDateStr() === todayStr() ? '今日'
        : this.homeDateStr() === shiftDate(todayStr(), -1) ? '昨日'
        : this.homeDateStr() === shiftDate(todayStr(), 1) ? '明日' : '',
      homePrevDay: this.homePrevDay, homeNextDay: this.homeNextDay,
      setHomeDate: this.setHomeDate, goToday: this.goToday,
      pile: st.screen === 'home' ? this.makePile(7) : [],
      // 残量ライン（rank）より上の絵文字が消える。ホーム/シャカと同じ配置
      sleepPile: st.screen === 'sleep' ? this.makeSleepPile().map((p, i) => ({
        ...p,
        op: p.rank < st.residual ? 1 : (st.sleepAnim ? 0 : 0.82),
        delay: st.sleepAnim ? (0.35 + (i % 12) * 0.07).toFixed(2) + 's' : '0s',
      })) : [],
      moons: st.moons || [],
      sleepAnim: !!st.sleepAnim,
      residualPct: (() => {
        const arr = this._sleepYByRank || [];
        if (st.residual <= 0 || !arr.length) return '4px';
        // 残す絵文字の一番上（rank=residual-1 の粒）の上端にラインを置く
        const topY = arr[Math.min(st.residual, arr.length) - 1] || 0;
        return (topY + (this._sleepFont || 40) * 0.65 + 4).toFixed(0) + 'px';
      })(),
      onSleepDrag: this.onSleepDrag,
      slots,
      plans,
      planDetailOpen: !!detailPlan, planDetailName: detailPlan ? detailPlan.name : '', planDetailMeta: detailMeta ? detailMeta.metaText : '', planDetailFat: detailMeta ? detailMeta.fatText : '', planTasks,
      openPlan: this.openPlan, closePlan: this.closePlan, openPlanAdd: this.openPlanAdd, closePlanAdd: this.closePlanAdd,
      planAddOpen: !!st.planAddOpen, newPlanName: st.newPlanName || '', onPlanName: this.onPlanName, addPlan: this.addPlan,
      planItemChoices, togglePlanSync: this.togglePlanSync, planSync: !!st.planSync,
      planSyncBg: st.planSync ? '#c4f000' : '#e4e1d8', planSyncDot: st.planSync ? '22px' : '3px',
      searchInputOpen: ss === 'input', searchResultsOpen: ss === 'results', searchMoreOpen: ss === 'more', searchConfirmOpen: ss === 'confirm',
      openSearch: this.openSearch, closeSearch: this.closeSearch, runSearch: this.runSearch, goSearchConfirm: this.goSearchConfirm, canSearch,
      searchBtnBg: canSearch ? '#c4f000' : '#e4e1d8', searchBtnColor: canSearch ? '#2f3a00' : '#a5a39a',
      keywordRows, searchGroups,
      moreData, moreFilters, closeMore: this.closeMore,
      searchCartRows, searchCount: scCount, searchTotalText: this.fmtMin(totalMin),
      searchTotalMinRaw: totalMin, setTotalMin: this.setTotalMin,
      allocSegs, allocHandles,
      confirmMode: st.confirmMode, isTimeMode: timeMode, isDurationMode: !timeMode,
      setDurationMode: () => this.setConfirmMode('duration'), setTimeMode: () => this.setConfirmMode('time'),
      durTabBg: timeMode ? '#fff' : '#1b1b18', durTabColor: timeMode ? '#8a8a82' : '#fff',
      timeTabBg: timeMode ? '#1b1b18' : '#fff', timeTabColor: timeMode ? '#fff' : '#8a8a82',
      startTime: st.startTime, endTime: st.endTime, onStartTime: this.onStartTime, onEndTime: this.onEndTime,
      commitLabel: (timeMode && this.hmToTs(st.endTime) > Date.now())
        ? (isEditFlow ? '予定にへんこう' : '予定を追加')
        : (isEditFlow ? 'へんこうする' : 'きろくする'),
      confirmTitle: isEditFlow ? 'きろくを編集' : '登録を確認',
      isEditFlow, trashOriginal: this.trashOriginal,
      trashRows, trashCount: trashRows.length, goTrash: this.goTrash,
      /* マイページの設定サブ画面 */
      slotTimeRows, slotTimesSub, catRows, templateRows, sensSections,
      sensSub: '体×' + (st.bodyFatCoef || 1).toFixed(1) + ' ・ 心×' + (st.mindFatCoef || 1).toFixed(1),
      goSlotTimes: this.goSlotTimes, goCatsManage: this.goCatsManage,
      goTemplates: this.goTemplates, goSensitivity: this.goSensitivity,
      homeMotion: st.homeMotion, setMotionFixed: () => this.setMotion(false), setMotionMove: () => this.setMotion(true),
      mainScreen: st.mainScreen || 'shaka', setMainShaka: () => this.setMainScreen('shaka'), setMainHome: () => this.setMainScreen('home'),
      motionFixedBg: st.homeMotion ? '#fff' : '#1b1b18', motionFixedColor: st.homeMotion ? '#8a8a82' : '#fff',
      motionMoveBg: st.homeMotion ? '#1b1b18' : '#fff', motionMoveColor: st.homeMotion ? '#fff' : '#8a8a82',
      addTotalM1: () => this.addTotal(-1), addTotalP1: () => this.addTotal(1), addTotalM10: () => this.addTotal(-10), addTotalP10: () => this.addTotal(10),
      searchTotalFatText: (searchTotalFat >= 0 ? '+' + searchTotalFat : '' + searchTotalFat),
      addMoreMenu: this.addMoreMenu, commitSearch: this.commitSearch, backFromConfirm: this.backFromConfirm,
      tplOpen: !!st.tplOpen, tplName: st.tplName || '', onTplName: this.onTplName,
      openTplSave: this.openTplSave, saveTpl: this.saveTpl, closeTpl: this.closeTpl,
      newActOpen: !!st.newActOpen, newActName: st.newActName || '',
      onNewActName: this.onNewActName, closeNewAct: this.closeNewAct, createNewAct: this.createNewAct,
      newActGlyph: st.newActGlyph, pickNewActGlyph: this.pickNewActGlyph,
      newActCatChoices: this.allCats().filter(c => !hiddenCats.includes(c.id)).map(c => ({
        id: c.id, name: c.name, icon: c.icon, color: c.color,
        on: st.newActCatId === c.id, onPick: () => this.pickNewActCat(c.id),
      })),
      newActStdGlyph: (this.allCats().find(c => c.id === st.newActCatId) || {}).glyph || '⭐',
      intensityOpen: !!intItem, intensityName: intItem ? intItem.name : '', intensityGlyph: intItem ? intItem.glyph : '',
      intensityFatText: (intFat >= 0 ? '+' + intFat : '' + intFat), intQuestions, closeIntensity: this.closeIntensity,
      prefOpts,
      cats, showCats: st.screen === 'record' && !st.catId && !st.searchStep,
      showSub: st.screen === 'record' && !!st.catId && !st.searchStep,
      subItems, subName: activeCat ? activeCat.name : '', subIcon: activeCat ? activeCat.icon : 'category', subColor: activeCat ? activeCat.color : '#8a8a82',
      degreeOpen: !!st.degreeItem,
      degreeName: degItem ? degItem.name : '', degreeIcon: degItem ? degItem.icon : '', degreeColor: degCat ? degCat.color : '#4fa88a',
      degreeQuestion: degItem && degItem.degLabels ? (degItem.degLabels[0] + ' / ' + degItem.degLabels[1] + '？') : '程度',
      degreePaceText: degItem ? ((degItem.fh >= 0 ? '+' + degItem.fh : degItem.fh) + ' /h → ' + (degFh >= 0 ? '+' + Math.round(degFh * 0.5) : Math.round(degFh * 0.5))) : '',
      degBorderLo: degOn(0) ? '2px solid #1b1b18' : '1.5px solid #e4e1d8', degBgLo: degOn(0) ? '#fbfdf0' : '#fff', degWeightLo: degOn(0) ? '900' : '700',
      degBorderMid: degOn(1) ? '2px solid #1b1b18' : '1.5px solid #e4e1d8', degBgMid: degOn(1) ? '#fbfdf0' : '#fff', degWeightMid: degOn(1) ? '900' : '700',
      degBorderHi: degOn(2) ? '2px solid #1b1b18' : '1.5px solid #e4e1d8', degBgHi: degOn(2) ? '#fbfdf0' : '#fff', degWeightHi: degOn(2) ? '900' : '700',
      degLo: () => this.setDegree(0), degMid: () => this.setDegree(1), degHi: () => this.setDegree(2),
      closeDegree: this.closeDegree, confirmDegree: this.confirmDegree,
      backToCats: this.backToCats,
      catAddOpen: !!st.catAddOpen, newCatName: st.newCatName || '', catIconChoices,
      newCatGlyph: st.newCatGlyph || '⭐', pickCatGlyph: this.pickCatGlyph,
      openCatAdd: this.openCatAdd, closeCatAdd: this.closeCatAdd, onCatName: this.onCatName, addCat: this.addCat,
      actAddOpen: !!st.actAddOpen, actSrcChoices, actBodyOpts, actMindOpts, actEstText, actIsRecover,
      actGlyph: st.actGlyph, actStdGlyph, pickActGlyph: this.pickActGlyph,
      actSrcName: actCalc ? actCalc.src.name : '', actName: st.actName || '',
      openActAdd: this.openActAdd, closeActAdd: this.closeActAdd, onActName: this.onActName, addAction: this.addAction,
      recordSlotName: activeSlot.name, recordSlotEmoji: activeSlot.emoji,
      slotMenuOpen: !!st.slotMenuOpen, toggleSlotMenu: this.toggleSlotMenu,
      slotOptions: SLOTS.map(s => ({ id: s.id, emoji: s.emoji, name: s.name, active: s.id === (st.slotId || this.slotNow()), bg: s.id === (st.slotId || this.slotNow()) ? '#fbfdf0' : '#fff', onPick: () => this.pickSlot(s.id) })),
      showCart: count > 0,
      cartMeta: count + '件 · ' + this.fmtMin(items.reduce((a, t) => a + (t.defMin || 30), 0)),
      cartFatText: (cartFat >= 0 ? '+' + cartFat : '' + cartFat),
      residual: st.residual,
      recoveredAbs: recovered,
      goHome: this.goHome, goShaka: this.goShaka, goMypage: this.goMypage, goSleep: this.goSleep,
      moodOpen: !!st.moodOpen, openMood: this.openMood, closeMood: this.closeMood, commitMood: this.commitMood,
      moodNote: st.moodNote || '', onMoodNote: this.onMoodNote,
      moodChoices: MOODS.map(m => ({ id: m.id, glyph: m.glyph, name: m.name, kind: m.kind, axis: m.axis || 'mind', on: st.moodId === m.id, onPick: () => this.pickMood(m.id) })),
      moodStrengths: MOOD_STRENGTHS.map(x => ({ key: x.key, label: x.label, on: st.moodStrength === x.key, onPick: () => this.pickMoodStrength(x.key) })),
      moodCanSave: !!st.moodId,
      /* バフ・デバフ */
      buffOpen: !!st.buffOpen, openBuffs: this.openBuffs, closeBuffs: this.closeBuffs,
      activeBuffGlyphs: this.buffEntries().map(en => (BUFFS.find(b => b.id === en.id) || {}).glyph).filter(Boolean),
      buffChoices: BUFFS.map(b => {
        const eff = [];
        if (b.mult.bodyFat) eff.push('体の疲労 ×' + b.mult.bodyFat);
        if (b.mult.mindFat) eff.push('心の疲労 ×' + b.mult.mindFat);
        if (b.mult.bodyRec) eff.push('体の回復 ×' + b.mult.bodyRec);
        if (b.mult.mindRec) eff.push('心の回復 ×' + b.mult.mindRec);
        const en = this.buffEntries().find(x => x.id === b.id);
        const periodText = en ? (en.until ? `${parseInt(en.until.split('-')[1], 10)}/${parseInt(en.until.split('-')[2], 10)}まで` : 'ずっと') : '';
        return {
          id: b.id, glyph: b.glyph, name: (en && en.title) || b.name, presetName: b.name,
          desc: en ? `${b.name} ・ ${periodText}` : b.desc,
          kind: b.kind, effects: eff,
          on: !!en,
          onToggle: () => this.toggleBuff(b.id),
          onEdit: en ? () => this.openBuffCfg(b.id) : null,
        };
      }),
      goBuffLog: this.goBuffLog,
      goCycle: () => this.openCycle(false),
      cycleStatus: (() => {
        const ph = this.cyclePhase();
        if (!(st.cycle && st.cycle.enabled)) return '未設定';
        if (!ph) return '設定済み';
        return ph.phase === 'period' ? '生理中' : ph.phase === 'pre' ? '生理前' : '通常期';
      })(),
      cycPhaseNow: (() => { const ph = this.cyclePhase(); return ph ? ph.phase : null; })(),
      buffLogActive: this.buffEntries().map(en => {
        const b = BUFFS.find(x => x.id === en.id) || {};
        return { key: en.id + (en.from || ''), glyph: b.glyph, name: en.title || b.name, kind: b.kind,
          period: (en.from ? this.fmtMD(en.from) : '') + ' 〜 ' + (en.until ? this.fmtMD(en.until) : 'ずっと') };
      }),
      buffLogPast: [...(st.buffLog || [])].reverse().map((l, i) => {
        const b = BUFFS.find(x => x.id === l.id) || {};
        return { key: 'log' + i, glyph: b.glyph, name: l.title || b.name, kind: b.kind,
          period: this.fmtMD(l.from) + ' 〜 ' + this.fmtMD(l.end) };
      }),
      // 症状デバフ（プリセット外・動的）を BuffSheet 上部に表示
      activeSymptomBuffs: this.buffEntries().filter(en => en.symptom).map(en => ({
        id: en.id, glyph: en.glyph, name: en.title,
        level: ['軽い', 'ふつう', '強い'][en.level != null ? en.level : 1],
        onRemove: () => this.buffCheckEnd(en.id),
      })),
      // 翌朝の継続確認
      buffCheckOpen: !!st.buffCheckOpen,
      buffCheckRows: this.buffEntries().map(en => {
        const b = BUFFS.find(x => x.id === en.id) || {};
        return { id: en.id, glyph: en.glyph || b.glyph, name: en.title || b.name, kind: en.symptom ? 'debuff' : b.kind, onEnd: () => this.buffCheckEnd(en.id) };
      }),
      finishBuffCheck: this.finishBuffCheck,
      symAdjustOpen: !!st.symAdjust,
      symAdjustName: st.symAdjust ? st.symAdjust.name : '',
      symAdjustLevel: st.symAdjust ? ['軽い', 'ふつう', '強い'][st.symAdjust.level] : '',
      applySymAdjust: this.applySymAdjust, dismissSymAdjust: this.dismissSymAdjust,
      buffCfgOpen: !!st.buffCfgId,
      buffCfgGlyph: st.buffCfgId ? (BUFFS.find(b => b.id === st.buffCfgId) || {}).glyph : '',
      buffCfgPreset: st.buffCfgId ? (BUFFS.find(b => b.id === st.buffCfgId) || {}).name : '',
      buffCfgTitle: st.buffCfgTitle || '', onBuffCfgTitle: this.onBuffCfgTitle,
      buffCfgPeriods: this.BUFF_PERIODS.map(pp => ({ key: pp.key, label: pp.label, on: st.buffCfgKey === pp.key, onPick: () => this.pickBuffCfgKey(pp.key) })),
      saveBuffCfg: this.saveBuffCfg, closeBuffCfg: this.closeBuffCfg,
      goConfirm: this.goConfirm,
      toggleTemplateToast: this.toggleTemplateToast, shake: this.shake,
      shakaDate: st.dayOffset === 0 ? formatDateShort(todayStr()) : formatDateShort(viewDateStr),
      clockHm: st.clockHm || this.tsToHm(Date.now()),
      prevDay: this.prevDay, nextDay: this.nextDay,
      prevColor: st.dayOffset <= -3 ? '#d8d5cb' : '#55554e',
      nextColor: st.dayOffset >= 0 ? '#d8d5cb' : '#55554e',
      showToast: !!st.toast, toastText: st.toast || '',
      /* auth / mypage */
      user: st.user,
      authOpen: st.authOpen, authEmail: st.authEmail, authPass: st.authPass, authErr: st.authErr, authBusy: st.authBusy,
      openAuth: this.openAuth, closeAuth: this.closeAuth,
      onAuthEmail: this.onAuthEmail, onAuthPass: this.onAuthPass,
      doLoginGoogle: this.doLoginGoogle, doLoginEmail: this.doLoginEmail, doSignupEmail: this.doSignupEmail,
      doLogout: this.doLogout, doCalendarSync: this.doCalendarSync,
    };
  }

  render() {
    const v = this.renderVals();
    return (
      <div className="app-screen" ref={this._screenRef} style={{ background: v.screenBg, ...(v.isBookshelf ? { maxWidth: 'none' } : null) }}>
        {/* status bar spacer */}
        <div style={{ height: 'max(40px, env(safe-area-inset-top))', flex: '0 0 auto', zIndex: 5 }} />
        {v.isOnboard && <Onboard v={v} />}
        {v.isCycle && <Cycle v={v} />}
        {!v.isOnboard && <>
        {v.isHome && <Home v={v} />}
        {v.isRecord && <Record v={v} />}
        {v.isSleep && <Sleep v={v} />}
        {v.isShaka && <Shaka v={v} />}
        {v.isCollect && <Collect v={v} />}
        {v.isMypage && <MyPage v={v} />}
        {v.isTrash && <Trash v={v} />}
        {v.isBuffLog && <BuffLog v={v} />}
        {v.isSlotTimes && <SlotTimes v={v} />}
        {v.isCatsManage && <CatsManage v={v} />}
        {v.isTemplates && <Templates v={v} />}
        {v.isSensitivity && <Sensitivity v={v} />}
        {v.isHelp && <Help v={v} />}
        {v.isBookshelf && <Bookshelf v={v} />}
        {v.tutorial > 0 && <Tutorial v={v} />}
        {v.symAdjustOpen && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 11, background: 'rgba(27,27,24,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 18px' }}>
            <div style={{ width: '100%', background: '#fff', borderRadius: 22, padding: '18px 20px 20px', boxShadow: '0 24px 60px rgba(27,27,24,.35)' }}>
              <div style={{ fontSize: 15, fontWeight: 900, textAlign: 'center' }}>デバフの強さも合わせる？</div>
              <div style={{ fontSize: 12.5, color: '#55554e', textAlign: 'center', marginTop: 10, lineHeight: 1.7 }}>「{v.symAdjustName}」のつらさを<b>{v.symAdjustLevel}</b>に変えました。<br />いまの調子のデバフも同じ強さにしますか？</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                <button onClick={v.dismissSymAdjust} style={{ flex: 1, border: '2px solid #e4e1d8', borderRadius: 13, background: '#fff', color: '#55554e', fontWeight: 700, fontSize: 14, padding: '14px 0', cursor: 'pointer' }}>そのまま</button>
                <button onClick={v.applySymAdjust} style={{ flex: 1.5, border: 'none', borderRadius: 13, background: '#c4f000', color: '#2f3a00', fontWeight: 700, fontSize: 14, padding: '14px 0', cursor: 'pointer' }}>合わせる</button>
              </div>
            </div>
          </div>
        )}
        {v.showToast && (
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 88, zIndex: 9, background: '#1b1b18', color: '#fff', borderRadius: 999, padding: '11px 20px', fontSize: 12.5, fontWeight: 700, boxShadow: '0 10px 24px rgba(27,27,24,.3)', whiteSpace: 'nowrap', animation: 'pop .25s ease' }}>{v.toastText}</div>
        )}
        {!v.isBookshelf && <Nav v={v} />}
        </>}
      </div>
    );
  }
}
