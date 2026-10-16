// The hype meter. Hold Cheer (or Space) to fill it; it slowly drains. A full
// meter = confetti, pyro, a goat scream, and the encore is unlocked.

import { conductor } from '../conductor/conductor';
import { engine } from '../audio/engine';
import { useShow } from '../state/store';
import { party } from '../party/party';
import { unlock } from './score';

let cooldown = 0;
/** Precise value; the store only gets updates when it visibly changes. */
let level = 0;
export let peakHype = 0;

export function resetPeak() {
  peakHype = useShow.getState().hype;
}

// Runs on its own timer (not the render loop) so the meter keeps working when
// the host's tab is in the background during a party.
let lastTick = performance.now();
window.setInterval(() => {
  const now = performance.now();
  tickHype(Math.min(1.2, (now - lastTick) / 1000));
  lastTick = now;
}, 50);

export function tickHype(dt: number) {
  const s = useShow.getState();
  if (s.phase === 'landing' || party.isGuest) return; // guests get the host's hype
  if (Math.abs(s.hype - level) > 0.02) level = s.hype; // reset from outside (play again)
  let h = level;
  if (s.cheering) h += dt * 0.2;
  // every friend holding cheer adds to the host's meter
  if (party.isHost) h += dt * 0.12 * party.cheering.size;
  else h -= dt * (s.phase === 'fakeEnding' ? 0.015 : 0.035);
  // the music itself gets the crowd going a bit
  h += dt * conductor.state.intensity * 0.012;
  h = Math.max(0, Math.min(1, h));
  cooldown = Math.max(0, cooldown - dt);

  if (h >= 1 && cooldown === 0) {
    cooldown = 6;
    conductor.emit('confetti', { amount: 1 });
    conductor.emit('pyro', {});
    conductor.emit('hype', { source: 'cheer' });
    engine.pyro();
    engine.meeeh();
    if (!s.encoreUnlocked) {
      s.set({ encoreUnlocked: true });
      unlock('encore');
      conductor.emit('ledText', { text: 'ENCORE UNLOCKED', seconds: 3 });
    }
    h = 0.8;
  }
  level = h;
  peakHype = Math.max(peakHype, h);
  if (Math.abs(h - s.hype) > 0.004 || (h === 0 && s.hype !== 0)) s.set({ hype: h });
}

export function cheerStart() {
  const s = useShow.getState();
  if (s.cheering || s.phase === 'landing') return;
  s.set({ cheering: true });
  engine.cheerStart();
  party.cheer(true);
  conductor.emit('cheer', { level: s.hype });
}

export function cheerStop() {
  const s = useShow.getState();
  if (!s.cheering) return;
  s.set({ cheering: false });
  engine.cheerStop();
  party.cheer(false);
}
