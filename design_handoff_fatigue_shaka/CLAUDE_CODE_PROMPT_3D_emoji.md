# Claude Code 依頼プロンプト — 絵文字を Fluent UI 3D に置き換え

> このファイルの本文（下の「==== プロンプト本体 ここから ====」以降）をそのまま Claude Code に貼ってください。
> 対象リポジトリ: `prototype.html`（疲労シャカシャカ）。同梱の `shaka_physics_reference.html` は物理挙動の参照。

---

==== プロンプト本体 ここから ====

## ゴール
`prototype.html` で使っている Unicode 絵文字を、**Microsoft Fluent UI Emoji の 3D 版 PNG**（https://github.com/microsoft/fluentui-emoji ）に置き換えてください。
特に重要なのは **シャカシャカ（物理シミュレーションで降ってきて積もる絵文字＝`#physics` レイヤーの charm）** が 3D 絵文字になること。タイムラインの行・チップ・詳細・トーストの絵文字も、可能な範囲で同じ 3D 画像に統一してください。

## 重要な制約・工夫ポイント（必ず守る）

1. **リポジトリ全体を clone しない。** 3D アセットだけで 1500 個以上あり巨大です。**使う絵文字だけ**を取得してリポジトリ内 `assets/emoji-3d/` に保存し、ローカル参照にしてください（CDN 直リンクに依存しない＝オフラインでも動く）。raw 取得例:
   `https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/<フォルダ名>/3D/<ファイル名>_3d.png`

2. **英語名を“推測”しない。** Fluent UI 側のフォルダ名・ファイル名は CLDR 準拠で揺れます。下の対応表の **Unicode コードポイントを正**として、各 `assets/<Name>/metadata.json` の `"unicode"` と突き合わせて実ファイル名を確定してください。ファイル名は基本「フォルダ名を小文字スネークケース化 + `_3d.png`」です（例: `Speech Balloon` → `speech_balloon_3d.png`）。

3. **異体字セレクタ（U+FE0F）に注意。** `⌨️ Keyboard` `✏️ Pencil` などは VS16 付き。metadata 上の unicode 表記と一致させること。

4. **スキントーン付き絵文字は `Default/` 配下。** `🏃 Person Running` `🚶 Person Walking` `🛌 Person In Bed` は
   `assets/<Name>/Default/3D/<name>_3d_default.png` という階層になります（`3D/` 直下ではない）。ここを取り違えると 404 します。

5. **すべてが綺麗に対応するとは限らない。** 対応表で「？」の行や、取得に失敗した絵文字は **元の Unicode 絵文字にフォールバック**してください（画像 `onerror` でテキスト絵文字を表示）。勝手に意味の違う絵文字で代用しない。判断に迷うものはコード内に `// TODO: 要確認` を残す。

6. **見た目とパフォーマンス。**
   - charm 1個 = `<img>`（3D PNG）。`#physics` は最大 100 個出るので、**絵文字ごとに 1 回だけ画像を生成・プリロードして使い回す**（同じ src の `<img>` を量産で OK だが、`decoding="async" loading="eager"` を付けてプリロード）。
   - サイズは現状の charm（直径 `2R=36px`、`font-size:30px`）に合わせる。3D 画像は正方形なので `width/height` を charm の直径にフィットさせ、`object-fit:contain`、既存の `filter: drop-shadow(...)` は維持。
   - 物理ボディ（matter-js の circle, R=18）は**変えない**。見た目だけ画像化する。落下・反発・振る挙動（`shakePile`/`settlePile`/`devicemotion`）は現状のまま動くこと。

7. **置き換えは一元化する。** いま絵文字は複数箇所でベタ書きされています（`EMOJI_MAP`、charm 生成 `addCharm`、リスト `renderList`、チップ `buildAddSheet`、詳細 `openDetail`、トースト）。
   `emojiAsset(unicodeChar) -> {src, fallback}` のような **ヘルパー1個**を作り、各所はそれを呼ぶ形にリファクタしてください。`textContent = emoji` をやめ、`<img src>` + テキストフォールバックに統一。

8. **ライセンス表記。** Fluent UI Emoji はアセットが MIT。`README.md` か `THIRD_PARTY_NOTICES` に出典（Microsoft Fluent UI Emoji, MIT）を1行追記。

## 対応表（行動アイコン EMOJI_MAP / Unicode を正とする）

| 行動(act) | 現Unicode | コードポイント | Fluent フォルダ名 | 階層 |
|---|---|---|---|---|
| 会議 | 💬 | U+1F4AC | Speech Balloon | `3D/` |
| 通勤 | 🚃 | U+1F683 | Railway Car | `3D/` |
| レビュー | 💻 | U+1F4BB | Laptop | `3D/` |
| 作業 | ⌨️ | U+2328 U+FE0F | Keyboard | `3D/` |
| 資料作成 | ✏️ | U+270F U+FE0F | Pencil | `3D/` |
| メール | 📧 | U+1F4E7 | E-Mail | `3D/` |
| 勉強 | 📚 | U+1F4DA | Books | `3D/` |
| 運動 | 🏃 | U+1F3C3 | Person Running | `Default/3D/` |
| 散歩 | 🚶 | U+1F6B6 | Person Walking | `Default/3D/` |
| 家事 | 🧹 | U+1F9F9 | Broom | `3D/` |
| 育児 | 🍼 | U+1F37C | Baby Bottle | `3D/` |
| 通話 | 📞 | U+1F4DE | Telephone Receiver | `3D/` |
| 睡眠 | 🛌 | U+1F6CC | Person In Bed | `Default/3D/` |
| 食事 | 🍙 | U+1F359 | Rice Ball | `3D/` |
| 休憩 | ☕ | U+2615 | Hot Beverage | `3D/` |
| 昼寝 | 😴 | U+1F634 | Sleeping Face | `3D/` |
| ゲーム | 🎮 | U+1F3AE | Video Game | `3D/` |
| 読書 | 📖 | U+1F4D6 | Open Book | `3D/` |
| 入浴 | 🛁 | U+1F6C1 | Bathtub | `3D/` |
| (フォールバック) | ✨ | U+2728 | Sparkles | `3D/` |

## 対応表（気分 MOODS / 任意・できれば統一）

| 現Unicode | コードポイント | Fluent フォルダ名 | 階層 |
|---|---|---|---|
| 😆 | U+1F606 | Grinning Squinting Face | `3D/` |
| 🙂 | U+1F642 | Slightly Smiling Face | `3D/` |
| 😌 | U+1F60C | Relieved Face | `3D/` |
| 🥲 | U+1F972 | Smiling Face With Tear | `3D/` |
| 😩 | U+1F629 | Weary Face | `3D/` |
| 😢 | U+1F622 | Crying Face | `3D/` |

> 気分は charm ではなく行ラベル右の小アイコンなので、優先度は低い。難しければ Unicode のままで可。

## 実装手順（推奨）

1. 上表のフォルダごとに metadata.json を取得し、`unicode` がコードポイントと一致するか検証 → 実際の 3D PNG ファイル名を確定。
2. 必要 PNG だけ raw からダウンロードし `assets/emoji-3d/<snake_name>.png` に保存（Default 系も同じ平らな名前で保存して OK）。
3. `EMOJI_MAP` の値を「Unicode 文字」のまま残しつつ、`act -> 3D画像パス` の `ASSET_MAP` を新設（Unicode はフォールバック用に保持）。
4. `emojiImg(act)` ヘルパー: `<img src=ASSET_MAP[act] onerror="この要素をテキスト絵文字に差し替え">` を返す（charm 用は要素を直接生成、テキスト埋め込み用途は同じ src の img タグ文字列）。
5. `addCharm`：`el.textContent = emoji` を `el` 内に img を入れる形へ。サイズ・drop-shadow を合わせる。**物理は触らない。**
6. リスト/チップ/詳細/トーストの絵文字も `emojiImg` 経由に。インラインで縦位置が崩れないよう `vertical-align:middle` 等を調整。
7. `prototype.html` 単体で開いて、`#physics` の charm が 3D 画像で降ってきて積もること、振るボタンで飛び散ること、ログ追加で個数が増減することを確認。取得失敗が出たら Unicode フォールバックされていることを確認。

## 受け入れ条件
- [ ] シャカシャカ（charm）が Fluent 3D 絵文字で表示され、落下・衝突・反発・振る・そろえるが従来どおり動く。
- [ ] 3D アセットはローカル同梱でオフライン動作。CDN 落ちでも壊れない。
- [ ] 未対応・取得失敗の絵文字は元 Unicode にフォールバック（意味の違う絵文字で代用していない）。
- [ ] 絵文字描画が `emojiImg` 系ヘルパーに一元化されている。
- [ ] 出典/ライセンス（Fluent UI Emoji, MIT）を明記。

==== プロンプト本体 ここまで ====
