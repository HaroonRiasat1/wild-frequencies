import { motion } from 'framer-motion';
import { useState } from 'react';
import { CAST, WALK_ON_ORDER } from '../show/cast';
import { director } from '../show/director';
import { ACHIEVEMENTS, bestScore } from '../show/score';
import { useShow } from '../state/store';

export function Credits() {
  const { setLog, lighters, moonJoined, sunglasses, encoreUnlocked, score, achievements } = useShow();
  const [copied, setCopied] = useState(false);
  const guest = useShow((s) => s.party.role === 'guest' && s.party.status === 'live');

  const share = async () => {
    const lines = [
      '🎶 I saw WILD FREQUENCIES live at the Hollow Log Amphitheater',
      ...setLog.map((s, i) => `${i + 1}. ${s.title} — peak hype ${s.peakHype}%`),
      encoreUnlocked ? '🔓 We got the encore.' : '🔒 No encore (we did not cheer enough).',
      moonJoined ? '🌕 The moon played tambourine.' : '',
      lighters ? `🔥 ${lighters} lighter(s) raised` : '',
      sunglasses ? '😎 Everyone wore sunglasses.' : '',
      `⭐ ${score.toLocaleString()} points · ${achievements.length} badges: ${achievements.map((a) => ACHIEVEMENTS[a]?.icon).join(' ')}`,
    ].filter(Boolean);
    const text = lines.join('\n');
    try {
      if (navigator.share) await navigator.share({ title: 'My Wild Frequencies set', text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
      }
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
      } catch {
        /* the band respects your privacy */
      }
    }
  };

  const roll = [
    ...WALK_ON_ORDER.slice().reverse().map((id) => [CAST[id].role, CAST[id].name]),
    ['Roadie, mic check, pizza theft', 'Trash Panda Pete'],
    ['Opening act', 'The Crumbs (Brie & Cheddar)'],
    ['Crowd surfing', 'A small frog (uninjured), occasionally a bear'],
    ...(moonJoined ? [['Guest tambourine', 'The Moon']] : []),
    ['Fog', 'Too much'],
    ['Catering', 'A badger with a bar tab'],
    ['Audience', 'You, a capybara'],
    ['', 'No animals were harmed. One frog was mildly surfed.'],
  ];

  return (
    <motion.div className="credits" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="credits-roll">
        <motion.div initial={{ y: '60%' }} animate={{ y: '-10%' }} transition={{ duration: 14, ease: 'linear' }}>
          <h2 className="logo small"><span>WILD</span> <span>FREQUENCIES</span></h2>
          {roll.map(([role, name], i) => (
            <p key={i} className="credit-line">
              {role && <span className="credit-role">{role}</span>}
              <span className="credit-name">{name}</span>
            </p>
          ))}
        </motion.div>
      </div>
      <div className="credits-set">
        <h3>Tonight's set</h3>
        <ol>
          {setLog.map((s) => (
            <li key={s.songId}>
              {s.title} <small>peak hype {s.peakHype}%</small>
            </li>
          ))}
        </ol>
        <p className="credits-score">
          ⭐ <b>{score.toLocaleString()}</b> points · best {bestScore().toLocaleString()}
          <br />
          {achievements.map((a) => <span key={a} title={ACHIEVEMENTS[a]?.title}>{ACHIEVEMENTS[a]?.icon}</span>)}
          {!achievements.length && <small>no badges — next time, clap on the beat</small>}
        </p>
        <div className="credits-buttons">
          {guest ? (
            <p className="fineprint">The host decides what happens next (afterparty? another show?).</p>
          ) : (
            <>
              <button className="big-btn alt" onClick={() => director.afterparty()}>🎉 Go to the afterparty</button>
              <button className="big-btn" onClick={() => director.playAgain()}>🔁 Play again</button>
            </>
          )}
          <button className="big-btn alt" onClick={share}>📤 {copied ? 'Copied!' : 'Share your set'}</button>
        </div>
      </div>
    </motion.div>
  );
}
