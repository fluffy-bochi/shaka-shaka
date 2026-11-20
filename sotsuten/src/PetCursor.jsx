import React from 'react';

/* 卒展: カーソルの場所を大きな輪で見せる＋やるきーぬの上でカーソルを動かすと「なでる」。
   なでると ♥ が出て、少しなでると happy のモーション。犬は [data-dog]（dog3d.js の mountDog）で探す。
   main.jsx で画面の外側（body 直下）に出すので、PC モードの zoom の影響を受けない */
const RUB_HEART = 36; // これだけ動かすごとに ♥
const RUB_HAPPY = 140; // これだけなでたら happy
const PET_GAP_MS = 1400; // happy を続けてやりすぎないように

const findDog = (x, y) => {
  for (const el of document.querySelectorAll('[data-dog]')) {
    const c = el.dogCtl; if (!c || c.paused()) continue; // 記録中の後ろのゲージの犬は止まっているので外す
    const r = el.getBoundingClientRect();
    // 絵の四角の外側（すきま）は外す
    if (x > r.left + r.width * 0.12 && x < r.right - r.width * 0.12 && y > r.top + r.height * 0.06 && y < r.bottom - r.height * 0.04) return c;
  }
  return null;
};

export default function PetCursor() {
  const ring = React.useRef(null), layer = React.useRef(null);
  React.useEffect(() => {
    let lx = null, ly = 0, rub = 0, rubH = 0, lastPet = 0;
    const heart = (x, y) => {
      const h = document.createElement('div');
      h.className = 'pet-heart'; h.textContent = '♥';
      h.style.left = x + (Math.random() - 0.5) * 30 + 'px'; h.style.top = y - 10 + 'px';
      layer.current.appendChild(h);
      setTimeout(() => h.remove(), 900);
    };
    const onMove = (e) => {
      const x = e.clientX, y = e.clientY, el = ring.current;
      el.style.transform = `translate(${x}px, ${y}px)`; el.style.opacity = 1;
      const d = lx == null ? 0 : Math.hypot(x - lx, y - ly); lx = x; ly = y;
      const dog = findDog(x, y);
      el.classList.toggle('petting', !!dog);
      if (!dog) { rub = 0; rubH = 0; return; }
      rub += d; rubH += d;
      dog.petAt = performance.now(); // なでられているあいだ、やるきーぬは歩きまわらない（dogRoam.js）
      if (rubH > RUB_HEART) { rubH = 0; heart(x, y); }
      const now = performance.now();
      if (rub > RUB_HAPPY && now - lastPet > PET_GAP_MS && !dog.busy()) { dog.play('happy', 1); lastPet = now; rub = 0; }
    };
    const onLeave = () => { ring.current.style.opacity = 0; lx = null; };
    window.addEventListener('pointermove', onMove);
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => { window.removeEventListener('pointermove', onMove); document.documentElement.removeEventListener('pointerleave', onLeave); };
  }, []);
  return (
    <div ref={layer} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }}>
      <div ref={ring} className="pet-cursor"><span className="pet-hand">✋</span></div>
    </div>
  );
}
