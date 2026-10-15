import { useEffect } from 'react';
import { stageRef } from '../scene/stageRef';
import { director } from '../show/director';
import { cheerStart, cheerStop } from '../show/hype';
import { conductor } from '../conductor/conductor';
import type { CharacterId } from '../songs/types';
import { useShow } from '../state/store';
import { recordClip } from './clip';
import { unlock } from '../show/score';

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
const POKE: CharacterId[] = ['cat', 'fox', 'sloth', 'octopus', 'owl', 'penguins', 'goat'];

export function useKeyboard() {
  useEffect(() => {
    let k = 0;
    const down = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      const s = useShow.getState();

      // Konami code: tiny sunglasses for everyone
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      k = key === KONAMI[k] ? k + 1 : key === KONAMI[0] ? 1 : 0;
      if (k === KONAMI.length) {
        k = 0;
        s.set({ sunglasses: !s.sunglasses });
        unlock('konami');
        conductor.emit('ledText', { text: s.sunglasses ? 'SUNGLASSES: OFF' : '😎 DEAL WITH IT 😎', seconds: 3 });
        s.say('Professor Hootenanny', s.sunglasses ? 'Fine. Eyes are back.' : 'Finally. Everyone gets it now.');
        return;
      }
      if (s.phase === 'landing') return;
      if (e.key === ' ') {
        e.preventDefault();
        if (!e.repeat) cheerStart();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 7) return stageRef.current?.poke(POKE[n - 1]);
      switch (key) {
        case 's': return s.togglePanel('setlist');
        case 'm': return s.togglePanel('mixer');
        case 'v': return s.togglePanel('mic');
        case 'u': return s.togglePanel('upload');
        case 'o': return s.togglePanel('settings');
        case 't': return s.set({ translate: !s.translate });
        case 'c': return s.set({ captions: !s.captions });
        case 'n': return director.skip();
        case 'h': return stageRef.current?.concert.clap();
        case 'y': e.preventDefault(); return s.togglePanel('shout');
        case 'x': return s.togglePanel('lights');
        case 'b': return s.togglePanel('merch');
        case 'r': return s.togglePanel('remix');
        case 'k': return recordClip();
        case 'w': return stageRef.current?.concert.wave();
        case 'j': return stageRef.current?.concert.beachBall();
        case 'g': return stageRef.current?.concert.shirtCannon();
        case 'l': {
          const st = stageRef.current;
          const fan = st?.crowd.fans[Math.floor(Math.random() * st.crowd.fans.length)];
          if (st && fan) st.crowd.raiseLighter(fan.x, fan.y - 50 * fan.s);
          return s.set({ lighters: s.lighters + 1 });
        }
        case '+': case '=': return s.set({ volume: Math.min(1, s.volume + 0.1) });
        case '-': return s.set({ volume: Math.max(0, s.volume - 0.1) });
        case 'Escape': return s.set({ panel: null });
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === ' ') cheerStop();
    };
    const blur = () => cheerStop();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);
}
