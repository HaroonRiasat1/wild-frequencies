import { useEffect, useRef } from 'react';
import { StageRenderer } from '../scene/renderer';
import { stageRef } from '../scene/stageRef';

export function StageCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const r = new StageRenderer(canvas);
    stageRef.current = r;
    r.start();
    const onResize = () => r.resize();
    window.addEventListener('resize', onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(canvas.parentElement!);
    return () => {
      window.removeEventListener('resize', onResize);
      ro.disconnect();
      r.stop();
      stageRef.current = null;
    };
  }, []);

  return (
    <div className="stage-wrap">
      <canvas
        ref={ref}
        className="stage-canvas"
        aria-label="The stage. Click a band member to poke them, click the moon, or tap the crowd to raise a lighter."
        onPointerDown={(e) => stageRef.current?.handleClick(e.clientX, e.clientY, e.pointerType)}
      />
    </div>
  );
}
