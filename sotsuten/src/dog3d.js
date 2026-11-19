/* やるきーぬの3Dモデル（public/models/corgi.glb）を el の中に表示する。
   - 背景は透明・カメラは正面に固定（さわっても回らない）
   - wave: true なら "wave" をくり返す。false なら最初のポーズで止める（絵を1回かくだけ）
   - 読み込み中・失敗したとき・WebGL が使えないときは透過PNG（dog_3d.png）を出しておく
   - 古い iPad Pro でも重くならないように、画素数は最大2倍・動きは30コマ/秒
   three.js は大きいので、はじめて使うときに読み込む */
export const DOG_PNG = '/chara/dog_3d.png';
export const DOG_RATIO = 456 / 700; // 絵の 横 / 縦

let modelP = null; // モデルは1回だけ読み込んで、表示する場所ごとに複製する
function loadModel() {
  if (!modelP) {
    modelP = Promise.all([import('three'), import('three/examples/jsm/loaders/GLTFLoader.js'), import('three/examples/jsm/utils/SkeletonUtils.js')])
      .then(([THREE, { GLTFLoader }, SkeletonUtils]) => new Promise((res, rej) => new GLTFLoader().load('/models/corgi.glb', (g) => res({ THREE, SkeletonUtils, gltf: g }), undefined, rej)));
    modelP.catch(() => { modelP = null; }); // 失敗したら次はもう一度ためす
  }
  return modelP;
}

export function mountDog(el, { wave = true } = {}) {
  const img = document.createElement('img');
  img.src = DOG_PNG; img.alt = '';
  Object.assign(img.style, { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center bottom' });
  el.appendChild(img);
  let dead = false, raf = 0, ro = null, renderer = null, canvas = null;
  loadModel().then(({ THREE, SkeletonUtils, gltf }) => {
    if (dead) return;
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    canvas = renderer.domElement;
    Object.assign(canvas.style, { position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0 });
    el.appendChild(canvas);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd8cfc0, 2.2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(1.5, 3, 4); scene.add(sun);
    const model = SkeletonUtils.clone(gltf.scene);
    scene.add(model);
    model.traverse(o => { if (o.isMesh) o.frustumCulled = false; }); // 手をふったときに消えないように
    const mixer = new THREE.AnimationMixer(model);
    const clip = THREE.AnimationClip.findByName(gltf.animations, 'wave') || gltf.animations[0];
    if (clip) { const a = mixer.clipAction(clip); a.setLoop(THREE.LoopRepeat); a.play(); }
    mixer.update(0);
    // 正面から全身が入るように（手をふる分すこし余白）
    const box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const camera = new THREE.PerspectiveCamera(20, 1, 0.01, 100);
    const fit = () => {
      const w = el.clientWidth || 1, h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const vh = Math.max(size.y * 1.04, (size.x * 1.15) / camera.aspect); // 縦か横、はみ出しそうなほうに合わせる
      const dist = vh / 2 / Math.tan((camera.fov * Math.PI) / 360) + size.z / 2;
      camera.position.set(c.x, c.y, c.z + dist);
      camera.lookAt(c.x, c.y, c.z);
      camera.updateProjectionMatrix();
    };
    fit();
    const draw = () => { renderer.render(scene, camera); };
    draw();
    canvas.style.opacity = 1; img.style.visibility = 'hidden'; // 3Dが出たら絵は隠す
    ro = new ResizeObserver(() => { fit(); draw(); });
    ro.observe(el);
    if (wave && clip) {
      let last = performance.now(), acc = 0;
      const tick = (now) => {
        raf = requestAnimationFrame(tick);
        const dt = (now - last) / 1000; last = now; acc += dt;
        if (acc < 1 / 31) return; // 30コマ/秒
        mixer.update(Math.min(acc, 0.1)); acc = 0;
        draw();
      };
      raf = requestAnimationFrame(tick);
    }
  }).catch(() => { /* 絵のまま */ });
  return () => {
    dead = true; cancelAnimationFrame(raf); if (ro) ro.disconnect();
    if (renderer) { renderer.dispose(); renderer.forceContextLoss(); }
    if (canvas) canvas.remove(); img.remove();
  };
}
