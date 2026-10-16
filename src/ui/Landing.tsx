import { motion } from 'framer-motion';
import { useState } from 'react';
import { director } from '../show/director';
import { useShow } from '../state/store';
import { JoinCard, joinCode } from './PartyPanel';

export function Landing() {
  const { strobe, reduceMotion, set } = useShow();
  const [opening, setOpening] = useState(false);

  const open = async () => {
    if (opening) return;
    setOpening(true);
    await director.doorsOpen();
  };

  return (
    <motion.div className="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.04 }} transition={{ duration: 0.6 }}>
      <div className="landing-card">
        <p className="eyebrow">LIVE TONIGHT · THE HOLLOW LOG AMPHITHEATER</p>
        <h1 className="logo">
          <span>WILD</span>
          <span>FREQUENCIES</span>
        </h1>
        <p className="tagline">A psychedelic synth-pop band made entirely of animals. Doors at midnight. Crickets must be silenced.</p>
        <p className="murmur" aria-hidden>*distant crowd murmuring* · *someone is eating popcorn* · *a bear says "excuse me"*</p>

        <div className="warning" role="note">
          <strong>⚠ Lights:</strong> this show has moving lights and lasers. Flashing strobe is <b>off</b> by default.
          <div className="landing-toggles">
            <label>
              <input type="checkbox" checked={strobe} onChange={(e) => set({ strobe: e.target.checked })} /> Enable strobe flashes
            </label>
            <label>
              <input type="checkbox" checked={reduceMotion} onChange={(e) => set({ reduceMotion: e.target.checked })} /> Reduce motion
            </label>
          </div>
        </div>

        {joinCode() ? (
          <JoinCard code={joinCode()!} />
        ) : (
        <motion.button
          className="doors"
          onClick={open}
          whileHover={{ scale: 1.05, rotate: -1 }}
          whileTap={{ scale: 0.95 }}
          disabled={opening}
          autoFocus
        >
          {opening ? 'Tuning the sloth…' : '🚪 Doors open'}
        </motion.button>
        )}
        <p className="hint">
          Sound on (headphones recommended). Hold <kbd>Space</kbd> to cheer · click band members · try the moon.
        </p>
      </div>
    </motion.div>
  );
}
