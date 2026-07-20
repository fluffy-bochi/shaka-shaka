/* サンプルデータ生成（デザイン学部2年・一人暮らしペルソナの1学年分）。
   学事暦にそって「毎年」決定的に生成できるので、表示中の年度に合わせて呼べば
   何年に移動しても同じリズムの1年が見える（＝毎年くりかえし表示）。

   entries は本番の entries と同じ形（date/from/to/title/act/glyph/delta/mood/exp）に
   _sample:true を付けて返す。_sample は保存時に除外される（model.js serialize）。 */
import { pad2, dateToStr } from './model';
import { guessAct } from './data';

/* ---- 決定的な擬似乱数（日付文字列＋salt から 0..1） ---- */
function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0); }
function rnd(seed) { return (hash(seed) % 100000) / 100000; }
function pick(seed, arr) { return arr[Math.floor(rnd(seed) * arr.length) % arr.length]; }

/* ---- 学事暦 ---- */
function firstDow(y, monthIdx, dow) { const d = new Date(y, monthIdx, 1); while (d.getDay() !== dow) d.setDate(d.getDate() + 1); return d; }
// 春学期の開始: 4月最初の金曜が1〜3日なら翌週月曜、そうでなければその金曜
function springStart(ay) {
  const fri = firstDow(ay, 3, 5); // 4月(index3)の最初の金曜
  if (fri.getDate() <= 3) { const m = new Date(fri); m.setDate(fri.getDate() + 3); return m; } // 翌週月曜
  return fri;
}
function fallStart(ay) { return firstDow(ay, 9, 1); } // 10月最初の月曜
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function between(d, a, b) { return d.getTime() >= a.getTime() && d.getTime() < b.getTime(); }
function ymd(d) { return dateToStr(d); }

/* ---- 疲労度: カテゴリマスタと同じ「fh × 時間」 ---- */
function D(fh, min, recover) { const v = Math.max(1, Math.round((fh * min) / 60)); return recover ? -v : v; }
function hm(h, m) { return pad2(h) + ':' + pad2(m || 0); }

/* ---- 時間割（1=月〜5=金）。fh はカテゴリマスタの体+心/h。assess: exam/report/create ---- */
const SPRING_TT = {
  1: [['09:00', '10:30', 'デザイン論', '📖', 7], ['10:40', '12:10', '造形基礎演習', '🎨', 10], ['13:00', '14:30', '情報デザイン', '📖', 7]],
  2: [['09:00', '10:30', '色彩学', '📖', 7], ['10:40', '12:10', 'タイポグラフィ演習', '🔬', 10]],
  3: [['10:40', '12:10', 'メディア論', '📖', 7], ['13:00', '14:30', '写真表現', '🎨', 10]],
  4: [['09:00', '10:30', '西洋美術史', '📖', 7], ['13:00', '14:30', '描画基礎', '🎨', 10]],
  5: [['09:00', '10:30', 'プログラミング演習', '🔬', 10]],
};
const FALL_TT = {
  1: [['09:00', '10:30', '視覚伝達論', '📖', 7], ['10:40', '12:10', '立体造形', '🎨', 10], ['13:00', '14:30', 'UIデザイン演習', '🔬', 9]],
  2: [['09:00', '10:30', 'デザイン史', '📖', 7], ['10:40', '12:10', 'イラストレーション', '🎨', 10]],
  3: [['10:40', '12:10', '映像表現', '🎨', 10], ['13:00', '14:30', 'マーケティング論', '📖', 7]],
  4: [['09:00', '10:30', '記号論', '📖', 7], ['13:00', '14:30', 'パッケージデザイン', '🎨', 10]],
  5: [['09:00', '10:30', 'Webデザイン演習', '🔬', 10]],
};

/* ---- ランの距離(km): 月ごと。冬(12〜2月)は雪で外を走らない ---- */
function runKm(month) { // month 1..12
  const table = { 5: 2.5, 6: 3.5, 7: 4, 8: 5.5, 9: 6.5, 10: 8, 11: 8 };
  return table[month] || 0;
}

const DIARY = {
  spring: ['授業がぼちぼち始まった。まだ体が慣れない。', '課題の締切がじわじわ近づいてきてる。', 'バイト終わりの帰り道、ちょっと疲れた。', '新しい課題のテーマ、面白そうだけど大変そう。', '今日はよく寝れた気がする。'],
  crunch: ['制作が終わらない…とりあえず今日はここまで。', 'テスト勉強と制作が重なってしんどい。'],
  summer: ['夏休み！やっと少しゆっくりできる。', '朝ラン気持ちよかった。距離のびてきた。', '久しぶりに友だちと会えてリフレッシュした。', '美術館に行ってきた。刺激をもらえた。', 'ライブ最高だった。しばらく余韻でいけそう。', 'バイト多めの週。でも夏は稼ぎどき。', '課題も少し進めた。えらい。'],
  fall: ['後期はじまり。生活リズム立て直そう。', '8km走れた！春には考えられなかった。', '制作課題、今回はうまく形になってきた。', '肌寒くなってきた。上着を出した。'],
  winter: ['雪でランはお休み。家で筋トレした。', '寒くて布団から出られない。', '年末。今年もいろいろあった。', 'テスト、なんとか乗り切った。', '春休みは少しのんびりしたい。'],
};

/* ペルソナの1学年分（ay年4月〜ay+1年3月）を生成 */
export function buildAcademicYear(ay, opts = {}) {
  const cycleOn = !!opts.cycleOn;
  const E = [];
  const diary = {};
  const fav = {};
  const add = (date, from, to, title, glyph, delta) => E.push({
    date, from, to, title, act: guessAct(title), glyph, delta, mood: '🙂', exp: false, _sample: true,
  });

  const spS = springStart(ay);
  const spClassEnd = addDays(spS, 105);           // 15週
  const spExamEnd = addDays(spClassEnd, 7);        // テスト週
  const flS = fallStart(ay);
  const flClassEnd = addDays(flS, 15 * 7 + 14);    // 15週＋年末年始ぶん
  const flExamEnd = addDays(flClassEnd, 7);
  const nextSp = springStart(ay + 1);
  const winterGapA = new Date(ay, 11, 27), winterGapB = new Date(ay + 1, 0, 6); // 12/27〜1/5 授業なし

  // 生理: 29日周期・生理5日・PMS4日。アンカーは学年開始まわりに固定
  const cycleAnchor = addDays(spS, 10).getTime();

  const D0 = new Date(ay, 3, 1);            // 4/1
  const D1 = new Date(ay + 1, 3, 1);        // 翌4/1
  // ライブ・美術館は年度に1回ずつ日をきめる（夏休み内）
  const liveDay = ymd(addDays(flS, -30 - Math.floor(rnd('live' + ay) * 20)));  // 夏休み後半あたり
  let lastFriendMonth = -1, lastMuseum = null;

  for (let d = new Date(D0); d < D1; d = addDays(d, 1)) {
    const date = ymd(d);
    const wd = d.getDay();               // 0=日
    const isWeekday = wd >= 1 && wd <= 5;
    const month = d.getMonth() + 1;
    const inSpringClass = between(d, spS, spClassEnd);
    const inSpringExam = between(d, spClassEnd, spExamEnd);
    const inSummer = between(d, spExamEnd, flS);
    const inFallClass = between(d, flS, flClassEnd) && !between(d, winterGapA, winterGapB);
    const inWinterGap = between(d, winterGapA, winterGapB);
    const inFallExam = between(d, flClassEnd, flExamEnd);
    const inSpringBreak = d >= flExamEnd && d < nextSp;
    const isBreak = inSummer || inSpringBreak || inWinterGap;

    // ---- 朝の身じたく（毎日） ----
    add(date, '07:20', '07:35', '洗顔・歯みがき', '🧼', D(3, 15));
    const outing = inSpringClass || inFallClass || inSpringExam || (!isBreak && isWeekday) || rnd('out' + date) < 0.6;
    if (outing && (wd !== 0)) add(date, '07:35', '07:55', 'メイク', '💄', D(6, 20));
    add(date, '07:55', '08:05', '着替え', '👕', D(3, 10));

    let hadClassOrWork = false;

    // ---- 授業 ----
    const tt = inSpringClass ? SPRING_TT[wd] : (inFallClass ? FALL_TT[wd] : null);
    if (tt && isWeekday) {
      hadClassOrWork = true;
      add(date, '08:10', '08:40', '通学（電車バス）', '🚃', D(9, 30));
      tt.forEach(([f, t, name, g, fh]) => add(date, f, t, name, g, D(fh, 90)));
    }

    // ---- テスト（前期2日・後期1日） ----
    if (inSpringExam && (wd === 1 || wd === 3)) {
      hadClassOrWork = true;
      add(date, '08:10', '08:40', '通学（電車バス）', '🚃', D(9, 30));
      add(date, '09:00', '10:00', 'テスト', '✍️', D(11, 60));
    }
    if (inFallExam && wd === 3) {
      hadClassOrWork = true;
      add(date, '08:10', '08:40', '通学（電車バス）', '🚃', D(9, 30));
      add(date, '09:00', '10:00', 'テスト', '✍️', D(11, 60));
    }

    // ---- バイト（ファミレス・ホール／配膳 5h） ----
    let baito = false;
    if ((inSpringClass || inFallClass) && (wd === 2 || wd === 4)) { // 平日は火・木の夜
      add(date, '17:00', '22:00', 'バイト（ホール・配膳）', '🍽', D(13, 300)); baito = true; hadClassOrWork = true;
    }
    // 土日: どっちも or どっちか
    if (wd === 6 || wd === 0) {
      const pat = pick('wend' + date, ['both', 'both', 'sat', 'sun', 'sun']);
      const work = (pat === 'both') || (pat === 'sat' && wd === 6) || (pat === 'sun' && wd === 0);
      if (work) { add(date, '11:00', '16:00', 'バイト（ホール・配膳）', '🍽', D(13, 300)); baito = true; hadClassOrWork = true; }
    }
    // 長期休みは平日昼にも入る
    if (isBreak && !inWinterGap && isWeekday && rnd('bb' + date) < 0.4) {
      add(date, '11:00', '16:00', 'バイト（ホール・配膳）', '🍽', D(13, 300)); baito = true;
    }
    if (baito && !tt) add(date, '16:20', '16:50', '通勤（電車バス）', '🚃', D(9, 30));

    // ---- 課題（レポート＝簡単2h／制作＝重め）。制作期は増やす ----
    if (inSpringClass || inFallClass) {
      const wk = Math.floor((d - (inSpringClass ? spS : flS)) / (7 * 864e5));
      const crunch = (wk >= 6 && wk <= 8) || wk >= 12;
      if (!baito && (crunch || rnd('rep' + date) < 0.35) && wd !== 0) {
        add(date, '20:00', '22:00', 'レポート・課題', '📝', D(9, 120));
      }
      if (crunch && !baito && rnd('cre' + date) < 0.7) {
        add(date, '19:30', '22:30', '制作・作品づくり', '🎨', D(10, 180));
      }
    }
    // テスト期は勉強＋制作でクランチ
    if (inSpringExam) {
      add(date, '19:00', '22:00', 'テスト勉強', '📚', D(9, 180));
      if (rnd('exc' + date) < 0.6) add(date, '14:00', '17:00', '制作・作品づくり', '🎨', D(10, 180));
    }
    if (inFallExam) add(date, '19:00', '22:00', 'テスト勉強', '📚', D(9, 180));

    // ---- 家事（一人暮らし） ----
    if (rnd('cook' + date) < 0.8) { add(date, '18:30', '19:10', '料理（自炊）', '🍳', D(8, 40)); add(date, '19:40', '19:55', '皿洗い', '🍽', D(8, 15)); }
    if (wd === 0 || wd === 3) add(date, '10:00', '10:40', '掃除・洗濯', '🧺', D(8, 40));
    if (wd === 6 || (isBreak && wd === 3)) add(date, '16:30', '17:10', '買い物（スーパー）', '🛒', D(9, 40));

    // ---- 回復（入浴・食事・趣味・休憩・昼寝など。delta マイナス＝回復） ----
    add(date, '22:10', '22:30', '入浴', '🛁', D(12, 20, true)); // 毎晩お風呂でリセット
    if (rnd('lunch' + date) < 0.85) add(date, '12:15', '12:50', '食事（ランチ）', '🍙', D(7, 35, true));
    if (rnd('leis' + date) < 0.6) {
      const lg = pick('lg' + date, [['ゲーム', '🎮', 7], ['趣味・音楽', '🎧', 10], ['SNS・動画', '📱', 5], ['読書', '📖', 8]]);
      add(date, '21:00', '21:40', lg[0], lg[1], D(lg[2], 40, true));
    }
    if ((inSpringExam || inFallExam || (inSpringClass && between(d, addDays(spClassEnd, -14), spClassEnd))) && rnd('cof' + date) < 0.6) {
      add(date, '15:30', '15:45', '休憩・コーヒー', '☕', D(7, 15, true)); // 追い込み期はこまめに休憩
    }
    if ((wd === 0 || wd === 6 || isBreak) && rnd('nap' + date) < 0.35) add(date, '14:30', '15:10', '昼寝・仮眠', '😴', D(13, 40, true));
    if (isBreak && !inWinterGap && rnd('relax' + date) < 0.4) add(date, '16:00', '16:40', 'ぼーっとする', '🌳', D(8, 40, true));

    // ---- 運動（春〜秋ラン・距離のびる／冬は室内筋トレ） ----
    const canRunOutside = month >= 3 && month <= 11; // 冬(12〜2)は雪でなし
    if (!inSpringExam && !inFallExam) {
      const km = runKm(month);
      if (canRunOutside && km > 0 && (wd === 0 || wd === 3) && rnd('run' + date) < 0.7) {
        const min = Math.round(km * 6.5);
        add(date, '07:00', hm(7, Math.min(59, min)), `ランニング ${km}km`, '🏃', D(12, min));
        if (km >= 8) fav[date] = true; // 8km達成の日は付箋
      } else if ((month === 5 || month === 6 || inSummer) && wd === 6 && rnd('gym' + date) < 0.4) {
        add(date, '10:00', '10:45', '筋トレ', '🏋️', D(14, 45));
      } else if ((month === 12 || month === 1 || month === 2) && (wd === 2 || wd === 5) && rnd('wg' + date) < 0.6) {
        add(date, '20:30', '21:10', '筋トレ（室内）', '🏋️', D(14, 40));
        if (rnd('st' + date) < 0.5) add(date, '21:10', '21:25', 'ストレッチ・ヨガ', '🧘', D(10, 15, true));
      }
    }

    // ---- 友だち・イベント（少なめ・長期休みに月1以上） ----
    if (isBreak && d.getMonth() !== lastFriendMonth && rnd('fr' + date) < 0.28 && (wd === 6 || wd === 0) && !baito) {
      add(date, '13:00', '17:00', '友だちと遊ぶ', '🎉', D(10, 240));
      lastFriendMonth = d.getMonth();
      diary[date] = pick('frd' + date, ['久しぶりに友だちと会えて楽しかった。', 'ひさびさに笑って話せてよかった。']);
    }
    if (date === liveDay) {
      add(date, '17:00', '21:00', '好きなアーティストのライブ', '🎤', D(11, 240));
      fav[date] = true; diary[date] = 'ライブ最高だった。しばらく余韻でいけそう。';
    }
    // 美術館（5〜6週おき）
    if ((wd === 6 || wd === 0) && !baito && rnd('mu' + date) < 0.14 && (lastMuseum === null || (d - lastMuseum) > 35 * 864e5)) {
      add(date, '14:00', '16:30', '美術館へ行く', '🖼', D(6, 150));
      lastMuseum = new Date(d); fav[date] = true;
      if (!diary[date]) diary[date] = '美術館に行ってきた。刺激をもらえた。';
    }

    // ---- 生理周期（ON時） ----
    if (cycleOn) {
      const day = Math.floor((d.getTime() - cycleAnchor) / 864e5);
      const phase = ((day % 29) + 29) % 29; // 0=生理初日
      if (phase < 5) {
        // 生理中: お腹が痛い（体）
        add(date, '08:20', '10:20', '生理痛', '🩸', D(8, 120));
      } else if (phase >= 25) {
        // PMS: メンタルがやられやすい（心）
        add(date, '21:30', '22:00', pick('pms' + date, ['気分が落ち込む（PMS）', '理由もなく不安（PMS）', 'イライラする（PMS）']),
          pick('pmsg' + date, ['😔', '😰', '😤']), D(7, 60));
      }
    }

    // ---- 日記（前期テスト・制作期で途切れ→夏に再開して定着） ----
    const diaryGapStart = addDays(spClassEnd, -14); // 制作＆テスト直前
    const inDiaryGap = d >= diaryGapStart && d < spExamEnd;
    if (!diary[date] && !inDiaryGap) {
      let pool = DIARY.spring, freq = 0.28;
      if (inSpringExam) { pool = DIARY.crunch; freq = 0; }
      else if (inSummer) { pool = DIARY.summer; freq = 0.5; }       // 夏に再開・頻度アップ
      else if (inFallClass || inFallExam) { pool = DIARY.fall; freq = 0.42; }
      else if (inSpringBreak || inWinterGap || month === 12 || month <= 2) { pool = DIARY.winter; freq = 0.42; }
      // 夏以降は「定着」→ 週2〜3
      if (rnd('di' + date) < freq && (wd === 0 || wd === 3 || rnd('di2' + date) < 0.3)) {
        diary[date] = pick('dt' + date, pool);
      }
    }
  }

  return { entries: E, diary, fav };
}

/* 表示中の日付が属する「学年（春スタートの年）」 */
export function academicYearOf(dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  const d = new Date(y, m - 1, Number(dateStr.split('-')[2]) || 1);
  return d >= springStart(y) ? y : y - 1;
}
