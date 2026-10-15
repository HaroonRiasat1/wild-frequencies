import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { stageRef } from '../scene/stageRef';
import { CAST } from '../show/cast';
import { director } from '../show/director';
import { cheerStart, cheerStop } from '../show/hype';
import { ALL_SONGS } from '../songs';
import { useShow, type Panel } from '../state/store';
import { MicPanel, Mixer, SettingsPanel, Setlist, UploadPanel } from './Panels';

const HYPE_LABELS = ['mild interest', 'polite clapping', 'woo!', 'WOOOO!!', 'absolute scenes', 'ENCORE ENERGY'];

export function Hud() {
  const s = useShow();
  const found = ALL_SONGS.find((x) => x.id === s.songId);
  const song = found ?? (s.songId === 'headliner' && s.trackBpm
    ? { title: s.headliner?.name ?? s.uploadName?.replace(/\.[^.]+$/, '') ?? 'Your track', bpm: Math.round(s.trackBpm), key: 'your track', ballad: false }
    : undefined);
  const balladNow = !!song?.ballad;

  return (
    <div className="hud">
      <header className="topbar">
        <div className="now">
          {song ? (
            <>
              <span className="live-dot" aria-hidden /> <b>{song.title}</b>
              <span className="meta"> · {song.bpm} BPM · {song.key}</span>
              {s.sectionLabel && <span className="section-chip">{s.sectionLabel}</span>}
            </>
          ) : (
            <span className="meta">{s.analysing ? '🎛️ Soundchecking your track (finding every beat)…' : phaseLabel(s.phase, s.uploadName)}</span>
          )}
        </div>
        <nav className="tools" aria-label="Show controls">
          <ToolButton panel="setlist" icon="📝" label="Setlist" k="S" />
          <ToolButton panel="mixer" icon="🎚️" label="Mixer" k="M" />
          <ToolButton panel="mic" icon="🎤" label="Sing" k="V" />
          <ToolButton panel="upload" icon="💿" label="Your track" k="U" />
          <ToolButton panel="settings" icon="⚙️" label="Settings" k="O" />
          {(s.phase === 'playing' || s.phase === 'encore' || (s.phase === 'upload' && s.songId)) && (
            <button className="tool" onClick={() => director.skip()} title="Skip to the end of this song">
              ⏭<span className="tool-label">Skip</span>
            </button>
          )}
          {s.phase === 'upload' && (
            <button className="tool" onClick={() => director.exitUpload()}>
              ⏹<span className="tool-label">Back to show</span>
            </button>
          )}
        </nav>
      </header>

      <AnimatePresence>
        {s.panel && (
          <motion.aside
            key={s.panel}
            className={`panel panel-${s.panel}`}
            initial={{ opacity: 0, y: -16, rotate: s.panel === 'setlist' ? -3 : 0 }}
            animate={{ opacity: 1, y: 0, rotate: s.panel === 'setlist' ? -1.5 : 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          >
            <button className="close" onClick={() => s.set({ panel: null })} aria-label="Close panel">✕</button>
            {s.panel === 'mixer' && <Mixer />}
            {s.panel === 'setlist' && <Setlist />}
            {s.panel === 'mic' && <MicPanel />}
            {s.panel === 'upload' && <UploadPanel />}
            {s.panel === 'settings' && <SettingsPanel />}
          </motion.aside>
        )}
      </AnimatePresence>

      <NameCard />
      <Subtitles />

      <footer className="bottombar">
        <HypeMeter />
        <CheerButton />
        <div className="fun-row" aria-label="Crowd fun">
          <FunButton icon="👏" label="Clap" k="H" onPress={() => stageRef.current?.concert.clap()} />
          <FunButton icon="🌊" label="Wave" k="W" onPress={() => stageRef.current?.concert.wave()} />
          <FunButton icon="🏐" label="Ball" k="J" onPress={() => stageRef.current?.concert.beachBall()} />
          <FunButton icon="👕" label="Shirt" k="G" onPress={() => stageRef.current?.concert.shirtCannon()} />
        </div>
        <button
          className={`lighter-btn ${balladNow ? 'glow' : ''}`}
          onClick={() => {
            const st = stageRef.current;
            if (!st) return;
            const fan = st.crowd.fans[Math.floor(Math.random() * st.crowd.fans.length)];
            st.crowd.raiseLighter(fan.x, fan.y - 50 * fan.s);
            s.set({ lighters: s.lighters + 1 });
          }}
          title="Lighter mode: raise a lighter (or tap the crowd)"
        >
          🔥<span className="tool-label">{balladNow ? 'Lighters up!' : 'Lighter'}</span>
        </button>
      </footer>
    </div>
  );
}

function phaseLabel(phase: string, upload: string | null) {
  switch (phase) {
    case 'micCheck': return 'Mic check (please remain calm)';
    case 'walkOn': return 'The band is walking on…';
    case 'banter': return 'Between songs (stage banter)';
    case 'fakeEnding': return 'The band has "left" the stage…';
    case 'outro': return 'Bows & thank-yous';
    case 'upload': return `Guest track: ${upload ?? '???'}`;
    default: return 'Wild Frequencies — live';
  }
}

function ToolButton({ panel, icon, label, k }: { panel: Exclude<Panel, null>; icon: string; label: string; k: string }) {
  const active = useShow((s) => s.panel === panel);
  const toggle = useShow((s) => s.togglePanel);
  return (
    <button className={`tool ${active ? 'active' : ''}`} onClick={() => toggle(panel)} aria-pressed={active} title={`${label} (${k})`}>
      {icon}
      <span className="tool-label">{label}</span>
    </button>
  );
}

function FunButton({ icon, label, k, onPress }: { icon: string; label: string; k: string; onPress: () => void }) {
  return (
    <button
      className="tool fun"
      // pointerdown, not click: claps have to land on the beat
      onPointerDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onPress())}
      title={`${label} (${k})`}
      aria-label={`${label} (${k})`}
    >
      {icon}
      <span className="tool-label">{label}</span>
    </button>
  );
}

function HypeMeter() {
  const hype = useShow((s) => s.hype);
  const unlocked = useShow((s) => s.encoreUnlocked);
  const label = HYPE_LABELS[Math.min(HYPE_LABELS.length - 1, Math.floor(hype * HYPE_LABELS.length))];
  return (
    <div className="hype" role="meter" aria-label="Hype meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(hype * 100)}>
      <div className="hype-track">
        <div className="hype-fill" style={{ width: `${hype * 100}%` }} />
      </div>
      <div className="hype-label">
        HYPE: <b>{label}</b> {unlocked && <span className="encore-badge">🔓 encore unlocked</span>}
      </div>
    </div>
  );
}

function CheerButton() {
  const cheering = useShow((s) => s.cheering);
  return (
    <button
      className={`cheer ${cheering ? 'on' : ''}`}
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        cheerStart();
      }}
      onPointerUp={cheerStop}
      onPointerCancel={cheerStop}
      onPointerLeave={cheerStop}
      aria-label="Cheer (hold, or hold Space)"
    >
      📣 CHEER <small>(hold / Space)</small>
    </button>
  );
}

function Subtitles() {
  const { subtitle, lyric, translate, captions, set } = useShow();
  useEffect(() => {
    if (!subtitle) return;
    // stray one-liners (moon, pokes) fade after a while; the director clears banter itself
    const id = subtitle.id;
    const h = window.setTimeout(() => {
      if (useShow.getState().subtitle?.id === id) set({ subtitle: null });
    }, 7000);
    return () => window.clearTimeout(h);
  }, [subtitle, set]);
  if (!captions) return null;
  return (
    <div className="subtitles" aria-live="polite">
      {lyric && (
        <div className="lyric">
          <span className="lyric-who">{translate ? '🐱 (translated)' : '🐱'}</span>
          {(translate ? lyric.words : lyric.animal).map((w, i) => (
            <span key={`${lyric.id}-${i}`} className={i === lyric.active ? 'syl on' : i < lyric.active ? 'syl done' : 'syl'}>
              {w}
            </span>
          ))}
          <button className="translate" onClick={() => set({ translate: !translate })} title="Translate (T)">
            {translate ? 'show meows' : 'translate'}
          </button>
        </div>
      )}
      {subtitle && !lyric && (
        <motion.div key={subtitle.id} className="caption" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <span className="speaker">{subtitle.speaker}:</span> {subtitle.text}
        </motion.div>
      )}
    </div>
  );
}

function NameCard() {
  const who = useShow((s) => s.nameCard);
  const c = who ? CAST[who] : null;
  return (
    <AnimatePresence>
      {c && (
        <motion.div
          key={c.id}
          className="namecard"
          style={{ borderColor: c.color }}
          initial={{ x: -320, rotate: -8, opacity: 0 }}
          animate={{ x: 0, rotate: -2, opacity: 1 }}
          exit={{ x: 320, rotate: 6, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
        >
          <div className="nc-role" style={{ color: c.color }}>{c.role}</div>
          <div className="nc-name">{c.name}</div>
          <div className="nc-fact">{c.fact}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
