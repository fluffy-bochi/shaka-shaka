import React from 'react';
import Emo from './fluent';
import DogModel from './DogModel';

/* 実行中の画面: いまの行動を やるきーぬ がしている表示。
   行動の名前（とカテゴリ）から動き（dog3d.js のモーション）と、行動の絵文字をどこに持たせるかを決める。
   prop: front＝体の前（パソコン・本・ごはん台など）／hand＝前足で持つ／over＝頭の上に持ちあげる／under＝乗り物（うしろに大きく）／above＝頭の上にうかぶ（💤）／none */
const RULES = [
  [/睡眠|寝る|昼寝|仮眠|就寝|二度寝/, 'nap', 'above', '💤'],
  [/歌|カラオケ|ライブ|発声/, 'sing', 'hand'],
  [/料理|調理|自炊|お弁当|弁当作/, 'stir', 'front'],
  [/食|ご飯|ごはん|朝ごはん|昼ごはん|夜ごはん|ランチ|ディナー|おやつ|飲み|カフェ|間食/, 'eat', 'hand'],
  [/掃除|清掃|洗濯|片付|片づけ|皿洗い|家事|ゴミ/, 'sweep', 'front'],
  [/電車|バス|車|運転|送迎|自転車|バイク|タクシー|飛行機|新幹線|通勤|通学/, 'ride', 'under'],
  [/散歩|徒歩|歩/, 'walk', 'none'],
  [/運動|体育|実技|ジョギング|ランニング|走|筋トレ|ジム|部活|スポーツ|ダンス|ヨガ|ストレッチ/, 'jog', 'none'],
  [/品出し|運ぶ|配膳|力仕事|現場|引っ越し|買い物|軽作業|荷物/, 'carry', 'over'],
  [/会議|打ち合わせ|ミーティング|電話|通話|接客|来客|発表|プレゼン|指導|教え|塾|面接|話|友達|家族|デート|レジ/, 'talk', 'hand'],
  [/パソコン|デスクワーク|資料|オンライン|プログラ|ゲーム|スマホ|SNS|メール|事務|入力|動画編集/, 'type', 'front'],
  [/レポート|課題|宿題|書|テスト|試験|日記|絵|描|制作|デザイン|ノート|演習|実習/, 'write', 'front'],
  [/読|講義|勉強|本|漫画|マンガ|授業|復習|予習|暗記/, 'read', 'front'],
  [/風呂|入浴|シャワー|休憩|休む|のんびり|テレビ|動画|ゴロゴロ|昼休み|身支度|洗顔|歯/, 'relax', 'front'],
  [/考|悩|計画|予定を立て/, 'think', 'front'],
];
export function runDogOf(c) {
  const s = [c.name, c.cat].filter(Boolean).join(' ');
  for (const [re, m, prop, g] of RULES) if (re.test(s)) return { m, prop, g: g || c.glyph };
  return { m: 'happy', prop: 'front', g: c.glyph };
}

/* 絵文字の置き場所（犬の四角に対して・size＝犬の高さに対して） */
const PROP = {
  front: { left: '50%', bottom: '-6%', size: 0.34, z: 2, anim: '' },
  hand: { left: '70%', top: '46%', size: 0.27, z: 2, anim: 'runDogBob 1s ease-in-out infinite alternate' },
  over: { left: '50%', top: '-16%', size: 0.36, z: 2, anim: 'runDogBob .35s ease-in-out infinite alternate' },
  under: { left: '50%', bottom: '-10%', size: 0.72, z: 0, anim: 'runDogBob .4s ease-in-out infinite alternate' },
  above: { left: '82%', top: '4%', size: 0.24, z: 2, anim: 'runDogFloat 2.4s ease-in-out infinite' },
};

export default function RunDog({ c, height = 170 }) {
  const d = runDogOf(c);
  const P = PROP[d.prop];
  const sz = P ? Math.round(height * P.size) : 0;
  return (
    <div style={{ height, display: 'flex', justifyContent: 'center' }}>
      <div style={{ position: 'relative', height }}>
        <div style={{ position: 'relative', zIndex: 1 }}><DogModel base={d.m} style={{ height }} /></div>
        {P && (
          <div style={{ position: 'absolute', left: P.left, top: P.top, bottom: P.bottom, zIndex: P.z, transform: 'translateX(-50%)', pointerEvents: 'none' }}>
            <div style={{ animation: P.anim }}><Emo e={d.g} size={sz} /></div>
          </div>
        )}
      </div>
    </div>
  );
}
