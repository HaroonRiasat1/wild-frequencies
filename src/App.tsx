import { AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { engine } from './audio/engine';
import { director } from './show/director';
import { INSTRUMENTS, isAudible, useShow } from './state/store';
import { Credits } from './ui/Credits';
import { Hud } from './ui/Hud';
import { Landing } from './ui/Landing';
import { StageCanvas } from './ui/StageCanvas';
import { useKeyboard } from './ui/useKeyboard';

export function App() {
  const phase = useShow((s) => s.phase);
  const reduceMotion = useShow((s) => s.reduceMotion);
  useKeyboard();
  useEffect(() => void director.restoreHeadliner(), []);

  // mixer + volume -> audio engine
  useEffect(
    () =>
      useShow.subscribe((s, prev) => {
        if (s.muted !== prev.muted || s.soloed !== prev.soloed) {
          for (const i of INSTRUMENTS) engine.setAudible(i.id, isAudible(i.id));
        }
        if (s.volume !== prev.volume) engine.setVolume(s.volume);
      }),
    [],
  );

  return (
    <main className={`app ${reduceMotion ? 'reduce-motion' : ''}`}>
      <StageCanvas />
      {phase !== 'landing' && phase !== 'credits' && <Hud />}
      <AnimatePresence>{phase === 'landing' && <Landing key="landing" />}</AnimatePresence>
      <AnimatePresence>{phase === 'credits' && <Credits key="credits" />}</AnimatePresence>
    </main>
  );
}
