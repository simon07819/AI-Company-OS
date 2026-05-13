"use client";

function isValidatedLogoSvg(svg?: string | null) {
  if (!svg) return false;
  if (!/<svg[\s>]/i.test(svg) || !/\bviewBox=/i.test(svg)) return false;
  return !/Brand system|Marque à nommer|Prototype visuel|legacy|fallback/i.test(svg);
}

export default function LogoFinalAnswer({ brandName, svg }: { brandName: string; darkBackground?: boolean; svg?: string | null }) {
  if (!isValidatedLogoSvg(svg)) {
    return (
      <div className="ceo-logo-answer invalid" role="status" aria-label={`Logo ${brandName} non validé`}>
        <span>Je n’ai pas encore un visuel logo validé pour {brandName}.</span>
      </div>
    );
  }
  const validatedSvg = svg as string;

  return (
    <div className="ceo-logo-answer" aria-label={`Visuel ${brandName}`}>
      <div className="ceo-logo-answer-media" aria-label={`Logo ${brandName}`} dangerouslySetInnerHTML={{ __html: validatedSvg }} />
    </div>
  );
}
