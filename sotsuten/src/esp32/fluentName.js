/* ESP32 版: Fluent 絵文字のファイル名（LittleFS は長い名前・空白が苦手なので短くする）。scripts/build-esp32.mjs と同じ関数を使う */
export function fluentFile(path) {
  let h = 5381;
  for (let i = 0; i < path.length; i++) h = ((h * 33) ^ path.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
