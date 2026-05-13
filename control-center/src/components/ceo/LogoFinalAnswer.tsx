"use client";

function isValidatedLogoSvg(svg?: string | null) {
  if (!svg) return false;
  if (!/<svg[\s>]/i.test(svg) || !/\bviewBox=/i.test(svg)) return false;
  return !/Brand system|Marque à nommer|Prototype visuel|legacy|fallback/i.test(svg);
}

export default function LogoFinalAnswer({
  brandName,
  svg,
  variants = [],
}: {
  brandName: string;
  darkBackground?: boolean;
  svg?: string | null;
  variants?: Array<{ id?: string; title: string; svg: string }>;
}) {
  if (!isValidatedLogoSvg(svg)) {
    return (
      <div className="ceo-logo-answer invalid" role="status" aria-label={`Logo ${brandName} non validé`}>
        <span>Je n’ai pas encore un visuel logo validé pour {brandName}.</span>
      </div>
    );
  }
  const validatedSvg = svg as string;
  const safeVariants = variants.filter((variant) => isValidatedLogoSvg(variant.svg)).slice(0, 3);

  return (
    <div className="ceo-logo-answer" aria-label={`Prototype de logo ${brandName}`}>
      <div className="ceo-logo-answer-header">
        <span>Prototype de logo</span>
      </div>
      <div className="ceo-logo-answer-media" aria-label={`Logo ${brandName}`} dangerouslySetInnerHTML={{ __html: validatedSvg }} />
      {safeVariants.length > 0 && (
        <div className="ceo-logo-variants" aria-label="Variantes de prototype">
          {safeVariants.map((variant) => (
            <figure className="ceo-logo-variant" key={variant.id ?? variant.title}>
              <div dangerouslySetInnerHTML={{ __html: variant.svg }} />
              <figcaption>{variant.title}</figcaption>
            </figure>
          ))}
        </div>
      )}
      <p className="ceo-logo-answer-note">Prototype vectoriel local, pas un logo final.</p>
    </div>
  );
}
