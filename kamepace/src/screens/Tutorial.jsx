import React from 'react';

/* 操作チュートリアルの案内カード（学生の1日サンプルで実際のUIを操作して学ぶ）。
   操作ステップは検知して自動で進み、情報ステップは「次へ」で進む。いつでもスキップ可 */

const mono = { fontFamily: "'Space Mono',monospace" };

/* pos: カードの位置。下部のボタンを使うステップは 'top'、上部のボタンを使うステップは 'bottom' */
const STEPS = {
  1: { pos: 'bottom', text: <>まずは記録してみよう。ホームの <b>🌤 午後</b> の「＋記録する」をタップ。<span style={{ color: '#8a8a82' }}>（学生の1日サンプル・午前まで記入済み）</span></> },
  2: { text: (f, v) => {
    if (v.showCart) return <>下の「<b>登録を確認 ›</b>」をタップ</>;
    if (v.showSub) return <>「<b>レポート・課題</b>」の<b>＋</b>をタップ（1時間ぶん記録します）</>;
    return <>やったことをカテゴリから選ぼう。「大カテゴリから」の「<b>📝 課題・勉強</b>」をタップ</>;
  } },
  3: { pos: 'top', text: <>一気に複数も入力できます。「<b>メニューを追加</b>」→ 検索窓に「<b>グループワーク</b>」「<b>バス</b>」「<b>地下鉄</b>」と入れてまとめて検索 → それぞれ<b>＋</b></> },
  4: { pos: 'top', text: (f) => (
    <>程度と時間を調整しよう。
      {f.int ? <s style={{ color: '#b4b2a8' }}>バスの「強度」チップで混み具合を変える</s> : <><b>バスの「強度」チップ</b>で混み具合を変えてみて</>}
      {' ／ '}
      {f.time ? <s style={{ color: '#b4b2a8' }}>合計時間かバーのつまみを動かす</s> : <><b>合計時間の−/＋やバーのつまみ</b>で時間と割合も調整</>}
      <span style={{ color: '#8a8a82' }}>（他の強度も好きに変えてOK）</span></>
  ), next: true },
  5: { pos: 'top', text: <>「<b>きろくする</b>」を押すと、そのぶんの絵文字が降ってきます</> },
  6: { pos: 'bottom', text: (f) => f.shaken
    ? <>いいね！<b>シャカシャカできるくらいの余白を作り続けるようにしましょう！</b></>
    : <>右上の <b>🔀</b> を押すとシャカシャカできます。振ってみよう</>,
  nextWhen: (f) => f.shaken },
  7: { pos: 'bottom', text: <>こうして1日分の記録がたまりました<span style={{ color: '#8a8a82' }}>（夜までのサンプルを追加しました）</span>。次は睡眠の記録です</>, next: true },
  8: { pos: 'bottom', text: <>これから睡眠の記録をするので<b>翌日の朝</b>に移動しました。昨日までの疲労は消えずに持ち越されています</>, next: true },
  9: { pos: 'bottom', text: <>たまった疲労は「<b>睡眠</b>」から消していきます。ホームの 🛏 睡眠カードをタップ</> },
  10: { pos: 'top', text: <>どのくらい休めたか、<b>画面を上下になぞって</b>いまの残り量を決めてください</> },
  11: { text: (f) => f.slept
    ? <>🌙が疲労を消して、消えたぶんは「<b>ためた回復</b>」にたまっていきます</>
    : <>右上の「<b>回復</b>」を押すと、回復していきます</>,
  nextWhen: (f) => f.slept },
  12: { pos: 'bottom', text: (
    <>そのほかにできること:<br />
      ☕ <b>休憩・回復</b>カテゴリで回復を記録（絵文字がぶつかって消える）<br />
      📋 <b>予定</b>としてまとめて記録（通勤＝徒歩＋電車など）<br />
      ＋ <b>大カテゴリの追加</b>も自由<br />
      🎚 <b>強度・すききらい</b>で体感を調整<br />
      おつかれさまでした！</>
  ), done: true },
};

export default function Tutorial({ v }) {
  const [min, setMin] = React.useState(false);
  const [flip, setFlip] = React.useState(false);
  // ステップが進んだら自動で再展開・位置もリセット（新しい指示を見逃さない）
  React.useEffect(() => { setMin(false); setFlip(false); }, [v.tutorial]);
  const step = STEPS[v.tutorial];
  if (!step) return null;
  const f = v.tutFlags || {};
  const text = typeof step.text === 'function' ? step.text(f, v) : step.text;
  const showNext = step.done || step.next || (step.nextWhen && step.nextWhen(f));
  // カード位置: 下部に固定CTA（検索・確認・カートバー）があるときは上、それ以外は下。⇅で手動入替も可
  // （睡眠は回復ボタンが右上にあるので下配置）
  const inSearch = v.searchInputOpen || v.searchResultsOpen || v.searchMoreOpen || v.searchConfirmOpen;
  const autoTop = inSearch || (v.isRecord && v.showCart);
  const isTop = flip ? !autoTop : autoTop;
  const posStyle = isTop
    ? { top: 'max(46px, calc(env(safe-area-inset-top) + 8px))' }
    : { bottom: 92 };
  const iconBtn = { border: 'none', background: '#efece3', borderRadius: 8, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#55554e', cursor: 'pointer', flex: '0 0 auto', padding: 0 };

  if (min) {
    // 最小化: 端の小さなピルだけ（タップで再展開）。
    // 上配置のときは右上の時間帯プルダウン・🔀を避けて左寄り（✕も避ける）、下配置のときは右寄り
    const pillPos = isTop
      ? { top: 'max(46px, calc(env(safe-area-inset-top) + 8px))', left: 56 }
      : { bottom: 92, right: 10 };
    return (
      <div style={{ position: 'absolute', ...pillPos, zIndex: 30 }}>
        <button onClick={() => setMin(false)} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '2px solid #c4f000', background: '#fff', borderRadius: 999, padding: '6px 11px', boxShadow: '0 8px 20px rgba(27,27,24,.2)', cursor: 'pointer' }}>
          <span style={{ ...mono, fontSize: 10, fontWeight: 700, background: '#c4f000', color: '#2f3a00', borderRadius: 6, padding: '1px 6px' }}>{v.tutorial}/12</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#55554e' }}>ひらく</span>
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', left: 10, right: 10, ...posStyle, zIndex: 30, pointerEvents: 'none' }}>
      <div style={{ pointerEvents: 'auto', background: '#fff', border: '2px solid #c4f000', borderRadius: 16, padding: '12px 14px', boxShadow: '0 12px 32px rgba(27,27,24,.22)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ ...mono, fontSize: 10, fontWeight: 700, background: '#c4f000', color: '#2f3a00', borderRadius: 6, padding: '2px 7px', flex: '0 0 auto' }}>{v.tutorial}/12</span>
          <span style={{ ...mono, fontSize: 9.5, letterSpacing: '.1em', color: '#8a8a82', flex: 1 }}>チュートリアル</span>
          <button onClick={() => setFlip(!flip)} aria-label="上下を入れかえる" title="上下を入れかえる" style={iconBtn}>{isTop ? '⬇' : '⬆'}</button>
          <button onClick={() => setMin(true)} aria-label="最小化" title="最小化" style={iconBtn}>−</button>
          <button onClick={v.endTutorial} style={{ border: 'none', background: 'none', fontSize: 11, fontWeight: 700, color: '#b4b2a8', cursor: 'pointer', flex: '0 0 auto' }}>スキップ</button>
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.75, color: '#1b1b18', marginTop: 7 }}>{text}</div>
        {showNext && (
          <button onClick={step.done ? v.endTutorial : v.tutNext} style={{ display: 'block', width: '100%', marginTop: 10, border: 'none', borderRadius: 11, background: step.done ? '#c4f000' : '#1b1b18', color: step.done ? '#2f3a00' : '#fff', fontWeight: 700, fontSize: 13, padding: '11px 0', cursor: 'pointer' }}>
            {step.done ? 'チュートリアルをおわる' : '次へ ›'}
          </button>
        )}
      </div>
    </div>
  );
}
