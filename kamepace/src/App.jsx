/* かめペース 本番アプリ
   UI/挙動: かめペース プロトタイプ.dc.html の Component クラスを1:1移植。
   データ: 旧本番(reference/index.html)互換の entries/tasks を正とし、
   時間帯スロット(朝/午前/午後/夜)は from 時刻のバケツ分けによる「見え方」(CLAUDE.md §G)。 */
import React from 'react';
import Matter from 'matter-js';
import {
  SLOTS, CATS, PLANS, SEARCH_DB, KW_PLACEHOLDERS, ACT_EMOJI,
  guessAct, slotOfEntry, slotForNow, IMPORT_DEFAULT_DELTA,
} from './data';
import {
  todayStr, shiftDate, formatDateCaps, formatDateShort, pad2, hmToTsOn,
  entryToRecord, entryGlyph, entryMin, planUnitsDue, entryEndTs,
  serialize, deserialize, freshState, sortEntries, normTitle, getTemplate, baseEntry,
} from './model';
import {
  watchAuth, loginGoogle, loginEmail, signupEmail, logout,
  cloudSave, loadUserData, fetchGoogleData, jpError,
} from './firebase';
import { initShakaSound, attachCollisionSound } from './sound';
import Home from './screens/Home';
import Record from './screens/Record';
import Sleep from './screens/Sleep';
import Shaka from './screens/Shaka';
import Collect from './screens/Collect';
import MyPage from './screens/MyPage';
import Nav from './screens/Nav';

export default class App extends React.Component {
  state = {
    screen: 'home',
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
    toast: null,
    sleepAnim: false,
    moons: [],
    catAddOpen: false,
    newCatName: '',
    newCatIcon: 'category',
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
    };
  }
  save() {
    // set() 直後に呼ばれるため、反映後の state で保存する
    setTimeout(() => {
      const data = this.dataState();
      if (this.state.user) cloudSave(data);
      else { try { localStorage.setItem('shaka_guest', JSON.stringify(serialize(data))); } catch (e) { /* ignore */ } }
    }, 0);
  }
  loadGuest() {
    let g = null;
    try { const s = localStorage.getItem('shaka_guest'); if (s) g = JSON.parse(s); } catch (e) { /* ignore */ }
    this.set({ ...deserialize(g), booted: true });
    setTimeout(() => this.advancePlans(), 0); // アプリを閉じている間に進んだ予定をキャッチアップ
  }
  async loadCloud() {
    try {
      const data = await loadUserData();
      if (data) {
        this.set({ ...deserialize(data), booted: true });
      } else {
        // 新規ユーザー: ゲストデータがあれば引き継いで保存
        this.set({ booted: true });
        this.save();
      }
      setTimeout(() => this.advancePlans(), 0);
    } catch (err) {
      console.warn('[kamepace] load failed', err);
      this.set({ booted: true });
    }
  }

  /* ================= derived: entries → slots ================= */
  todayEntries() { return sortEntries(this.state.entries).filter(e => e.date === todayStr() && !e.exp); }
  slotRecords() {
    const out = { asa: [], am: [], pm: [], yoru: [] };
    const t = todayStr();
    // 編集用に state.entries 内のインデックスを添えて、from 順で各スロットへ
    const rows = this.state.entries
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => e.date === t && !e.exp)
      .sort((a, b) => (a.e.from || '').localeCompare(b.e.from || ''));
    rows.forEach(({ e, i }) => {
      const sid = e.slot || slotOfEntry(e);
      const r = entryToRecord(e);
      r._i = i;
      (out[sid] || out.yoru).push(r);
    });
    return out;
  }
  slotDef(id) { return SLOTS.find(s => s.id === id) || SLOTS[0]; }
  /* スロット基準時刻＋累積分 → "HH:MM"（通常記録の配置。CLAUDE.md §G） */
  slotHm(slot, offsetMin) {
    const [bh, bm] = slot.base.split(':').map(Number);
    let t = bh * 60 + bm + offsetMin; t = ((t % 1440) + 1440) % 1440;
    return pad2(Math.floor(t / 60)) + ':' + pad2(t % 60);
  }
  slotUsedMin(slotId) {
    return this.todayEntries()
      .filter(e => (e.slot || slotOfEntry(e)) === slotId && !e.planned)
      .reduce((a, e) => a + entryMin(e), 0);
  }
  hmToTs(hm) { const [h, m] = (hm || '0:0').split(':').map(Number); const d = new Date(); d.setHours(h || 0, m || 0, 0, 0); return d.getTime(); }
  tsToHm(ts) { const d = new Date(ts); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
  timeSpanMin() { const s = this.hmToTs(this.state.startTime), t = this.hmToTs(this.state.endTime); const d = Math.round((t - s) / 60000); return d < 1 ? 1 : d; }

  /* ================= categories / plans / search pools ================= */
  allCats() { return [...CATS, ...(this.state.customCats || [])]; }
  allItems() {
    const out = [];
    this.allCats().forEach(c => c.items.forEach(it => out.push({ ...it, color: c.color, catId: c.id })));
    return out;
  }
  itemById(id) { return this.allItems().find(t => t.id === id); }
  allPlans() { return [...PLANS, ...(this.state.customPlans || [])]; }
  planById(id) { return this.allPlans().find(p => p.id === id); }
  planMeta(p) {
    const min = p.tasks.reduce((a, t) => a + (t.min || 0), 0);
    const fat = p.tasks.reduce((a, t) => a + (t.fat || 0), 0);
    return { min, fat, minText: this.fmtMin(min), fatText: (fat >= 0 ? '+' + fat : '' + fat), metaText: p.tasks.length + '件 · ' + this.fmtMin(min) };
  }
  searchPool() { return SEARCH_DB.concat(this.state.customActions || []); }
  searchHits(kw) {
    const q = (kw || '').toLowerCase().trim();
    return this.searchPool().filter(e => e.name.toLowerCase().includes(q) || (e.kw || []).some(t => t.toLowerCase().includes(q) || q.includes(t.toLowerCase())));
  }
  searchDB(kw) { const h = this.searchHits(kw); return h.length ? h : [{ name: kw, glyph: '⭐', fh: 6, kw: [kw] }]; }

  /* ================= 強度チップ（あすけん分量入力相当） ================= */
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
        { key: 'len', label: '長さ', opts: ['短め', 'ふつう', '長め'], mult: [0.8, 1, 1.3] },
        { key: 'stress', label: '気疲れ', opts: ['少ない', 'ふつう', '多い'], mult: [0.85, 1, 1.25] },
      ];
    }
    if (has('家事')) return [{ key: 'amount', label: '量', opts: ['すこし', 'ふつう', 'たくさん'], mult: [0.8, 1, 1.3] }];
    if (has('運動')) return [{ key: 'intensity', label: '強度', opts: ['軽め', 'ふつう', 'ハード'], mult: [0.8, 1, 1.4] }];
    return [{ key: 'deg', label: '程度', opts: ['すくなめ', 'ふつう', '多め'], mult: [0.75, 1, 1.3] }];
  }
  effFh(item) {
    const qs = this.intensityQuestions(item); let m = 1;
    (item.picks || []).forEach((p, idx) => { if (qs[idx] && qs[idx].mult[p] != null) m *= qs[idx].mult[p]; });
    return item.fh * m;
  }
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
    const cart = [...this.state.searchCart, { id, name: item.name, glyph: item.glyph, fh: item.fh, kw: item.kw, picks }];
    const resolved = kwIndex == null ? this.state.resolvedIdx : [...this.state.resolvedIdx, kwIndex];
    const remaining = this.remainingKw(resolved);
    const n = cart.length;
    this.set({ searchCart: cart, resolvedIdx: resolved, moreKw: null, searchStep: remaining.length ? 'results' : 'confirm', searchTotalMin: n * 30, searchFracs: Array(n).fill(1 / n) });
  };
  addNewAction = (kwIndex, name) => {
    const item = { name, glyph: '⭐', fh: 6, kw: [name] };
    this.set({ customActions: [...(this.state.customActions || []), item] });
    this.save();
    this.selectSearchItem(kwIndex, item);
  };
  addRoughAction = (kwIndex, name) => this.selectSearchItem(kwIndex, { name, glyph: '🌀', fh: 6, kw: [name] });
  addTotal = (d) => this.set({ searchTotalMin: Math.max(1, Math.round((this.state.searchTotalMin || 30) + d)) });
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
  removeSearchItem = (id) => { const cart = this.state.searchCart.filter(x => x.id !== id); const n = cart.length; this.set({ searchCart: cart, searchTotalMin: Math.max(1, n * 30), searchFracs: n ? Array(n).fill(1 / n) : [] }); };
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
      if (isEdit) {
        // カートを空にして確定 = 削除
        this.set({ entries: baseEntries, searchStep: null, screen: 'home', editIdxs: null, confirmOrigin: 'search', confirmMode: 'duration', searchCart: [], framePlan: null });
        this.save();
        this.toast('削除しました');
      } else this.set({ searchStep: null });
      return;
    }
    const n = items.length;
    const fr = (this.state.searchFracs && this.state.searchFracs.length === n) ? this.state.searchFracs : Array(n).fill(1 / n);
    const timeMode = this.state.confirmMode === 'time';
    const totalMin = timeMode ? this.timeSpanMin() : (this.state.searchTotalMin || (n * 30));
    const mins = fr.map(f => Math.max(1, Math.round(f * totalMin)));
    const d = totalMin - mins.reduce((a, b) => a + b, 0); mins[n - 1] = Math.max(1, mins[n - 1] + d);
    const now = Date.now();
    const slotId = this.state.slotId || slotForNow();
    const slot = this.slotDef(slotId);
    let cursor = timeMode ? this.hmToTs(this.state.startTime) : null;
    // 通常記録の配置位置: 同スロットの使用済み分（編集中は元の記録を除いて数える）
    const t0 = todayStr();
    let slotOffset = baseEntries
      .filter(e => e.date === t0 && !e.exp && !e.planned && (e.slot || slotOfEntry(e)) === slotId)
      .reduce((a, e) => a + entryMin(e), 0);
    const templates = { ...(this.state.templates || {}) };
    const newEntries = items.map((t, i) => {
      const fat = Math.round(this.effFh(t) * (mins[i] / 60));
      const e = {
        ...baseEntry(t.name, fat),
        glyph: t.glyph, min: mins[i], _new: true,
      };
      // 枠に入れているときは枠タイトルでグループ化（既製の予定経由でも枠が勝つ）
      if (this.state.framePlan) e.plan = this.state.framePlan;
      else if (t.plan) e.plan = t.plan;
      if (t.after) e.after = Math.round(t.after * (mins[i] / 60));
      if (timeMode) {
        const fromTs = cursor, toTs = cursor + mins[i] * 60000;
        e.from = this.tsToHm(fromTs); e.to = this.tsToHm(toTs); cursor = toTs;
        if (toTs > now) { e.planned = true; e.dropped = planUnitsDue({ ...e, date: todayStr() }, now); e._new = e.dropped > 0; }
      } else {
        // 通常記録＝選んだ時間帯の基準時刻に配置（CLAUDE.md §G）
        e.slot = slotId;
        e.from = this.slotHm(slot, slotOffset); e.to = this.slotHm(slot, slotOffset + mins[i]);
        slotOffset += mins[i];
      }
      // 同じ予定は同じ疲労度（テンプレ学習 → カレンダー取り込みで使用）
      const k = normTitle(t.name);
      if (k) templates[k] = { act: e.act, delta: fat };
      return e;
    });
    // カレンダー枠への記録: 構成をテンプレ保存 → 次回同じタイトルの取り込みで自動適用
    const framePlan = this.state.framePlan;
    if (framePlan) {
      const fk = normTitle(framePlan);
      if (fk) {
        templates[fk] = {
          act: guessAct(framePlan) || '',
          delta: newEntries.reduce((a, e) => a + (e.delta || 0), 0),
          tasks: newEntries.map(e => ({ name: e.title, glyph: e.glyph, min: e.min, fat: e.delta })),
        };
      }
    }
    const entries = sortEntries([...baseEntries, ...newEntries]);
    const anyImmediate = newEntries.some(r => !r.planned);
    const toastMsg = framePlan ? ('きろくして「' + framePlan + '」をテンプレに保存')
      : isEdit ? 'へんこうしました' : (anyImmediate ? 'きろくしました' : '予定を追加した（時間どおりに記録）');
    this.set({ entries, templates, screen: anyImmediate ? 'shaka' : 'home', dayOffset: 0, searchStep: null, searchCart: [], keywords: [''], resolvedIdx: [], cart: {}, catId: null, confirmMode: 'duration', editIdxs: null, confirmOrigin: 'search', framePlan: null, toast: toastMsg });
    this.save();
    if (anyImmediate) {
      this.stopPhysics();
      requestAnimationFrame(() => { const el = document.getElementById('shakacase'); if (el) this.startPhysics(el); });
    }
    clearTimeout(this._t); this._t = setTimeout(() => this.set({ toast: null }), 1800);
  };

  /* ================= home / pile（疲労は日をまたいで持ち越す） ================= */
  r2(x) { return Math.round(x * 2) / 2; }
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
  // 100個で画面全体を埋めるサイズ（旧本番と同一式）
  calcR(w, h) {
    const area = Math.max(1, w) * Math.max(1, h);
    const r = Math.sqrt(area * 0.6 / (100 * Math.PI));
    return Math.max(12, Math.min(r, 60));
  }

  /* 積む絵文字: 全日付の正の疲労から回復を引く。日をまたいで持ち越す。
     時系列（日付・時刻順）に処理し、回復は「古いものから・その時点で積もっているぶんだけ」消す。
     ※末尾（最新）から引くと、回復残高がある間は新しい記録が山に出ず降ってこない。
       また合計で引くと回復が山を超えたぶんが「借金」になり将来の記録まで消してしまう。 */
  pileSource() {
    const t = todayStr();
    const stack = [];
    const proc = (r) => {
      if (r.exp) return;
      if (r.delta > 0) {
        const n = r.planned ? (r.dropped || 0) : r.delta;
        for (let i = 0; i < n; i++) stack.push({ g: entryGlyph(r), isNew: !!r._new });
      } else if (r.delta < 0) {
        const n = r.planned ? (r.dropped || 0) : -r.delta;
        stack.splice(0, n);
      }
      if (r.after) stack.splice(0, r.after);
    };
    const all = sortEntries(this.state.entries);
    // 昨日まで → 睡眠で消したぶん（consumed）は持ち越し分にだけ効かせる → 今日
    // （consumed を最後に引くと、過剰な回復残高が今日の新規記録まで食ってしまう）
    all.filter(e => (e.date || '') < t).forEach(proc);
    const consumed = this.state.consumed || 0;
    if (consumed > 0) stack.splice(0, consumed);
    all.filter(e => (e.date || '') >= t).forEach(proc);
    return stack;
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

  makePile(seed) {
    const glyphs = this.pileGlyphs().slice(-130); // 上限は新しい側を残す
    const W = this.screenW(), H = this.screenH();
    const r = this.calcR(W, H);
    const d = r * 2, font = Math.round(r * 1.6);
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
  goMypage = () => this.set({ screen: 'mypage' });
  goSleep = () => {
    this._sleepPile = null;
    const n = this.pileGlyphs().length;
    this.set({ screen: 'sleep', residual: n });
  };
  openRecord(id) { this.set({ slotMenuOpen: false, screen: 'record', slotId: id, catId: null, cart: {}, degreeItem: null, planDetailId: null, planAddOpen: false, searchStep: null, keywords: [''], searchCart: [], resolvedIdx: [], moreKw: null, intensityId: null, editIdxs: null, confirmOrigin: 'search', framePlan: null }); }
  toggleSlotMenu = () => this.set({ slotMenuOpen: !this.state.slotMenuOpen });
  pickSlot = (id) => this.set({ slotId: id, slotMenuOpen: false });
  selectCat = (id) => this.set({ catId: id });
  backToCats = () => this.set({ catId: null });

  /* ================= カテゴリ追加 ================= */
  openCatAdd = () => this.set({ catAddOpen: true, newCatName: '', newCatIcon: 'category' });
  closeCatAdd = () => this.set({ catAddOpen: false });
  onCatName = (e) => this.set({ newCatName: e.target.value });
  pickCatIcon = (icon) => this.set({ newCatIcon: icon });
  addCat = () => {
    const name = (this.state.newCatName || '').trim() || '新しいカテゴリ';
    const id = 'cust' + Date.now();
    const cat = { id, icon: this.state.newCatIcon, color: '#8a7bc4', name, sub: 'じぶんで追加', items: [
      { id: id + '_a', glyph: '⭐', icon: this.state.newCatIcon, name, last: 'はじめて', fh: 6 },
    ] };
    this.set({ customCats: [...(this.state.customCats || []), cat], catAddOpen: false, catId: id });
    this.save();
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
    const durOf = (t) => (t.fh < 0 || t.id === 'shop') ? 30 : 60;
    const totalMin = items.reduce((a, t) => a + durOf(t), 0);
    const cart = items.map((t, i) => ({ id: 'scc' + Date.now() + i, name: t.name, glyph: t.glyph, fh: this.cartFh(t), kw: [...(t.kw || []), t.name], picks: [], after: t.after || 0 }));
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
      return it;
    });
    const first = entries[idxs[0]], last = entries[idxs[idxs.length - 1]];
    const anyPlanned = idxs.some(i => !!entries[i].planned);
    this.set({
      screen: 'record', slotId: first.slot || slotOfEntry(first),
      searchStep: 'confirm', confirmOrigin: 'edit', editIdxs: idxs,
      searchCart: items, searchTotalMin: total, searchFracs: mins.map(m => m / total),
      confirmMode: anyPlanned ? 'time' : 'duration',
      startTime: anyPlanned ? (first.from || '') : '',
      endTime: anyPlanned ? (last.to || '') : '',
      catId: null, cart: {}, keywords: [''], resolvedIdx: [], moreKw: null, intensityId: null, slotMenuOpen: false,
    });
  };

  /* カレンダー枠に行動を入れる: 記録フローの入口から選ばせ、確定時に枠を置き換えてテンプレ保存 */
  openFrameFill = (g) => {
    const idx = g.idxs && g.idxs[0];
    const e = idx != null ? this.state.entries[idx] : null;
    if (!e) return;
    this.set({
      screen: 'record', slotId: e.slot || slotOfEntry(e),
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
  makeSleepPile() {
    if (this._sleepPile) return this._sleepPile;
    const glyphs = [...this.pileGlyphs()];
    let s = 51; const rng = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    for (let i = glyphs.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = glyphs[i]; glyphs[i] = glyphs[j]; glyphs[j] = t; }
    // ホーム／シャカの山と同じ幾何
    const W = this.screenW(), H = this.screenH();
    const r = this.calcR(W, H);
    const d = r * 2, font = Math.round(r * 1.6);
    const cols = Math.max(1, Math.floor(W / d)), out = [];
    const N = glyphs.length;
    for (let i = 0; i < N; i++) {
      const row = Math.floor(i / cols), col = i % cols;
      const x = Math.round(col * d + (row % 2 ? d / 2 : 0) + (rng() - 0.5) * (d * 0.35));
      out.push({
        e: glyphs[i],
        x: Math.max(-8, Math.min(W - d + 8, x)),
        y: Math.max(-6, Math.round(row * d * 0.82 + (rng() - 0.5) * (d * 0.25))),
        r2: Math.round((rng() - 0.5) * 54),
        s: font,
      });
    }
    this._sleepPile = out; this._sleepN = N; this._sleepD = d; this._sleepCols = cols;
    return out;
  }
  sleepCount() { this.makeSleepPile(); return this._sleepN; }
  finishSleep = () => {
    if (this.state.sleepAnim) return;
    const recovered = Math.max(0, this.sleepCount() - this.state.residual);
    let s = 7; const rng = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const moons = Array.from({ length: Math.min(recovered, 45) }, (_, i) => ({ x: Math.round(rng() * 86 + 2), delay: (i * 0.03).toFixed(2) + 's' }));
    this.set({ sleepAnim: true, moons });
    setTimeout(() => {
      this.set({
        collected: [...this.state.collected, { act: '睡眠', amount: recovered, ts: Date.now() }],
        consumed: (this.state.consumed || 0) + recovered,
        screen: 'home', sleepAnim: false, moons: [],
      });
      this.save();
    }, 1900);
  };

  /* ================= 予定の時間進行（旧本番と統一） ================= */
  advancePlans() {
    const now = Date.now(); let changed = false; const drops = [];
    const entries = this.state.entries.map(e => {
      if (!e.planned) return e;
      const N = Math.abs(e.delta); const due = planUnitsDue(e, now); let ne = e;
      // シャカ画面以外で進んだ分も、次のシャカ表示で降るように _new を立てる
      if (due > (e.dropped || 0)) { const add = due - (e.dropped || 0); if (e.delta > 0) { for (let i = 0; i < add; i++) drops.push(entryGlyph(e)); } ne = { ...e, dropped: due, _new: true }; changed = true; }
      if ((ne.dropped || 0) >= N) { ne = { ...ne, planned: false, dropped: N }; changed = true; }
      return ne;
    });
    if (changed) { this.set({ entries }); this.save(); if (this.state.screen === 'shaka' && drops.length) this.addFallingBodies(drops); }
  }

  /* ================= matter.js physics ================= */
  PR = 18;
  componentDidMount() {
    initShakaSound();
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
  }
  componentWillUnmount() {
    clearInterval(this._tick); clearInterval(this._planT);
    if (this._unwatch) this._unwatch();
    this.stopPhysics(); this.stopCollectPhysics();
  }

  startPhysics(el) {
    if (!el || this.engine) return;
    const { Engine, World, Bodies, Runner } = Matter;
    const rect = el.getBoundingClientRect();
    const W = rect.width || 350, H = rect.height || 700;
    const r = this.calcR(W, H);
    this.PR = r;
    this.engine = Engine.create();
    this.engine.world.gravity.y = 1;
    attachCollisionSound(this.engine);
    const t = 80;
    World.add(this.engine.world, [
      Bodies.rectangle(W / 2, H + t / 2, W + t * 2, t, { isStatic: true }),
      Bodies.rectangle(-t / 2, H / 2, t, H + t * 2, { isStatic: true }),
      Bodies.rectangle(W + t / 2, H / 2, t, H + t * 2, { isStatic: true }),
    ]);
    this.bodies = [];
    // 90個上限は新しい側（末尾）を残す — 先頭を残すと新規分が表示から漏れて降ってこない
    let marks;
    if (this.state.dayOffset === 0) marks = this.pileGlyphsMarked().slice(-90);
    else marks = this.currentBag().slice(-90).map(g => ({ g, isNew: false }));
    const newCount = marks.filter(m => m.isNew).length;
    const oldCount = marks.length - newCount;
    const perRow = Math.max(1, Math.floor(W / (2 * r)));
    marks.forEach((m, idx) => {
      const glyph = m.g;
      const isNew = idx >= oldCount;
      let x, y;
      if (isNew) {
        x = r + Math.random() * (W - 2 * r);
        y = -r - Math.random() * (H * 0.6);
      } else {
        const row = Math.floor(idx / perRow), col = idx % perRow;
        x = r + col * (2 * r) + (Math.random() - 0.5) * r * 0.5;
        y = H - r - row * (2 * r * 0.92) + (Math.random() - 0.5) * r * 0.3;
      }
      const body = Bodies.circle(x, y, r, { restitution: 0.35, friction: 0.05, frictionAir: 0.01, density: 0.001 });
      World.add(this.engine.world, body);
      const d = document.createElement('div');
      d.style.cssText = 'position:absolute;top:0;left:0;display:flex;align-items:center;justify-content:center;will-change:transform;pointer-events:none;filter:drop-shadow(0 4px 5px rgba(27,27,24,.2))';
      d.style.width = d.style.height = (2 * r) + 'px';
      d.style.fontSize = Math.round(r * 1.6) + 'px';
      d.textContent = glyph;
      el.appendChild(d);
      this.bodies.push({ body, el: d });
    });
    this.runner = Runner.create();
    Runner.run(this.runner, this.engine);
    this._running = true;
    if (newCount > 0) { clearTimeout(this._newT); this._newT = setTimeout(() => this.clearNewFlags(), 2600); }
    this._startLoop();
    // 固定モードなら落下が落ち着いてから演算を止める（絵文字は積もったまま静止）
    clearTimeout(this._settleT);
    if (!this.state.homeMotion) this._settleT = setTimeout(() => { if (!this.state.homeMotion) this.freezeMotion(); }, 2000);
  }
  _startLoop() {
    this._phys = true;
    const loop = () => {
      if (!this._phys) return;
      const rr = this.PR;
      this.bodies.forEach(({ body, el }) => {
        el.style.transform = `translate(${body.position.x - rr}px, ${body.position.y - rr}px) rotate(${body.angle}rad)`;
      });
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }
  freezeMotion() { if (!this.runner || !this._running) return; this._running = false; Matter.Runner.stop(this.runner); }
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
      const body = Bodies.circle(x, y, r, { restitution: 0.35, friction: 0.05, frictionAir: 0.01, density: 0.001 });
      World.add(this.engine.world, body);
      const d = document.createElement('div');
      d.style.cssText = 'position:absolute;top:0;left:0;display:flex;align-items:center;justify-content:center;pointer-events:none;filter:drop-shadow(0 4px 5px rgba(27,27,24,.2))';
      d.style.width = d.style.height = (2 * r) + 'px'; d.style.fontSize = Math.round(r * 1.6) + 'px'; d.textContent = g;
      el.appendChild(d);
      this.bodies.push({ body, el: d });
    });
    clearTimeout(this._settleT);
    if (!this.state.homeMotion) this._settleT = setTimeout(() => { if (!this.state.homeMotion) this.freezeMotion(); }, 2000);
  }
  stopPhysics() {
    this._phys = false; this._running = false; clearTimeout(this._settleT);
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this.runner) Matter.Runner.stop(this.runner);
    if (this.engine) { Matter.World.clear(this.engine.world); Matter.Engine.clear(this.engine); }
    if (this.bodies) this.bodies.forEach(({ el }) => el.remove());
    const caseEl = document.getElementById('shakacase');
    if (caseEl) caseEl.innerHTML = '';
    this.engine = null; this.runner = null; this.bodies = [];
  }
  shake = () => {
    if (!this.bodies) return;
    this.resumeMotion();
    this.bodies.forEach(({ body }) => {
      Matter.Body.setVelocity(body, { x: (Math.random() - 0.5) * 32, y: -Math.random() * 14 });
      Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.4);
    });
    clearTimeout(this._settleT);
    if (!this.state.homeMotion) this._settleT = setTimeout(() => { if (!this.state.homeMotion) this.freezeMotion(); }, 2000);
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
    this.collectEngine.gravity.y = 1;
    const wt = 140;
    World.add(this.collectEngine.world, [
      Bodies.rectangle(W / 2, worldH + wt / 2, W + wt * 2, wt, { isStatic: true }),
      Bodies.rectangle(-wt / 2, worldH / 2, wt, worldH * 2 + wt, { isStatic: true }),
      Bodies.rectangle(W + wt / 2, worldH / 2, wt, worldH * 2 + wt, { isStatic: true }),
    ]);
    this.collectBodies = [];
    glyphs.slice(0, 150).forEach(glyph => {
      const x = r + Math.random() * (W - 2 * r);
      const y = worldH - 60 - Math.random() * (worldH * 0.7);
      const body = Bodies.circle(x, y, r, { restitution: 0.2, friction: 0.1, frictionAir: 0.02, density: 0.001 });
      World.add(this.collectEngine.world, body);
      const d = document.createElement('div');
      d.style.cssText = 'position:absolute;top:0;left:0;display:flex;align-items:center;justify-content:center;will-change:transform;pointer-events:none';
      d.style.width = d.style.height = itemPx + 'px';
      d.style.fontSize = Math.round(r * 1.6) + 'px';
      d.textContent = glyph;
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
    const cats = this.allCats().map(c => ({ id: c.id, name: c.name, sub: c.sub, icon: c.icon, color: c.color, onSelect: () => this.selectCat(c.id) }));
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
      return { color: scPalette[idx % scPalette.length], widthPct: (fr0[idx] * 100) + '%', name: it.name, minText: timeMode ? timeText : this.fmtMin(mins[idx]), fatText: (fat >= 0 ? '+' + fat : '' + fat) };
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
    const catIconOpts = ['category', 'pets', 'volunteer_activism', 'self_improvement', 'favorite'];
    const catIconChoices = catIconOpts.map(ic => ({ icon: ic, onPick: () => this.pickCatIcon(ic), border: st.newCatIcon === ic ? '2px solid #1b1b18' : '1.5px solid #e4e1d8', bg: st.newCatIcon === ic ? '#fbfdf0' : '#fff' }));
    const subItems = (activeCat ? activeCat.items : []).map(t => {
      const e = st.cart[t.id]; const sel = !!e;
      const degTag = (e && e.degIdx != null && t.degLabels)
        ? ('（' + [t.degLabels[0], 'ふつう', t.degLabels[1]][e.degIdx] + '）') : '';
      return {
        id: t.id, icon: t.icon, color: activeCat.color, name: t.name,
        degreeTag: degTag, last: t.last,
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
    const cartFat = items.reduce((a, t) => a + Math.round(this.cartFh(t) * (this.cartFh(t) < 0 || t.id === 'shop' ? 0.5 : 1)), 0);

    const sleepN = this.sleepCount();
    const recovered = Math.max(0, sleepN - st.residual);

    const activeSlot = this.slotDef(st.slotId || slotForNow());
    const viewDateStr = shiftDate(todayStr(), st.dayOffset);

    const isEditFlow = st.confirmOrigin === 'edit';

    return {
      screenBg: st.screen === 'record' ? '#ffffff' : '#f7f4ec',
      isHome: st.screen === 'home', isRecord: st.screen === 'record',
      isSleep: st.screen === 'sleep', isShaka: st.screen === 'shaka', isMypage: st.screen === 'mypage',
      isCollect: st.screen === 'collect', collectedTotal: this.collectedTotal(),
      goCollect: this.goCollect, finishSleep: this.finishSleep,
      navHomeColor: ['home', 'record', 'sleep'].includes(st.screen) ? '#1b1b18' : '#8a8a82',
      navHomeFill: ['home', 'record', 'sleep'].includes(st.screen) ? 1 : 0,
      navShakaColor: ['shaka', 'collect'].includes(st.screen) ? '#1b1b18' : '#8a8a82',
      navShakaFill: ['shaka', 'collect'].includes(st.screen) ? 1 : 0,
      navMypageColor: st.screen === 'mypage' ? '#1b1b18' : '#8a8a82',
      navMypageFill: st.screen === 'mypage' ? 1 : 0,
      homeDateCaps: formatDateCaps(todayStr()),
      pile: st.screen === 'home' ? this.makePile(7) : [],
      sleepPile: st.screen === 'sleep' ? this.makeSleepPile().map((p, i) => ({
        ...p,
        op: i < st.residual ? 1 : (st.sleepAnim ? 0 : 0.82),
        delay: st.sleepAnim ? (0.35 + (i % 12) * 0.07).toFixed(2) + 's' : '0s',
      })) : [],
      moons: st.moons || [],
      sleepAnim: !!st.sleepAnim,
      residualPct: (Math.ceil(st.residual / (this._sleepCols || 6)) * (this._sleepD || 58) * 0.82 + 6).toFixed(0) + 'px',
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
      homeMotion: st.homeMotion, setMotionFixed: () => this.setMotion(false), setMotionMove: () => this.setMotion(true),
      motionFixedBg: st.homeMotion ? '#fff' : '#1b1b18', motionFixedColor: st.homeMotion ? '#8a8a82' : '#fff',
      motionMoveBg: st.homeMotion ? '#1b1b18' : '#fff', motionMoveColor: st.homeMotion ? '#fff' : '#8a8a82',
      addTotalM1: () => this.addTotal(-1), addTotalP1: () => this.addTotal(1), addTotalM10: () => this.addTotal(-10), addTotalP10: () => this.addTotal(10),
      searchTotalFatText: (searchTotalFat >= 0 ? '+' + searchTotalFat : '' + searchTotalFat),
      addMoreMenu: this.addMoreMenu, commitSearch: this.commitSearch, backFromConfirm: this.backFromConfirm,
      intensityOpen: !!intItem, intensityName: intItem ? intItem.name : '', intensityGlyph: intItem ? intItem.glyph : '',
      intensityFatText: (intFat >= 0 ? '+' + intFat : '' + intFat), intQuestions, closeIntensity: this.closeIntensity,
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
      openCatAdd: this.openCatAdd, closeCatAdd: this.closeCatAdd, onCatName: this.onCatName, addCat: this.addCat,
      recordSlotName: activeSlot.name, recordSlotEmoji: activeSlot.emoji,
      slotMenuOpen: !!st.slotMenuOpen, toggleSlotMenu: this.toggleSlotMenu,
      slotOptions: SLOTS.map(s => ({ id: s.id, emoji: s.emoji, name: s.name, active: s.id === (st.slotId || slotForNow()), bg: s.id === (st.slotId || slotForNow()) ? '#fbfdf0' : '#fff', onPick: () => this.pickSlot(s.id) })),
      showCart: count > 0,
      cartMeta: count + '件 · ' + this.fmtMin(items.reduce((a, t) => a + (this.cartFh(t) < 0 || t.id === 'shop' ? 0.5 : 1), 0) * 60),
      cartFatText: (cartFat >= 0 ? '+' + cartFat : '' + cartFat),
      residual: st.residual,
      recoveredAbs: recovered,
      goHome: this.goHome, goShaka: this.goShaka, goMypage: this.goMypage, goSleep: this.goSleep,
      goConfirm: this.goConfirm,
      toggleTemplateToast: this.toggleTemplateToast, shake: this.shake,
      shakaDate: st.dayOffset === 0 ? formatDateShort(todayStr()) : formatDateShort(viewDateStr),
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
      <div className="app-screen" ref={this._screenRef} style={{ background: v.screenBg }}>
        {/* status bar spacer */}
        <div style={{ height: 'max(40px, env(safe-area-inset-top))', flex: '0 0 auto', zIndex: 5 }} />
        {v.isHome && <Home v={v} />}
        {v.isRecord && <Record v={v} />}
        {v.isSleep && <Sleep v={v} />}
        {v.isShaka && <Shaka v={v} />}
        {v.isCollect && <Collect v={v} />}
        {v.isMypage && <MyPage v={v} />}
        {v.showToast && (
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 88, zIndex: 9, background: '#1b1b18', color: '#fff', borderRadius: 999, padding: '11px 20px', fontSize: 12.5, fontWeight: 700, boxShadow: '0 10px 24px rgba(27,27,24,.3)', whiteSpace: 'nowrap', animation: 'pop .25s ease' }}>{v.toastText}</div>
        )}
        <Nav v={v} />
      </div>
    );
  }
}
