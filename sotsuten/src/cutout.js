/* キャラ画像の白い背景を透明にする（画像の外側からつながっている白っぽいところだけ）。
   透過PNGがまだないので、読み込むときにブラウザで抜く。結果は src ごとに覚えておく */
const cache = {};

export function cutout(src) {
  if (!cache[src]) {
    cache[src] = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const w = img.naturalWidth, h = img.naturalHeight;
          const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
          const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
          const id = g.getImageData(0, 0, w, h), d = id.data;
          // 白っぽい（明るくて色が薄い）か
          const whiteness = (i) => { const r = d[i], gg = d[i + 1], b = d[i + 2]; const mn = Math.min(r, gg, b), mx = Math.max(r, gg, b); return mn >= 236 && mx - mn <= 9 ? mn : -1; }; // クリーム色の毛（少し黄色い）は白とみなさない
          const seen = new Uint8Array(w * h), stack = [];
          const push = (x, y) => { const k = y * w + x; if (seen[k]) return; seen[k] = 1; if (whiteness(k * 4) >= 0) stack.push(k); };
          for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
          for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
          while (stack.length) {
            const k = stack.pop(), x = k % w, y = (k - x) / w;
            const m = whiteness(k * 4);
            // 真っ白に近いほど透明に（ふちはなめらかに）
            d[k * 4 + 3] = Math.round(255 * Math.max(0, Math.min(1, (251 - m) / 15)));
            if (x > 0) push(x - 1, y); if (x < w - 1) push(x + 1, y);
            if (y > 0) push(x, y - 1); if (y < h - 1) push(x, y + 1);
          }
          // 画像のふちにくっついている小さなかけら（となりの絵のはみ出し）を消す。
          // いちばん大きいかたまり（本体）と、ふちに触れていない「？」や汗などは残す
          const lab = new Int32Array(w * h).fill(-1), comps = [];
          for (let k0 = 0; k0 < w * h; k0++) {
            if (lab[k0] >= 0 || d[k0 * 4 + 3] < 40) continue;
            const id2 = comps.length, st = [k0], px = []; let edge = false; lab[k0] = id2;
            while (st.length) {
              const k = st.pop(), x = k % w, y = (k - x) / w; px.push(k);
              if (x === 0 || y === 0 || x === w - 1 || y === h - 1) edge = true;
              const nb = [x > 0 ? k - 1 : -1, x < w - 1 ? k + 1 : -1, y > 0 ? k - w : -1, y < h - 1 ? k + w : -1];
              for (const q of nb) if (q >= 0 && lab[q] < 0 && d[q * 4 + 3] >= 40) { lab[q] = id2; st.push(q); }
            }
            comps.push({ px, edge });
          }
          const big = comps.reduce((m, c) => Math.max(m, c.px.length), 0);
          comps.forEach(c => { if (c.edge && c.px.length < big * 0.2) c.px.forEach(k => { d[k * 4 + 3] = 0; }); });
          g.putImageData(id, 0, 0);
          resolve(cv.toDataURL('image/png'));
        } catch (e) { resolve(src); }
      };
      img.onerror = () => resolve(src);
      img.src = src;
    });
  }
  return cache[src];
}
