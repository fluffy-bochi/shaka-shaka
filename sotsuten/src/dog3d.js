/* やるきーぬの3Dモデル（public/models/corgi_motions.glb）を el の中に表示する。
   モーション: doya happy idle nod relax sad shake think walk wave
   - いつもは base（ふだんは idle）をくり返し、play(name) でそのモーションを何回かやってから base にもどる
   - 背景は透明・カメラは正面に固定（さわっても回らない）
   - 読み込み中・失敗したとき・WebGL が使えないときは透過PNG（dog_3d.png）を出しておく
   - 古い iPad Pro でも重くならないように、画素数は最大2倍・動きは30コマ/秒・pause 中はかかない
   three.js は大きいので、はじめて使うときに読み込む */
export const DOG_PNG = '/chara/dog_3d.png';
export const DOG_RATIO = 456 / 700; // 絵の 横 / 縦
const FADE = 0.35; // モーションの切りかえ（秒）

let modelP = null; // モデルは1回だけ読み込んで、表示する場所ごとに複製する
function loadModel() {
  if (!modelP) {
    modelP = Promise.all([import('three'), import('three/examples/jsm/loaders/GLTFLoader.js'), import('three/examples/jsm/utils/SkeletonUtils.js')])
      .then(([THREE, { GLTFLoader }, SkeletonUtils]) => new Promise((res, rej) => new GLTFLoader().load('/models/corgi_motions.glb', (g) => res({ THREE, SkeletonUtils, gltf: g }), undefined, rej)));
    modelP.catch(() => { modelP = null; }); // 失敗したら次はもう一度ためす
  }
  return modelP;
}

/* ---- Claude Code で作った追加のモーション（骨を回して作る。モデルのファイルはそのまま） ----
   dig: 四つ足で前足で交互に土を掘る・ball: 四つ足のまま足をたたんで丸まる（ゴロゴロ用）
   nap: 四つ足のまま伏せて寝る（ゆっくり息をする）・crawl: 四つ足で歩く
   骨: body（腰が回転の中心）の子に arm.L/R・head・tail、root の子に foot.L/R（後ろ足）。
   回転は「体の向き」での角度（ラジアン）を、もとの姿勢の前にかける */
const Q4 = 1.35; // 四つ足のときに体を前にたおす角度
/* 前足の角度: bp＝体をたおした角度、x＝真下から前へどれだけ（0＝真下・1.57＝まっすぐ前・マイナスは後ろ）。体をたおしたぶんを打ち消してから回す */
const arm = (bp, x) => [-bp - x, 0, 0];
const POSES = {
  dig: { dur: 0.6, f: (t) => { const s = Math.sin(t * Math.PI * 4), c = Math.cos(t * Math.PI * 4), bp = Q4 + 0.15;
    return { body: { r: [bp + 0.04 * c, 0, 0.05 * s], p: [0, 0.03, -0.28] }, head: { r: [-bp * 0.5 + 0.1 * c, 0.1 * s, 0] },
      'arm.L': { r: arm(bp, 0.25 + 0.8 * s) }, 'arm.R': { r: arm(bp, 0.25 - 0.8 * s) },
      tail: { r: [0.3, 0.6 * Math.sin(t * Math.PI * 6), 0] } }; } },
  ball: { dur: 0.8, f: (t) => { const s = Math.sin(t * Math.PI * 2), bp = Q4;
    return { body: { r: [bp, 0, 0], p: [0, 0.08, -0.28] }, head: { r: [-bp * 0.8, 0, 0.08 * s] },
      'arm.L': { r: arm(bp, -0.7 + 0.2 * s) }, 'arm.R': { r: arm(bp, -0.7 - 0.2 * s) },
      'foot.L': { r: [0.9 + 0.2 * s, 0, 0], p: [0, 0.1, 0.1] }, 'foot.R': { r: [0.9 - 0.2 * s, 0, 0], p: [0, 0.1, 0.1] }, tail: { r: [0.6, 0, 0] } }; } },
  nap: { dur: 3.2, f: (t) => { const b = Math.sin(t * Math.PI * 2), bp = Q4 + 0.2;
    return { body: { r: [bp, 0, 0], p: [0, -0.06 + 0.008 * b, -0.28], s: [1 + 0.02 * b, 1, 1 + 0.02 * b] }, head: { r: [-bp * 0.72 + 0.04 * b, 0, 0.12] },
      'arm.L': { r: arm(bp, 1.3) }, 'arm.R': { r: arm(bp, 1.3) },
      tail: { r: [0.2, 0.25 * b, 0] },
      // 目をとじる（目を横に細くつぶして、光を消す）
      'eye.L': { s: [1.1, 0.12, 1] }, 'eye.R': { s: [1.1, 0.12, 1] }, 'hl.L': { s: [0.01, 0.01, 0.01] }, 'hl.R': { s: [0.01, 0.01, 0.01] }, 'spark.L': { s: [0.01, 0.01, 0.01] }, 'spark.R': { s: [0.01, 0.01, 0.01] }, 'eyew.L': { s: [0.01, 0.01, 0.01] }, 'eyew.R': { s: [0.01, 0.01, 0.01] } }; } },
  crawl: { dur: 0.6, f: (t) => { const s = Math.sin(t * Math.PI * 2), c = Math.abs(Math.cos(t * Math.PI * 2)), bp = Q4;
    return { body: { r: [bp, 0, 0.04 * s], p: [0, 0.07 + 0.03 * c, -0.28] }, head: { r: [-bp * 0.8 + 0.05 * c, 0.06 * s, 0] },
      'arm.L': { r: arm(bp, 0.55 * s) }, 'arm.R': { r: arm(bp, -0.55 * s) },
      'foot.L': { r: [-0.5 * s, 0, 0] }, 'foot.R': { r: [0.5 * s, 0, 0] }, tail: { r: [0.3, 0.5 * s, 0] } }; } },
};
function makeClips(THREE, model) {
  const bones = []; model.traverse(o => { if (o.isBone) bones.push(o); });
  const key = (n) => n.replace(/[.\s]/g, ''); // three.js は名前の「.」を消す（arm.L → armL）
  const rest = Object.fromEntries(bones.map(b => [b.name, { q: b.quaternion.clone(), p: b.position.clone(), s: b.scale.clone() }]));
  const qd = new THREE.Quaternion(), e = new THREE.Euler();
  return Object.entries(POSES).map(([name, { dur, f }]) => {
    const N = 24, times = [], tr = {};
    bones.forEach(b => { tr[b.name] = { q: [], p: [], s: [] }; });
    for (let i = 0; i <= N; i++) {
      const t = i / N; times.push(t * dur);
      const pose = {}; Object.entries(f(t)).forEach(([k, v]) => { pose[key(k)] = v; });
      bones.forEach(b => {
        const R = rest[b.name], v = pose[key(b.name)] || {}, o = tr[b.name];
        const q = R.q.clone();
        if (v.r) { qd.setFromEuler(e.set(v.r[0], v.r[1], v.r[2])); q.premultiply(qd); }
        o.q.push(q.x, q.y, q.z, q.w);
        o.p.push(R.p.x + (v.p ? v.p[0] : 0), R.p.y + (v.p ? v.p[1] : 0), R.p.z + (v.p ? v.p[2] : 0));
        o.s.push(R.s.x * (v.s ? v.s[0] : 1), R.s.y * (v.s ? v.s[1] : 1), R.s.z * (v.s ? v.s[2] : 1));
      });
    }
    const tracks = [];
    bones.forEach(b => {
      const o = tr[b.name];
      tracks.push(new THREE.QuaternionKeyframeTrack(b.name + '.quaternion', times, o.q));
      tracks.push(new THREE.VectorKeyframeTrack(b.name + '.position', times, o.p));
      tracks.push(new THREE.VectorKeyframeTrack(b.name + '.scale', times, o.s));
    });
    return new THREE.AnimationClip(name, dur, tracks);
  });
}

/* 返り値: { play(name, times), setBase(name), pause(bool), busy(), dispose() }。読み込み前に呼んでも、読み込み後に反映する */
/* wide: 絵の四角より横に広くかく（横を向いたり転がったりしてもはみ出さないように。大きさは同じ）
   frame: 'face' で顔のアップ（中継のワイプ用） */
export function mountDog(el, { base = 'idle', wide = 1, frame = 'body' } = {}) {
  const img = document.createElement('img');
  img.src = DOG_PNG; img.alt = '';
  Object.assign(img.style, { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center bottom' });
  el.appendChild(img);
  let dead = false, raf = 0, ro = null, renderer = null, canvas = null, paused = false;
  let want = { base, once: null }; // 読み込み前に頼まれたこと
  let api = null; // 読み込み後の本体
  loadModel().then(({ THREE, SkeletonUtils, gltf }) => {
    if (dead) return;
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    canvas = renderer.domElement;
    Object.assign(canvas.style, { position: 'absolute', top: 0, left: (-(wide - 1) / 2 * 100) + '%', width: wide * 100 + '%', height: '100%', opacity: 0 });
    el.appendChild(canvas);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd8cfc0, 2.2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(1.5, 3, 4); scene.add(sun);
    const model = SkeletonUtils.clone(gltf.scene);
    scene.add(model);
    model.traverse(o => { if (o.isMesh) o.frustumCulled = false; }); // 手や体を動かしたときに消えないように
    const mixer = new THREE.AnimationMixer(model);
    const acts = {};
    gltf.animations.forEach(c => { acts[c.name] = mixer.clipAction(c); });
    makeClips(THREE, model).forEach(c => { acts[c.name] = mixer.clipAction(c); }); // dig ball nap crawl
    let cur = null, curAt = 0, baseName = null, onceT = 0, oneShot = false, yaw = 0;
    const go = (name, times) => {
      const a = acts[name] || acts.idle; if (!a) return;
      clearTimeout(onceT);
      a.reset(); a.setEffectiveWeight(1);
      a.setLoop(THREE.LoopRepeat, Infinity);
      if (cur && cur !== a) a.crossFadeFrom(cur, FADE, false); else a.fadeIn(cur ? 0 : 0.0001);
      a.play(); cur = a; curAt = performance.now(); oneShot = !!times;
      if (times) onceT = setTimeout(() => { if (!dead && cur === a) go(baseName); }, a.getClip().duration * times * 1000 - FADE * 500);
    };
    api = {
      play: (name, times = 2) => { if (acts[name]) go(name, times); },
      busy: () => oneShot,
      turn: (a) => { yaw = a; }, // 向き（0＝正面・＋で右を向く）。少しずつまわる
      // 1回きりのモーション中なら、終わってから。now: 1回きりのモーションを止めてすぐ（歩き出すときなど・体の移動とずれないように）
      setBase: (name, now) => { baseName = acts[name] ? name : 'idle'; if ((now || !oneShot) && cur !== acts[baseName]) go(baseName); },
      // いま出ているモーションの名前と、出始めてからの秒（切りかえの途中かどうかを見る）
      motion: () => (cur ? { name: cur.getClip().name, t: (performance.now() - curAt) / 1000 } : null),
    };
    baseName = acts[want.base] ? want.base : 'idle';
    go(baseName);
    if (want.once) api.play(want.once.name, want.once.times);
    if (want.yaw != null) { yaw = want.yaw; model.rotation.y = yaw; }
    mixer.update(0);
    // 正面から全身が入るように（体を動かす分すこし余白）。大きさは idle の最初のポーズで決める
    const box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const camera = new THREE.PerspectiveCamera(20, 1, 0.01, 100);
    const fit = () => {
      const w = el.clientWidth || 1, h = el.clientHeight || 1;
      renderer.setSize(w * wide, h, false);
      camera.aspect = (w * wide) / h;
      // 縦か横、はみ出しそうなほうに合わせる（横は絵の四角の幅で決める＝wide でも大きさは同じ）。顔のアップは頭のあたり
      const vh = frame === 'face' ? size.y * 0.66 : Math.max(size.y * 1.06, (size.x * 1.2) / (w / h));
      const cy = frame === 'face' ? c.y + size.y * 0.04 : c.y;
      const dist = vh / 2 / Math.tan((camera.fov * Math.PI) / 360) + size.z / 2;
      camera.position.set(c.x, cy, c.z + dist);
      camera.lookAt(c.x, cy, c.z);
      camera.updateProjectionMatrix();
    };
    fit();
    const draw = () => { renderer.render(scene, camera); };
    draw();
    canvas.style.opacity = 1; img.style.visibility = 'hidden'; // 3Dが出たら絵は隠す
    ro = new ResizeObserver(() => { fit(); draw(); });
    ro.observe(el);
    let last = performance.now(), acc = 0;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const dt = (now - last) / 1000; last = now;
      if (paused) return;
      acc += dt;
      if (acc < 1 / 31) return; // 30コマ/秒
      const st = Math.min(acc, 0.1);
      mixer.update(st); acc = 0;
      model.rotation.y += (yaw - model.rotation.y) * Math.min(1, st * 7);
      draw();
    };
    raf = requestAnimationFrame(tick);
  }).catch(() => { /* 絵のまま */ });
  const ctl = {
    paused: () => paused,
    play(name, times) { if (api) api.play(name, times); else want.once = { name, times }; },
    setBase(name, now) { if (api) api.setBase(name, now); else want.base = name; },
    motion() { return api ? api.motion() : null; }, // 読み込み前・絵のときは null
    pause(b) { paused = !!b; },
    busy() { return api ? api.busy() : true; }, // 1回きりのモーション中か
    turn(a) { if (api) api.turn(a); else want.yaw = a; },
    dispose() {
      dead = true; cancelAnimationFrame(raf); if (ro) ro.disconnect();
      if (renderer) { renderer.dispose(); renderer.forceContextLoss(); }
      if (canvas) canvas.remove(); img.remove();
      delete el.dataset.dog; el.dogCtl = null;
    },
  };
  el.dataset.dog = '1'; el.dogCtl = ctl; // なでる（PetCursor.jsx）が見つけられるように
  return ctl;
}
