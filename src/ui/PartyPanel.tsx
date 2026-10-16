import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { engine } from '../audio/engine';
import { EMOTES, party } from '../party/party';
import { useShow, type FanAnimal } from '../state/store';

const ANIMALS: { id: FanAnimal; label: string }[] = [
  { id: 'raccoon', label: '🦝 Raccoon' },
  { id: 'deer', label: '🦌 Deer' },
  { id: 'hedgehog', label: '🦔 Hedgehog' },
  { id: 'bear', label: '🐻 Bear' },
];

export const joinCode = () => new URLSearchParams(location.search).get('join')?.toUpperCase().slice(0, 4) ?? null;

function useJoinUrl(): string | null {
  const p = useShow((s) => s.party);
  if (p.status !== 'live' || !p.room) return null;
  const base = p.urls.find((u) => !u.includes('localhost')) ?? p.urls[0] ?? location.origin;
  return `${base}/?join=${p.room}`;
}

export function PartyPanel() {
  const p = useShow((s) => s.party);
  const [name, setName] = useState(() => localStorage.getItem('wf-name') ?? '');
  const [qr, setQr] = useState<string | null>(null);
  const url = useJoinUrl();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!url) return setQr(null);
    QRCode.toDataURL(url, { margin: 1, width: 200, color: { dark: '#1a1030', light: '#fbf6e6' } }).then(setQr).catch(() => setQr(null));
  }, [url]);

  if (p.role === 'guest' && p.status === 'live') {
    return (
      <div>
        <h2>🎉 You're at the party</h2>
        <p className="panel-sub">Concert <b>{p.room}</b> · the host runs the show; your cheers count toward their hype meter.</p>
        <Roster />
        <button className="big-btn" onClick={() => party.leave()}>Leave the concert</button>
      </div>
    );
  }

  return (
    <div>
      <h2>🎉 Party mode</h2>
      <p className="panel-sub">
        Friends anywhere join your concert from their phone or laptop — just share the link. The band plays on every device in sync, they show up
        in the crowd, and their cheers fill <i>your</i> hype meter.
      </p>
      {p.status !== 'live' ? (
        <>
          <form
            className="shout-form"
            onSubmit={(e) => {
              e.preventDefault();
              localStorage.setItem('wf-name', name);
              void party.host(name || 'The Host');
            }}
          >
            <input value={name} maxLength={18} onChange={(e) => setName(e.target.value)} placeholder="Your name (shown in the crowd)" aria-label="Your name" />
            <button className="mx-btn" type="submit" disabled={p.status === 'connecting'}>
              {p.status === 'connecting' ? '…' : 'Start a party'}
            </button>
          </form>
          {p.message && <p className={p.status === 'error' ? 'err' : 'fineprint'}>{p.message}</p>}
          <p className="fineprint">
            Online (e.g. on Vercel) your browser hosts the room and friends connect to it directly. Keep this tab open while the party runs.
            Running locally instead? <code>npm run party</code> serves it to your Wi-Fi.
          </p>
        </>
      ) : (
        <>
          <div className="party-invite">
            {qr && <img src={qr} alt={`QR code to join: ${url}`} width={160} height={160} />}
            <div>
              <div className="party-code">{p.room}</div>
              <p className="fineprint">Scan, or open this on a friend's device:</p>
              <code className="party-url">{url}</code>
              <button
                className="linkish"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(url ?? '');
                    setCopied(true);
                  } catch {
                    /* fine, they can read it */
                  }
                }}
              >
                {copied ? 'copied!' : 'copy link'}
              </button>
            </div>
          </div>
          <Roster />
          <p className="fineprint">
            🎵 Tracks you upload (💿 Your track) are sent to everyone here so they hear them in sync. Only share music you're allowed to share.
          </p>
          <button className="big-btn alt" onClick={() => party.leave()}>End the party</button>
        </>
      )}
    </div>
  );
}

function Roster() {
  const { members, me } = useShow((s) => s.party);
  return (
    <ul className="roster">
      {members.map((m) => (
        <li key={m.id}>
          <i style={{ background: m.color }} /> {m.role === 'host' ? '★ ' : ''}
          {m.name} <small>({m.animal}){m.id === me ? ' — you' : ''}</small>
        </li>
      ))}
    </ul>
  );
}

/** Landing screen for an invited friend (?join=CODE). */
export function JoinCard({ code }: { code: string }) {
  const p = useShow((s) => s.party);
  const [name, setName] = useState(() => localStorage.getItem('wf-name') ?? '');
  const [animal, setAnimal] = useState<FanAnimal>(() => (localStorage.getItem('wf-animal') as FanAnimal) || 'raccoon');
  const [busy, setBusy] = useState(false);
  const join = async () => {
    setBusy(true);
    localStorage.setItem('wf-name', name);
    localStorage.setItem('wf-animal', animal);
    await engine.init();
    engine.setVolume(useShow.getState().volume);
    await party.join(code, name || 'A Fan', animal);
    setBusy(false);
  };
  return (
    <div className="join-card">
      <p className="eyebrow">YOU'RE INVITED · CONCERT {code}</p>
      <div className="shout-form">
        <input value={name} maxLength={18} onChange={(e) => setName(e.target.value)} placeholder="Your name" aria-label="Your name" autoFocus />
      </div>
      <div className="chips">
        {ANIMALS.map((a) => (
          <button key={a.id} className={`chip ${animal === a.id ? 'on' : ''}`} onClick={() => setAnimal(a.id)}>{a.label}</button>
        ))}
      </div>
      <button className="doors" onClick={join} disabled={busy || p.status === 'connecting'}>
        {busy || p.status === 'connecting' ? 'Finding your seat…' : '🎟️ Join the concert'}
      </button>
      {p.status === 'live' && <p className="hint">You're in! Waiting for the host's show…</p>}
      {p.message && <p className={p.status === 'error' ? 'err' : 'hint'}>{p.message}</p>}
    </div>
  );
}

/** Emoji reactions everyone in the party can see above your head. */
export function EmoteBar() {
  const live = useShow((s) => s.party.status === 'live');
  if (!live) return null;
  return (
    <div className="emote-bar" aria-label="Send a reaction">
      {EMOTES.map((e) => (
        <button key={e} className="emote-btn" onClick={() => party.emote(e)} aria-label={`React ${e}`}>{e}</button>
      ))}
    </div>
  );
}
