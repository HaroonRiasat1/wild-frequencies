// Plays a CompiledSong on Tone.Transport, one 16th at a time, and mirrors every
// musical event to the conductor at the exact moment it becomes audible.

import * as Tone from 'tone';
import { conductor, type ConductorEvents } from '../conductor/conductor';
import type { CompiledSong } from '../songs/compile';
import { midiToFreq } from '../songs/theory';
import { useShow } from '../state/store';
import { engine } from './engine';

type Emission = { [K in keyof ConductorEvents]: [K, ConductorEvents[K]] }[keyof ConductorEvents];

class SongPlayer {
  current: CompiledSong | null = null;
  private onEnd: (() => void) | null = null;

  constructor() {
    const transport = Tone.getTransport();
    conductor.state.beatSource = () => {
      if (transport.state !== 'started') return conductor.state.playing ? 0 : performance.now() / 1000 * (conductor.state.bpm / 60);
      return transport.getTicksAtTime(Tone.immediate()) / transport.PPQ;
    };
  }

  play(song: CompiledSong, onEnd: () => void) {
    this.stop();
    const transport = Tone.getTransport();
    transport.bpm.value = song.song.bpm;
    transport.swing = song.song.swing ?? 0;
    transport.swingSubdivision = '16n';
    transport.position = 0;
    this.current = song;
    this.onEnd = onEnd;
    conductor.state.bpm = song.song.bpm;
    conductor.state.song = song.song;
    conductor.state.playing = true;
    engine.setPadBrightness(song.song.sound?.padBrightness ?? 0.6);

    let step = 0;
    const s16 = 60 / song.song.bpm / 4;
    transport.scheduleRepeat((time) => {
      if (step < song.totalSteps) this.playStep(song, step, time, s16);
      step++;
    }, '16n', 0);

    // one extra bar of ring-out, then tell the director
    const endTime = (song.totalSteps + 16) * s16;
    transport.scheduleOnce((time) => {
      Tone.getDraw().schedule(() => this.finish(), time);
    }, endTime);

    Tone.getDraw().schedule(() => conductor.emit('songStart', { song: song.song }), Tone.now());
    transport.start('+0.1');
  }

  private lineId = -1;

  /**
   * Called every animation frame: derives the current section + lyric line
   * from the transport position. Unlike Tone.Draw callbacks (which are dropped
   * if the tab was throttled), this can never miss a section change.
   */
  sync() {
    const song = this.current;
    const tr = Tone.getTransport();
    if (!song || tr.state !== 'started') return;
    const step = Math.floor(tr.getTicksAtTime(Tone.immediate()) / (tr.PPQ / 4));
    if (step < 0 || step >= song.totalSteps) return;
    const sec = song.sections.find((x) => step >= x.start && step < x.end) ?? null;
    if (sec && conductor.state.section !== sec) {
      conductor.state.section = sec;
      conductor.state.intensity = sec.section.intensity;
      conductor.state.soloist = sec.soloist;
      conductor.emit('section', { section: sec, song: song.song });
      conductor.emit('solo', { who: sec.soloist });
    }
    const line = song.lines.find((l) => step >= l.start && step < l.end) ?? null;
    const id = line ? line.id : -1;
    if (id !== this.lineId) {
      this.lineId = id;
      conductor.emit('line', { line });
    }
  }

  /** Stop early (skip) — still counts as finished for the director. */
  skip() {
    if (!this.current) return;
    this.finish();
  }

  private finish() {
    const song = this.current;
    const cb = this.onEnd;
    this.stop();
    if (song) conductor.emit('songEnd', { song: song.song });
    cb?.();
  }

  stop() {
    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel(0);
    this.current = null;
    this.onEnd = null;
    this.lineId = -1;
    conductor.state.playing = false;
    conductor.state.section = null;
    conductor.state.soloist = null;
    engine.pad?.releaseAll();
    engine.cat?.silence();
    engine.penguins?.forEach((p) => p.silence());
  }

  private playStep(song: CompiledSong, i: number, time: number, s16: number) {
    const ev = song.steps[i];
    const out: Emission[] = [];
    const st = useShow.getState();

    // grid events
    if (i % 4 === 0) out.push(['beat', { beat: i / 4, bar: Math.floor(i / 16), downbeat: i % 16 === 0 }]);
    if (i % 16 === 0) out.push(['bar', { bar: i / 16, chord: song.barChords[i / 16] }]);
    // drums
    for (const d of ev.drums) {
      engine.drum(d.kind, time, d.vel);
      out.push(['hit', { kind: d.kind, vel: d.vel }]);
    }
    if (st.moonJoined && i % 2 === 0) {
      engine.tambourine(time, i % 4 === 0 ? 0.9 : 0.5);
    }

    if (ev.bass) {
      engine.bass.triggerAttackRelease(midiToFreq(ev.bass.midi), ev.bass.dur * s16 * 0.92, time, ev.bass.vel);
      out.push(['note', { who: 'sloth', midi: ev.bass.midi, dur: ev.bass.dur, vel: ev.bass.vel }]);
    }
    if (ev.pad) {
      engine.pad.triggerAttackRelease(ev.pad.midis.map(midiToFreq), ev.pad.dur * s16 * 0.98, time, 0.5);
    }
    if (ev.keys) {
      engine.keys.triggerAttackRelease(midiToFreq(ev.keys.midi), ev.keys.dur * s16 * 0.9, time, ev.keys.vel);
      out.push(['note', { who: 'owl', midi: ev.keys.midi, dur: ev.keys.dur, vel: ev.keys.vel }]);
    }
    if (ev.lead) {
      engine.lead.triggerAttackRelease(midiToFreq(ev.lead.midi), ev.lead.dur * s16 * 0.95, time, ev.lead.vel);
      out.push(['note', { who: 'owl', midi: ev.lead.midi, dur: ev.lead.dur, vel: 1 }]);
    }
    if (ev.guitar) {
      const g = ev.guitar;
      if (g.solo) {
        const f = midiToFreq(g.midis[0]);
        engine.guitarLead.triggerAttackRelease(f, g.dur * s16 * 0.95, time, g.vel);
        if (g.bend) {
          // a whole-step bend, because the fox has no restraint
          engine.guitarLead.frequency.setValueAtTime(f, time + s16);
          engine.guitarLead.frequency.exponentialRampToValueAtTime(f * Math.pow(2, 2 / 12), time + s16 * 2.5);
        }
      } else {
        engine.guitar.triggerAttackRelease(g.midis.map(midiToFreq), g.dur * s16 * 0.8, time, g.vel);
      }
      out.push(['note', { who: 'fox', midi: g.midis[0], dur: g.dur, vel: g.vel }]);
    }
    if (ev.vocal) {
      const v = ev.vocal;
      const durSec = v.dur * s16 * 0.95;
      engine.cat.setPresetIfNeeded(v.voice);
      engine.cat.sing(v.midi, durSec, time, v.syl, v.vel);
      out.push(['vocal', { ...v, durSec }]);
      out.push(['note', { who: 'cat', midi: v.midi, dur: v.dur, vel: v.vel }]);
    }
    if (ev.backing) {
      const b = ev.backing;
      const durSec = b.dur * s16 * 0.95;
      b.midis.forEach((m, k) => engine.penguins[k]?.sing(m, durSec, time + k * 0.012, b.syl, 0.7));
      out.push(['backing', { midis: b.midis, syl: b.syl, durSec }]);
    }
    if (ev.hype) {
      engine.meeeh(time + s16 * 0.5);
      out.push(['hype', { source: 'song' }]);
    }

    if (out.length) {
      Tone.getDraw().schedule(() => {
        for (const [type, payload] of out) conductor.emit(type, payload as never);
      }, time);
    }
  }
}

export const songPlayer = new SongPlayer();
