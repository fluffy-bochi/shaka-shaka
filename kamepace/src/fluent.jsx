import React from 'react';

/* Microsoft Fluent UI Emoji (3D) https://github.com/microsoft/fluentui-emoji
   シャカで振る絵文字を3D画像に置き換える。マップに無い/読み込めない絵文字は
   元の絵文字テキストにフォールバックする（全部は置き換えられなくてもうまく動く）。 */

export const FLUENT_BASE = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/';

export const FLUENT_MAP = {
  '🚃': 'Railway car/3D/railway_car_3d.png',
  '🚌': 'Bus/3D/bus_3d.png',
  '🚙': 'Sport utility vehicle/3D/sport_utility_vehicle_3d.png',
  '🚗': 'Automobile/3D/automobile_3d.png',
  '🚶': 'Person walking/Default/3D/person_walking_3d_default.png',
  '🚲': 'Bicycle/3D/bicycle_3d.png',
  '💬': 'Speech balloon/3D/speech_balloon_3d.png',
  '💻': 'Laptop/3D/laptop_3d.png',
  '📝': 'Memo/3D/memo_3d.png',
  '⌨️': 'Keyboard/3D/keyboard_3d.png',
  '📧': 'E-mail/3D/e-mail_3d.png',
  '🤝': 'Handshake/3D/handshake_3d.png',
  '🧳': 'Luggage/3D/luggage_3d.png',
  '🔧': 'Wrench/3D/wrench_3d.png',
  '🧑‍🏫': 'Teacher/Default/3D/teacher_3d_default.png',
  '🙋': 'Person raising hand/Default/3D/person_raising_hand_3d_default.png',
  '🧾': 'Receipt/3D/receipt_3d.png',
  '🍳': 'Cooking/3D/cooking_3d.png',
  '📦': 'Package/3D/package_3d.png',
  '🍽': 'Fork and knife with plate/3D/fork_and_knife_with_plate_3d.png',
  '🧹': 'Broom/3D/broom_3d.png',
  '✏️': 'Pencil/3D/pencil_3d.png',
  '🗃': 'Card file box/3D/card_file_box_3d.png',
  '📖': 'Open book/3D/open_book_3d.png',
  '🔬': 'Microscope/3D/microscope_3d.png',
  '🎤': 'Microphone/3D/microphone_3d.png',
  '🏃': 'Person running/Default/3D/person_running_3d_default.png',
  '✍️': 'Writing hand/Default/3D/writing_hand_3d_default.png',
  '📚': 'Books/3D/books_3d.png',
  '🎨': 'Artist palette/3D/artist_palette_3d.png',
  '👥': 'Busts in silhouette/3D/busts_in_silhouette_3d.png',
  '👔': 'Necktie/3D/necktie_3d.png',
  '⚽': 'Soccer ball/3D/soccer_ball_3d.png',
  '🏆': 'Trophy/3D/trophy_3d.png',
  '📋': 'Clipboard/3D/clipboard_3d.png',
  '🧺': 'Basket/3D/basket_3d.png',
  '🛒': 'Shopping cart/3D/shopping_cart_3d.png',
  '🍼': 'Baby bottle/3D/baby_bottle_3d.png',
  '🩺': 'Stethoscope/3D/stethoscope_3d.png',
  '📄': 'Page facing up/3D/page_facing_up_3d.png',
  '📞': 'Telephone receiver/3D/telephone_receiver_3d.png',
  '🍻': 'Clinking beer mugs/3D/clinking_beer_mugs_3d.png',
  '🎉': 'Party popper/3D/party_popper_3d.png',
  '👪': 'People hugging/3D/people_hugging_3d.png', // Family は3Dが無いので近いもので代用
  '☕': 'Hot beverage/3D/hot_beverage_3d.png',
  '🍙': 'Rice ball/3D/rice_ball_3d.png',
  '🛁': 'Bathtub/3D/bathtub_3d.png',
  '😴': 'Sleeping face/3D/sleeping_face_3d.png',
  '🎧': 'Headphone/3D/headphone_3d.png',
  '🎮': 'Video game/3D/video_game_3d.png',
  '📱': 'Mobile phone/3D/mobile_phone_3d.png',
  '🧘': 'Person in lotus position/Default/3D/person_in_lotus_position_3d_default.png',
  '🌿': 'Herb/3D/herb_3d.png',
  '🌳': 'Deciduous tree/3D/deciduous_tree_3d.png',
  '🌙': 'Crescent moon/3D/crescent_moon_3d.png',
  '⭐': 'Star/3D/star_3d.png',
  '✨': 'Sparkles/3D/sparkles_3d.png',
  '🌀': 'Cyclone/3D/cyclone_3d.png',
  '🏋️': 'Person lifting weights/Default/3D/person_lifting_weights_3d_default.png',
  '🧼': 'Soap/3D/soap_3d.png',
  '🧸': 'Teddy bear/3D/teddy_bear_3d.png',
  '🛏': 'Bed/3D/bed_3d.png',
  '🪥': 'Toothbrush/3D/toothbrush_3d.png',
  '💄': 'Lipstick/3D/lipstick_3d.png',
  '🧴': 'Lotion bottle/3D/lotion_bottle_3d.png',
  '🪒': 'Razor/3D/razor_3d.png',
  '💇': 'Person getting haircut/Default/3D/person_getting_haircut_3d_default.png',
};


/* 絵文字カタログ: ピッカーで選べる Fluent 3D 絵文字（日本語キーワードで検索可能）。
   path 省略時は FLUENT_MAP（アプリ既存分）を参照 */
const C = (g, path, ...kw) => ({ g, path, kw });
export const EMOJI_CATALOG = [
  // アプリで使っている絵文字（積み重ねているもの）
  C('🚃', null, 'でんしゃ', '電車', '通勤'), C('🚌', null, 'バス'), C('🚙', null, 'くるま', '送迎'),
  C('🚗', null, 'くるま', '車', '運転'), C('🚶', null, 'あるく', '徒歩', '散歩'), C('🚲', null, 'じてんしゃ', '自転車'),
  C('💬', null, 'かいわ', '会議', '話す'), C('💻', null, 'パソコン', '仕事'), C('📝', null, 'メモ', '資料', '書く'),
  C('⌨️', null, 'キーボード', '作業'), C('📧', null, 'メール'), C('🤝', null, 'あくしゅ', '握手', '接客'),
  C('🧳', null, 'かばん', '出張', '旅行'), C('🔧', null, 'こうぐ', '工具', '現場'), C('🙋', null, 'て', '接客', '挙手'),
  C('🧾', null, 'レシート', 'レジ'), C('🍳', null, 'りょうり', '料理', '調理'), C('📦', null, 'にもつ', '荷物', '品出し'),
  C('🍽', null, 'しょっき', '皿洗い', '食器'), C('🧹', null, 'そうじ', '掃除', 'ほうき'), C('✏️', null, 'えんぴつ', '勉強'),
  C('🗃', null, 'せいり', '整理', '軽作業'), C('📖', null, 'ほん', '本', '講義', '読書'), C('🔬', null, 'じっけん', '実験', '実習'),
  C('🎤', null, 'マイク', '発表', 'カラオケ'), C('🏃', null, 'はしる', '走る', '運動'), C('✍️', null, 'かく', 'テスト', '書く'),
  C('📚', null, 'ほん', '勉強', '自習'), C('🎨', null, 'えのぐ', '制作', 'アート'), C('👥', null, 'ひと', 'グループ'),
  C('👔', null, 'ネクタイ', '就活', 'スーツ'), C('⚽', null, 'サッカー', '部活'), C('🏆', null, 'トロフィー', '試合', '優勝'),
  C('📋', null, 'よてい', '予定', 'クリップボード'), C('🧺', null, 'せんたく', '洗濯'), C('🛒', null, 'かいもの', '買い物'),
  C('🍼', null, 'いくじ', '育児', 'あかちゃん'), C('🩺', null, 'びょういん', '介護', '看病'), C('📄', null, 'しょるい', '書類', '手続き'),
  C('📞', null, 'でんわ', '電話'), C('🍻', null, 'のみかい', '飲み会', 'ビール'), C('🎉', null, 'パーティ', 'イベント', 'お祝い'),
  C('👪', null, 'かぞく', '家族'), C('☕', null, 'コーヒー', '休憩', 'カフェ'), C('🍙', null, 'おにぎり', '食事', 'ごはん'),
  C('🛁', null, 'おふろ', '風呂', '入浴'), C('😴', null, 'ねる', '昼寝', '睡眠'), C('🎧', null, 'おんがく', '音楽', 'ヘッドホン'),
  C('🎮', null, 'ゲーム'), C('📱', null, 'スマホ', 'SNS'), C('🧘', null, 'ヨガ', 'ストレッチ', '瞑想'),
  C('🌿', null, 'はっぱ', '深呼吸', '植物'), C('🌳', null, 'き', '木', '公園'), C('🌙', null, 'つき', '月', '睡眠'),
  C('⭐', null, 'ほし', '星'), C('✨', null, 'キラキラ'), C('🏋️', null, 'きんとれ', '筋トレ', 'ジム'),
  C('🧼', null, 'せっけん', '身じたく', '洗顔'), C('🧸', null, 'ぬいぐるみ', '寝かしつけ'), C('🛏', null, 'ベッド', '睡眠'),
  C('🪥', null, 'はぶらし', '歯磨き'), C('💄', null, 'くちべに', 'メイク', '化粧'), C('🧴', null, 'スキンケア', 'ローション'),
  C('🪒', null, 'かみそり', 'ひげ'), C('💇', null, 'ヘアカット', '髪', '美容院'),
  // かお
  C('😀', 'Grinning face/3D/grinning_face_3d.png', 'えがお', '笑顔'),
  C('🙂', 'Slightly smiling face/3D/slightly_smiling_face_3d.png', 'にこにこ'),
  C('😌', 'Relieved face/3D/relieved_face_3d.png', 'ほっとした', '安心'),
  C('🥰', 'Smiling face with hearts/3D/smiling_face_with_hearts_3d.png', 'すき', '好き'),
  C('😎', 'Smiling face with sunglasses/3D/smiling_face_with_sunglasses_3d.png', 'サングラス', 'かっこいい'),
  C('🤔', 'Thinking face/3D/thinking_face_3d.png', 'かんがえる', '考える'),
  C('😭', 'Loudly crying face/3D/loudly_crying_face_3d.png', 'なく', '泣く'),
  C('🥱', 'Yawning face/3D/yawning_face_3d.png', 'ねむい', 'あくび'),
  C('🤒', 'Face with thermometer/3D/face_with_thermometer_3d.png', 'ねつ', '体調不良', '風邪'),
  // どうぶつ
  C('🐶', 'Dog face/3D/dog_face_3d.png', 'いぬ', '犬', 'ペット'),
  C('🐱', 'Cat face/3D/cat_face_3d.png', 'ねこ', '猫', 'ペット'),
  C('🐢', 'Turtle/3D/turtle_3d.png', 'かめ', '亀'),
  C('🐰', 'Rabbit face/3D/rabbit_face_3d.png', 'うさぎ'),
  C('🐹', 'Hamster/3D/hamster_3d.png', 'ハムスター'),
  C('🐦', 'Bird/3D/bird_3d.png', 'とり', '鳥'),
  C('🐟', 'Fish/3D/fish_3d.png', 'さかな', '魚', '釣り'),
  C('🐾', 'Paw prints/3D/paw_prints_3d.png', 'あしあと', 'ペット'),
  // たべもの
  C('🍞', 'Bread/3D/bread_3d.png', 'パン', '朝食'),
  C('🍜', 'Steaming bowl/3D/steaming_bowl_3d.png', 'ラーメン', 'めん'),
  C('🍰', 'Shortcake/3D/shortcake_3d.png', 'ケーキ', 'おやつ', 'スイーツ'),
  C('🍎', 'Red apple/3D/red_apple_3d.png', 'りんご', 'くだもの'),
  C('🍌', 'Banana/3D/banana_3d.png', 'バナナ'),
  C('🍺', 'Beer mug/3D/beer_mug_3d.png', 'ビール', 'おさけ'),
  C('🍵', 'Teacup without handle/3D/teacup_without_handle_3d.png', 'おちゃ', 'お茶'),
  C('🥗', 'Green salad/3D/green_salad_3d.png', 'サラダ', 'やさい'),
  C('🍔', 'Hamburger/3D/hamburger_3d.png', 'ハンバーガー'),
  C('🍕', 'Pizza/3D/pizza_3d.png', 'ピザ'),
  C('🍱', 'Bento box/3D/bento_box_3d.png', 'べんとう', '弁当'),
  C('🍩', 'Doughnut/3D/doughnut_3d.png', 'ドーナツ', 'おやつ'),
  C('🍫', 'Chocolate bar/3D/chocolate_bar_3d.png', 'チョコ'),
  C('🎂', 'Birthday cake/3D/birthday_cake_3d.png', 'たんじょうび', '誕生日'),
  // スポーツ・そと
  C('🏀', 'Basketball/3D/basketball_3d.png', 'バスケ'),
  C('⚾', 'Baseball/3D/baseball_3d.png', 'やきゅう', '野球'),
  C('🎾', 'Tennis/3D/tennis_3d.png', 'テニス'),
  C('🏐', 'Volleyball/3D/volleyball_3d.png', 'バレー'),
  C('🏸', 'Badminton/3D/badminton_3d.png', 'バドミントン'),
  C('🏓', 'Ping pong/3D/ping_pong_3d.png', 'たっきゅう', '卓球'),
  C('🏊', 'Person swimming/Default/3D/person_swimming_3d_default.png', 'すいえい', '水泳', 'プール'),
  C('🚴', 'Person biking/Default/3D/person_biking_3d_default.png', 'サイクリング', '自転車'),
  C('⛰', 'Mountain/3D/mountain_3d.png', 'やま', '山', '登山'),
  C('🎣', 'Fishing pole/3D/fishing_pole_3d.png', 'つり', '釣り'),
  C('🎳', 'Bowling/3D/bowling_3d.png', 'ボウリング'),
  C('⛺', 'Tent/3D/tent_3d.png', 'キャンプ'),
  // おんがく・しゅみ
  C('🎵', 'Musical note/3D/musical_note_3d.png', 'おんがく', '音楽'),
  C('🎸', 'Guitar/3D/guitar_3d.png', 'ギター', 'バンド'),
  C('🎹', 'Musical keyboard/3D/musical_keyboard_3d.png', 'ピアノ'),
  C('🎻', 'Violin/3D/violin_3d.png', 'バイオリン'),
  C('🥁', 'Drum/3D/drum_3d.png', 'ドラム'),
  C('🎺', 'Trumpet/3D/trumpet_3d.png', 'トランペット', '吹奏楽'),
  C('🎬', 'Clapper board/3D/clapper_board_3d.png', 'えいが', '映画', '動画'),
  C('📷', 'Camera/3D/camera_3d.png', 'カメラ', '写真'),
  C('🎭', 'Performing arts/3D/performing_arts_3d.png', 'えんげき', '演劇'),
  // しごと・どうぐ
  C('💼', 'Briefcase/3D/briefcase_3d.png', 'しごと', '仕事', 'かばん'),
  C('🖥', 'Desktop computer/3D/desktop_computer_3d.png', 'パソコン', 'デスクトップ'),
  C('🖨', 'Printer/3D/printer_3d.png', 'いんさつ', '印刷'),
  C('📅', 'Calendar/3D/calendar_3d.png', 'カレンダー', '予定'),
  C('⏰', 'Alarm clock/3D/alarm_clock_3d.png', 'めざまし', '時計'),
  C('🔑', 'Key/3D/key_3d.png', 'かぎ', '鍵'),
  C('💡', 'Light bulb/3D/light_bulb_3d.png', 'アイデア', 'でんきゅう'),
  C('✂️', 'Scissors/3D/scissors_3d.png', 'はさみ', '美容院'),
  C('🧰', 'Toolbox/3D/toolbox_3d.png', 'こうぐばこ', 'DIY'),
  C('💊', 'Pill/3D/pill_3d.png', 'くすり', '薬', '病院'),
  C('💉', 'Syringe/3D/syringe_3d.png', 'ちゅうしゃ', '注射'),
  C('🧪', 'Test tube/3D/test_tube_3d.png', 'じっけん', '実験'),
  C('🩹', 'Adhesive bandage/3D/adhesive_bandage_3d.png', 'ばんそうこう', 'けが'),
  // いえ・せいかつ
  C('🛋', 'Couch and lamp/3D/couch_and_lamp_3d.png', 'ソファ', 'くつろぐ'),
  C('🚿', 'Shower/3D/shower_3d.png', 'シャワー'),
  C('🧽', 'Sponge/3D/sponge_3d.png', 'スポンジ', '掃除'),
  C('🪣', 'Bucket/3D/bucket_3d.png', 'バケツ', '掃除'),
  C('🚽', 'Toilet/3D/toilet_3d.png', 'トイレ'),
  C('🛍', 'Shopping bags/3D/shopping_bags_3d.png', 'かいもの', 'ショッピング'),
  C('👕', 'T-shirt/3D/t-shirt_3d.png', 'ふく', '服', '着替え'),
  C('👟', 'Running shoe/3D/running_shoe_3d.png', 'くつ', '靴', 'ランニング'),
  C('🧦', 'Socks/3D/socks_3d.png', 'くつした'),
  C('🧢', 'Billed cap/3D/billed_cap_3d.png', 'ぼうし', '帽子'),
  // のりもの
  C('✈️', 'Airplane/3D/airplane_3d.png', 'ひこうき', '飛行機', '旅行'),
  C('🚕', 'Taxi/3D/taxi_3d.png', 'タクシー'),
  C('🚑', 'Ambulance/3D/ambulance_3d.png', 'きゅうきゅうしゃ', '救急'),
  C('🚚', 'Delivery truck/3D/delivery_truck_3d.png', 'トラック', '配達'),
  C('🛵', 'Motor scooter/3D/motor_scooter_3d.png', 'バイク', 'スクーター'),
  C('🛴', 'Kick scooter/3D/kick_scooter_3d.png', 'キックボード'),
  C('🚢', 'Ship/3D/ship_3d.png', 'ふね', '船'),
  // しぜん・てんき
  C('🌸', 'Cherry blossom/3D/cherry_blossom_3d.png', 'さくら', '桜', '花見'),
  C('🌻', 'Sunflower/3D/sunflower_3d.png', 'ひまわり', '花'),
  C('🌷', 'Tulip/3D/tulip_3d.png', 'チューリップ', '花'),
  C('🍀', 'Four leaf clover/3D/four_leaf_clover_3d.png', 'クローバー', 'ラッキー'),
  C('🌈', 'Rainbow/3D/rainbow_3d.png', 'にじ', '虹'),
  C('☀️', 'Sun/3D/sun_3d.png', 'たいよう', '晴れ'),
  C('☁️', 'Cloud/3D/cloud_3d.png', 'くも', '曇り'),
  C('☔', 'Umbrella with rain drops/3D/umbrella_with_rain_drops_3d.png', 'あめ', '雨', 'かさ'),
  C('❄️', 'Snowflake/3D/snowflake_3d.png', 'ゆき', '雪'),
  C('🌊', 'Water wave/3D/water_wave_3d.png', 'うみ', '海', 'なみ'),
  C('🔥', 'Fire/3D/fire_3d.png', 'ひ', '火', 'やるき'),
  C('⚡', 'High voltage/3D/high_voltage_3d.png', 'かみなり', '電気'),
  // きごう・そのほか
  C('❤️', 'Red heart/3D/red_heart_3d.png', 'ハート', 'すき'),
  C('💪', 'Flexed biceps/Default/3D/flexed_biceps_3d_default.png', 'きんにく', '筋肉', 'がんばる'),
  C('🙏', 'Folded hands/Default/3D/folded_hands_3d_default.png', 'おねがい', '感謝'),
  C('👍', 'Thumbs up/Default/3D/thumbs_up_3d_default.png', 'いいね'),
  C('✅', 'Check mark button/3D/check_mark_button_3d.png', 'チェック', '完了'),
  C('🎯', 'Bullseye/3D/bullseye_3d.png', 'まと', '目標', 'ダーツ'),
  C('🎁', 'Wrapped gift/3D/wrapped_gift_3d.png', 'プレゼント'),
  C('🎈', 'Balloon/3D/balloon_3d.png', 'ふうせん', '風船'),
  C('💰', 'Money bag/3D/money_bag_3d.png', 'おかね', 'お金', '貯金'),
  C('🧠', 'Brain/3D/brain_3d.png', 'のう', '脳', '考える'),
  C('👀', 'Eyes/3D/eyes_3d.png', 'め', '目', 'みる'),
];
// カタログの新規分を FLUENT_MAP に取り込む
EMOJI_CATALOG.forEach(e => { if (e.path && !FLUENT_MAP[e.g]) FLUENT_MAP[e.g] = e.path; });

export function fluentSrc(glyph) {
  const p = FLUENT_MAP[glyph];
  return p ? FLUENT_BASE + encodeURI(p) : null;
}

/* 物理ボディ用のDOMヘルパ。読み込み失敗時は絵文字テキストに戻す */
export function appendGlyph(el, glyph, sizePx) {
  const src = fluentSrc(glyph);
  if (!src) { el.textContent = glyph; return; }
  const img = document.createElement('img');
  img.src = src;
  img.alt = glyph;
  img.draggable = false;
  img.decoding = 'async';
  img.style.width = img.style.height = sizePx + 'px';
  img.style.objectFit = 'contain';
  img.style.pointerEvents = 'none';
  img.onerror = () => { if (img.parentNode) img.parentNode.replaceChild(document.createTextNode(glyph), img); };
  el.appendChild(img);
}

/* React用: 山の背景など。読み込み失敗時は絵文字テキストに戻す */
export default function Emo({ e, size }) {
  const [err, setErr] = React.useState(false);
  const src = err ? null : fluentSrc(e);
  if (!src) return e;
  return <img src={src} alt={e} draggable={false} decoding="async" loading="lazy" onError={() => setErr(true)} style={{ width: size, height: size, objectFit: 'contain', pointerEvents: 'none', display: 'block' }} />;
}
