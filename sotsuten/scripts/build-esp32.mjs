/* 卒展アプリを ESP32 に入れる版にビルドする（インターネットなしで動く）。
   使い方: npm run build:esp32 -- <スケッチの data フォルダ>
     例: npm run build:esp32 -- ~/Documents/4th/卒業研究/展示/工作/esp32_sotsuten/data
   やること:
     1. vite build --mode esp32（Firebase なし・Google フォントの代わりに /fonts/fonts.css・Fluent 絵文字は /f/*.webp）
     2. Fluent 絵文字（src/fluent.jsx に載っているもの全部）を CDN から取って WebP（画質80）にし、fluent.pack にまとめる（目次 fluent.idx）
     3. アイコン（Material Symbols）と英数字のフォントを Google Fonts から必要なぶんだけ取る → /fonts/
     4. 文字のファイル（html/js/css/svg/glb）は gzip にして .gz だけ置く（ESP32 のスケッチが Content-Encoding: gzip で返す）
   2・3 はビルドする Mac にインターネットが要る（取ったものは .esp32-cache/ にためるので、2回目からは要らない） */
import { build } from 'vite';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import { fluentFile } from '../src/esp32/fluentName.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = path.join(ROOT, '.esp32-cache');
const TMP = path.join(CACHE, 'dist');
const FS_SIZE = 0x1E0000; // Partition Scheme「No OTA (2MB APP/2MB SPIFFS)」のファイル領域
const FLUENT_BASE = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/';
const UA = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
// 卒展アプリで使っているアイコン（Material Symbols Rounded）。アイコンを足したらここにも足す
const ICONS = ['add', 'auto_stories', 'blur_on', 'brush', 'category', 'chat_bubble', 'chevron_left', 'chevron_right', 'cleaning_services',
  'directions_car', 'directions_subway', 'eco', 'face', 'favorite', 'fitness_center', 'fullscreen', 'groups', 'home', 'local_cafe',
  'medical_services', 'menu_book', 'music_note', 'palette', 'person', 'pets', 'rocket_launch', 'savings', 'school', 'self_improvement',
  'sick', 'spa', 'sports_esports', 'sports_soccer', 'star', 'storefront', 'summarize', 'today', 'volunteer_activism', 'work'];
const ASCII = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('') + '・';
const GZIP_EXT = new Set(['.html', '.js', '.css', '.svg', '.json', '.glb', '.webmanifest', '.txt']);

const out = process.argv[2] && path.resolve(process.argv[2].replace(/^~/, process.env.HOME));
if (!out || path.basename(out) !== 'data') {
  console.error('スケッチの data フォルダを指定してください（例: npm run build:esp32 -- ~/…/esp32_sotsuten/data）');
  process.exit(1);
}

const get = async (url, type = 'buffer') => {
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return type === 'text' ? r.text() : Buffer.from(await r.arrayBuffer());
};
const cached = async (file, make) => {
  const p = path.join(CACHE, file);
  if (fs.existsSync(p)) return fs.readFileSync(p);
  const b = await make();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, b);
  return b;
};

// 1. ビルド
fs.rmSync(TMP, { recursive: true, force: true });
await build({ root: ROOT, configFile: path.join(ROOT, 'vite.config.js'), mode: 'esp32', logLevel: 'warn', build: { outDir: TMP, emptyOutDir: true, chunkSizeWarningLimit: 4000 } });

// 2. Fluent 絵文字 → WebP
const src = fs.readFileSync(path.join(ROOT, 'src/fluent.jsx'), 'utf8');
const paths = [...new Set([...src.matchAll(/'([^']+\/(?:3D|Color|Flat|High Contrast)\/[^']+\.(?:png|svg))'/g)].map(m => m[1]))];
// LittleFS は小さいファイルでも 4KB ずつ場所をとるので、1つのファイル（fluent.pack）にまとめる。
// 目次（fluent.idx: 1行に「名前 位置 長さ」）を見て、ESP32 のスケッチが /f/<名前>.webp を切り出して返す
const parts = [], idx = [];
let n = 0, off = 0;
for (const p of paths) {
  const name = fluentFile(p);
  const b = await cached('f/' + name + '.webp', async () => sharp(await get(FLUENT_BASE + encodeURI(p))).webp({ quality: 80, alphaQuality: 80, effort: 6 }).toBuffer());
  if (idx.some(l => l.startsWith(name + ' '))) continue;
  parts.push(b); idx.push(`${name} ${off} ${b.length}`); off += b.length;
  if (++n % 40 === 0) console.log(`絵文字 ${n}/${paths.length}`);
}
fs.writeFileSync(path.join(TMP, 'fluent.pack'), Buffer.concat(parts));
fs.writeFileSync(path.join(TMP, 'fluent.idx'), idx.join('\n') + '\n');
console.log(`絵文字 ${idx.length} 枚 ${(off / 1048576).toFixed(2)}MB`);

// 3. フォント
const fontCss = [];
const addFont = async (key, cssUrl) => {
  const css = (await cached(`fonts/${key}.css`, async () => Buffer.from(await get(cssUrl, 'text')))).toString();
  const faces = css.match(/@font-face\s*{[^}]*}/g) || [];
  for (const [i, face] of faces.entries()) {
    const url = (face.match(/url\(([^)]+)\)/) || [])[1];
    if (!url) continue;
    const file = `${key}-${i}.woff2`;
    fs.mkdirSync(path.join(TMP, 'fonts'), { recursive: true });
    fs.writeFileSync(path.join(TMP, 'fonts', file), await cached('fonts/' + file, () => get(url)));
    fontCss.push(face.replace(/url\([^)]+\)/, `url(/fonts/${file})`));
  }
};
await addFont('icons', `https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0..1,0&icon_names=${[...ICONS].sort().join(',')}`);
await addFont('text', `https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Archivo:wght@800&text=${encodeURIComponent(ASCII)}`);
fs.writeFileSync(path.join(TMP, 'fonts', 'fonts.css'), fontCss.join('\n') + '\n');

// 4. gzip して data へ
fs.rmSync(out, { recursive: true, force: true });
let total = 0, blocks = 0, files = 0;
const walk = (dir) => {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const from = path.join(dir, ent.name);
    if (ent.isDirectory()) { walk(from); continue; }
    if (ent.name === '.DS_Store') continue;
    const rel = path.relative(TMP, from);
    let buf = fs.readFileSync(from), to = path.join(out, rel);
    if (GZIP_EXT.has(path.extname(ent.name).toLowerCase())) { buf = zlib.gzipSync(buf, { level: 9 }); to += '.gz'; }
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.writeFileSync(to, buf);
    total += buf.length; blocks += Math.ceil(buf.length / 4096) + 1; files++;
  }
};
walk(TMP);
const used = blocks * 4096;
console.log(`data: ${files} ファイル ${(total / 1048576).toFixed(2)}MB（LittleFS で約 ${(used / 1048576).toFixed(2)}MB／${(FS_SIZE / 1048576).toFixed(2)}MB）→ ${out}`);
if (used > FS_SIZE * 0.95) { console.error('ESP32 のファイル領域に入りません'); process.exit(1); }
