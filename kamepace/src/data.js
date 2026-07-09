/* 静的データ: プロトタイプ（かめペース プロトタイプ.dc.html）と旧本番（reference/index.html）から移植 */

export const SLOTS = [
  { id: 'asa', emoji: '🌅', name: '朝', fromH: 6, toH: 9, base: '07:00' },
  { id: 'am', emoji: '☀️', name: '午前', fromH: 9, toH: 12, base: '10:00' },
  { id: 'pm', emoji: '🌤', name: '午後', fromH: 12, toH: 18, base: '14:00' },
  { id: 'yoru', emoji: '🌙', name: '夜', fromH: 18, toH: 30, base: '20:00' },
];
export function slotForHour(h) {
  if (h >= 6 && h < 9) return 'asa';
  if (h >= 9 && h < 12) return 'am';
  if (h >= 12 && h < 18) return 'pm';
  return 'yoru';
}
export function slotOfEntry(e) {
  const h = parseInt((e.from || '00:00').split(':')[0], 10) || 0;
  return slotForHour(h);
}
export function slotForNow() { return slotForHour(new Date().getHours()); }

export const CATS = [
  { id: 'idou', icon: 'directions_subway', color: '#6f8fbf', name: 'いどう', sub: '通勤・運転・送迎', items: [
    { id: 'commute', glyph: '🚃', icon: 'directions_subway', name: '通勤', last: '前回 0.5h ・ +4', fh: 8 },
    { id: 'drive', glyph: '🚗', icon: 'directions_car', name: '運転', last: '前回 1h ・ +7', fh: 7 },
  ] },
  { id: 'work', icon: 'work', color: '#c58b3d', name: 'しごと・学業', sub: '会議・資料・集中作業', items: [
    { id: 'meeting', glyph: '💬', icon: 'forum', name: '会議', last: '前回 1h ・ +10', fh: 10 },
    { id: 'docs', glyph: '📝', icon: 'description', name: '資料作成', last: '前回 2h ・ +12', fh: 6 },
    { id: 'focus', glyph: '⌨️', icon: 'computer', name: '集中作業', last: '前回 1h ・ +8', fh: 8 },
  ] },
  { id: 'house', icon: 'cleaning_services', color: '#4fa88a', name: '家事', sub: '皿洗い・掃除・洗濯・買い物', items: [
    { id: 'dishes', glyph: '🍽', icon: 'local_dining', name: '皿洗い', last: '前回 0.5h ・ +4', fh: 8, after: 1, degree: true, degLabels: ['すくなめ', '多め'], degFh: [5, 8, 11] },
    { id: 'clean', glyph: '🧹', icon: 'mop', name: '掃除', last: '前回 0.5h ・ +3', fh: 6, after: 1 },
    { id: 'laundry', glyph: '🧺', icon: 'local_laundry_service', name: '洗濯', last: '前回 0.5h ・ +3', fh: 6, after: 1 },
    { id: 'shop', glyph: '🛒', icon: 'shopping_basket', name: '買い物', last: '前回 0.5h ・ +3', fh: 6 },
  ] },
  { id: 'talk', icon: 'groups', color: '#b07bc4', name: '対人・イベント', sub: '打ち合わせ・飲み会', items: [
    { id: 'talk', glyph: '💬', icon: 'groups', name: '打ち合わせ', last: '前回 1h ・ +9', fh: 9 },
  ] },
  { id: 'rest', icon: 'self_improvement', color: '#7a9a00', name: '休憩・回復', sub: 'お茶・入浴・昼寝・ストレッチ ・ −回復', items: [
    { id: 'rest', glyph: '☕', icon: 'local_cafe', name: '休憩・お茶', last: '前回 0.5h ・ −4', fh: -8 },
    { id: 'bath', glyph: '🛁', icon: 'bathtub', name: '入浴', last: '前回 0.5h ・ −6', fh: -12 },
    { id: 'nap', glyph: '😴', icon: 'bedtime', name: '昼寝・仮眠', last: '前回 0.5h ・ −10', fh: -20 },
    { id: 'stretch', glyph: '🧘', icon: 'self_improvement', name: 'ストレッチ・ヨガ', last: '前回 0.5h ・ −5', fh: -10 },
    { id: 'breathe', glyph: '🌿', icon: 'spa', name: '深呼吸・瞑想', last: '前回 10分 ・ −3', fh: -8 },
    { id: 'nature', glyph: '🌳', icon: 'park', name: 'ぼーっとする', last: '前回 15分 ・ −4', fh: -8 },
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

export const SEARCH_DB = [
  { name: '通勤（電車・座れた）', glyph: '🚃', fh: 5, kw: ['通勤', '電車', '移動'] },
  { name: '通勤（電車・立ち）', glyph: '🚃', fh: 8, kw: ['通勤', '電車', '移動'] },
  { name: '通勤（バス）', glyph: '🚌', fh: 6, kw: ['通勤', 'バス', '移動'] },
  { name: '通勤（徒歩）', glyph: '🚶', fh: 7, kw: ['通勤', '徒歩', '移動', '散歩'] },
  { name: '通勤（自転車）', glyph: '🚲', fh: 9, kw: ['通勤', '自転車', '移動'] },
  { name: '運転（街中）', glyph: '🚗', fh: 8, kw: ['運転', '車', '移動'] },
  { name: '会議', glyph: '💬', fh: 10, kw: ['会議', 'ミーティング', '打ち合わせ', '仕事'] },
  { name: 'オンライン会議', glyph: '💻', fh: 8, kw: ['会議', 'オンライン', '仕事'] },
  { name: '資料作成', glyph: '📝', fh: 6, kw: ['資料', '作成', '仕事', '書類'] },
  { name: '集中作業', glyph: '⌨️', fh: 8, kw: ['集中', '作業', '仕事'] },
  { name: 'メール返信', glyph: '📧', fh: 4, kw: ['メール', '返信', '仕事'] },
  { name: '皿洗い', glyph: '🍽', fh: 8, kw: ['皿洗い', '家事', '洗い物', '食器'] },
  { name: '掃除機がけ', glyph: '🧹', fh: 7, kw: ['掃除', '家事', '掃除機'] },
  { name: '洗濯', glyph: '🧺', fh: 6, kw: ['洗濯', '家事'] },
  { name: '買い物', glyph: '🛒', fh: 6, kw: ['買い物', '家事', '買い出し', 'スーパー'] },
  { name: '料理', glyph: '🍳', fh: 7, kw: ['料理', '家事', '自炊'] },
  { name: '打ち合わせ', glyph: '💬', fh: 9, kw: ['打ち合わせ', '対人', '会議'] },
  { name: '飲み会', glyph: '🍻', fh: 11, kw: ['飲み会', '対人', 'イベント'] },
  { name: 'ランニング', glyph: '🏃', fh: 12, kw: ['ランニング', '運動', 'ジョギング', '走る'] },
  { name: '筋トレ', glyph: '🏋️', fh: 14, kw: ['筋トレ', '運動', 'ジム', 'トレーニング'] },
  { name: 'ヨガ', glyph: '🧘', fh: 5, kw: ['ヨガ', '運動', 'ストレッチ'] },
  { name: '休憩・お茶', glyph: '☕', fh: -8, kw: ['休憩', 'お茶', 'カフェ', 'コーヒー', '休む'] },
  { name: '入浴', glyph: '🛁', fh: -6, kw: ['入浴', '風呂', 'お風呂'] },
  { name: '昼寝', glyph: '😴', fh: -10, kw: ['昼寝', '仮眠', '寝る', '休む'] },
];

/* 旧本番の act → 絵文字（同期互換: 旧データの entries は act しか持たない） */
export const ACT_EMOJI = {
  '会議': '💬', '通勤': '🚃', 'レビュー': '💻', '作業': '⌨️', '資料作成': '📝',
  'メール': '📧', '勉強': '📚', '運動': '🏃', '散歩': '🚶', '家事': '🧹',
  '育児': '🍼', '通話': '📞', '睡眠': '🌙', '食事': '🍙', '休憩': '☕',
  '昼寝': '😴', 'ゲーム': '🎮', '読書': '📖', '入浴': '🛁',
};

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
