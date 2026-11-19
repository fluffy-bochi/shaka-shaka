import React from 'react';
import { mountDog, DOG_RATIO } from './dog3d';

/* やるきーぬの3D（React 用）。高さを決めると幅は絵の比率で決まる */
export default function Dog3D({ wave = true, style }) {
  const ref = React.useRef(null);
  React.useEffect(() => mountDog(ref.current, { wave }), [wave]);
  return <div ref={ref} style={{ position: 'relative', aspectRatio: String(DOG_RATIO), pointerEvents: 'none', ...style }} />;
}
