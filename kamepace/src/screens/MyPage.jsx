import React from 'react';

const mono = { fontFamily: "'Space Mono',monospace" };
const label = { ...mono, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a8a82', margin: '18px 6px 8px' };
const card = { background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(27,27,24,.05)', overflow: 'hidden' };
const row = (last) => ({ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 15px', borderBottom: last ? 'none' : '1px solid #f1efe8' });

/* iOS風トグルスイッチ */
function Toggle({ on, onClick }) {
  return (
    <button onClick={onClick} aria-pressed={on} style={{ width: 46, height: 27, borderRadius: 999, border: 'none', cursor: 'pointer', padding: 0, flex: '0 0 auto', background: on ? '#c4f000' : '#d8d5cb', position: 'relative', transition: 'background .2s' }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 22 : 3, width: 21, height: 21, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(27,27,24,.3)', transition: 'left .2s' }} />
    </button>
  );
}

export default function MyPage({ v }) {
  const u = v.user;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: '#f7f4ec' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 20px 12px' }}>
        <button onClick={v.goHome} style={{ background: 'none', border: 'none', fontSize: 19, color: '#8a8a82', cursor: 'pointer' }}>‹</button>
        <div style={{ fontSize: 16, fontWeight: 700 }}>マイページ</div>
      </div>
      <div className="nos" style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px' }}>
        {/* profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, background: '#fff', borderRadius: 16, padding: '14px 15px', boxShadow: '0 1px 3px rgba(27,27,24,.05)' }}>
          <div style={{ width: 48, height: 48, flex: '0 0 auto', borderRadius: 13, background: '#c4f000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>🐢</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 900 }}>{u ? (u.displayName || 'かめペース') : 'ゲスト'}</div>
            <div style={{ ...mono, fontSize: 10.5, color: '#8a8a82', marginTop: 2 }}>{u ? (u.email || '') : 'ログインするとクラウドに保存されます'}</div>
          </div>
          {u ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#eef7cc', borderRadius: 999, padding: '5px 10px', fontSize: 10.5, fontWeight: 700, color: '#2f3a00', flex: '0 0 auto' }}>🔗 {u.providerData && u.providerData.some(p => p.providerId === 'google.com') ? 'Google' : 'メール'}</span>
          ) : (
            <button onClick={v.openAuth} style={{ border: 'none', background: '#1b1b18', color: '#fff', borderRadius: 999, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flex: '0 0 auto' }}>ログイン</button>
          )}
        </div>
        <div style={label}>きろく</div>
        <div style={card}>
          <button onClick={v.goSlotTimes} style={{ ...row(), width: '100%', border: 'none', borderBottom: '1px solid #f1efe8', background: '#fff', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
            <span style={{ fontSize: 16 }}>🕘</span>
            <span style={{ flex: 1, fontSize: 14 }}>枠のじかん</span>
            <span style={{ ...mono, fontSize: 11.5, color: '#8a8a82' }}>{v.slotTimesSub}時</span>
            <span style={{ fontSize: 16, color: '#c9c7bf' }}>›</span>
          </button>
          <button onClick={v.goCatsManage} style={{ ...row(), width: '100%', border: 'none', borderBottom: '1px solid #f1efe8', background: '#fff', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
            <span style={{ fontSize: 16 }}>🏷</span>
            <span style={{ flex: 1, fontSize: 14 }}>カテゴリの管理</span>
            <span style={{ fontSize: 16, color: '#c9c7bf' }}>›</span>
          </button>
          <button onClick={v.goTemplates} style={{ ...row(), width: '100%', border: 'none', borderBottom: '1px solid #f1efe8', background: '#fff', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
            <span style={{ fontSize: 16 }}>📋</span>
            <span style={{ flex: 1, fontSize: 14 }}>テンプレート</span>
            {v.templateRows.length > 0 && <span style={{ ...mono, fontSize: 11.5, color: '#8a8a82' }}>{v.templateRows.length}件</span>}
            <span style={{ fontSize: 16, color: '#c9c7bf' }}>›</span>
          </button>
          <button onClick={v.goBuffLog} style={{ ...row(), width: '100%', border: 'none', borderBottom: '1px solid #f1efe8', background: '#fff', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
            <span style={{ fontSize: 16 }}>🎭</span>
            <span style={{ flex: 1, fontSize: 14 }}>調子の記録（バフ・デバフ）</span>
            <span style={{ fontSize: 16, color: '#c9c7bf' }}>›</span>
          </button>
          <button onClick={v.goTrash} style={{ ...row(true), width: '100%', border: 'none', background: '#fff', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
            <span style={{ fontSize: 16 }}>🗑</span>
            <span style={{ flex: 1, fontSize: 14 }}>ゴミ箱</span>
            {v.trashCount > 0 && <span style={{ ...mono, fontSize: 11.5, color: '#8a8a82' }}>{v.trashCount}件</span>}
            <span style={{ fontSize: 16, color: '#c9c7bf' }}>›</span>
          </button>
        </div>
        <div style={label}>つかれの計算</div>
        <div style={card}>
          <button onClick={v.goSensitivity} style={{ ...row(), width: '100%', border: 'none', borderBottom: '1px solid #f1efe8', background: '#fff', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
            <span style={{ fontSize: 16 }}>💪</span>
            <span style={{ flex: 1, fontSize: 14 }}>疲れやすさの調整</span>
            <span style={{ ...mono, fontSize: 11.5, color: '#8a8a82' }}>{v.sensSub}</span>
            <span style={{ fontSize: 16, color: '#c9c7bf' }}>›</span>
          </button>
          <button onClick={v.goCycle} style={{ ...row(), width: '100%', border: 'none', borderBottom: '1px solid #f1efe8', background: '#fff', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
            <span style={{ fontSize: 16 }}>🌙</span>
            <span style={{ flex: 1, fontSize: 14 }}>生理の反映</span>
            <span style={{ ...mono, fontSize: 11.5, color: v.cycPhaseNow && v.cycPhaseNow !== 'normal' ? '#a33e6d' : '#8a8a82' }}>{v.cycleStatus}</span>
            <span style={{ fontSize: 16, color: '#c9c7bf' }}>›</span>
          </button>
          <button onClick={v.doCalendarSync} style={{ ...row(true), width: '100%', border: 'none', background: '#fff', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
            <span style={{ fontSize: 16 }}>📅</span>
            <span style={{ flex: 1, fontSize: 14 }}>Googleカレンダー / ToDo</span>
            <span style={{ display: 'inline-flex', background: '#eef7cc', borderRadius: 999, padding: '4px 10px', fontSize: 10.5, fontWeight: 700, color: '#2f3a00' }}>今日の予定を取り込む</span>
          </button>
        </div>
        <div style={label}>れんけい</div>
        <div style={card}>
          <button onClick={v.syncMylifecore} style={{ ...row(true), width: '100%', border: 'none', background: '#fff', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
            <span style={{ fontSize: 16 }}>🗓️</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 14 }}>mylifecore</span>
              <span style={{ ...mono, fontSize: 10.5, color: '#9d9b91' }}>{v.mylifeStatusText}</span>
            </span>
            {v.mylifeConnected
              ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#eef7cc', borderRadius: 999, padding: '4px 10px', fontSize: 10.5, fontWeight: 700, color: '#2f3a00', flex: '0 0 auto' }}>🟢 連携中 · いま同期</span>
              : <span style={{ display: 'inline-flex', background: '#f1efe8', borderRadius: 999, padding: '4px 10px', fontSize: 10.5, fontWeight: 700, color: '#8a8a82', flex: '0 0 auto' }}>ログインで連携</span>}
          </button>
        </div>
        <div style={label}>ヘルプ</div>
        <div style={card}>
          <button onClick={v.startTutorial} style={{ ...row(), width: '100%', border: 'none', borderBottom: '1px solid #f1efe8', background: '#fff', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
            <span style={{ fontSize: 16 }}>🎓</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14 }}>操作チュートリアル</div>
              <div style={{ ...mono, fontSize: 10.5, color: '#8a8a82', marginTop: 1 }}>サンプルの1日で記録〜睡眠までを体験</div>
            </div>
            <span style={{ fontSize: 16, color: '#c9c7bf' }}>›</span>
          </button>
          <button onClick={v.redoOnboard} style={{ ...row(), width: '100%', border: 'none', borderBottom: '1px solid #f1efe8', background: '#fff', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
            <span style={{ fontSize: 16 }}>🐢</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14 }}>はじめの質問をやりなおす</div>
              <div style={{ ...mono, fontSize: 10.5, color: '#8a8a82', marginTop: 1 }}>職業・疲れやすさの設定（約1分）</div>
            </div>
            <span style={{ fontSize: 16, color: '#c9c7bf' }}>›</span>
          </button>
          <button onClick={v.goHelp} style={{ ...row(true), width: '100%', border: 'none', background: '#fff', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
            <span style={{ fontSize: 16 }}>📖</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14 }}>ペルソナ別・1日のシミュレーション</div>
              <div style={{ ...mono, fontSize: 10.5, color: '#8a8a82', marginTop: 1 }}>3人の1日で疲労のたまり方を見る</div>
            </div>
            <span style={{ fontSize: 16, color: '#c9c7bf' }}>›</span>
          </button>
        </div>
        <div style={label}>ひょうじ</div>
        <div style={card}>
          <div style={row()}>
            <span style={{ fontSize: 16 }}>🚩</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14 }}>さいしょの画面</div>
              <div style={{ ...mono, fontSize: 10.5, color: '#8a8a82', marginTop: 1 }}>アプリを開いたとき出る画面</div>
            </div>
            <div style={{ display: 'flex', gap: 0, background: '#efece3', borderRadius: 10, padding: 3, flex: '0 0 auto' }}>
              <button onClick={v.setMainShaka} style={{ border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', background: v.mainScreen === 'shaka' ? '#1b1b18' : 'transparent', color: v.mainScreen === 'shaka' ? '#fff' : '#8a8a82' }}>シャカ</button>
              <button onClick={v.setMainHome} style={{ border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', background: v.mainScreen === 'home' ? '#1b1b18' : 'transparent', color: v.mainScreen === 'home' ? '#fff' : '#8a8a82' }}>記録</button>
            </div>
          </div>
          <div style={row(true)}>
            <span style={{ fontSize: 16 }}>🌀</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14 }}>背景のシャカ</div>
              <div style={{ ...mono, fontSize: 10.5, color: '#8a8a82', marginTop: 1 }}>絵文字を動かすか固定するか</div>
            </div>
            <div style={{ display: 'flex', gap: 0, background: '#efece3', borderRadius: 10, padding: 3, flex: '0 0 auto' }}>
              <button onClick={v.setMotionFixed} style={{ border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', background: v.motionFixedBg, color: v.motionFixedColor }}>固定</button>
              <button onClick={v.setMotionMove} style={{ border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', background: v.motionMoveBg, color: v.motionMoveColor }}>動かす</button>
            </div>
          </div>
          <div style={row(true)}>
            <span style={{ fontSize: 16 }}>📱</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14 }}>動かし方</div>
              <div style={{ ...mono, fontSize: 10.5, color: '#8a8a82', marginTop: 1 }}>{v.gyroMode ? '傾けた向きに絵文字が集まる（逆さで上へ）' : '本体を振るとシャカシャカ'}</div>
            </div>
            <div style={{ display: 'flex', gap: 0, background: '#efece3', borderRadius: 10, padding: 3, flex: '0 0 auto' }}>
              <button onClick={v.setSensorAccel} style={{ border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', background: v.sensorAccelBg, color: v.sensorAccelColor }}>振る</button>
              <button onClick={v.setSensorGyro} style={{ border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', background: v.sensorGyroBg, color: v.sensorGyroColor }}>傾き</button>
            </div>
          </div>
        </div>
        <div style={label}>サンプル（デモ）</div>
        <div style={card}>
          <div style={row()}>
            <span style={{ fontSize: 16 }}>🎒</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14 }}>サンプルデータを表示</div>
              <div style={{ ...mono, fontSize: 10.5, color: '#8a8a82', marginTop: 1 }}>デザイン学部2年の1年ぶん（毎年くりかえし）</div>
            </div>
            <Toggle on={v.sampleMode} onClick={v.toggleSample} />
          </div>
          <div style={row(true)}>
            <span style={{ fontSize: 16 }}>🩸</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14 }}>生理周期をふくめる</div>
              <div style={{ ...mono, fontSize: 10.5, color: '#8a8a82', marginTop: 1 }}>PMSでメンタル↓・生理中はお腹が痛い</div>
            </div>
            <Toggle on={v.sampleCycleOn} onClick={v.toggleSampleCycle} />
          </div>
        </div>
        {u && (
          <button onClick={v.doLogout} style={{ display: 'block', width: '100%', marginTop: 18, textAlign: 'center', fontSize: 12, color: '#8a8a82', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>ログアウト</button>
        )}
      </div>
      {v.authOpen && <AuthGate v={v} />}
    </div>
  );
}

/* ログイン（Google / メール＋パスワード）。ゲスト継続可 */
function AuthGate({ v }) {
  const input = { width: '100%', marginTop: 8, background: '#efece3', border: 'none', borderRadius: 12, padding: '12px 14px', fontFamily: "'Zen Kaku Gothic New',sans-serif", fontSize: 15, color: '#1b1b18', boxSizing: 'border-box', outline: 'none' };
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(27,27,24,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 18px' }}>
      <div style={{ width: '100%', background: '#fff', borderRadius: 22, padding: '18px 20px 20px', boxShadow: '0 24px 60px rgba(27,27,24,.35)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 900, paddingLeft: 28 }}>ログイン</div>
          <button onClick={v.closeAuth} style={{ width: 28, height: 28, background: 'none', border: 'none', fontSize: 18, color: '#55554e', cursor: 'pointer', flex: '0 0 auto' }}>✕</button>
        </div>
        <button onClick={v.doLoginGoogle} disabled={v.authBusy} style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16, border: '1.5px solid #e4e1d8', borderRadius: 13, background: '#fff', fontSize: 14, fontWeight: 700, padding: '13px 0', cursor: 'pointer' }}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" style={{ width: 18, height: 18 }} />
          Googleでログイン
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 2px' }}>
          <span style={{ flex: 1, height: 1, background: '#f1efe8' }} />
          <span style={{ ...mono, fontSize: 10, color: '#b4b2a8' }}>OR</span>
          <span style={{ flex: 1, height: 1, background: '#f1efe8' }} />
        </div>
        <input type="email" value={v.authEmail} onChange={v.onAuthEmail} placeholder="メールアドレス" style={input} />
        <input type="password" value={v.authPass} onChange={v.onAuthPass} placeholder="パスワード（6文字以上）" style={input} />
        {v.authErr && <div style={{ fontSize: 12, color: '#d9534f', marginTop: 10, lineHeight: 1.5 }}>{v.authErr}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button onClick={v.doSignupEmail} disabled={v.authBusy} style={{ flex: 1, border: '2px solid #e4e1d8', borderRadius: 13, background: '#fff', color: '#55554e', fontWeight: 700, fontSize: 14, padding: '13px 0', cursor: 'pointer' }}>新規登録</button>
          <button onClick={v.doLoginEmail} disabled={v.authBusy} style={{ flex: 1.5, border: 'none', borderRadius: 13, background: '#c4f000', color: '#2f3a00', fontWeight: 700, fontSize: 14, padding: '13px 0', cursor: 'pointer' }}>ログイン</button>
        </div>
        <button onClick={v.closeAuth} style={{ display: 'block', width: '100%', marginTop: 14, textAlign: 'center', fontSize: 12, color: '#8a8a82', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>ゲストのままつかう</button>
      </div>
    </div>
  );
}
