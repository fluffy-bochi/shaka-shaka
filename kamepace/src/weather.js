/* 天気（Open-Meteo・キー不要・非商用は無料。出典「Open-Meteo.com」を表示する）。
   地域はマイページで都道府県（県庁所在地の座標）を選ぶ（prefs.weatherArea）。位置情報は使わない。
   取った天気は端末（localStorage）に日ごとにためる。クラウドの記録には入れない（保存の失敗を増やさないため）。
   直近60日〜3日先は forecast、それより前の日は archive から取る。 */

export const AREAS = [
  ['hokkaido', '北海道', 43.06, 141.35], ['aomori', '青森', 40.82, 140.74], ['iwate', '岩手', 39.70, 141.15],
  ['miyagi', '宮城', 38.27, 140.87], ['akita', '秋田', 39.72, 140.10], ['yamagata', '山形', 38.24, 140.36],
  ['fukushima', '福島', 37.75, 140.47], ['ibaraki', '茨城', 36.34, 140.45], ['tochigi', '栃木', 36.57, 139.88],
  ['gunma', '群馬', 36.39, 139.06], ['saitama', '埼玉', 35.86, 139.65], ['chiba', '千葉', 35.61, 140.12],
  ['tokyo', '東京', 35.69, 139.69], ['kanagawa', '神奈川', 35.45, 139.64], ['niigata', '新潟', 37.90, 139.02],
  ['toyama', '富山', 36.70, 137.21], ['ishikawa', '石川', 36.59, 136.63], ['fukui', '福井', 36.07, 136.22],
  ['yamanashi', '山梨', 35.66, 138.57], ['nagano', '長野', 36.65, 138.18], ['gifu', '岐阜', 35.39, 136.72],
  ['shizuoka', '静岡', 34.98, 138.38], ['aichi', '愛知', 35.18, 136.91], ['mie', '三重', 34.73, 136.51],
  ['shiga', '滋賀', 35.00, 135.87], ['kyoto', '京都', 35.02, 135.76], ['osaka', '大阪', 34.69, 135.52],
  ['hyogo', '兵庫', 34.69, 135.18], ['nara', '奈良', 34.69, 135.83], ['wakayama', '和歌山', 34.23, 135.17],
  ['tottori', '鳥取', 35.50, 134.24], ['shimane', '島根', 35.47, 133.05], ['okayama', '岡山', 34.66, 133.93],
  ['hiroshima', '広島', 34.40, 132.46], ['yamaguchi', '山口', 34.19, 131.47], ['tokushima', '徳島', 34.07, 134.56],
  ['kagawa', '香川', 34.34, 134.04], ['ehime', '愛媛', 33.84, 132.77], ['kochi', '高知', 33.56, 133.53],
  ['fukuoka', '福岡', 33.61, 130.42], ['saga', '佐賀', 33.25, 130.30], ['nagasaki', '長崎', 32.74, 129.87],
  ['kumamoto', '熊本', 32.79, 130.74], ['oita', '大分', 33.24, 131.61], ['miyazaki', '宮崎', 31.91, 131.42],
  ['kagoshima', '鹿児島', 31.56, 130.56], ['okinawa', '沖縄', 26.21, 127.68],
].map(([id, name, lat, lon]) => ({ id, name, lat, lon }));
const areaOf = (id) => AREAS.find(a => a.id === id) || null;

/* WMO の天気コード → 晴れ・曇り・雨・雪 */
const KINDS = {
  sun: { name: '晴れ', glyph: '☀️' }, cloud: { name: '曇り', glyph: '☁️' },
  rain: { name: '雨', glyph: '🌧' }, snow: { name: '雪', glyph: '❄️' },
};
export function kindOf(code) {
  if (code == null) return null;
  if (code <= 1) return 'sun';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return 'rain';
  return 'cloud'; // 2, 3, 45, 48（霧）
}

const KEY = (id) => 'kame_weather_' + id;
const mem = {};
function load(id) {
  if (!mem[id]) { try { mem[id] = JSON.parse(localStorage.getItem(KEY(id)) || 'null') || { at: 0, days: {} }; } catch (e) { mem[id] = { at: 0, days: {} }; } }
  return mem[id];
}
function store(id) { try { localStorage.setItem(KEY(id), JSON.stringify(mem[id])); } catch (e) { /* 入らなければ毎回取る */ } }

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const shift = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return ymd(d); };

/* その日の天気（手元にあれば）: { kind, name, glyph, max, min } */
export function get(id, date) {
  const a = areaOf(id);
  if (!a || !date) return null;
  const x = load(id).days[date];
  if (!x) return null;
  const k = kindOf(x.c);
  return { kind: k, ...(k ? KINDS[k] : { name: '', glyph: '' }), max: x.max == null ? null : Math.round(x.max), min: x.min == null ? null : Math.round(x.min) };
}

const inflight = {}, failedAt = {};
const FRESH = 3 * 3600000; // 今日・これからの日は3時間ごとに取り直す（予報が変わる）
/* 足りない日を取りに行く。取れたら onDone()。同じ取り方は同時に1回・失敗したら10分あける */
export function ensure(id, dates, onDone) {
  const a = areaOf(id);
  if (!a || !dates || !dates.length) return;
  const c = load(id), today = ymd(new Date()), recent = shift(today, -60); // forecast の過去は実際は75日ほどしか返らないので、60日より前は archive
  const age = Date.now() - c.at;
  // 3日より先の日は取れないので取りに行かない。取ったばかりでも無い日は10分あける
  const needRecent = dates.some(d => d >= recent && d <= shift(today, 2) && (!c.days[d] ? age > 600000 : (d >= shift(today, -1) && age > FRESH)));
  const old = dates.filter(d => d < recent && !c.days[d]).sort();
  const base = 'latitude=' + a.lat + '&longitude=' + a.lon + '&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FTokyo';
  if (needRecent) get1(id, 'recent', 'https://api.open-meteo.com/v1/forecast?' + base + '&past_days=92&forecast_days=3', true, onDone);
  if (old.length) get1(id, 'old' + old[0], 'https://archive-api.open-meteo.com/v1/archive?' + base + '&start_date=' + old[0] + '&end_date=' + old[old.length - 1], false, onDone);
}
function get1(id, tag, url, isRecent, onDone) {
  const k = id + ':' + tag;
  if (inflight[k] || (failedAt[k] && Date.now() - failedAt[k] < 600000)) return;
  inflight[k] = true;
  fetch(url).then(r => (r.ok ? r.json() : Promise.reject(new Error('weather ' + r.status)))).then(j => {
    const dl = j && j.daily, c = load(id);
    if (!dl || !dl.time) throw new Error('weather: no daily');
    dl.time.forEach((t, i) => {
      const x = { c: dl.weather_code[i], max: dl.temperature_2m_max[i], min: dl.temperature_2m_min[i] };
      if (x.c == null && x.max == null) return; // まだ値がない日
      c.days[t] = x;
    });
    if (isRecent) c.at = Date.now();
    store(id);
    if (onDone) onDone();
  }).catch(() => { /* つぎは10分後 */ }).finally(() => { failedAt[k] = Date.now(); delete inflight[k]; });
}
