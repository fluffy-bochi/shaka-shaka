import React from 'react';

const mono = { fontFamily: "'Space Mono',monospace" };

/* 記録の編集シート。単体記録は絵文字・なまえ・時間を編集（疲労は時間比例で自動再計算）。
   📋予定グループはタスク一覧 → 各タスクを個別に編集。 */
export default function EditSheet({ v }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 8, background: 'rgba(27,27,24,.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      {v.editIsPlan ? <PlanList v={v} /> : <EntryForm v={v} />}
    </div>
  );
}

function PlanList({ v }) {
  return (
    <div className="nos" style={{ width: '100%', maxHeight: '86%', overflowY: 'auto', background: '#fff', borderRadius: '22px 22px 0 0', padding: '16px 18px 22px', boxShadow: '0 -12px 40px rgba(27,27,24,.3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <span style={{ width: 40, height: 40, borderRadius: 12, background: '#eaf5c9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flex: '0 0 auto' }}>📋</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 900 }}>{v.editPlanName}</div>
          <div style={{ ...mono, fontSize: 10.5, color: '#8a8a82', marginTop: 2 }}>タスクをえらんで編集</div>
        </div>
        <button onClick={v.closeEdit} style={{ width: 28, height: 28, background: 'none', border: 'none', fontSize: 18, color: '#55554e', cursor: 'pointer', flex: '0 0 auto' }}>✕</button>
      </div>
      <div style={{ border: '1px solid #f1efe8', borderRadius: 14, overflow: 'hidden', marginTop: 14 }}>
        {v.editPlanRows.map(t => (
          <button key={t.i} onClick={t.onEdit} style={{ display: 'flex', width: '100%', textAlign: 'left', alignItems: 'center', gap: 11, padding: '12px 13px', border: 'none', borderBottom: '1px solid #f1efe8', background: '#fff', cursor: 'pointer' }}>
            <span style={{ fontSize: 16 }}>{t.glyph}</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{t.name}</span>
            <span style={{ ...mono, fontSize: 11.5, color: '#8a8a82' }}>{t.minText}</span>
            <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: '#f5994e', width: 34, textAlign: 'right' }}>{t.fatText}</span>
            <span style={{ fontSize: 16, color: '#c9c7bf' }}>›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function EntryForm({ v }) {
  return (
    <div className="nos" style={{ width: '100%', maxHeight: '92%', overflowY: 'auto', background: '#fff', borderRadius: '22px 22px 0 0', padding: '16px 18px 22px', boxShadow: '0 -12px 40px rgba(27,27,24,.3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {v.editHasBack
          ? <button onClick={v.backEdit} style={{ width: 28, height: 28, background: 'none', border: 'none', fontSize: 19, color: '#8a8a82', cursor: 'pointer', flex: '0 0 auto' }}>‹</button>
          : <span style={{ width: 28 }} />}
        <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 900 }}>
          きろくを編集
          {v.editPlanned && <span style={{ display: 'inline-block', ...mono, fontSize: 9, fontWeight: 700, letterSpacing: '.04em', color: '#fff', background: '#a5a39a', borderRadius: 5, padding: '1px 6px', marginLeft: 8, verticalAlign: 'middle' }}>予定</span>}
        </div>
        <button onClick={v.closeEdit} style={{ width: 28, height: 28, background: 'none', border: 'none', fontSize: 18, color: '#55554e', cursor: 'pointer', flex: '0 0 auto' }}>✕</button>
      </div>
      {v.editPlanTag && <div style={{ ...mono, fontSize: 10.5, color: '#8a8a82', textAlign: 'center', marginTop: 4 }}>📋 {v.editPlanTag}</div>}
      {/* 絵文字（変更すると積まれたアイコンも新しくなる） */}
      <div style={{ fontSize: 12, fontWeight: 700, marginTop: 14, color: '#55554e' }}>アイコン</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 8 }}>
        {v.emojiChoices.map((c, ci) => (
          <button key={ci} onClick={c.onPick} style={{ width: 40, height: 40, borderRadius: 11, border: c.on ? '2px solid #1b1b18' : '1.5px solid #e4e1d8', background: c.on ? '#fbfdf0' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, cursor: 'pointer' }}>{c.g}</button>
        ))}
      </div>
      <div style={{ fontSize: 11, color: '#b4b2a8', marginTop: 7 }}>変えると、積もっている絵文字もこのアイコンになります</div>
      {/* なまえ */}
      <div style={{ fontSize: 12, fontWeight: 700, marginTop: 14, color: '#55554e' }}>なまえ</div>
      <input value={v.editTitle} onChange={v.onEditTitle} style={{ width: '100%', marginTop: 8, background: '#efece3', border: 'none', borderRadius: 12, padding: '12px 14px', fontFamily: "'Zen Kaku Gothic New',sans-serif", fontSize: 15, fontWeight: 700, color: '#1b1b18', boxSizing: 'border-box', outline: 'none' }} />
      {/* 時間（1分単位。疲労は時間に比例して自動調整） */}
      <div style={{ fontSize: 12, fontWeight: 700, marginTop: 14, color: '#55554e' }}>時間</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 }}>
        <button onClick={v.editM10} style={{ width: 32, height: 32, borderRadius: 9, border: '1.5px solid #e4e1d8', background: '#fff', ...mono, fontSize: 11, fontWeight: 700, color: '#55554e', cursor: 'pointer' }}>-10</button>
        <button onClick={v.editM1} style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid #1b1b18', background: '#fff', fontSize: 17, color: '#1b1b18', cursor: 'pointer' }}>−</button>
        <span style={{ ...mono, fontSize: 15, fontWeight: 700, minWidth: 72, textAlign: 'center' }}>{v.editMinText}</span>
        <button onClick={v.editP1} style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid #1b1b18', background: '#fff', fontSize: 17, color: '#1b1b18', cursor: 'pointer' }}>＋</button>
        <button onClick={v.editP10} style={{ width: 32, height: 32, borderRadius: 9, border: '1.5px solid #e4e1d8', background: '#fff', ...mono, fontSize: 11, fontWeight: 700, color: '#55554e', cursor: 'pointer' }}>+10</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 }}>
        <span style={{ fontSize: 11, color: '#b4b2a8' }}>この記録の疲労</span>
        <span style={{ ...mono, fontSize: 14, fontWeight: 700, color: '#f5994e' }}>{v.editFatText}</span>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button onClick={v.deleteEdit} style={{ flex: 1, border: '2px solid #e4e1d8', borderRadius: 13, background: '#fff', color: '#b4645a', fontWeight: 700, fontSize: 14, padding: '14px 0', cursor: 'pointer' }}>削除</button>
        <button onClick={v.saveEdit} style={{ flex: 1.5, border: 'none', borderRadius: 13, background: '#c4f000', color: '#2f3a00', fontWeight: 700, fontSize: 14, padding: '14px 0', cursor: 'pointer' }}>保存</button>
      </div>
    </div>
  );
}
