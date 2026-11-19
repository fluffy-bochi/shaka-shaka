import React from 'react';
import { mountDog, DOG_RATIO } from './dog3d';

/* やるきーぬの3D（React 用）。高さを決めると幅は絵の比率で決まる。
   base: いつものモーション（くり返す）・act: { name, n } を変えるたびにそのモーションを times 回 */
export default function DogModel({ base = 'idle', act, times = 2, style }) {
  const ref = React.useRef(null), dog = React.useRef(null);
  React.useEffect(() => { const d = mountDog(ref.current, { base }); dog.current = d; return () => d.dispose(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => { if (dog.current) dog.current.setBase(base); }, [base]);
  React.useEffect(() => { if (dog.current && act && act.name) dog.current.play(act.name, times); }, [act]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div ref={ref} style={{ position: 'relative', aspectRatio: String(DOG_RATIO), pointerEvents: 'none', ...style }} />;
}
