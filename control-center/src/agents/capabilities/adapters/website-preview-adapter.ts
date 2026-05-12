import type { ToolAdapter } from "../types";

interface WebsitePreviewInput {
  brandName: string;
  industry?: string;
  contentMode?: "temporary" | "real";
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderWebsitePreviewSvg(input: WebsitePreviewInput) {
  const brand = escapeXml(input.brandName);
  const apparel = input.industry === "apparel";
  const temporary = input.contentMode === "temporary";
  const hero = apparel ? "Essentiels de linge modernes" : "Une présence web claire";
  const sub = temporary
    ? "Contenu temporaire pour valider la direction, la structure et le ton."
    : "Une première page structurée avec proposition de valeur et sections clés.";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 760" role="img" aria-label="Preview site web ${brand}">
  <rect width="1100" height="760" rx="44" fill="#f6f1e8"/>
  <rect x="48" y="44" width="1004" height="672" rx="34" fill="#fffdf8" stroke="#ded8cc"/>
  <g transform="translate(92 82)" aria-label="nav">
    <text x="0" y="28" fill="#111827" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="900" letter-spacing="3">${brand}</text>
    <text x="520" y="26" fill="#64748b" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="800">Collection</text>
    <text x="650" y="26" fill="#64748b" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="800">À propos</text>
    <text x="766" y="26" fill="#64748b" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="800">Contact</text>
    <rect x="854" y="0" width="108" height="42" rx="21" fill="#111827"/>
    <text x="908" y="27" text-anchor="middle" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="15" font-weight="900">Acheter</text>
  </g>
  <g transform="translate(92 166)" aria-label="hero">
    <rect x="0" y="0" width="916" height="286" rx="30" fill="#111827"/>
    <circle cx="760" cy="74" r="116" fill="#d7b98c" opacity="0.24"/>
    <circle cx="842" cy="214" r="142" fill="#f7f3ea" opacity="0.12"/>
    <text x="54" y="88" fill="#f8fafc" font-family="Inter, Arial, sans-serif" font-size="58" font-weight="950" letter-spacing="-1">${escapeXml(hero)}</text>
    <text x="58" y="142" fill="#cbd5e1" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="700">${escapeXml(sub)}</text>
    <rect x="58" y="184" width="154" height="50" rx="25" fill="#d7b98c"/>
    <text x="135" y="216" text-anchor="middle" fill="#111827" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="950">Voir la collection</text>
    <g transform="translate(644 70)" aria-label="logo asset">
      <rect x="0" y="0" width="168" height="190" rx="28" fill="#f8fafc"/>
      <path d="M54 44c16-20 44-20 60 0l28 36-32 18v58H58V98L26 80l28-36Z" fill="#d7b98c"/>
      <path d="M84 28v136" stroke="#111827" stroke-width="7" stroke-linecap="round" opacity="0.22"/>
    </g>
  </g>
  <g transform="translate(92 500)" aria-label="sections">
    <rect x="0" y="0" width="286" height="150" rx="24" fill="#f7f3ea" stroke="#e5dfd2"/>
    <rect x="315" y="0" width="286" height="150" rx="24" fill="#f7f3ea" stroke="#e5dfd2"/>
    <rect x="630" y="0" width="286" height="150" rx="24" fill="#f7f3ea" stroke="#e5dfd2"/>
    <text x="30" y="56" fill="#111827" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="900">Nouveautés</text>
    <text x="345" y="56" fill="#111827" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="900">Confort quotidien</text>
    <text x="660" y="56" fill="#111827" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="900">Lookbook</text>
    <text x="30" y="94" fill="#64748b" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="700">Sélection temporaire.</text>
    <text x="345" y="94" fill="#64748b" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="700">Matières et coupes.</text>
    <text x="660" y="94" fill="#64748b" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="700">Images à remplacer.</text>
  </g>
</svg>`;
}

export const websitePreviewAdapter: ToolAdapter<WebsitePreviewInput, { primaryVisual: string }> = {
  id: "website.preview",
  name: "Website Preview",
  description: "Render a structured website preview with header, hero, CTA and sections.",
  permissions: [{ id: "website.preview.render", description: "Render static SVG website previews in memory.", allowed: true }],
  run(input) {
    return { primaryVisual: renderWebsitePreviewSvg(input) };
  },
};
