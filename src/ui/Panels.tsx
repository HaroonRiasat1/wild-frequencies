import { useRef, useState } from 'react';
import { micSinger } from '../audio/micSinger';
import { director } from '../show/director';
import { COVERS, ENCORE, SETLIST } from '../songs';
import { INSTRUMENTS, useShow, type MicAnimal } from '../state/store';

export function Mixer() {
  const { muted, soloed, toggleMute, toggleSolo, volume, set } = useShow();
  const anySolo = Object.values(soloed).some(Boolean);
  return (
    <div>
      <h2>🎚️ The Mixer</h2>
      <p className="panel-sub">Mute someone and watch them freeze. Dramatically.</p>
      <ul className="mixer">
        {INSTRUMENTS.map((i) => {
          const silent = muted[i.id] || (anySolo && !soloed[i.id]);
          return (
            <li key={i.id} className={silent ? 'silent' : ''}>
              <span className="mx-emoji" aria-hidden>{i.emoji}</span>
              <span className="mx-name">{i.label}</span>
              <button className={`mx-btn ${muted[i.id] ? 'on mute' : ''}`} onClick={() => toggleMute(i.id)} aria-pressed={muted[i.id]} aria-label={`Mute ${i.label}`}>
                M
              </button>
              <button className={`mx-btn ${soloed[i.id] ? 'on solo' : ''}`} onClick={() => toggleSolo(i.id)} aria-pressed={soloed[i.id]} aria-label={`Solo ${i.label}`}>
                S
              </button>
              <span className="mx-meter" aria-hidden>
                <span style={{ opacity: silent ? 0.15 : 1 }} />
              </span>
            </li>
          );
        })}
      </ul>
      <label className="slider">
        Master volume
        <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => set({ volume: parseFloat(e.target.value) })} />
      </label>
    </div>
  );
}

export function Setlist() {
  const { played, songId, requested, encoreUnlocked, phase, headliner } = useShow();
  const canRequest = phase !== 'landing' && phase !== 'credits' && phase !== 'outro' && phase !== 'fakeEnding' && phase !== 'encore';
  return (
    <div className="paper">
      <div className="tape" aria-hidden />
      <h2>SETLIST ✎</h2>
      <p className="panel-sub">(taped to the stage, slightly damp)</p>
      <ol className="setlist">
        {headliner && (
          <li className={`headliner-row ${played.includes('headliner') ? 'played' : ''} ${songId === 'headliner' ? 'now' : ''}`}>
            <span className="sl-num">★</span>
            <span className="sl-title">
              {headliner.name}
              <small>tonight's headliner (your track) · plays right after the opener</small>
            </span>
            <span className="sl-act">
              {songId === 'headliner' ? '♪ now' : played.includes('headliner') ? '✓' : requested === 'headliner' ? '★ next' : canRequest ? (
                <>
                  <button onClick={() => director.request('headliner', false)}>next</button>
                  <button onClick={() => director.request('headliner', true)}>now!</button>
                </>
              ) : null}
            </span>
          </li>
        )}
        {SETLIST.map((s, i) => {
          const isPlayed = played.includes(s.id);
          const now = songId === s.id;
          return (
            <li key={s.id} className={`${isPlayed ? 'played' : ''} ${now ? 'now' : ''}`}>
              <span className="sl-num">{i + 1}.</span>
              <span className="sl-title">
                {s.title}
                <small>{s.tagline}</small>
              </span>
              <span className="sl-act">
                {now ? '♪ now' : isPlayed ? '✓' : requested === s.id ? '★ next' : canRequest ? (
                  <>
                    <button onClick={() => director.request(s.id, false)} title="Play this next">next</button>
                    <button onClick={() => director.request(s.id, true)} title="Play this right now">now!</button>
                  </>
                ) : null}
              </span>
            </li>
          );
        })}
        <li className={`encore ${encoreUnlocked ? '' : 'locked'} ${songId === ENCORE.id ? 'now' : ''}`}>
          <span className="sl-num">E.</span>
          <span className="sl-title">
            {encoreUnlocked ? ENCORE.title : '🔒 ENCORE (fill the hype meter)'}
            <small>{encoreUnlocked ? ENCORE.tagline : 'scribbled out, then un-scribbled'}</small>
          </span>
          <span className="sl-act">{songId === ENCORE.id ? '♪ now' : ''}</span>
        </li>
      </ol>
      <h3 className="covers-head">★ Famous covers (request only)</h3>
      <p className="panel-sub">Public-domain classics, re-arranged by animals who should know better.</p>
      <ol className="setlist">
        {COVERS.map((c) => {
          const isPlayed = played.includes(c.id);
          const now = songId === c.id;
          return (
            <li key={c.id} className={`${isPlayed ? 'played' : ''} ${now ? 'now' : ''}`}>
              <span className="sl-num">♫</span>
              <span className="sl-title">
                {c.title}
                <small>{c.tagline}</small>
              </span>
              <span className="sl-act">
                {now ? '♪ now' : isPlayed ? '✓' : requested === c.id ? '★ next' : canRequest ? (
                  <>
                    <button onClick={() => director.request(c.id, false)} title="Play this next">next</button>
                    <button onClick={() => director.request(c.id, true)} title="Play this right now">now!</button>
                  </>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function MicPanel() {
  const { micActive, micAnimal, micNote, duet, set } = useShow();
  const [err, setErr] = useState<string | null>(null);
  const animals: { id: MicAnimal; label: string }[] = [
    { id: 'cat', label: '🐱 Cat' },
    { id: 'goat', label: '🐐 Goat' },
    { id: 'penguin', label: '🐧 Penguin' },
    { id: 'wolf', label: '🐺 Wolf' },
  ];
  const start = async () => {
    setErr(null);
    try {
      await micSinger.start(micAnimal);
      set({ micActive: true });
    } catch (e) {
      setErr('No microphone access. (The band is disappointed but understanding.)');
      console.error(e);
    }
  };
  const stop = () => {
    micSinger.stop();
    set({ micActive: false, micNote: null });
  };
  return (
    <div>
      <h2>🎤 Sing along</h2>
      <p className="panel-sub">Hum or sing — we track your pitch, autotune it to the song's key, and an animal sings it. Headphones avoid feedback.</p>
      <div className="chips">
        {animals.map((a) => (
          <button
            key={a.id}
            className={`chip ${micAnimal === a.id ? 'on' : ''}`}
            onClick={() => {
              set({ micAnimal: a.id });
              micSinger.setAnimal(a.id);
            }}
          >
            {a.label}
          </button>
        ))}
      </div>
      <label className="setting">
        <input type="checkbox" checked={duet} onChange={(e) => set({ duet: e.target.checked })} />
        <span>
          Duet with Sir Reginald
          <small>every second lyric line is yours — the cat rests, the subtitles say 🎤 YOUR LINE</small>
        </span>
      </label>
      {micActive ? (
        <>
          <div className="mic-note" aria-live="polite">{micNote ? `♪ ${micNote}` : '…listening…'}</div>
          <button className="big-btn" onClick={stop}>Stop singing</button>
        </>
      ) : (
        <button className="big-btn" onClick={start}>Start microphone</button>
      )}
      {err && <p className="err">{err}</p>}
    </div>
  );
}

export function UploadPanel() {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const { phase, uploadName, headliner, analysing } = useShow();
  const close = () => useShow.getState().set({ panel: null });
  return (
    <div>
      <h2>💿 Bring your own track</h2>
      <p className="panel-sub">
        Drop an MP3/WAV you have the rights to. We soundcheck it first (tempo, every beat, kicks/snares, quiet and loud
        sections) so the whole band plays exactly on the beat.
      </p>
      <div
        className={`dropzone ${drag ? 'drag' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          setFile(e.dataTransfer.files[0] ?? null);
        }}
        onClick={() => input.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && input.current?.click()}
      >
        {file ? `🎵 ${file.name}` : phase === 'upload' && uploadName ? `Now playing: ${uploadName}` : 'Drop audio here, or click to choose'}
      </div>
      <input ref={input} type="file" accept="audio/*" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      {file && (
        <>
          <button
            className="big-btn"
            onClick={() => {
              void director.setHeadliner(file);
              close();
            }}
          >
            ★ Make it tonight's headliner
          </button>
          <button
            className="big-btn alt"
            onClick={() => {
              void director.enterUpload(file);
              close();
            }}
          >
            ▶ Play it right now
          </button>
        </>
      )}
      {headliner && (
        <p className="fineprint">
          Headliner: <b>{headliner.name}</b> — plays right after the opener.{' '}
          <button className="linkish" onClick={() => void director.removeHeadliner()}>remove</button>
        </p>
      )}
      {analysing && <p className="fineprint">🎛️ Soundchecking…</p>}
      {phase === 'upload' && (
        <button className="big-btn" onClick={() => director.exitUpload()}>Back to the setlist</button>
      )}
      <p className="fineprint">Your file stays in this browser (saved locally so the headliner survives a reload). It is never uploaded.</p>
    </div>
  );
}

export function SettingsPanel() {
  const s = useShow();
  const row = (label: string, value: boolean, key: 'reduceMotion' | 'strobe' | 'captions' | 'translate' | 'lowQuality' | 'haptics', hint?: string) => (
    <label className="setting">
      <input type="checkbox" checked={value} onChange={(e) => s.set({ [key]: e.target.checked })} />
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
  return (
    <div>
      <h2>⚙️ Settings</h2>
      {row('Reduce motion', s.reduceMotion, 'reduceMotion', 'no camera sway, gentler bouncing')}
      {row('Strobe flashes', s.strobe, 'strobe', '⚠ flashing lights — off by default')}
      {row('Captions', s.captions, 'captions', 'lyrics + banter subtitles')}
      {row('Translate meows', s.translate, 'translate', 'show the human lyrics')}
      {row('Haptics', s.haptics, 'haptics', 'phones buzz on the beat')}
      <label className="setting">
        <span>
          Weather
          <small>auto = it might rain mid-set</small>
        </span>
        <select value={s.weather} onChange={(e) => s.set({ weather: e.target.value as 'auto' | 'rain' | 'clear', raining: e.target.value === 'rain' && s.phase !== 'landing' ? true : e.target.value === 'clear' ? false : s.raining })}>
          <option value="auto">auto</option>
          <option value="rain">rain</option>
          <option value="clear">clear skies</option>
        </select>
      </label>
      {row('Low quality', s.lowQuality, 'lowQuality', 'fewer particles/fog (reload to fully apply)')}
      <label className="slider">
        Volume
        <input type="range" min={0} max={1} step={0.01} value={s.volume} onChange={(e) => s.set({ volume: parseFloat(e.target.value) })} />
      </label>
      <h3>Keyboard</h3>
      <ul className="keys">
        <li><kbd>Space</kbd> hold to cheer</li>
        <li><kbd>1</kbd>–<kbd>7</kbd> poke a band member</li>
        <li><kbd>S</kbd> setlist · <kbd>M</kbd> mixer · <kbd>V</kbd> sing · <kbd>U</kbd> upload · <kbd>O</kbd> settings</li>
        <li><kbd>T</kbd> translate · <kbd>C</kbd> captions · <kbd>L</kbd> lighter · <kbd>N</kbd> skip song</li>
        <li><kbd>Y</kbd> shout · <kbd>X</kbd> lights · <kbd>R</kbd> remix · <kbd>K</kbd> record a clip · click the merch stand or your capybara</li>
        <li><kbd>H</kbd> clap on the beat · <kbd>W</kbd> Mexican wave · <kbd>J</kbd> beach ball · <kbd>G</kbd> T-shirt cannon</li>
        <li><kbd>+</kbd>/<kbd>-</kbd> volume · <kbd>Esc</kbd> close panel</li>
      </ul>
    </div>
  );
}
