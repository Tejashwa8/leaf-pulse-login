/**
 * LeafRx logo — circle badge + leaf + midrib veins + stethoscope arc + "Rx"
 * Spec coordinates use a 44×44 design grid; we expose viewBox "0 0 44 44"
 * and let the consumer pick width/height.
 */
export function LeafRxLogo({ size = 44, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="LeafRx logo"
      role="img"
    >
      {/* Outer circle badge */}
      <circle cx="22" cy="22" r="21" fill="#1a2810" stroke="#6B8E23" strokeWidth="1" />

      {/* Leaf body */}
      <path
        d="M22 37C22 37 9 29 9 19C9 12 14.9 6 22 6C29.1 6 35 12 35 19C35 29 22 37 22 37Z"
        fill="#1e3310"
        stroke="#6B8E23"
        strokeWidth="1.5"
      />
      {/* Glow layer */}
      <path
        d="M22 37C22 37 9 29 9 19C9 12 14.9 6 22 6C29.1 6 35 12 35 19C35 29 22 37 22 37Z"
        fill="#4CAF50"
        opacity="0.12"
      />

      {/* Midrib */}
      <path d="M22 7V37" stroke="#6B8E23" strokeWidth="1.4" strokeLinecap="round" />
      {/* Side veins */}
      <path d="M22 14C22 14 17 12 14 9" stroke="#6B8E23" strokeWidth="1" opacity="0.7" fill="none" />
      <path d="M22 20C22 20 27 18 30 15" stroke="#6B8E23" strokeWidth="1" opacity="0.7" fill="none" />

      {/* Stethoscope arc */}
      <path
        d="M13 19C8 12 10 4 18 2C21 1 24 2 22 6"
        stroke="#8D6E63"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
      />
      {/* Earpiece */}
      <circle cx="13" cy="19.5" r="3.5" fill="none" stroke="#8D6E63" strokeWidth="1.5" opacity="0.55" />
      <circle cx="13" cy="19.5" r="1.3" fill="#8D6E63" opacity="0.55" />

      {/* Rx */}
      <text
        x="15"
        y="34"
        fontFamily="Georgia, serif"
        fontSize="9"
        fontWeight="900"
        fill="#4CAF50"
        opacity="0.9"
      >
        Rx
      </text>
    </svg>
  );
}

export function LeafRxWordmark({
  iconSize = 36,
  fontSize = 22,
  gap = 10,
}: {
  iconSize?: number;
  fontSize?: number;
  gap?: number;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap }}>
      <LeafRxLogo size={iconSize} />
      <span
        style={{
          fontFamily: "'Nunito', 'Poppins', sans-serif",
          fontWeight: 900,
          fontSize,
          letterSpacing: "-0.5px",
          lineHeight: 1,
        }}
      >
        <span style={{ color: "#ffffff" }}>Leaf</span>
        <span style={{ color: "#4CAF50" }}>Rx</span>
      </span>
    </span>
  );
}
