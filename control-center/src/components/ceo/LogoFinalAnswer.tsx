"use client";

function monogramFor(brandName: string) {
  const letters = brandName.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase();
  return letters || "AI";
}

export default function LogoFinalAnswer({ brandName }: { brandName: string }) {
  const monogram = monogramFor(brandName);

  return (
    <div className="ceo-logo-answer" aria-label={`Prototype visuel ${brandName}`}>
      <svg viewBox="0 0 520 320" role="img" aria-label={`Logo prototype ${brandName}`}>
        <defs>
          <linearGradient id={`logo-${brandName}-bg`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#dbeafe" />
          </linearGradient>
          <linearGradient id={`logo-${brandName}-mark`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>
        <rect width="520" height="320" rx="34" fill={`url(#logo-${brandName}-bg)`} />
        <g transform="translate(74 72)">
          <rect width="104" height="104" rx="28" fill={`url(#logo-${brandName}-mark)`} />
          <path d="M28 72 L52 28 L76 72" fill="none" stroke="#ffffff" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M38 58 H68" stroke="#ffffff" strokeWidth="10" strokeLinecap="round" />
          <text x="52" y="138" textAnchor="middle" fill="#2563eb" fontSize="18" fontWeight="800">{monogram}</text>
        </g>
        <text x="220" y="142" fill="#0f172a" fontSize="54" fontWeight="900" letterSpacing="2">{brandName}</text>
        <text x="222" y="180" fill="#475569" fontSize="18" fontWeight="700">Prototype visuel</text>
      </svg>
      <span>Prototype visuel</span>
    </div>
  );
}
