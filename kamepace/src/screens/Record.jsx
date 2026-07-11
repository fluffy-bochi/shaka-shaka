import React from 'react';
import SlotPill from './SlotPill';
import EmojiPicker from './EmojiPicker';
import Emo from '../fluent';

const mono = { fontFamily: "'Space Mono',monospace" };
const msIcon = (size, color, fill = true) => ({ fontFamily: 'Material Symbols Rounded', ...(fill ? { fontVariationSettings: "'FILL' 1" } : {}), fontSize: size, color });

/* 分の表示をタップするとキーボード入力に切り替わる（Enter/フォーカスアウトで確定） */
function MinEdit({ text, raw, onSet, style }) {
  const [editing, setEditing] = React.useState(false);
  const [val, setVal] = React.useState('');
  if (!onSet) return <span style={style}>{text}</span>;
  if (!editing) {
    return (
      <button onClick={() => { setVal(String(raw)); setEditing(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, ...style }}>{text}</button>
    );
  }
  const commit = () => { setEditing(false); onSet(val); };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      <input
        type="number" inputMode="numeric" min="1" autoFocus value={val}
        onChange={(e) => setVal(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        style={{ ...mono, fontSize: 14, fontWeight: 700, width: 58, textAlign: 'center', border: '1.5px solid #1b1b18', borderRadius: 8, outline: 'none', padding: '3px 2px', background: '#fff', color: '#1b1b18' }}
      />
      <span style={{ fontSize: 11, color: '#8a8a82' }}>分</span>
    </span>
  );
}
const sectionLabel = { ...mono, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a8a82', padding: '14px 22px 6px' };

export default function Record({ v }) {
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: '#fff' }}>
      {v.showCats && <Cats v={v} />}
      {v.searchInputOpen && <SearchInput v={v} />}
      {v.searchResultsOpen && <SearchResults v={v} />}
      {v.searchMoreOpen && <SearchMore v={v} />}
      {v.searchConfirmOpen && <Confirm v={v} />}
      {v.showSub && <Sub v={v} />}
      {v.showCart && !v.searchConfirmOpen && <CartBar v={v} />}
      {v.degreeOpen && <DegreePopup v={v} />}
      {v.catAddOpen && <CatAddPopup v={v} />}
      {v.actAddOpen && <ActAddPopup v={v} />}
      {v.intensityOpen && <IntensityPopup v={v} />}
      {v.planDetailOpen && <PlanDetailPopup v={v} />}
      {v.planAddOpen && <PlanAddPopup v={v} />}
    </div>
  );
}

/* ---- STEP 1 : 入口（検索窓 → 予定から → 大カテゴリから） ---- */
function Cats({ v }) {
  return (
    <div className="nos" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '6px 18px 12px 22px' }}>
        <button onClick={v.goHome} style={{ background: 'none', border: 'none', fontSize: 19, color: '#8a8a82', cursor: 'pointer' }}>✕</button>
        <div style={{ fontSize: 16, fontWeight: 700, flex: 1 }}>記録</div>
        <SlotPill v={v} />
      </div>
      <div style={{ padding: '0 16px' }}>
        <button onClick={v.openSearch} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 9, background: '#efece3', border: 'none', borderRadius: 12, padding: '11px 13px', cursor: 'pointer', textAlign: 'left' }}>
          <span style={msIcon(19, '#8a8a82', false)}>search</span>
          <span style={{ fontSize: 14, color: '#a5a39a' }}>なにをした？（例：皿洗い、会議）</span>
        </button>
      </div>
      <div style={sectionLabel}>予定から</div>
      <div style={{ padding: '0 0 2px' }}>
        {v.plans.map(p => (
          <button key={p.id} onClick={p.onOpen} style={{ display: 'flex', width: '100%', textAlign: 'left', alignItems: 'center', gap: 13, padding: '10px 22px', border: 'none', borderBottom: '1px solid #f1efe8', background: '#fff', cursor: 'pointer' }}>
            <span style={{ width: 26, textAlign: 'center', flex: '0 0 auto', fontSize: 19 }}>📋</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1b1b18' }}>{p.name}</div>
              <div style={{ ...mono, fontSize: 11, color: '#9d9b91', marginTop: 1 }}>{p.meta}</div>
            </div>
            <span style={{ fontSize: 16, color: '#c9c7bf' }}>›</span>
          </button>
        ))}
        <button onClick={v.openPlanAdd} style={{ display: 'flex', width: 'calc(100% - 32px)', margin: '12px 16px 2px', alignItems: 'center', justifyContent: 'center', gap: 7, border: '1.5px dashed #d8d5cb', borderRadius: 12, padding: '12px 0', fontSize: 13, fontWeight: 700, color: '#8a8a82', background: '#fff', cursor: 'pointer' }}>
          <span style={msIcon(18, '#8a8a82', false)}>calendar_add_on</span>予定をつくる
        </button>
      </div>
      <div style={sectionLabel}>大カテゴリから</div>
      <div style={{ padding: '0 0 10px' }}>
        {v.cats.map(c => (
          <button key={c.id} onClick={c.onSelect} style={{ display: 'flex', width: '100%', textAlign: 'left', alignItems: 'center', gap: 13, padding: '10px 22px', border: 'none', borderBottom: '1px solid #f1efe8', background: '#fff', cursor: 'pointer' }}>
            <span style={{ ...msIcon(22, c.color), width: 26, textAlign: 'center', flex: '0 0 auto' }}>{c.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1b1b18' }}>{c.name}</div>
              <div style={{ ...mono, fontSize: 11, color: '#9d9b91', marginTop: 1 }}>{c.sub}</div>
            </div>
            <span style={{ fontSize: 16, color: '#c9c7bf' }}>›</span>
          </button>
        ))}
        <button onClick={v.openCatAdd} style={{ display: 'flex', width: 'calc(100% - 32px)', margin: '14px 16px 0', alignItems: 'center', justifyContent: 'center', gap: 7, border: '1.5px dashed #d8d5cb', borderRadius: 12, padding: '12px 0', fontSize: 13, fontWeight: 700, color: '#8a8a82', background: '#fff', cursor: 'pointer' }}>＋ 大カテゴリを追加</button>
      </div>
    </div>
  );
}

/* ---- 検索: 複数キーワード入力 ---- */
function SearchInput({ v }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '6px 22px 10px' }}>
        <button onClick={v.closeSearch} style={{ background: 'none', border: 'none', fontSize: 19, color: '#8a8a82', cursor: 'pointer' }}>‹</button>
        <div style={{ fontSize: 16, fontWeight: 700, flex: 1 }}>記録</div>
        <SlotPill v={v} />
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, margin: '0 16px', background: '#f0f6d8', borderRadius: 14, padding: '12px 14px' }}>
        <span style={{ ...msIcon(20, '#7a9a00', false), flex: '0 0 auto' }}>manage_search</span>
        <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.5, color: '#4a5a00' }}>
          一度に10件までまとめて検索できます
          <div style={{ fontSize: 11, fontWeight: 400, color: '#7a8a3a', marginTop: 2 }}>やったことを思い出しながら書き出してOK</div>
        </div>
      </div>
      <div className="nos" style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {v.keywordRows.map(k => (
          <div key={k.i} style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#efece3', borderRadius: 12, padding: '2px 12px', flex: '0 0 auto' }}>
            <span style={{ ...msIcon(19, '#8a8a82', false), flex: '0 0 auto' }}>search</span>
            <input value={k.val} onChange={k.onInput} placeholder={k.placeholder} style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', fontFamily: "'Zen Kaku Gothic New',sans-serif", fontSize: 15, color: '#1b1b18', padding: '11px 0' }} />
            {k.hasVal && <button onClick={k.onClear} style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: '#c9c7bf', color: '#fff', fontSize: 13, cursor: 'pointer', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>}
          </div>
        ))}
      </div>
      <div style={{ flex: '0 0 auto', padding: '8px 16px 22px' }}>
        <button onClick={v.runSearch} style={{ width: '100%', border: 'none', borderRadius: 14, background: v.searchBtnBg, color: v.searchBtnColor, fontWeight: 700, fontSize: 16, padding: 16, cursor: 'pointer' }}>検索</button>
      </div>
    </div>
  );
}

/* ---- 検索: 類似結果 ---- */
function SearchResults({ v }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '6px 22px 8px' }}>
        <button onClick={v.openSearch} style={{ background: 'none', border: 'none', fontSize: 19, color: '#8a8a82', cursor: 'pointer' }}>‹</button>
        <div style={{ fontSize: 16, fontWeight: 700, flex: 1 }}>近いものをえらぶ</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '0 16px 4px', background: '#e9f0ff', borderRadius: 12, padding: '10px 13px' }}>
        <span style={{ ...msIcon(18, '#6f8fbf', false), flex: '0 0 auto' }}>help</span>
        <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: '#3a5a8f' }}>見つからない時は「もっと見る」から</div>
      </div>
      <div className="nos" style={{ flex: 1, overflowY: 'auto', padding: '6px 0 8px' }}>
        {v.searchGroups.map(g => (
          <div key={g.i} style={{ marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px 8px' }}>
              <span style={{ fontSize: 14, fontWeight: 900, flex: 1 }}>{g.kw}</span>
              <span style={{ ...mono, fontSize: 12, color: '#8a8a82' }}>{g.countText}</span>
            </div>
            {g.items.map((it, ii) => (
              <div key={ii} style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 16px 8px', background: '#fff', borderRadius: 14, padding: '12px 14px', boxShadow: '0 1px 3px rgba(27,27,24,.06)' }}>
                <span style={{ fontSize: 19, flex: '0 0 auto' }}>{it.glyph}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.4 }}>{it.name}</div>
                  <div style={{ ...mono, fontSize: 11, color: '#f5994e', marginTop: 2 }}>目安 {it.fatText}/h</div>
                </div>
                <button onClick={it.onAdd} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: '#c4f000', color: '#2f3a00', fontSize: 19, fontWeight: 700, cursor: 'pointer', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>＋</button>
              </div>
            ))}
            {g.noHit && (
              <div style={{ margin: '0 16px 8px', background: '#fff', borderRadius: 14, padding: 14, boxShadow: '0 1px 3px rgba(27,27,24,.06)' }}>
                <div style={{ fontSize: 12.5, color: '#8a8a82', lineHeight: 1.5 }}>「{g.kw}」に近い候補が見つかりませんでした。どちらで記録する？</div>
                <button onClick={g.onAddNew} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 10, marginTop: 10, border: '1.5px solid #1b1b18', borderRadius: 12, padding: '11px 13px', background: '#fff', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ ...msIcon(21, '#7a9a00', false), flex: '0 0 auto' }}>add_circle</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700 }}>「{g.kw}」を新しく登録</span>
                    <span style={{ display: 'block', fontSize: 11, color: '#9d9b91', marginTop: 1 }}>次回から候補に出ます</span>
                  </span>
                </button>
                <button onClick={g.onAddRough} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 10, marginTop: 8, border: '1.5px solid #e4e1d8', borderRadius: 12, padding: '11px 13px', background: '#fff', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ ...msIcon(21, '#8a8a82', false), flex: '0 0 auto' }}>bolt</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700 }}>だいたいで登録</span>
                    <span style={{ display: 'block', fontSize: 11, color: '#9d9b91', marginTop: 1 }}>きまった目安の疲労で記録（あとで調整）</span>
                  </span>
                </button>
              </div>
            )}
            {g.hasMore && (
              <button onClick={g.onMore} style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 6, padding: '0 22px 10px', border: 'none', background: 'none', fontSize: 13, fontWeight: 700, color: '#7a9a00', cursor: 'pointer' }}>もっと見る ›</button>
            )}
            <div style={{ height: 1, background: '#efece3', margin: '0 16px 8px' }} />
          </div>
        ))}
      </div>
      <div style={{ flex: '0 0 auto', padding: '8px 16px 22px' }}>
        <button onClick={v.goSearchConfirm} style={{ width: '100%', border: 'none', borderRadius: 14, background: '#1b1b18', color: '#fff', fontWeight: 700, fontSize: 15, padding: 15, cursor: 'pointer' }}>えらび終えた · 登録を確認 ›</button>
      </div>
    </div>
  );
}

/* ---- 検索: もっと見る ---- */
function SearchMore({ v }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '6px 20px 8px' }}>
        <button onClick={v.closeMore} style={{ background: 'none', border: 'none', fontSize: 19, color: '#8a8a82', cursor: 'pointer' }}>‹</button>
        <div style={{ fontSize: 16, fontWeight: 700, flex: 1 }}>{v.moreData.kw}</div>
        <span style={{ ...mono, fontSize: 12, color: '#8a8a82' }}>{v.moreData.countText}</span>
      </div>
      <div className="nos" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '2px 16px 8px', flex: '0 0 auto' }}>
        {v.moreFilters.map((f, fi) => (
          <button key={fi} onClick={f.onPick} style={{ flex: '0 0 auto', border: `1.5px solid ${f.border}`, background: f.bg, color: f.color, borderRadius: 999, padding: '8px 16px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>{f.text}</button>
        ))}
      </div>
      <div className="nos" style={{ flex: 1, overflowY: 'auto', padding: '4px 0 8px' }}>
        {v.moreData.items.map((it, ii) => (
          <div key={ii} style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 16px 8px', background: '#fff', borderRadius: 14, padding: '12px 14px', boxShadow: '0 1px 3px rgba(27,27,24,.06)' }}>
            <span style={{ fontSize: 19, flex: '0 0 auto' }}>{it.glyph}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.4 }}>{it.name}</div>
              <div style={{ ...mono, fontSize: 11, color: '#f5994e', marginTop: 2 }}>目安 {it.fatText}/h</div>
            </div>
            <button onClick={it.onAdd} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: '#c4f000', color: '#2f3a00', fontSize: 19, fontWeight: 700, cursor: 'pointer', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>＋</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- 登録を確認（統一確認UI）＋時間の割り振り ---- */
function Confirm({ v }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: '#f7f4ec' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '6px 20px 10px' }}>
        <button onClick={v.backFromConfirm} style={{ background: 'none', border: 'none', fontSize: 19, color: '#8a8a82', cursor: 'pointer' }}>‹</button>
        <div style={{ fontSize: 16, fontWeight: 700, flex: 1 }}>{v.confirmTitle}</div>
        <SlotPill v={v} />
      </div>
      <div className="nos" style={{ flex: 1, overflowY: 'auto', padding: '2px 16px 8px' }}>
        {v.searchCartRows.map(r => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderRadius: 14, padding: '11px 12px', marginBottom: 8, boxShadow: '0 1px 3px rgba(27,27,24,.05)' }}>
            <button onClick={r.onRemove} style={{ width: 26, height: 26, border: 'none', background: 'none', fontSize: 17, color: '#c9c7bf', cursor: 'pointer', flex: '0 0 auto' }}>✕</button>
            <span style={{ fontSize: 17, flex: '0 0 auto' }}>{r.glyph}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.4 }}>{r.name}</div>
              <div style={{ ...mono, fontSize: 10.5, color: '#f5994e', marginTop: 1 }}>{r.fatText}</div>
            </div>
            <button onClick={r.onIntensity} style={{ border: '1.5px solid #c4de52', background: '#fbfdf0', borderRadius: 10, padding: '7px 11px', fontSize: 11.5, fontWeight: 700, color: '#4a5a00', cursor: 'pointer', flex: '0 0 auto', maxWidth: 118, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.intensityText}</button>
          </div>
        ))}
        <button onClick={v.addMoreMenu} style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#fff', border: 'none', borderRadius: 14, padding: '14px 0', fontSize: 14, fontWeight: 700, color: '#7a9a00', cursor: 'pointer', boxShadow: '0 1px 3px rgba(27,27,24,.05)' }}>
          <span style={msIcon(20, '#7a9a00', false)}>add_circle</span>メニューを追加
        </button>
        <div style={{ marginTop: 12, background: '#fff', borderRadius: 16, padding: 15, boxShadow: '0 1px 3px rgba(27,27,24,.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>時間の割り振り</span>
            <div style={{ display: 'flex', gap: 0, background: '#efece3', borderRadius: 10, padding: 3 }}>
              <button onClick={v.setDurationMode} style={{ border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', background: v.durTabBg, color: v.durTabColor }}>所要時間</button>
              <button onClick={v.setTimeMode} style={{ border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', background: v.timeTabBg, color: v.timeTabColor }}>時刻</button>
            </div>
          </div>
          {v.isDurationMode && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 }}>
              <button onClick={v.addTotalM10} style={{ width: 32, height: 32, borderRadius: 9, border: '1.5px solid #e4e1d8', background: '#fff', ...mono, fontSize: 11, fontWeight: 700, color: '#55554e', cursor: 'pointer' }}>-10</button>
              <button onClick={v.addTotalM1} style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid #1b1b18', background: '#fff', fontSize: 17, color: '#1b1b18', cursor: 'pointer' }}>−</button>
              <MinEdit text={v.searchTotalText} raw={v.searchTotalMinRaw} onSet={v.setTotalMin} style={{ ...mono, fontSize: 15, fontWeight: 700, minWidth: 60, textAlign: 'center' }} />
              <button onClick={v.addTotalP1} style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid #1b1b18', background: '#fff', fontSize: 17, color: '#1b1b18', cursor: 'pointer' }}>＋</button>
              <button onClick={v.addTotalP10} style={{ width: 32, height: 32, borderRadius: 9, border: '1.5px solid #e4e1d8', background: '#fff', ...mono, fontSize: 11, fontWeight: 700, color: '#55554e', cursor: 'pointer' }}>+10</button>
            </div>
          )}
          {v.isTimeMode && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                <input type="time" value={v.startTime} onChange={v.onStartTime} style={{ flex: 1, minWidth: 0, ...mono, fontSize: 15, fontWeight: 700, border: '1.5px solid #e4e1d8', borderRadius: 10, padding: '9px 8px', textAlign: 'center', color: '#1b1b18', background: '#fff' }} />
                <span style={{ color: '#8a8a82', fontSize: 14 }}>→</span>
                <input type="time" value={v.endTime} onChange={v.onEndTime} style={{ flex: 1, minWidth: 0, ...mono, fontSize: 15, fontWeight: 700, border: '1.5px solid #e4e1d8', borderRadius: 10, padding: '9px 8px', textAlign: 'center', color: '#1b1b18', background: '#fff' }} />
              </div>
              <div style={{ fontSize: 11, color: '#6f8fbf', marginTop: 7, lineHeight: 1.5 }}>終了が先の時刻なら「予定」として時間どおりに1個ずつ記録されます</div>
            </>
          )}
          {/* 配分バー: つまみを左右ドラッグで1分単位調整 */}
          <div style={{ position: 'relative', height: 38, marginTop: 14, touchAction: 'none' }}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', borderRadius: 11, overflow: 'hidden' }}>
              {v.allocSegs.map((s, si) => <div key={si} style={{ width: s.widthPct, background: s.color }} />)}
            </div>
            {v.allocHandles.map((h, hi) => (
              <div key={hi} onPointerDown={h.onDrag} onPointerMove={h.onDrag} style={{ position: 'absolute', top: -4, bottom: -4, left: h.leftPct, width: 28, marginLeft: -14, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'ew-resize', touchAction: 'none' }}>
                <span style={{ width: 8, height: 34, borderRadius: 5, background: '#fff', border: '2px solid #1b1b18', boxShadow: '0 2px 6px rgba(27,27,24,.3)' }} />
              </div>
            ))}
          </div>
          {v.allocSegs.map((s, si) => (
            <div key={si} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 2px 9px', borderBottom: '1px solid #f1efe8' }}>
              <span style={{ width: 11, height: 11, borderRadius: 3, background: s.color, flex: '0 0 auto' }} />
              <span style={{ fontSize: 13.5, flex: 1, minWidth: 0 }}>{s.name}</span>
              <MinEdit text={s.minText} raw={s.rawMin} onSet={s.onSetMin} style={{ ...mono, fontSize: 12, fontWeight: 700, background: '#efece3', borderRadius: 8, padding: '4px 9px' }} />
              <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: '#f5994e', width: 34, textAlign: 'right' }}>{s.fatText}</span>
            </div>
          ))}
          <div style={{ fontSize: 11, color: '#b4b2a8', marginTop: 8 }}>つまみを左右にドラッグで配分を変更（1分単位）。強度チップで体感を調整</div>
        </div>
        <button onClick={v.openTplSave} style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, border: '1.5px solid #1b1b18', borderRadius: 13, padding: '13px 0', fontSize: 13, fontWeight: 700, background: '#fff', color: '#1b1b18', cursor: 'pointer' }}>📋 これらをテンプレにまとめる</button>
        <div style={{ fontSize: 11, color: '#b4b2a8', marginTop: 7, textAlign: 'center' }}>まとめると「予定から」とカレンダー取り込みで次回から自動で使えます</div>
      </div>
      {v.tplOpen && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 9, background: 'rgba(27,27,24,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 18px' }}>
          <div style={{ width: '100%', background: '#fff', borderRadius: 22, padding: '16px 20px 20px', boxShadow: '0 24px 60px rgba(27,27,24,.35)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 900, paddingLeft: 28 }}>テンプレにまとめる</div>
              <button onClick={v.closeTpl} style={{ width: 28, height: 28, background: 'none', border: 'none', fontSize: 18, color: '#55554e', cursor: 'pointer', flex: '0 0 auto' }}>✕</button>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 14, color: '#55554e' }}>テンプレの名前</div>
            <input value={v.tplName} onChange={v.onTplName} placeholder="例：学生相談室、朝のしたく" style={{ width: '100%', marginTop: 8, background: '#efece3', border: 'none', borderRadius: 12, padding: '12px 14px', fontFamily: "'Zen Kaku Gothic New',sans-serif", fontSize: 15, fontWeight: 700, color: '#1b1b18', boxSizing: 'border-box', outline: 'none' }} />
            <div style={{ fontSize: 11.5, color: '#8a8a82', marginTop: 10, lineHeight: 1.7 }}>いまの行動と時間の組み合わせを保存します。同じ名前の予定をGoogleカレンダーから取り込むと、次回から自動でこの構成が使われます。</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={v.closeTpl} style={{ flex: 1, border: '2px solid #e4e1d8', borderRadius: 13, background: '#fff', color: '#55554e', fontWeight: 700, fontSize: 14, padding: '14px 0', cursor: 'pointer' }}>キャンセル</button>
              <button onClick={v.saveTpl} style={{ flex: 1.5, border: 'none', borderRadius: 13, background: '#c4f000', color: '#2f3a00', fontWeight: 700, fontSize: 14, padding: '14px 0', cursor: 'pointer' }}>まとめる</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ flex: '0 0 auto', padding: '10px 16px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 4px 9px' }}>
          <span style={{ fontSize: 12, color: '#8a8a82' }}>合計 {v.searchTotalText}</span>
          <span style={{ ...mono, fontSize: 15, fontWeight: 700 }}>{v.searchTotalFatText}</span>
        </div>
        <button onClick={v.commitSearch} style={{ width: '100%', border: 'none', borderRadius: 14, background: '#c4f000', color: '#2f3a00', fontWeight: 700, fontSize: 16, padding: 16, cursor: 'pointer' }}>{v.commitLabel}</button>
        {v.isEditFlow && (
          <button onClick={v.trashOriginal} style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, border: '1.5px solid #e4e1d8', borderRadius: 12, background: '#fff', color: '#b4645a', fontWeight: 700, fontSize: 13, padding: '11px 0', cursor: 'pointer' }}>🗑 この記録をゴミ箱へ</button>
        )}
      </div>
    </div>
  );
}

/* ---- STEP 2 : 小カテゴリ ---- */
function Sub({ v }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '6px 22px 12px' }}>
        <button onClick={v.backToCats} style={{ background: 'none', border: 'none', fontSize: 19, color: '#8a8a82', cursor: 'pointer' }}>‹</button>
        <span style={{ ...msIcon(22, v.subColor), flex: '0 0 auto' }}>{v.subIcon}</span>
        <div style={{ fontSize: 16, fontWeight: 700, flex: 1 }}>{v.subName}</div>
        <SlotPill v={v} small />
      </div>
      <div className="nos" style={{ flex: 1, overflowY: 'auto', padding: '2px 0 8px' }}>
        {v.subItems.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '9px 22px', borderBottom: '1px solid #f1efe8', background: t.rowBg }}>
            <span style={{ ...msIcon(22, t.color), width: 26, textAlign: 'center', flex: '0 0 auto' }}>{t.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: t.weight, color: '#1b1b18' }}>{t.name}{t.degreeTag}</div>
              <div style={{ ...mono, fontSize: 11, color: '#9d9b91', marginTop: 1 }}>{t.last}</div>
            </div>
            <button onClick={t.onTap} style={{ width: 30, height: 30, borderRadius: '50%', border: t.btnBorder, background: t.btnBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 700, flex: '0 0 auto', cursor: 'pointer', color: t.btnColor }}>{t.btnLabel}</button>
          </div>
        ))}
        <button onClick={v.openActAdd} style={{ display: 'flex', width: 'calc(100% - 32px)', alignItems: 'center', justifyContent: 'center', gap: 7, margin: '14px 16px 0', border: '1.5px dashed #d8d5cb', borderRadius: 12, padding: '11px 0', fontSize: 12.5, fontWeight: 700, color: '#8a8a82', background: '#fff', cursor: 'pointer' }}>＋ にているものをコピーして作る</button>
      </div>
    </div>
  );
}

/* ---- shared cart bar ---- */
function CartBar({ v }) {
  return (
    <div style={{ flex: '0 0 auto', padding: '10px 14px 22px' }}>
      <div style={{ background: '#1b1b18', borderRadius: 18, padding: '10px 10px 10px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ whiteSpace: 'nowrap' }}>
          <div style={{ ...mono, fontSize: 10, letterSpacing: '.1em', color: '#9a9a90' }}>{v.cartMeta}</div>
          <div style={{ ...mono, fontSize: 16, fontWeight: 700, color: '#fff' }}>目安 {v.cartFatText}</div>
        </div>
        <button onClick={v.goConfirm} style={{ flex: 1, border: 'none', borderRadius: 12, background: '#c4f000', color: '#2f3a00', fontWeight: 700, fontSize: 15, padding: '14px 0', cursor: 'pointer' }}>登録を確認 ›</button>
      </div>
    </div>
  );
}

/* ---- 程度 popup ---- */
function DegreePopup({ v }) {
  const degBtn = (border, bg, weight, onClick, label) => (
    <button onClick={onClick} style={{ flex: 1, textAlign: 'center', border, background: bg, borderRadius: 13, padding: '11px 0', fontSize: 12.5, fontWeight: weight, cursor: 'pointer' }}>{label}</button>
  );
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 5, background: 'rgba(27,27,24,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 18px' }}>
      <div style={{ width: '100%', background: '#fff', borderRadius: 22, padding: '16px 20px 20px', boxShadow: '0 24px 60px rgba(27,27,24,.35)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 900, paddingLeft: 28 }}>程度をえらぶ</div>
          <button onClick={v.closeDegree} style={{ width: 28, height: 28, background: 'none', border: 'none', fontSize: 18, color: '#55554e', cursor: 'pointer', flex: '0 0 auto' }}>✕</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, background: '#f7f4ec', borderRadius: 14, padding: '12px 14px', marginTop: 14 }}>
          <span style={{ ...msIcon(21, v.degreeColor), flex: '0 0 auto' }}>{v.degreeIcon}</span>
          <div style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 900 }}>{v.degreeName}</div>
        </div>
        <div style={{ background: '#c4f000', borderRadius: 14, padding: '12px 14px', marginTop: 10, textAlign: 'center' }}>
          <span style={{ display: 'inline-block', background: '#fff', borderRadius: 999, padding: '3px 12px', fontSize: 11, fontWeight: 900, color: '#2f3a00' }}>疲労の目安</span>
          <div style={{ ...mono, fontSize: 15, fontWeight: 700, color: '#2f3a00', marginTop: 5 }}>{v.degreePaceText}</div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, marginTop: 14, color: '#55554e' }}>{v.degreeQuestion}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          {degBtn(v.degBorderLo, v.degBgLo, v.degWeightLo, v.degLo, 'すくなめ')}
          {degBtn(v.degBorderMid, v.degBgMid, v.degWeightMid, v.degMid, 'ふつう')}
          {degBtn(v.degBorderHi, v.degBgHi, v.degWeightHi, v.degHi, '多め')}
        </div>
        <div style={{ fontSize: 11, color: '#b4b2a8', marginTop: 12, lineHeight: 1.7, textAlign: 'center' }}>えらんだ程度で次回から履歴に出ます</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button onClick={v.closeDegree} style={{ flex: 1, border: '2px solid #e4e1d8', borderRadius: 13, background: '#fff', color: '#55554e', fontWeight: 700, fontSize: 14, padding: '14px 0', cursor: 'pointer' }}>スキップ</button>
          <button onClick={v.confirmDegree} style={{ flex: 1.5, border: 'none', borderRadius: 13, background: '#c4f000', color: '#2f3a00', fontWeight: 700, fontSize: 14, padding: '14px 0', cursor: 'pointer' }}>カートに入れる</button>
        </div>
      </div>
    </div>
  );
}

/* ---- 大カテゴリ追加 popup ---- */
function CatAddPopup({ v }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 6, background: 'rgba(27,27,24,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 18px' }}>
      <div style={{ width: '100%', background: '#fff', borderRadius: 22, padding: '16px 20px 20px', boxShadow: '0 24px 60px rgba(27,27,24,.35)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 900, paddingLeft: 28 }}>大カテゴリを追加</div>
          <button onClick={v.closeCatAdd} style={{ width: 28, height: 28, background: 'none', border: 'none', fontSize: 18, color: '#55554e', cursor: 'pointer', flex: '0 0 auto' }}>✕</button>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, marginTop: 14, color: '#55554e' }}>なまえ</div>
        <input value={v.newCatName} onChange={v.onCatName} placeholder="例：ペットのこと" style={{ width: '100%', marginTop: 8, background: '#efece3', border: 'none', borderRadius: 12, padding: '12px 14px', fontFamily: "'Zen Kaku Gothic New',sans-serif", fontSize: 15, fontWeight: 700, color: '#1b1b18', boxSizing: 'border-box', outline: 'none' }} />
        <div style={{ fontSize: 12, fontWeight: 700, marginTop: 14, color: '#55554e' }}>アイコン</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 8 }}>
          {v.catIconChoices.map((ic, ii) => (
            <button key={ii} onClick={ic.onPick} style={{ width: 40, height: 40, borderRadius: 11, border: ic.border, background: ic.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <span style={msIcon(20, '#55554e')}>{ic.icon}</span>
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, marginTop: 14, color: '#55554e' }}>標準の絵文字（このカテゴリの行動に使われます）</div>
        <EmojiPicker value={v.newCatGlyph} onPick={v.pickCatGlyph} />
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button onClick={v.closeCatAdd} style={{ flex: 1, border: '2px solid #e4e1d8', borderRadius: 13, background: '#fff', color: '#55554e', fontWeight: 700, fontSize: 14, padding: '14px 0', cursor: 'pointer' }}>キャンセル</button>
          <button onClick={v.addCat} style={{ flex: 1.5, border: 'none', borderRadius: 13, background: '#c4f000', color: '#2f3a00', fontWeight: 700, fontSize: 14, padding: '14px 0', cursor: 'pointer' }}>作る</button>
        </div>
      </div>
    </div>
  );
}

/* ---- 行動をつくる popup（コピー式・設計書§2） ---- */
function ActAddPopup({ v }) {
  const [srcOpen, setSrcOpen] = React.useState(false);
  const cur = v.actSrcChoices.find(sc => sc.on) || v.actSrcChoices[0];
  const cmpBtns = (opts) => (
    <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
      {opts.map((o, oi) => (
        <button key={oi} onClick={o.onPick} style={{ flex: 1, textAlign: 'center', border: o.on ? '2px solid #1b1b18' : '1.5px solid #e4e1d8', background: o.on ? '#fbfdf0' : '#fff', borderRadius: 10, padding: '9px 0', fontSize: 10.5, fontWeight: o.on ? 900 : 700, cursor: 'pointer', lineHeight: 1.3 }}>{o.text}</button>
      ))}
    </div>
  );
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 7, background: 'rgba(27,27,24,.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div className="nos" style={{ width: '100%', maxHeight: '92%', overflowY: 'auto', background: '#fff', borderRadius: '22px 22px 0 0', padding: '16px 18px 20px', boxShadow: '0 -12px 40px rgba(27,27,24,.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 900, paddingLeft: 28 }}>行動をつくる</div>
          <button onClick={v.closeActAdd} style={{ width: 28, height: 28, background: 'none', border: 'none', fontSize: 18, color: '#55554e', cursor: 'pointer', flex: '0 0 auto' }}>✕</button>
        </div>
        {/* コピー元を選ぶ（プルダウン。空欄からの新規は不可＝アンカリング） */}
        <div style={{ fontSize: 12, fontWeight: 700, marginTop: 14, color: '#55554e' }}>にているものをえらぶ（コピー元）</div>
        <div style={{ position: 'relative', marginTop: 8 }}>
          <button onClick={() => setSrcOpen(!srcOpen)} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 9, border: '1.5px solid #e4e1d8', background: '#fff', borderRadius: 12, padding: '11px 13px', cursor: 'pointer', textAlign: 'left' }}>
            <span style={{ fontSize: 17 }}>{cur ? cur.glyph : ''}</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#1b1b18' }}>{cur ? cur.name : ''}</span>
            <span style={{ fontFamily: 'Material Symbols Rounded', fontSize: 19, color: '#8a8a82' }}>{srcOpen ? 'expand_less' : 'expand_more'}</span>
          </button>
          {srcOpen && (
            <div className="nos" style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 4px)', zIndex: 5, background: '#fff', border: '1px solid #efece3', borderRadius: 14, boxShadow: '0 12px 28px rgba(27,27,24,.2)', padding: 6, maxHeight: 210, overflowY: 'auto' }}>
              {v.actSrcChoices.map(sc => (
                <button key={sc.id} onClick={() => { sc.onPick(); setSrcOpen(false); }} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 9, background: sc.on ? '#fbfdf0' : '#fff', border: 'none', borderRadius: 10, padding: '10px 11px', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ fontSize: 16 }}>{sc.glyph}</span>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: '#1b1b18' }}>{sc.name}</span>
                  {sc.on && <span style={{ fontFamily: 'Material Symbols Rounded', fontSize: 17, color: '#7a9a00' }}>check</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* くらべてどう？（体・心それぞれ。回復系は「回復の量」で比べる） */}
        <div style={{ fontSize: 12, fontWeight: 700, marginTop: 16, color: '#55554e' }}>「{v.actSrcName}」と同じ時間やったとして、{v.actIsRecover ? 'からだの回復は？' : 'からだは？'}</div>
        {cmpBtns(v.actBodyOpts)}
        <div style={{ fontSize: 12, fontWeight: 700, marginTop: 12, color: '#55554e' }}>{v.actIsRecover ? 'こころの回復は？' : 'こころは？'}</div>
        {cmpBtns(v.actMindOpts)}
        <div style={{ background: '#c4f000', borderRadius: 12, padding: '9px 14px', marginTop: 12, textAlign: 'center' }}>
          <span style={{ ...mono, fontSize: 13, fontWeight: 700, color: '#2f3a00' }}>{v.actIsRecover ? '回復の目安' : '目安'} {v.actEstText}</span>
        </div>
        {/* なまえ */}
        <div style={{ fontSize: 12, fontWeight: 700, marginTop: 14, color: '#55554e' }}>なまえ</div>
        <input value={v.actName} onChange={v.onActName} placeholder="例：数学、皿洗い（夜）" style={{ width: '100%', marginTop: 8, background: '#efece3', border: 'none', borderRadius: 12, padding: '12px 14px', fontFamily: "'Zen Kaku Gothic New',sans-serif", fontSize: 15, fontWeight: 700, color: '#1b1b18', boxSizing: 'border-box', outline: 'none' }} />
        {/* 絵文字: カテゴリ標準 or 検索して個別に設定 */}
        <div style={{ fontSize: 12, fontWeight: 700, marginTop: 14, color: '#55554e' }}>絵文字（カテゴリ標準か、この行動だけの絵文字）</div>
        <EmojiPicker
          value={v.actGlyph === 'std' ? null : v.actGlyph}
          onPick={v.pickActGlyph}
          lead={(
            <button onClick={() => v.pickActGlyph('std')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 56, height: 40, borderRadius: 10, border: v.actGlyph === 'std' ? '2px solid #1b1b18' : '1.5px solid #e4e1d8', background: v.actGlyph === 'std' ? '#fbfdf0' : '#fff', cursor: 'pointer', padding: 0, lineHeight: 1 }}>
              <Emo e={v.actStdGlyph} size={18} />
              <span style={{ fontSize: 8.5, fontWeight: 700, color: '#7a9a00', marginTop: 2 }}>標準</span>
            </button>
          )}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button onClick={v.closeActAdd} style={{ flex: 1, border: '2px solid #e4e1d8', borderRadius: 13, background: '#fff', color: '#55554e', fontWeight: 700, fontSize: 14, padding: '14px 0', cursor: 'pointer' }}>キャンセル</button>
          <button onClick={v.addAction} style={{ flex: 1.5, border: 'none', borderRadius: 13, background: '#c4f000', color: '#2f3a00', fontWeight: 700, fontSize: 14, padding: '14px 0', cursor: 'pointer' }}>つくる</button>
        </div>
      </div>
    </div>
  );
}

/* ---- 強度をえらぶ popup（分量入力＝行動の強度） ---- */
function IntensityPopup({ v }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 8, background: 'rgba(27,27,24,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 18px' }}>
      <div style={{ width: '100%', background: '#fff', borderRadius: 22, padding: '16px 20px 20px', boxShadow: '0 24px 60px rgba(27,27,24,.35)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 900, paddingLeft: 28 }}>強度をえらぶ</div>
          <button onClick={v.closeIntensity} style={{ width: 28, height: 28, background: 'none', border: 'none', fontSize: 18, color: '#55554e', cursor: 'pointer', flex: '0 0 auto' }}>✕</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, background: '#f7f4ec', borderRadius: 14, padding: '12px 14px', marginTop: 14 }}>
          <span style={{ fontSize: 20, flex: '0 0 auto' }}>{v.intensityGlyph}</span>
          <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 900, lineHeight: 1.4 }}>{v.intensityName}</div>
        </div>
        <div style={{ background: '#c4f000', borderRadius: 14, padding: '11px 14px', marginTop: 10, textAlign: 'center' }}>
          <span style={{ display: 'inline-block', background: '#fff', borderRadius: 999, padding: '3px 12px', fontSize: 11, fontWeight: 900, color: '#2f3a00' }}>この記録の疲労</span>
          <div style={{ ...mono, fontSize: 16, fontWeight: 700, color: '#2f3a00', marginTop: 5 }}>{v.intensityFatText}</div>
        </div>
        {v.intQuestions.map((q, qi) => (
          <React.Fragment key={qi}>
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 14, color: '#55554e' }}>{q.label}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {q.opts.map((o, oi) => (
                <button key={oi} onClick={o.onPick} style={{ flex: 1, textAlign: 'center', border: `1.5px solid ${o.border}`, background: o.bg, color: o.color, borderRadius: 12, padding: '11px 0', fontSize: 12.5, fontWeight: o.weight, cursor: 'pointer' }}>{o.text}</button>
              ))}
            </div>
          </React.Fragment>
        ))}
        {/* 好き嫌い: 行動ごとに保存され、いつも疲労に反映される */}
        <div style={{ fontSize: 12, fontWeight: 700, marginTop: 14, color: '#55554e' }}>すき・きらい</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          {v.prefOpts.map((o, oi) => (
            <button key={oi} onClick={o.onPick} style={{ flex: 1, textAlign: 'center', border: `1.5px solid ${o.border}`, background: o.bg, color: o.color, borderRadius: 12, padding: '11px 0', fontSize: 12.5, fontWeight: o.weight, cursor: 'pointer' }}>{o.text}</button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: '#b4b2a8', marginTop: 7, lineHeight: 1.6 }}>この行動にいつも反映されます。嫌いだと疲れやすく、好きだと軽くなります</div>
        <button onClick={v.closeIntensity} style={{ width: '100%', marginTop: 18, border: 'none', borderRadius: 13, background: '#1b1b18', color: '#fff', fontWeight: 700, fontSize: 15, padding: '14px 0', cursor: 'pointer' }}>OK</button>
      </div>
    </div>
  );
}

/* ---- 予定 詳細 popup（カレンダー式） ---- */
function PlanDetailPopup({ v }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 6, background: 'rgba(27,27,24,.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ width: '100%', background: '#fff', borderRadius: '22px 22px 0 0', padding: '16px 18px 20px', boxShadow: '0 -12px 40px rgba(27,27,24,.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{ width: 40, height: 40, borderRadius: 12, background: '#eaf5c9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flex: '0 0 auto' }}>📋</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 900 }}>{v.planDetailName}</div>
            <div style={{ ...mono, fontSize: 10.5, color: '#8a8a82', marginTop: 2 }}>{v.recordSlotEmoji} {v.recordSlotName} · {v.planDetailMeta}</div>
          </div>
          <button onClick={v.closePlan} style={{ width: 28, height: 28, background: 'none', border: 'none', fontSize: 18, color: '#55554e', cursor: 'pointer', flex: '0 0 auto' }}>✕</button>
        </div>
        <div style={{ ...mono, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a8a82', margin: '16px 2px 6px' }}>この予定にふくまれる行動</div>
        <div style={{ border: '1px solid #f1efe8', borderRadius: 14, overflow: 'hidden' }}>
          {v.planTasks.map((t, ti) => (
            <div key={ti} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', borderBottom: '1px solid #f1efe8' }}>
              <span style={{ fontSize: 16 }}>{t.glyph}</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{t.name}</span>
              <span style={{ ...mono, fontSize: 11.5, color: '#8a8a82' }}>{t.minText}</span>
              <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: '#f5994e', width: 34, textAlign: 'right' }}>{t.fatText}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginTop: 14 }}>
          <span style={msIcon(20, '#6f8fbf', false)}>event_available</span>
          <div style={{ flex: 1, fontSize: 12.5, fontWeight: 700, lineHeight: 1.4 }}>
            Googleカレンダーにも同期
            <div style={{ fontSize: 10.5, fontWeight: 400, color: '#9d9b91' }}>予定＋ふくまれる行動をそのまま反映</div>
          </div>
          <button onClick={v.togglePlanSync} style={{ width: 44, height: 26, borderRadius: 999, border: 'none', background: v.planSyncBg, position: 'relative', cursor: 'pointer', flex: '0 0 auto' }}>
            <span style={{ position: 'absolute', top: 3, left: v.planSyncDot, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.25)' }} />
          </button>
        </div>
        <button onClick={v.recordThisPlan} style={{ width: '100%', marginTop: 16, border: 'none', borderRadius: 14, background: '#c4f000', color: '#2f3a00', fontWeight: 700, fontSize: 15, padding: '15px 0', cursor: 'pointer' }}>この予定を記録 · <span style={mono}>{v.planDetailFat}</span></button>
      </div>
    </div>
  );
}

/* ---- 予定 作成 popup ---- */
function PlanAddPopup({ v }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 7, background: 'rgba(27,27,24,.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div className="nos" style={{ width: '100%', maxHeight: '92%', overflowY: 'auto', background: '#fff', borderRadius: '22px 22px 0 0', padding: '16px 18px 20px', boxShadow: '0 -12px 40px rgba(27,27,24,.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 900, paddingLeft: 28 }}>予定をつくる</div>
          <button onClick={v.closePlanAdd} style={{ width: 28, height: 28, background: 'none', border: 'none', fontSize: 18, color: '#55554e', cursor: 'pointer', flex: '0 0 auto' }}>✕</button>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, marginTop: 14, color: '#55554e' }}>予定の名前</div>
        <input value={v.newPlanName} onChange={v.onPlanName} placeholder="例：通勤・ジム・買い出し" style={{ width: '100%', marginTop: 8, background: '#efece3', border: 'none', borderRadius: 12, padding: '12px 14px', fontFamily: "'Zen Kaku Gothic New',sans-serif", fontSize: 15, fontWeight: 700, color: '#1b1b18', boxSizing: 'border-box', outline: 'none' }} />
        <div style={{ fontSize: 12, fontWeight: 700, marginTop: 16, color: '#55554e' }}>ふくめる行動をえらぶ</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {v.planItemChoices.map(it => (
            <button key={it.id} onClick={it.onToggle} style={{ display: 'flex', alignItems: 'center', gap: 6, border: it.border, background: it.bg, borderRadius: 999, padding: '7px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
              <span>{it.glyph}</span>{it.name}<span style={{ ...mono, color: it.markColor }}>{it.mark}</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginTop: 16, background: '#f7f4ec', borderRadius: 12, padding: '11px 13px' }}>
          <span style={msIcon(20, '#6f8fbf', false)}>event_available</span>
          <div style={{ flex: 1, fontSize: 12.5, fontWeight: 700 }}>Googleカレンダーと同期</div>
          <button onClick={v.togglePlanSync} style={{ width: 44, height: 26, borderRadius: 999, border: 'none', background: v.planSyncBg, position: 'relative', cursor: 'pointer', flex: '0 0 auto' }}>
            <span style={{ position: 'absolute', top: 3, left: v.planSyncDot, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.25)' }} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button onClick={v.closePlanAdd} style={{ flex: 1, border: '2px solid #e4e1d8', borderRadius: 13, background: '#fff', color: '#55554e', fontWeight: 700, fontSize: 14, padding: '14px 0', cursor: 'pointer' }}>キャンセル</button>
          <button onClick={v.addPlan} style={{ flex: 1.5, border: 'none', borderRadius: 13, background: '#c4f000', color: '#2f3a00', fontWeight: 700, fontSize: 14, padding: '14px 0', cursor: 'pointer' }}>つくる</button>
        </div>
      </div>
    </div>
  );
}
