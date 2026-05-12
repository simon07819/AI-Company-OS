"use client";

function monogramFor(brandName: string) {
  const letters = brandName.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase();
  return letters || "AI";
}

export default function LogoFinalAnswer({ brandName, darkBackground = false, svg }: { brandName: string; darkBackground?: boolean; svg?: string | null }) {
  const monogram = monogramFor(brandName);
  const bgStart = darkBackground ? "#05070b" : "#f8fafc";
  const bgEnd = darkBackground ? "#111827" : "#dbeafe";
  const markStart = darkBackground ? "#f8fafc" : "#0f172a";
  const markEnd = darkBackground ? "#60a5fa" : "#2563eb";
  const brandFill = darkBackground ? "#ffffff" : "#0f172a";
  const subFill = darkBackground ? "#93c5fd" : "#2563eb";

  return (
    <div className="ceo-logo-answer" aria-label={`Visuel ${brandName}`}>
      {svg ? (
        <div className="ceo-logo-answer-media" aria-label={`Logo ${brandName}`} dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
      <svg viewBox="0 0 520 320" role="img" aria-label={`Logo ${brandName}`}>
        <defs>
          <linearGradient id={`logo-${brandName}-bg`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={bgStart} />
            <stop offset="100%" stopColor={bgEnd} />
          </linearGradient>
          <linearGradient id={`logo-${brandName}-mark`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={markStart} />
            <stop offset="100%" stopColor={markEnd} />
          </linearGradient>
        </defs>
        <rect width="520" height="320" rx="34" fill={`url(#logo-${brandName}-bg)`} />
        <circle cx="430" cy="58" r="96" fill={darkBackground ? "#1d4ed8" : "#bfdbfe"} opacity="0.18" />
        <circle cx="72" cy="274" r="88" fill={darkBackground ? "#f8fafc" : "#2563eb"} opacity="0.08" />
        <g transform="translate(74 72)">
          <rect width="104" height="104" rx="28" fill={`url(#logo-${brandName}-mark)`} />
          <path d="M30 73 L52 31 L74 73" fill="none" stroke={darkBackground ? "#05070b" : "#ffffff"} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M38 58 H67" stroke={darkBackground ? "#05070b" : "#ffffff"} strokeWidth="10" strokeLinecap="round" />
          <text x="52" y="138" textAnchor="middle" fill={subFill} fontSize="18" fontWeight="900">{monogram}</text>
        </g>
        <text x="220" y="154" fill={brandFill} fontSize="58" fontWeight="900" letterSpacing="2">{brandName}</text>
        <text x="222" y="192" fill={subFill} fontSize="19" fontWeight="800">{monogram}</text>
      </svg>
      )}
    </div>
  );
}
