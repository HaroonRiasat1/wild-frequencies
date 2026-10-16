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

## 🎉 Party mode — friends join your concert

**Online (e.g. the Vercel deployment) — nothing to run:**

1. Open the site, click **Doors open**, then **🎉 Party → Start a party**.
2. Send friends the link (or let them scan the QR code / type the 4-letter
   code). They pick a name and an animal and tap **Join** — from anywhere.
3. Keep your tab open: your browser is the room's "server". Friends connect
   straight to you peer-to-peer over WebRTC; the free PeerJS service is only
   used for the initial handshake. (Very strict networks — some schools and
   offices — can block peer-to-peer connections.)

**When things go wrong (they're handled):**
- A friend's connection drops → they see "Reconnecting…", the music keeps
  playing, and they're back in a couple of seconds (retries for 3 minutes).
  Dead links are noticed within ~13 s via heartbeats.
- You (the host) refresh → open the doors again and you get the **same room
  code** back, with the setlist, score and badges restored; friends rejoin
  on their own.
- Friends' messages are type-checked and rate-limited (no emoji floods).

**Strict networks (TURN relay, optional):** peer-to-peer needs a direct path.
Some school/office/mobile networks block that; a TURN relay fixes it. Get
credentials from any TURN provider (e.g. Metered, Twilio, Cloudflare) and add
these environment variables in Vercel (Project → Settings → Environment
Variables), then redeploy:

```
VITE_TURN_URLS=turn:your-relay.example.com:443?transport=tcp,turns:your-relay.example.com:443
VITE_TURN_USERNAME=…
VITE_TURN_CREDENTIAL=…
```

They end up in the browser bundle (that's how TURN works for static sites),
so use credentials with usage limits.

**Local network alternative:** `npm run party` builds the app and serves it
plus a WebSocket relay on port 5180, for friends on the same Wi-Fi. The app
uses this server automatically when it's served by it.

What friends can do: **cheer** (every friend holding Cheer fills *your* hype
meter — a loud crowd unlocks the encore), **clap**, send **emoji reactions**
(🔥🤘😂😍👏🦆🌕🐐) that float above their head on everyone's screen, **shout**
(the cat answers them by name), **request songs**, and **poke** band members
(everyone sees it). The host runs the show: setlist, skip, lights, remix,
encore and afterparty.

How it stays in sync: the host's clock (or the local server's) is the shared clock (each
client measures its offset by ping). When the host starts a song it
announces *"song X starts at server time T"* about 0.8 s ahead; every device
synthesises the band itself and starts its transport at T, compensating for
Tone's scheduling look-ahead. Friends who join mid-song jump straight to the
right 16th note (even across tempo changes). Measured on one machine:
songs start within ~3 ms of each other. Show state (phase, subtitles, hype,
rain, lights, setlist…) is sent as small patches 10× a second.

**Your own tracks play for friends too.** When you play or headline a track
(💿 Your track), it's sent to everyone in the room in small chunks (WebRTC data
channels drop messages over ~16 KB). Each friend's device runs the same
soundcheck (beats, sections, vocals, key) and plays it on the shared clock,
jumping in at the right spot if it arrived late; while it's still
downloading, the band follows your beats. A 3.4 MB track was playing on the
guest within ~4.5 s, 3 ms from the host. Up to 40 MB per track. Only share
music you're allowed to share — friends receive a copy of the file.
Nothing is
stored anywhere.

## The show

1. **Landing** – dark venue, strobe/motion warnings, "Doors open".
1. **Opening act** – The Crumbs (two very nervous mice) play their one song. Someone heckles. Polite applause.
2. **Mic check** – Trash Panda Pete (roadie raccoon): "one two, one two… *squeak*" (plus a little feedback).
3. **Walk-on** – band members enter one by one with name cards. The diva enters last.
4. **The set** – a famous opener plus six original songs with banter in between:

   | # | Song | BPM | Key | Showcase |
   |---|------|-----|-----|----------|
   | 0 | When the Saints Go Marching In (traditional) | 108 | C major | the famous opener: the band marches in; Greg gets verse 3 |
   | 1 | Moonlit Static | 96 | A minor | slow build, drums kick in at the drop |
   | 2 | Velvet Claws | 108 | E dorian | sloth bass groove, fox knee-slide solo |
   | 3 | Eight Arms of Love | 124 | D minor | octopus drum solo (inking likely) |
   | 4 | Fog Machine Heart | 72 | F major | the ballad: phones & lighters up |
   | 5 | Hibernation Is for Quitters | 116 | B minor | anti-sleep rock, espresso-fuelled fox solo |
   | 6 | Howl at the Disco | 122 | G minor | four-on-the-floor, wolf-howl chorus, goat drops |
   | E | Last Call at the Watering Hole | 100 | C major | encore singalong — **only if you earn it** |

5. **Fake ending** – the band "leaves". Fill the hype meter to unlock the encore.
6. **Outro** – bows, rolling credits with your score and badges, *Play again* / *Share your set* / **🎉 Go to the afterparty** (backstage: Gary finally tunes, Octavia signs eight autographs at once, Greg eats the setlist).

**Famous covers (request only)** — on the paper setlist, or shout the title:

| Cover | Source | What the band does to it |
|---|---|---|
| Old MacDonald Had a Farm | traditional | a hoedown; Greg sings the goat verse, the penguins honk theirs |
| Ode to Joy | Beethoven, 1824 | a disco edit with new (silly) English lyrics |
| In the Hall of the Mountain King | Grieg, 1875 | instrumental accelerando, 96 → 186 BPM, Octavia drum solo |
| Twinkle Twinkle Little Star | traditional (1806 poem) | an arena power-ballad with lighters |
| The Entertainer | Scott Joplin, 1902 | a ragtime piano feature for the owl, stride bass by Gary |
| Jingle Bells | Pierpont, 1857 | it is October; they do not care |
| Happy Birthday to You | Hill sisters, 1893 | a 168 BPM punk version for Gary (and Kevin, and Greg) |

These are all public domain worldwide. Songs from 1930 (e.g. "I Got Rhythm",
"Georgia on My Mind") entered the **US** public domain in 2026 but are still
protected in many other countries, so they are not included. Modern famous
songs are copyrighted, so they are not bundled — to have the band play along to one you own, use **Your track →
Make it tonight's headliner** (the file stays in your browser).

All other melodies, lyrics and progressions are original. Every song runs 1:40–2:05.

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
| **Clap** (H) on the beat | rated PERFECT / good / off-beat; 8 in a row and the whole crowd claps along on 2 & 4 |
| **Wave** (W) | a Mexican wave rolls through the crowd (it also happens by itself on big choruses) |
| **Ball** (J), then click it | beach balls bounce over the crowd; click to BONK them back up |
| **Shirt** (G) | Greg fires the T-shirt cannon — sometimes *you* catch one and wear it |
| Click **your capybara** during a song | stage dive: climb up, dance next to the band, dive and crowd-surf back |
| **Shout** (Y) | type a request or a heckle — song names get queued, the cat answers everything |
| **Merch** (B) or click the stand | spend acorns (earned by playing along) on shirts, cat ears, a crown, a foam paw… your capybara wears them |
| **Lights** (X) | take over the light show: palettes, movement, lasers, fog bursts, confetti, pyro |
| **Remix** (R) | filter sweep, echo throw, drum fill on demand, DROP IT, tempo ± (band songs) |
| **Clip** (K) | records 10 s of the show (video + audio) in your browser, then gives you a link to save it |
| **Sing → Duet** | with the mic on, every second lyric line is yours; the cat waits for you |
| Phones | portrait works (camera follows the action), tap the stage to clap, buzz on the beat |
| Click the moon 5× | the moon joins on tambourine |
| ↑ ↑ ↓ ↓ ← → ← → B A | tiny sunglasses for everyone (including the crowd, the frog and you) |

Accessibility: **Reduce motion**, **Strobe** (off by default, warned on the
landing page), captions always available (C), keyboard controls for
everything, volume (+/−). Phones in landscape get a simplified stage with fewer
particles and less fog.

### Score & badges

Everything you do earns points and 🌰 acorns: on-beat claps, catches, bonks,
stage dives, shouting, remixing, filming. There are 19 badges ("Survived the
Bear", "Lunar Percussion", "Human Metronome"…); the ⭐ chip in the top bar opens
the list, and the best score on this device is remembered.

### Real-gig moments (they just happen)

- Fans hold cardboard signs ("MARRY ME GARY", "KEVIN STAND UP"…), glow sticks
  come out on the big sections, phone cameras flash on drops, and phone
  torches go up during the encore chant.
- Crowd surfers on drops: usually the frog, sometimes a hedgehog
  ("ouch ouch ouch"), occasionally an entire bear.
- The **crowd cam** takes over the LED wall — sometimes it finds you.
- After each song Rusty flicks a pick and Octavia launches a drumstick into
  the pit; the hype goat fires shirts on drops.
- Once per show Rusty breaks a string mid-verse; the roadie sprints on with a
  spare guitar.
- Weather: it may rain for a song mid-set (free ponchos, puddles reflecting
  the lights, splashes on the stage). During the ballad a cloud covers the
  moon and the fog turns purple. Force it in Settings → Weather.
- On your own headliner track the penguins sing harmonies on the detected
  chords (`audio/keyDetect.ts`: chromagram → Krumhansl key profiles → one
  triad per bar), and mic mode autotunes to the detected key.

These all live in `scene/concert.ts` and react to the same conductor events,
so they work on your headliner track too.

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
7 ms). The cat's mouth follows the *singer only* (`audio/vocalDetect.ts`): an STFT
keeps the centre of the stereo image (where lead vocals sit), harmonic /
percussive median filtering strips out drum hits, and a hysteresis gate on the
voice-band syllable envelope decides when someone is actually singing — so the
mouth stays shut through intros and instrumental bars. No lyrics are shown.
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

   Sections can also change tempo with `bpm: 140` (see the Mountain King cover).

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

## Performance note

Cymbals are filtered-noise synths (Tone's MetalSynth keeps big FM banks running
all the time), the animal voices only run their oscillators while singing, and
crowd noise only runs while you can hear it. Together that took the audio
engine from ~0.5× real time to a solid 1.0× on a busy machine.

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
  party/      party.ts (client: rooms, clock sync, relay)
party/        server.mjs (static server + WebSocket relay for party mode)
```

No animals were harmed. One frog was mildly surfed.
