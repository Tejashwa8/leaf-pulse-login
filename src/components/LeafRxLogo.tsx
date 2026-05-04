/**
 * LeafRx logo — uses the official brand image (leaf + stethoscope + Rx in dark green badge).
 * Renders as a perfectly round image regardless of source padding.
 */
import logoSrc from "@/assets/leafrx-logo.png";

export function LeafRxLogo({ size = 44, className }: { size?: number; className?: string }) {
  return (
    <img
      src={logoSrc}
      width={size}
      height={size}
      alt="LeafRx logo"
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        objectFit: "cover",
        display: "inline-block",
        flexShrink: 0,
      }}
      draggable={false}
    />
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
    <span style={{ display: "inline-flex", alignItems: "center", gap }} data-i18n-skip translate="no">
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
        <span style={{ color: "#5cc85c" }}>Rx</span>
      </span>
    </span>
  );
}
