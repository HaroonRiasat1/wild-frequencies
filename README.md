# 🐱🦊🦥🐙🦉🐧🐐 Wild Frequencies

A browser-based, entirely synthesized, mildly unhinged **animal rock concert**.
A Maine Coon in a velvet jacket sings (in meows) a full live set of original
psychedelic synth-pop, backed by a glitter-guitar fox, a sloth on bass, an
eight-armed drummer, an owl at a wall of synths, three harmonising penguins and
a goat whose only job is to scream at the drops.

Everything — every note, every meow, every crowd roar — is generated in the
browser with Tone.js. No samples, no API keys, works offline after load.

## Run it

```bash
npm install
npm run dev        # http://localhost:5178
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
```

Click **🚪 Doors open** (browsers need a click before they'll play audio).
Add `?rehearsal` to the URL to skip the mic check + walk-on (handy while
working on songs).

## The show

1. **Landing** – dark venue, strobe/motion warnings, "Doors open".
2. **Mic check** – Trash Panda Pete (roadie raccoon): "one two, one two… *squeak*" (plus a little feedback).
3. **Walk-on** – band members enter one by one with name cards. The diva enters last.
4. **The set** – five original songs with banter in between:

   | # | Song | BPM | Key | Showcase |
   |---|------|-----|-----|----------|
   | 1 | Moonlit Static | 96 | A minor | slow build, drums kick in at the drop |
   | 2 | Velvet Claws | 108 | E dorian | sloth bass groove, fox knee-slide solo |
   | 3 | Eight Arms of Love | 124 | D minor | octopus drum solo (inking likely) |
   | 4 | Fog Machine Heart | 72 | F major | the ballad: phones & lighters up |
   | 5 | Howl at the Disco | 122 | G minor | four-on-the-floor, wolf-howl chorus, goat drops |
   | E | Last Call at the Watering Hole | 100 | C major | encore singalong — **only if you earn it** |

5. **Fake ending** – the band "leaves". Fill the hype meter to unlock the encore.
6. **Outro** – bows, rolling credits, *Play again* / *Share your set*.

All melodies, lyrics and progressions are original. Every song runs 1:40–2:05.

## Things to do

| Do this | Get this |
|---------|----------|
| Click a band member (or keys **1–7**) | a mini-solo + a reaction (the sloth replies… eventually) |
| Hold **Space** / the **Cheer** button | crowd roars, band reacts, hype meter fills. Full = confetti + pyro + encore unlocked |
| **Mixer** (M) | mute/solo each instrument; muted animals freeze with a ❄ MUTED sign |
| **Setlist** (S) | the paper setlist taped to the stage: queue a song "next" or play it "now!" |
| **Sing** (V) | your mic → pitch tracking → autotuned to the song's key → sung by a cat, goat, penguin or wolf |
| **Your track** (U) | drop an MP3/WAV you have the rights to → **Make it tonight's headliner** (opens the set, remembered in this browser) or **Play it right now**. The band plays along locked to its beats |
| **Lighter** (L) or tap the crowd | raise a lighter (essential during the ballad) |
| **Translate** (T) | swap meow subtitles for the human lyrics |
| Click the moon 5× | the moon joins on tambourine |
| ↑ ↑ ↓ ↓ ← → ← → B A | tiny sunglasses for everyone (including the crowd, the frog and you) |

Accessibility: **Reduce motion**, **Strobe** (off by default, warned on the
landing page), captions always available (C), keyboard controls for
everything, volume (+/−). Phones in landscape get a simplified stage with fewer
particles and less fog.

## How it works

```
 songs/*.ts ──compileSong()──▶ CompiledSong (flat array of 16th-note steps)
                                     │
                         audio/songPlayer.ts  (Tone.Transport.scheduleRepeat, '16n')
                          │                         │
           plays synths at exact audio time    Tone.Draw.schedule(…, time)
                          │                         │
                          ▼                         ▼
                   audio/engine.ts            conductor.emit(event)
                  (instruments, FX,                 │
                   mixer, crowd)        ┌───────────┼─────────────┐
                                        ▼           ▼             ▼
                                 scene/renderer  characters    ui/ (React + Zustand)
```

### The conductor

`src/conductor/conductor.ts` is a tiny typed event bus. Events:
`beat`, `bar`, `section`, `solo`, `hit` (each drum hit), `note` (per
instrument), `vocal` (each sung syllable), `backing`, `line` (lyric line),
`hype`, `songStart`/`songEnd`, plus show events (`cheer`, `confetti`, `pyro`,
`ledText`, `bubble`).

The **song player** walks the compiled step array on `Tone.Transport` (one
callback per 16th note). For each step it triggers the synths at the exact
audio time and hands the matching events to `Tone.Draw`, which fires them on
the animation frame closest to when you'll actually *hear* them. So the
octopus's arm lands on the snare when the snare sounds — never via
`setTimeout`.

Two more sync mechanisms:

- **Beat clock** – `conductor.beat()` returns the transport position in beats
  (`getTicksAtTime(Tone.immediate())`). Every bounce, head-bang, sway and light
  chase is a function of that phase, so idle animation stays locked even
  between events.
- **Per-frame resync** – `songPlayer.sync()` derives the current section and
  lyric line from the transport each frame, so a throttled tab can never leave
  the lights or subtitles stuck in the wrong section.

**Your own track** gets a soundcheck before it plays (`audio/trackAnalysis.ts`,
~0.5 s for a 4-minute song): an offline render splits it into low / vocal /
snare / hat bands, builds an onset-strength curve, estimates tempo by
autocorrelation, tracks every beat with dynamic programming (Ellis-style),
finds the downbeat, picks kick/snare/hat onsets and snaps them to the 16th
grid, and segments the song into intro / verse / build / chorus / drop /
instrumental / bridge / outro from phrase energy and vocal presence.
`audio/trackPlayer.ts` then plays the file *on* `Tone.Transport`
(`player.sync()`) and schedules every beat, onset and section on the same
transport, so hits land on the audio (measured: median 0.2 ms, 90% within
7 ms). The cat mouths along to the vocal-band energy — no lyrics are shown.
The headliner file is kept in the browser's IndexedDB only; it is never copied
into the project or the build. (`audio/beatDetector.ts` is the older real-time
`AnalyserNode` detector, kept as a reference.)

### The audio

- `audio/engine.ts` – drum kit (Membrane/Noise/Metal synths through a
  compressor), Gary's wobbly bass, a phaser→chorus pad, square-wave arps, a
  driven glitter guitar, reverb + tape delay (feedback delay behind a
  wow/flutter vibrato) on sends, per-instrument `Tone.Channel`s for the mixer,
  and the crowd (pink-noise roar, procedural applause, "woo"s, murmur).
- `audio/animalVoice.ts` – the singing animals. A source oscillator runs
  through three formant band-pass filters whose frequencies glide between
  vowel shapes per syllable (`m → ee → aa → oo` = "meow"). Notes scoop up from
  below and snap to pitch (the autotune), vibrato blooms on long notes, rolled
  r's ("mrrrow", "prrr") get amplitude flutter, goats get a ferocious bleat
  vibrato. Presets: cat, wolf, penguin, goat, owl, raccoon.
- `audio/micSinger.ts` – `getUserMedia` → `pitchy` (McLeod pitch method) →
  snapped to the current song's scale → an `AnimalVoice` in continuous mode.

### The stage

A single Canvas2D renderer (`scene/renderer.ts`) in a 1600×900 world with a
camera that sways, zooms in on soloists and pulls back on big choruses, plus
parallax layers (sky 0.25, stage 1, crowd 0.5). The LED wall
(`scene/ledWall.ts`) is a per-pixel "software shader" (kaleidoscope, lava-lamp
metaballs, spirals, tunnel) rendered at 120×48 and scaled up behind an LED dot
mask, all driven by the FFT. Characters are layered procedural drawings with
skeletal-style limbs (`arm()` = shoulder angle + elbow angle).

## Add a new song

1. Create `src/songs/mySong.ts` exporting a `Song` (see `songs/types.ts`):

   ```ts
   export const mySong: Song = {
     id: 'my-song', title: 'Nap Time Anthem', tagline: 'Gary wrote this one. It took a year.',
     bpm: 90, key: 'D minor', tonic: 'D', scale: 'minor', voice: 'cat',
     progression: ['Dm', 'Bb', 'F', 'C'],               // chord per bar, cycled
     drumPatterns: { main: { kick: 'x.......x.x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' } },
     bassPatterns: { root: '1---5---8---5---' },        // 1/3/5/7/8/b = intervals, '-' = hold
     keysPatterns: { arp: '0.1.2.3.2.1.0.1.' },          // chord-tone indexes (4-7 = octave up)
     guitarStabs: 'x-..x-..x-..x.x.',
     sections: [
       { kind: 'intro', bars: 4, pad: true, keys: 'arp', lights: { palette: ['#ff4fd8', '#00e0c6'], movement: 'still' }, intensity: 0.2 },
       { kind: 'verse', bars: 8, drums: 'main', bass: 'root', pad: true, intensity: 0.5,
         lights: { palette: ['#ff4fd8', '#00e0c6'], movement: 'sweep', fog: 0.6 },
         vocals: [ { melody: 'D5:4 F5:4 A5:8 G5:4 F5:4 D5:8', words: 'Wake me when it\'s din-ner' } ] },
       // …chorus/drop/solo/outro. `hype: true` = goat scream, `guitar: 'solo'` = fox solo,
       //    `drumSolo: true` = octopus improvises, `soloist` = spotlight + camera zoom.
     ],
   };
   ```

   Melodies use mini-notation: `NOTE:duration-in-16ths`, `_` for rests. Each
   vocal line starts on a bar line; syllables in `words` (split on spaces and
   hyphens) map one-to-one onto the sung notes. The compiler warns in the
   console if the counts don't match.

2. Add it to `SETLIST` in `src/songs/index.ts`, and give the cat something to
   say afterwards in `BANTER`.

## Add a new animal

1. Make `src/scene/characters/myAnimal.ts` extending `Character` (see
   `base.ts`). Implement `drawBody(g, f)` with feet at (0, 0). Use the pose
   values the base class maintains — `this.anim` (`idle | play | solo |
   celebrate | react | frozen | bow | walk`), `this.ph` (beat phase),
   `this.hit` (note impulse), `this.local` (its clock, frozen when muted) and
   `this.bounce(f, amp)`.
2. Add its id to `CharacterId` in `songs/types.ts`, its card in
   `show/cast.ts` (name, role, fun fact, poke lines) and `WALK_ON_ORDER`.
3. Instantiate it in `scene/renderer.ts` (`band`, `drawOrder`, `hitOrder`),
   map it to an instrument in `state/store.ts`, and route a conductor event to
   it (e.g. `conductor.on('note', …)`).
4. Give it a lick in `engine.lick()` and, if it sings, an `AnimalVoice` preset.

## Project layout

```
src/
  songs/      song data, theory helpers, the compiler, setlist + banter
  audio/      engine, animal voice synth, song player, beat detector, mic singer
  conductor/  the event bus
  show/       director (show flow), hype meter, cast list
  scene/      renderer, stage + lights, LED wall, sky, crowd, effects, characters/
  ui/         React HUD: mixer, paper setlist, mic, upload, settings, subtitles, credits
  state/      Zustand store
```

No animals were harmed. One frog was mildly surfed.
