import * as Tone from 'tone';
import { useState } from 'react';
import { engine } from '../audio/engine';
import { songPlayer } from '../audio/songPlayer';
import { conductor } from '../conductor/conductor';
import { stageRef } from '../scene/stageRef';
import { ACHIEVEMENTS, addScore, bestScore, unlock } from '../show/score';
import { shout } from '../show/shout';
import { useShow, type Movement, type Outfit } from '../state/store';

// ------------------------------------------------------------------ merch

interface Item {
  id: string;
  name: string;
  price: number;
  blurb: string;
  apply: (o: Outfit) => Outfit | null; // null = consumable
}

const ITEMS: Item[] = [
  { id: 'tee', name: '💜 Velvet Claws tee', price: 20, blurb: '100% velvet. 0% breathable.', apply: (o) => ({ ...o, shirt: '#5b1a7a' }) },
  { id: 'poncho', name: '🟡 Poncho', price: 0, blurb: 'Free tonight. You may need it.', apply: (o) => ({ ...o, shirt: '#f2d43a' }) },
  { id: 'ears', name: '🐱 Cat-ear hat', price: 25, blurb: 'Officially licensed by Sir Reginald (he wanted more).', apply: (o) => ({ ...o, hat: 'ears' }) },
  { id: 'crown', name: '👑 Tiny crown', price: 50, blurb: 'For the main character of the crowd.', apply: (o) => ({ ...o, hat: 'crown' }) },
  { id: 'bucket', name: '🧢 Bucket hat', price: 15, blurb: 'Festival-grade. Smells of fog.', apply: (o) => ({ ...o, hat: 'bucket' }) },
  { id: 'paw', name: '🐾 Foam paw', price: 20, blurb: 'Says "#1". Number one what? Yes.', apply: (o) => ({ ...o, extra: 'paw' }) },
  { id: 'glow', name: '✨ Glow necklace', price: 15, blurb: 'Cycles colours. You cannot turn it off.', apply: (o) => ({ ...o, extra: 'necklace' }) },
  { id: 'water', name: '🥤 Pond water', price: 0, blurb: 'On the house. Refreshing. Mostly.', apply: () => null },
];

export function MerchPanel() {
  const { acorns, outfit, set } = useShow();
  const [msg, setMsg] = useState('');
  const buy = (it: Item) => {
    if (acorns < it.price) return setMsg(`The badger stares. You need ${it.price - acorns} more 🌰 (clap, catch things, cheer).`);
    const next = it.apply(outfit);
    set({ acorns: acorns - it.price, ...(next ? { outfit: next } : {}) });
    setMsg(next ? `Bought ${it.name}. The badger nods, once.` : 'You drink the pond water. It drinks you back a little.');
    unlock('merch', 30);
  };
  return (
    <div>
      <h2>🛍️ Merch &amp; Pond Water</h2>
      <p className="panel-sub">Run by a badger. Cash only (acorns). You have <b>{acorns} 🌰</b>.</p>
      <ul className="shop">
        {ITEMS.map((it) => (
          <li key={it.id}>
            <span>
              <b>{it.name}</b>
              <small>{it.blurb}</small>
            </span>
            <button className="mx-btn" onClick={() => buy(it)}>{it.price ? `${it.price} 🌰` : 'free'}</button>
          </li>
        ))}
      </ul>
      {msg && <p className="fineprint">{msg}</p>}
      <button className="linkish" onClick={() => set({ outfit: { shirt: null, hat: 'none', extra: 'none' } })}>take it all off (the outfit)</button>
    </div>
  );
}

// ------------------------------------------------------------------ shout

export function ShoutPanel() {
  const [text, setText] = useState('');
  const [log, setLog] = useState<{ you: string; them: string }[]>([]);
  const send = () => {
    const reply = shout(text);
    if (reply) setLog((l) => [{ you: text.trim().slice(0, 60), them: reply }, ...l].slice(0, 5));
    setText('');
  };
  return (
    <div>
      <h2>📣 Shout at the band</h2>
      <p className="panel-sub">Request a song by name, heckle, declare your love. The cat will answer. Probably rudely.</p>
      <form
        className="shout-form"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input value={text} maxLength={60} onChange={(e) => setText(e.target.value)} placeholder='e.g. "PLAY VELVET CLAWS" or "WE LOVE YOU GARY"' aria-label="What you shout" />
        <button className="mx-btn" type="submit">Shout!</button>
      </form>
      <ul className="shout-log">
        {log.map((l, i) => (
          <li key={i}>
            <b>You:</b> {l.you}
            <br />
            <b>🐱:</b> {l.them}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ------------------------------------------------------------------ lights

const PALETTES: { name: string; colors: string[] }[] = [
  { name: 'Neon', colors: ['#ff2bd6', '#2bf1ff', '#ffe600', '#7cff4f'] },
  { name: 'Velvet', colors: ['#7b2cff', '#ff4fd8', '#3a1cff'] },
  { name: 'Sunset', colors: ['#ff9671', '#ffc75f', '#d65db1'] },
  { name: 'Ice', colors: ['#9ad5ff', '#ffffff', '#00b4ff'] },
  { name: 'Forest', colors: ['#39ff14', '#00e0c6', '#16a34a'] },
  { name: 'Fire', colors: ['#ff2e00', '#ff8a1a', '#ffe066'] },
];
const MOVES: Movement[] = ['still', 'sweep', 'chase', 'pulse', 'strobe'];

export function LightsPanel() {
  const { lightOverride: ov, strobe, set } = useShow();
  const [pyroCd, setPyroCd] = useState(false);
  const take = (patch: Partial<NonNullable<typeof ov>>) => {
    set({ lightOverride: { palette: PALETTES[0].colors, movement: 'sweep', lasers: true, ...(ov ?? {}), ...patch } });
    unlock('lights', 40);
  };
  return (
    <div>
      <h2>💡 Light-show remote</h2>
      <p className="panel-sub">You're the lighting designer now. The real one went to get nachos.</p>
      <label className="setting">
        <input type="checkbox" checked={!!ov} onChange={(e) => (e.target.checked ? take({}) : set({ lightOverride: null }))} />
        <span>Take control of the lights</span>
      </label>
      <h3>Colours</h3>
      <div className="chips">
        {PALETTES.map((p) => (
          <button key={p.name} className={`chip swatch ${ov?.palette === p.colors ? 'on' : ''}`} onClick={() => take({ palette: p.colors })}>
            {p.colors.map((c) => <i key={c} style={{ background: c }} />)} {p.name}
          </button>
        ))}
      </div>
      <h3>Movement</h3>
      <div className="chips">
        {MOVES.filter((m) => m !== 'strobe' || strobe).map((m) => (
          <button key={m} className={`chip ${ov?.movement === m ? 'on' : ''}`} onClick={() => take({ movement: m })}>{m}</button>
        ))}
      </div>
      <h3>Effects</h3>
      <div className="chips">
        <button className={`chip ${ov?.lasers ? 'on' : ''}`} onClick={() => take({ lasers: !(ov?.lasers ?? false) })}>🟢 lasers</button>
        <button className="chip" onClick={() => { stageRef.current?.fogBurst(); unlock('lights', 40); }}>🌫️ fog burst</button>
        <button className="chip" onClick={() => conductor.emit('confetti', { amount: 0.7 })}>🎊 confetti</button>
        <button
          className="chip"
          disabled={pyroCd}
          onClick={() => {
            conductor.emit('pyro', {});
            engine.pyro();
            setPyroCd(true);
            window.setTimeout(() => setPyroCd(false), 3000);
          }}
        >
          🔥 pyro{pyroCd ? ' (recharging)' : ''}
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ remix

export function RemixPanel() {
  const { songId } = useShow();
  const [bpm, setBpm] = useState<number | null>(null);
  const live = !!songPlayer.current;
  const did = (pts = 5) => {
    addScore(pts);
    unlock('remix', 40);
  };
  const nudge = (d: number) => {
    if (!songPlayer.current) return;
    const tr = Tone.getTransport();
    const next = Math.max(60, Math.min(170, Math.round(tr.bpm.value + d)));
    tr.bpm.rampTo(next, 0.4);
    conductor.state.bpm = next;
    setBpm(next);
    did();
  };
  return (
    <div>
      <h2>🎛️ Live remix</h2>
      <p className="panel-sub">Mess with the band mid-song. They will act like it was planned.</p>
      <div className="remix-grid">
        <button className="big-btn" onClick={() => { engine.filterSweep(); did(); }}>🌊 Filter sweep</button>
        <button className="big-btn" onClick={() => { engine.echoThrow(); did(); }}>🔁 Echo throw</button>
        <button className="big-btn" onClick={() => { engine.fill(); did(); }}>🥁 Drum fill</button>
        <button
          className="big-btn alt"
          onClick={() => {
            engine.dropBoom();
            engine.meeeh();
            conductor.emit('pyro', {});
            conductor.emit('confetti', { amount: 0.6 });
            conductor.emit('hype', { source: 'cheer' });
            did(15);
          }}
        >
          💥 DROP IT
        </button>
      </div>
      <h3>Tempo {live ? `(${bpm ?? Math.round(Tone.getTransport().bpm.value)} BPM)` : ''}</h3>
      {live ? (
        <div className="chips">
          <button className="chip" onClick={() => nudge(-4)}>🐢 −4</button>
          <button className="chip" onClick={() => nudge(4)}>🐇 +4</button>
        </div>
      ) : (
        <p className="fineprint">{songId === 'headliner' ? 'Tempo is fixed for your own track (it would change its pitch).' : 'Tempo works while one of the band\'s songs is playing.'}</p>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ score

export function ScorePanel() {
  const { score, achievements, acorns } = useShow();
  return (
    <div>
      <h2>⭐ Score &amp; badges</h2>
      <p className="panel-sub">
        <b>{score.toLocaleString()}</b> points · {acorns} 🌰 · best on this device: {bestScore().toLocaleString()}
      </p>
      <ul className="badges">
        {Object.entries(ACHIEVEMENTS).map(([id, a]) => {
          const got = achievements.includes(id);
          return (
            <li key={id} className={got ? 'got' : ''} title={a.text}>
              <span className="badge-icon">{got ? a.icon : '🔒'}</span>
              <span>
                <b>{a.title}</b>
                <small>{a.text}</small>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
