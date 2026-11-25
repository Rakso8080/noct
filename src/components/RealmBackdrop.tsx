const PINES = [
  { left: '2%', width: 28, height: 62, bottom: '7%' },
  { left: '8%', width: 20, height: 46, bottom: '6%' },
  { left: '15%', width: 34, height: 72, bottom: '8%' },
  { left: '72%', width: 24, height: 54, bottom: '7%' },
  { left: '79%', width: 36, height: 76, bottom: '9%' },
  { left: '88%', width: 22, height: 50, bottom: '6%' },
  { left: '94%', width: 30, height: 64, bottom: '8%' },
];

const FIREFLIES = [
  { left: '17%', bottom: '28%', delay: '-1.2s', duration: '9s' },
  { left: '29%', bottom: '36%', delay: '-4.4s', duration: '11s' },
  { left: '43%', bottom: '24%', delay: '-2.1s', duration: '8s' },
  { left: '61%', bottom: '33%', delay: '-6.3s', duration: '12s' },
  { left: '74%', bottom: '26%', delay: '-3.5s', duration: '10s' },
  { left: '86%', bottom: '38%', delay: '-7.2s', duration: '13s' },
];

/**
 * The Hollow Atlas behind every table: one valley, one moon, and a light that
 * changes with the room you are in. Purely decorative, never interactive.
 */
export function RealmBackdrop({ hidden = false }: { hidden?: boolean }) {
  return (
    <div className={`realm-backdrop${hidden ? ' is-hidden' : ''}`} aria-hidden="true">
      <span className="realm-aurora realm-aurora--a" />
      <span className="realm-aurora realm-aurora--b" />
      <span className="realm-stars" />
      <span className="realm-stars realm-stars--near" />
      <span className="realm-moon" />
      <span className="realm-cloud realm-cloud--a" />
      <span className="realm-cloud realm-cloud--b" />

      <span className="realm-ridge realm-ridge--far" />

      <svg className="realm-castle" viewBox="0 0 96 76" shapeRendering="crispEdges" focusable="false">
        <path
          fill="currentColor"
          d="M4 72V36h8v-8h5v8h7v-8h5v8h7V26h7V10h6v16h7v10h7v-8h5v8h7v-8h5v8h8v36H4Z"
        />
        <path fill="currentColor" d="M38 72V54h20v18H38Z" />
        <g fill="var(--r-glow)" opacity="0.85">
          <rect x="15" y="46" width="4" height="6" />
          <rect x="29" y="47" width="4" height="6" />
          <rect x="44" y="32" width="4" height="6" />
          <rect x="52" y="32" width="4" height="6" />
          <rect x="66" y="46" width="4" height="6" />
          <rect x="79" y="47" width="4" height="6" />
          <rect x="46" y="58" width="4" height="7" />
        </g>
      </svg>

      <span className="realm-ridge realm-ridge--mid" />
      <span className="realm-water" />

      <span className="realm-house">
        <i className="realm-house-roof" />
        <i className="realm-house-window" />
      </span>
      <span className="realm-path" />

      {PINES.map((pine, index) => (
        <span
          key={`pine-${index}`}
          className={`realm-pine${index % 3 === 0 ? ' is-lit' : ''}`}
          style={{
            left: pine.left,
            width: pine.width,
            height: pine.height,
            bottom: pine.bottom,
          }}
        />
      ))}

      <span className="realm-ridge realm-ridge--near" />

      <span className="realm-fireflies">
        {FIREFLIES.map((fly, index) => (
          <i
            key={`fly-${index}`}
            style={{
              left: fly.left,
              bottom: fly.bottom,
              animationDelay: fly.delay,
              animationDuration: fly.duration,
            }}
          />
        ))}
      </span>

      <span className="realm-shooting-star" />
    </div>
  );
}
