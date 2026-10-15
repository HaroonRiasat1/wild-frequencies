// Record a 10-second clip of the show (canvas video + the band's audio).
// Everything stays in the browser; you get a link to save/share the file.

import { engine } from '../audio/engine';
import { stageRef } from '../scene/stageRef';
import { unlock } from '../show/score';
import { useShow } from '../state/store';

const SECONDS = 10;

function pickMime(): string {
  const options = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
  return options.find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) ?? '';
}

export function clipSupported(): boolean {
  return typeof MediaRecorder !== 'undefined' && !!HTMLCanvasElement.prototype.captureStream;
}

export function recordClip() {
  const s = useShow.getState();
  const canvas = stageRef.current?.canvasEl;
  if (!canvas || s.clip.recording || !clipSupported()) return;
  const video = canvas.captureStream(30);
  const audio = engine.recordStream();
  const stream = new MediaStream([...video.getVideoTracks(), ...(audio ? audio.getAudioTracks() : [])]);
  const mime = pickMime();
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 4_000_000 } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.onstop = () => {
    video.getTracks().forEach((t) => t.stop());
    const old = useShow.getState().clip.url;
    if (old) URL.revokeObjectURL(old);
    const blob = new Blob(chunks, { type: rec.mimeType || 'video/webm' });
    useShow.getState().set({ clip: { recording: false, url: URL.createObjectURL(blob), seconds: 0 } });
    unlock('clip', 40);
  };
  rec.start(250);
  s.set({ clip: { recording: true, url: s.clip.url, seconds: SECONDS } });
  let left = SECONDS;
  const tick = window.setInterval(() => {
    left--;
    const st = useShow.getState();
    st.set({ clip: { ...st.clip, seconds: left } });
    if (left <= 0) {
      window.clearInterval(tick);
      rec.stop();
    }
  }, 1000);
}

export function clipExtension(url: string | null): string {
  return url && /mp4/.test(pickMime()) ? 'mp4' : 'webm';
}
