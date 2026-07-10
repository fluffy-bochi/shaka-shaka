/* 静的データ: プロトタイプ（かめペース プロトタイプ.dc.html）と旧本番（reference/index.html）から移植 */

export const SLOTS = [
  { id: 'asa', emoji: '🌅', name: '朝' },
  { id: 'am', emoji: '☀️', name: '午前' },
  { id: 'pm', emoji: '🌤', name: '午後' },
  { id: 'yoru', emoji: '🌙', name: '夜' },
];
/* 枠の開始時刻（朝・午前・午後・夜）。マイページ「枠のじかん」で変更でき同期される */
export const DEFAULT_SLOT_HOURS = [6, 9, 12, 18];
export function slotForHour(h, hours = DEFAULT_SLOT_HOURS) {
  const [a, b, c, d] = hours;
  if (h >= a && h < b) return 'asa';
  if (h >= b && h < c) return 'am';
  if (h >= c && h < d) return 'pm';
  return 'yoru';
}
export function slotOfEntry(e, hours) {
  const h = parseInt((e.from || '00:00').split(':')[0], 10) || 0;
  return slotForHour(h, hours);
}
export function slotForNow(hours) { return slotForHour(new Date().getHours(), hours); }

/* カテゴリマスタ（カテゴリマスタ設計_v2.md 準拠）
   body/mind は設計書の（体, 心）/h。表示・計算は合計の fh（回復はマイナス）。
   2軸の個人係数・モディファイア・職業別表示は将来対応（値だけ内部保持しておく）。 */
const act = (id, glyph, icon, name, body, mind, extra = {}) => {
  const sum = body + mind;
  const recover = !!extra.recover;
  return {
    id, glyph, icon, name, body, mind,
    fh: recover ? -sum : sum,
    last: `目安 ${recover ? '−' : '+'}${sum}/h`,
    ...extra,
  };
};

export const CATS = [
  { id: 'idou', icon: 'directions_subway', color: '#6f8fbf', name: 'いどう', sub: '通勤通学・運転・送迎', items: [
    act('commute', '🚃', 'directions_subway', '通勤・通学（電車バス）', 5, 4, { kw: ['移動', '電車', '満員電車', 'バス', '通勤', '通学'] }),
    act('drive', '🚗', 'directions_car', '車の運転', 5, 7, { kw: ['移動', '運転', '車', '渋滞'] }),
    act('pickup', '🚙', 'airport_shuttle', '送迎', 4, 5, { kw: ['移動', '送り', 'お迎え', '子供'] }),
    act('walkmove', '🚶', 'directions_walk', '徒歩移動', 7, 2, { kw: ['移動', '徒歩', '歩き'] }),
    act('bicycle', '🚲', 'directions_bike', '自転車', 8, 2, { kw: ['移動', 'チャリ', 'サイクリング'] }),
  ] },
  { id: 'work', icon: 'work', color: '#c58b3d', name: '仕事', sub: '会議・デスクワーク・接客・現場', items: [
    act('meeting', '💬', 'forum', '会議・打ち合わせ', 3, 7, { kw: ['仕事', '会議', 'ミーティング', 'MTG', '打ち合わせ'] }),
    act('docs', '📝', 'description', 'デスクワーク・資料作成', 4, 6, { kw: ['仕事', '資料', '作業', '事務', 'パソコン'] }),
    act('workcall', '📞', 'call', '電話・通話対応', 2, 6, { kw: ['仕事', '電話', '通話', 'コール'] }),
    act('reception', '🤝', 'support_agent', '来客・接客', 4, 8, { kw: ['仕事', '接客', '来客', '窓口', 'クレーム'] }),
    act('fieldwork', '🧳', 'business_center', '外回り・出張', 7, 6, { kw: ['仕事', '営業', '外回り', '出張'] }),
    act('labor', '🔧', 'construction', '力仕事・現場', 9, 4, { kw: ['仕事', '現場', '力仕事', '肉体労働'] }),
    act('teach', '🧑‍🏫', 'cast_for_education', '教える・指導', 4, 7, { kw: ['仕事', '指導', '研修', '教える'] }),
  ] },
  { id: 'baito', icon: 'storefront', color: '#d97a6a', name: 'バイト', sub: '接客・レジ・調理・品出し', items: [
    act('serve', '🙋', 'support_agent', '接客', 5, 8, { kw: ['仕事', 'バイト', '接客', 'ホール', 'クレーム'] }),
    act('register', '🧾', 'point_of_sale', 'レジ', 5, 6, { kw: ['仕事', 'バイト', 'レジ', '会計'] }),
    act('cookwork', '🍳', 'restaurant', '調理', 7, 5, { kw: ['仕事', 'バイト', '調理', 'キッチン'] }),
    act('stock', '📦', 'inventory', '品出し', 7, 3, { kw: ['仕事', 'バイト', '品出し', '陳列'] }),
    act('carry', '🍽', 'room_service', '配膳', 8, 5, { kw: ['仕事', 'バイト', '配膳', 'ホール'] }),
    act('cleanwork', '🧹', 'mop', '清掃', 7, 3, { kw: ['仕事', 'バイト', '清掃', '掃除'] }),
    act('tutor', '✏️', 'school', '塾講・指導', 3, 7, { kw: ['仕事', 'バイト', '塾', '家庭教師', '指導'] }),
    act('lightwork', '🗃', 'package_2', '軽作業', 6, 3, { kw: ['仕事', 'バイト', '軽作業', '倉庫', 'ピッキング'] }),
  ] },
  { id: 'school', icon: 'school', color: '#5b8fd4', name: '授業・学校', sub: '講義・演習・発表・テスト', items: [
    act('lecture', '📖', 'menu_book', '講義（聞く中心）', 2, 5, { kw: ['授業', '講義', '学校', '大学'] }),
    act('seminar', '🔬', 'science', '演習・実習', 4, 6, { kw: ['授業', '演習', '実習', 'ゼミ'] }),
    act('present', '🎤', 'co_present', '発表・プレゼン', 3, 9, { kw: ['授業', '発表', 'プレゼン'] }),
    act('pe', '🏃', 'directions_run', '体育・実技', 9, 3, { kw: ['運動', '体育', '実技'] }),
    act('online_class', '💻', 'computer', 'オンライン授業', 2, 4, { kw: ['授業', 'オンライン', 'リモート'] }),
    act('exam', '✍️', 'quiz', 'テスト', 3, 8, { kw: ['授業', 'テスト', '試験', '受験'] }),
  ] },
  { id: 'study', icon: 'edit_note', color: '#8a7bc4', name: '課題・勉強', sub: 'レポート・テスト勉強・就活', items: [
    act('report', '📝', 'edit_note', 'レポート・課題', 3, 6, { kw: ['勉強', '課題', 'レポート', '宿題'] }),
    act('examstudy', '📚', 'menu_book', 'テスト勉強', 3, 6, { kw: ['勉強', 'テスト', '試験', '暗記'] }),
    act('create', '🎨', 'palette', '制作・作品づくり', 4, 6, { kw: ['勉強', '制作', '作品', 'デザイン'] }),
    act('groupwork', '👥', 'group', 'グループワーク', 3, 7, { kw: ['勉強', 'グループ', '共同', 'ゼミ'] }),
    act('jobhunt', '👔', 'badge', '就活・受験', 4, 9, { kw: ['就活', '面接', 'ES', '受験'] }),
  ] },
  { id: 'club', icon: 'sports_soccer', color: '#58a34d', name: '部活・サークル', sub: '練習・試合・ミーティング', items: [
    act('practice', '⚽', 'sports_soccer', '練習', 8, 4, { kw: ['運動', '部活', 'サークル', '練習'] }),
    act('match', '🏆', 'emoji_events', '試合・大会・本番', 9, 8, { kw: ['運動', '部活', '試合', '大会', '本番', 'ライブ'] }),
    act('clubmtg', '💬', 'forum', 'ミーティング', 2, 5, { kw: ['部活', 'サークル', 'ミーティング'] }),
    act('clubadmin', '📋', 'assignment', '運営・幹部業務', 3, 7, { kw: ['部活', 'サークル', '運営', '幹事'] }),
    act('camp', '🚌', 'directions_bus', '合宿・遠征', 8, 6, { kw: ['部活', '合宿', '遠征', '旅行'] }),
  ] },
  { id: 'house', icon: 'cleaning_services', color: '#4fa88a', name: '家事・生活', sub: '掃除・料理・育児・手続き', items: [
    act('dishes', '🍽', 'local_dining', '皿洗い', 5, 3, { kw: ['家事', '皿洗い', '洗い物', '食器'], after: 1, degree: true, degLabels: ['すくなめ', '多め'], degFh: [5, 8, 11] }),
    act('cleanlaundry', '🧺', 'local_laundry_service', '掃除・洗濯', 6, 2, { kw: ['家事', '掃除', '洗濯', '片付け'], after: 1 }),
    act('cook', '🍳', 'lunch_dining', '料理', 5, 3, { kw: ['家事', '料理', '自炊', 'ごはん'] }),
    act('shop', '🛒', 'shopping_basket', '買い物', 5, 4, { kw: ['家事', '買い物', '買い出し', 'スーパー'] }),
    act('childcare', '🍼', 'child_care', '育児', 7, 7, { kw: ['家事', '育児', '子供', '保育'] }),
    act('carework', '🩺', 'medical_services', '介護・看病', 7, 8, { kw: ['家事', '介護', '看病'] }),
    act('errands', '📄', 'receipt_long', '手続き・役所・病院', 4, 6, { kw: ['手続き', '役所', '病院', '銀行', '待ち時間'] }),
  ] },
  { id: 'talk', icon: 'groups', color: '#b07bc4', name: '対人', sub: '相談・飲み会・イベント', items: [
    act('consult', '💬', 'groups', '打ち合わせ・相談', 3, 7, { kw: ['対人', '相談', '打ち合わせ'] }),
    act('privatecall', '📞', 'call', '電話・通話', 2, 6, { kw: ['対人', '電話', '通話'] }),
    act('party', '🍻', 'local_bar', '交流会・飲み会', 5, 7, { kw: ['対人', '飲み会', '交流会', '宴会', 'イベント'] }),
    act('hangout', '🎉', 'celebration', '遊び・イベント', 5, 5, { kw: ['対人', '遊び', 'イベント', 'お出かけ'] }),
    act('firstmeet', '🤝', 'handshake', '初対面の場', 4, 9, { kw: ['対人', '初対面', '面談', '挨拶'] }),
    act('family', '👪', 'diversity_3', '家族の対応', 3, 6, { kw: ['対人', '家族', '親', '親戚'] }),
  ] },
  { id: 'rest', icon: 'self_improvement', color: '#7a9a00', name: '休憩・回復', sub: 'お茶・入浴・昼寝・趣味 ・ −回復', items: [
    act('rest', '☕', 'local_cafe', '休憩・コーヒー', 2, 5, { recover: true, kw: ['休憩', 'お茶', 'カフェ', 'コーヒー', '休む'] }),
    act('meal', '🍙', 'restaurant', '食事', 3, 4, { recover: true, kw: ['休憩', '食事', 'ランチ', 'ごはん'] }),
    act('bath', '🛁', 'bathtub', '入浴', 5, 7, { recover: true, kw: ['休憩', '風呂', 'お風呂', 'サウナ'] }),
    act('nap', '😴', 'bedtime', '昼寝・仮眠', 7, 6, { recover: true, kw: ['休憩', '昼寝', '仮眠', '寝る'] }),
    act('hobby', '🎧', 'interests', '趣味・娯楽', 2, 8, { recover: true, kw: ['休憩', '趣味', '娯楽', '音楽', '読書'] }),
    act('gaming', '🎮', 'sports_esports', 'ゲーム', 1, 6, { recover: true, kw: ['休憩', 'ゲーム', 'プレイ'] }),
    act('sns', '📱', 'smartphone', 'SNS・動画', 1, 4, { recover: true, kw: ['休憩', 'SNS', '動画', 'スマホ', 'YouTube'] }),
    // 設計書では体は微疲労・心は回復の混合（未決）。1軸のいまは小さめの回復として扱う
    act('stroll', '🚶', 'park', '散歩・軽い運動', 1, 2, { recover: true, kw: ['休憩', '散歩', 'ウォーキング', '軽い運動'] }),
    act('stretch', '🧘', 'self_improvement', 'ストレッチ・ヨガ', 5, 5, { recover: true, kw: ['休憩', 'ストレッチ', 'ヨガ'] }),
    act('breathe', '🌿', 'spa', '深呼吸・瞑想', 3, 5, { recover: true, kw: ['休憩', '深呼吸', '瞑想', 'マインドフルネス'] }),
    act('nature', '🌳', 'park', 'ぼーっとする', 3, 5, { recover: true, kw: ['休憩', 'ぼーっと', '外気浴'] }),
  ] },
];

export const PLANS = [
  { id: 'commute', name: '通勤', tasks: [
    { glyph: '🚶', name: '徒歩', min: 8, fat: 2 },
    { glyph: '🚃', name: '電車', min: 25, fat: 6 },
    { glyph: '🚌', name: 'バス', min: 12, fat: 3 },
  ] },
  { id: 'gym', name: 'ジム', tasks: [
    { glyph: '🏃', name: 'ランニング', min: 30, fat: 12 },
    { glyph: '🏋️', name: '筋トレ', min: 30, fat: 14 },
  ] },
];

export const KW_PLACEHOLDERS = ['(例)通勤', '(例)会議 打ち合わせ', '(例)皿洗い', '(例)買い物 スーパー', '(例)ランニング', '(例)休憩 お茶', '(例)資料作成', '(例)入浴', '(例)掃除', '(例)飲み会'];

/* 検索候補: カテゴリマスタの全行動＋バリエーション（座れた/立ち等の分岐）。
   body/mind は（体, 心）/h の内訳。fh = 合計 */
const SEARCH_VARIANTS = [
  { name: '通勤（電車・座れた）', glyph: '🚃', fh: 7, body: 4, mind: 3, kw: ['通勤', '電車', '移動'] },
  { name: '通勤（電車・立ち）', glyph: '🚃', fh: 10, body: 6, mind: 4, kw: ['通勤', '電車', '移動'] },
  { name: '通勤（バス）', glyph: '🚌', fh: 8, body: 4, mind: 4, kw: ['通勤', 'バス', '移動'] },
  { name: 'オンライン会議', glyph: '💻', fh: 8, body: 2, mind: 6, kw: ['会議', 'オンライン', '仕事'] },
  { name: '集中作業', glyph: '⌨️', fh: 8, body: 3, mind: 5, kw: ['集中', '作業', '仕事'] },
  { name: 'メール返信', glyph: '📧', fh: 4, body: 1, mind: 3, kw: ['メール', '返信', '仕事'] },
  { name: '掃除機がけ', glyph: '🧹', fh: 7, body: 5, mind: 2, kw: ['掃除', '家事', '掃除機'] },
  { name: 'ランニング', glyph: '🏃', fh: 12, body: 10, mind: 2, kw: ['ランニング', '運動', 'ジョギング', '走る'] },
  { name: '筋トレ', glyph: '🏋️', fh: 14, body: 12, mind: 2, kw: ['筋トレ', '運動', 'ジム', 'トレーニング'] },
];
export const SEARCH_DB = [
  ...SEARCH_VARIANTS,
  ...CATS.flatMap(c => c.items.map(it => ({
    name: it.name, glyph: it.glyph, fh: it.fh, body: it.body, mind: it.mind,
    kw: [...(it.kw || []), c.name, it.name],
  }))),
];

/* 旧本番の act → 絵文字（同期互換: 旧データの entries は act しか持たない） */
export const ACT_EMOJI = {
  '会議': '💬', '通勤': '🚃', 'レビュー': '💻', '作業': '⌨️', '資料作成': '📝',
  'メール': '📧', '勉強': '📚', '運動': '🏃', '散歩': '🚶', '家事': '🧹',
  '育児': '🍼', '通話': '📞', '睡眠': '🌙', '食事': '🍙', '休憩': '☕',
  '昼寝': '😴', 'ゲーム': '🎮', '読書': '📖', '入浴': '🛁',
};

/* 絵文字 → act の逆引き（回復で消した記録を collected に act 付きで積む＝旧アプリ表示互換） */
export const EMOJI_ACT = Object.fromEntries(Object.entries(ACT_EMOJI).map(([a, g]) => [g, a]));

/* タイトルから行動を推測（旧本番と同一: カレンダー取り込み・テンプレ用） */
const ACT_KEYWORDS = [
  ['資料作成', ['資料作成', '資料', 'スライド', 'ドキュメント', 'slide', 'ppt', '企画書', 'レポート']],
  ['会議', ['会議', 'ミーティング', 'mtg', 'meeting', '打ち合わせ', '打合せ', '面談', '1on1', '商談', '朝会', '定例']],
  ['通勤', ['通勤', '出社', '退社', '移動', 'commute']],
  ['レビュー', ['レビュー', 'review', '確認', 'チェック', '検収']],
  ['メール', ['メール', 'mail', '返信', '連絡']],
  ['勉強', ['勉強', '学習', 'study', '研修', 'セミナー', '講座', '勉強会', '受講']],
  ['運動', ['運動', 'ジム', 'トレーニング', '筋トレ', 'workout', 'gym', 'ランニング', 'run', 'ヨガ']],
  ['散歩', ['散歩', 'walk', 'ウォーキング', 'お散歩']],
  ['家事', ['家事', '掃除', '洗濯', '料理', '買い物']],
  ['育児', ['育児', '子供', 'こども', '保育', '送迎', 'お迎え', '送り']],
  ['通話', ['通話', '電話', 'call', 'tel', 'コール']],
  ['睡眠', ['睡眠', '就寝', '寝る', 'sleep', 'お休み']],
  ['昼寝', ['昼寝', '仮眠', 'nap']],
  ['食事', ['食事', '昼食', '夕食', '朝食', 'ランチ', 'lunch', 'dinner', 'ディナー', 'ご飯', 'ごはん', '飲み会', '会食']],
  ['休憩', ['休憩', '休み', 'break', 'コーヒー', 'カフェ', 'お茶', 'ブレイク']],
  ['ゲーム', ['ゲーム', 'game', 'プレイ']],
  ['読書', ['読書', '読む', 'book', 'リーディング']],
  ['入浴', ['入浴', '風呂', 'お風呂', 'シャワー', 'bath', 'sauna', 'サウナ']],
  ['作業', ['作業', 'タスク', 'work', '実装', '開発', 'コーディング', '対応', '準備']],
];
export function guessAct(title) {
  const t = (title || '').toLowerCase();
  if (!t) return '';
  for (const [act, kws] of ACT_KEYWORDS) {
    if (kws.some(k => t.includes(k.toLowerCase()))) return act;
  }
  return '';
}
export const IMPORT_DEFAULT_DELTA = 10;

/* 記録の編集で選べる絵文字（SEARCH_DB・ACT_EMOJI の行動グリフから） */
export const EMOJI_CHOICES = [
  '🚃', '🚌', '🚶', '🚲', '🚗', '💬', '💻', '📝', '⌨️', '📧',
  '🍽', '🧹', '🧺', '🛒', '🍳', '🍻', '🏃', '🏋️', '🧘', '☕',
  '🛁', '😴', '📚', '📞', '🎮', '📖', '🍙', '🍼', '🌿', '🌳',
  '🌙', '⭐', '✨',
];
