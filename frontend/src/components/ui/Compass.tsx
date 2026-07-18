// La bàn minh hoạ — nhận diện sản phẩm (hero, loading khớp nối, empty state).

const TICKS = Array.from({ length: 24 }, (_, i) => i * 15);

export function Compass({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 320" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="cc-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#007C76" />
          <stop offset="100%" stopColor="#0A3F44" />
        </linearGradient>
        <radialGradient id="cc-face" cx="0.5" cy="0.4" r="0.85">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E0F0EE" />
        </radialGradient>
      </defs>
      <circle cx="160" cy="160" r="150" fill="url(#cc-face)" stroke="url(#cc-ring)" strokeWidth="12" />
      <circle cx="160" cy="160" r="122" fill="none" stroke="#007C76" strokeOpacity="0.14" strokeWidth="1.5" />
      {TICKS.map((angle) => (
        <line
          key={angle}
          x1="160"
          y1="26"
          x2="160"
          y2={angle % 90 === 0 ? 42 : 35}
          stroke={angle % 90 === 0 ? "#007C76" : "#5B6B69"}
          strokeOpacity={angle % 90 === 0 ? 0.9 : 0.35}
          strokeWidth={angle % 90 === 0 ? 3 : 1.5}
          transform={`rotate(${angle} 160 160)`}
        />
      ))}
      <text x="160" y="72" textAnchor="middle" fontSize="21" fontWeight="700" fill="#0A3F44">N</text>
      <text x="252" y="160" textAnchor="middle" dominantBaseline="central" fontSize="18" fontWeight="600" fill="#5B6B69">E</text>
      <text x="160" y="262" textAnchor="middle" fontSize="18" fontWeight="600" fill="#5B6B69">S</text>
      <text x="68" y="160" textAnchor="middle" dominantBaseline="central" fontSize="18" fontWeight="600" fill="#5B6B69">W</text>
      <g className="compass-needle">
        <polygon points="160,74 175,160 145,160" fill="#3DAE5A" />
        <polygon points="160,246 175,160 145,160" fill="#CBD5E1" />
      </g>
      <circle cx="160" cy="160" r="14" fill="#FFFFFF" stroke="#007C76" strokeWidth="5" />
    </svg>
  );
}

export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <img
      src="/logo.png"
      alt="CareerRadar Logo"
      className={`object-contain shrink-0 ${className}`}
    />
  );
}
