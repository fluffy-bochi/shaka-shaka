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
};

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
  return <img src={src} alt={e} draggable={false} decoding="async" onError={() => setErr(true)} style={{ width: size, height: size, objectFit: 'contain', pointerEvents: 'none', display: 'block' }} />;
}
