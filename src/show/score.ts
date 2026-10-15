// Points + achievements. Everything fun you do earns acorns (the forest's
// currency — spend them at the merch stand) and some things unlock badges.

import { useShow } from '../state/store';

export const ACHIEVEMENTS: Record<string, { icon: string; title: string; text: string }> = {
  firstClap: { icon: '👏', title: 'Rhythm Section', text: 'Landed a perfect clap' },
  clapStreak: { icon: '🥁', title: 'Human Metronome', text: 'Got the whole crowd clapping' },
  shirt: { icon: '👕', title: 'Free Shirt!', text: 'Caught a T-shirt from Greg' },
  drumstick: { icon: '🥢', title: 'Souvenir Hunter', text: 'Caught a pick or a drumstick' },
  bear: { icon: '🐻', title: 'Survived the Bear', text: 'An entire bear crowd-surfed past you' },
  moon: { icon: '🌕', title: 'Lunar Percussion', text: 'Recruited the moon on tambourine' },
  konami: { icon: '😎', title: 'Deal With It', text: 'Gave everyone tiny sunglasses' },
  encore: { icon: '🔓', title: 'One More Song', text: 'Unlocked the encore' },
  stageDive: { icon: '🤸', title: 'Stage Diver', text: 'Climbed on stage and dove into the crowd' },
  merch: { icon: '🛍️', title: 'Supporting the Arts', text: 'Bought merch' },
  shout: { icon: '📣', title: 'Heckler', text: 'Shouted at the band (they answered)' },
  duet: { icon: '🎤', title: 'Duet Partner', text: 'Sang a line with Sir Reginald' },
  lights: { icon: '💡', title: 'Lighting Designer', text: 'Took over the light show' },
  remix: { icon: '🎛️', title: 'Live Remix', text: 'Remixed the band mid-song' },
  rain: { icon: '☔', title: 'Rain or Shine', text: 'Stayed through the downpour' },
  openingAct: { icon: '🐭', title: 'Early Bird', text: 'Watched the opening act' },
  afterparty: { icon: '🎉', title: 'VIP', text: 'Got into the afterparty' },
  clip: { icon: '🎥', title: 'Phone Out', text: 'Filmed a clip of the show' },
  bonk: { icon: '🏐', title: 'Beach Ball Hero', text: 'Bonked a beach ball' },
};

let toastId = 0;

export function addScore(points: number, acorns = Math.round(points / 10)) {
  const s = useShow.getState();
  s.set({ score: s.score + points, acorns: s.acorns + acorns });
}

export function unlock(id: keyof typeof ACHIEVEMENTS, bonus = 50) {
  const s = useShow.getState();
  if (s.achievements.includes(id)) return;
  const a = ACHIEVEMENTS[id];
  const toast = { id: ++toastId, ...a };
  s.set({ achievements: [...s.achievements, id], toasts: [...s.toasts, toast] });
  addScore(bonus);
  window.setTimeout(() => {
    const st = useShow.getState();
    st.set({ toasts: st.toasts.filter((t) => t.id !== toast.id) });
  }, 3500);
  try {
    const best = Number(localStorage.getItem('wf-best') ?? 0);
    if (useShow.getState().score > best) localStorage.setItem('wf-best', String(useShow.getState().score));
  } catch {
    /* private mode — no high score for you, but you still had fun */
  }
}

export function bestScore(): number {
  try {
    return Math.max(Number(localStorage.getItem('wf-best') ?? 0), useShow.getState().score);
  } catch {
    return useShow.getState().score;
  }
}
