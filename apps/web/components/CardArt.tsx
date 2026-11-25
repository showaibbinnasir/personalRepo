/**
 * Generated "planet" artwork for cards without a cover image. Each card gets its
 * own deterministic composition (seeded by its id), so placeholders feel designed
 * rather than empty, and always match the deep-space theme.
 */
function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: string) {
  let a = hash(seed) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function CardArt({ seed, label }: { seed: string; label?: string }) {
  const r = rng(seed);
  const id = `ca${hash(seed).toString(36)}`;
  const px = 215 + r() * 105; // planet centre
  const py = 70 + r() * 100;
  const pr = 46 + r() * 38; // planet radius
  const ringed = r() > 0.4;
  const tilt = -28 + r() * 24;
  const moon = r() > 0.35;
  const ma = r() * Math.PI * 2;
  const md = pr + 26 + r() * 26;
  const stars = Array.from({ length: 34 }, () => ({ x: r() * 400, y: r() * 250, s: r() < 0.15 ? 1.3 : 0.6, o: 0.25 + r() * 0.6 }));
  const orbitR = pr + 54 + r() * 40;

  return (
    <div className="card-placeholder card-art" aria-hidden="true">
      <svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id={`${id}-p`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="color-mix(in srgb, var(--accent) 55%, #ffd9c9)" />
            <stop offset="45%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="#120606" />
          </radialGradient>
          <radialGradient id={`${id}-g`} cx="50%" cy="50%" r="50%">
            <stop offset="55%" stopColor="var(--accent)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${id}-s`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="40%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.7" />
          </linearGradient>
          <clipPath id={`${id}-c`}><circle cx={px} cy={py} r={pr} /></clipPath>
        </defs>
        {stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.s} fill="#f4f1ec" opacity={s.o} />
        ))}
        <ellipse cx={px} cy={py} rx={orbitR} ry={orbitR * 0.34} fill="none" stroke="rgba(244,241,236,.14)" strokeDasharray="2 5"
          transform={`rotate(${tilt} ${px} ${py})`} />
        <circle cx={px} cy={py} r={pr * 1.6} fill={`url(#${id}-g)`} />
        {ringed && (
          <ellipse cx={px} cy={py} rx={pr * 1.75} ry={pr * 0.42} fill="none" stroke="color-mix(in srgb, var(--accent) 60%, #f4f1ec)"
            strokeOpacity="0.55" strokeWidth="2" transform={`rotate(${tilt} ${px} ${py})`} />
        )}
        <circle cx={px} cy={py} r={pr} fill={`url(#${id}-p)`} />
        <g clipPath={`url(#${id}-c)`} opacity="0.35">
          {[0.25, 0.5, 0.7].map(f => (
            <ellipse key={f} cx={px} cy={py - pr + pr * 2 * f} rx={pr * 1.2} ry={pr * 0.07} fill="#000"
              transform={`rotate(${tilt * 0.6} ${px} ${py})`} />
          ))}
        </g>
        <circle cx={px} cy={py} r={pr} fill={`url(#${id}-s)`} />
        {ringed && (
          // Front half of the ring, drawn over the planet.
          <path d={`M ${px - pr * 1.75} ${py} A ${pr * 1.75} ${pr * 0.42} 0 0 0 ${px + pr * 1.75} ${py}`} fill="none"
            stroke="color-mix(in srgb, var(--accent) 60%, #f4f1ec)" strokeOpacity="0.7" strokeWidth="2"
            transform={`rotate(${tilt} ${px} ${py})`} />
        )}
        {moon && <circle cx={px + Math.cos(ma) * md} cy={py + Math.sin(ma) * md * 0.5} r={4 + r() * 5} fill="#cfc8c0" opacity="0.85" />}
      </svg>
      {label && <span className="card-art-label">{label}</span>}
    </div>
  );
}
