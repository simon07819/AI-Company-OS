import type { WorkOrder } from "@/agents/runtime/types";
import type { AgentCandidate } from "./types";

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function compactBrand(brandName?: string) {
  return (brandName ?? "AI").replace(/[^A-Za-z0-9]/g, "").toUpperCase() || "AI";
}

function monogram(brandName?: string) {
  return compactBrand(brandName).slice(0, 2);
}

function isBlackBackground(workOrder: WorkOrder) {
  return /fond noir|en noir|background noir|black/i.test(`${workOrder.originalPrompt} ${workOrder.constraints.join(" ")}`);
}

function logoSvg(workOrder: WorkOrder, variant: "monogram" | "geometric" | "badge" | "wordmark" | "dynamic") {
  const brand = escapeXml(compactBrand(workOrder.brandName));
  const mark = escapeXml(monogram(workOrder.brandName));
  const black = isBlackBackground(workOrder);
  const bg = black ? "#030712" : "#f8fafc";
  const ink = black ? "#ffffff" : "#0f172a";
  const muted = black ? "#93c5fd" : "#2563eb";
  const accent = /sport|photo|photographe/i.test(workOrder.originalPrompt) ? "#22c55e" : "#2f6fed";
  const accent2 = /sport|photo|photographe/i.test(workOrder.originalPrompt) ? "#f97316" : "#38bdf8";
  const proshotsSymbol = compactBrand(workOrder.brandName) === "PROSHOTS"
    ? `<g aria-label="camera sport viewfinder"><rect x="338" y="176" width="116" height="78" rx="18" fill="none" stroke="${ink}" stroke-width="14"/><circle cx="396" cy="215" r="24" fill="none" stroke="${accent2}" stroke-width="12"/><path d="M462 184h54m-27-27v54" stroke="${accent2}" stroke-width="12" stroke-linecap="round"/></g>`
    : "";

  if (variant === "badge") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 560" role="img" aria-label="Logo ${brand}"><rect width="900" height="560" rx="52" fill="${bg}"/><g transform="translate(276 54)"><path d="M174 0 334 62v120c0 128-62 210-160 268C76 392 14 310 14 182V62L174 0Z" fill="${accent}"/><path d="M174 58 286 100v78c0 86-38 144-112 190-74-46-112-104-112-190v-78l112-42Z" fill="${bg}"/><path d="M124 152h100M124 214h78M124 276h100" stroke="${ink}" stroke-width="22" stroke-linecap="round"/><path d="M236 152 282 214l-46 62" fill="none" stroke="${accent2}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/><text x="174" y="434" text-anchor="middle" fill="${muted}" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="950" letter-spacing="4">${mark}</text></g><text x="450" y="524" text-anchor="middle" fill="${ink}" font-family="Inter, Arial, sans-serif" font-size="58" font-weight="950" letter-spacing="7">${brand}</text>${proshotsSymbol}</svg>`;
  }

  if (variant === "geometric") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 560" role="img" aria-label="Logo ${brand}"><rect width="900" height="560" rx="52" fill="${bg}"/><circle cx="710" cy="104" r="128" fill="${accent}" opacity="0.16"/><g transform="translate(126 118)"><path d="M98 230 206 66h108l-72 112h134L270 344H160l72-114H98Z" fill="${accent}"/><path d="M410 92h150M410 160h112M410 228h150" stroke="${ink}" stroke-width="26" stroke-linecap="round"/><path d="M568 160h84m0 0-34-34m34 34-34 34" stroke="${accent2}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>${proshotsSymbol}</g><text x="450" y="496" text-anchor="middle" fill="${ink}" font-family="Inter, Arial, sans-serif" font-size="${brand.length > 8 ? 62 : 82}" font-weight="950" letter-spacing="8">${brand}</text><text x="450" y="74" text-anchor="middle" fill="${muted}" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="900" letter-spacing="7">${mark}</text></svg>`;
  }

  if (variant === "wordmark") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 560" role="img" aria-label="Logo ${brand}"><rect width="900" height="560" rx="52" fill="${bg}"/><g transform="translate(158 116)"><path d="M0 150 88 8h132l88 142-88 142H88L0 150Z" fill="${accent}"/><path d="M52 150 118 52h72l66 98-66 98h-72L52 150Z" fill="${bg}"/><path d="M116 98h92M116 150h74M116 202h92" stroke="${ink}" stroke-width="20" stroke-linecap="round"/><path d="M226 98 278 150l-52 52" fill="none" stroke="${accent2}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/></g><text x="520" y="270" fill="${ink}" font-family="Inter, Arial, sans-serif" font-size="${brand.length > 8 ? 58 : 78}" font-weight="950" letter-spacing="9">${brand}</text><path d="M522 318h228" stroke="${accent}" stroke-width="12" stroke-linecap="round"/></svg>`;
  }

  if (variant === "dynamic") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 560" role="img" aria-label="Logo ${brand}"><rect width="900" height="560" rx="52" fill="${bg}"/><g transform="translate(116 112)"><path d="M132 48h250c116 0 206 82 228 196" stroke="${accent}" stroke-width="42" stroke-linecap="round" fill="none"/><path d="M126 252h414" stroke="${ink}" stroke-width="30" stroke-linecap="round"/><path d="M536 188 634 252l-98 64" fill="none" stroke="${accent2}" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/><text x="142" y="184" fill="${ink}" font-family="Inter, Arial, sans-serif" font-size="86" font-weight="950" letter-spacing="6">${mark}</text>${proshotsSymbol}</g><text x="450" y="480" text-anchor="middle" fill="${ink}" font-family="Inter, Arial, sans-serif" font-size="${brand.length > 8 ? 60 : 78}" font-weight="950" letter-spacing="8">${brand}</text></svg>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 560" role="img" aria-label="Logo ${brand}"><rect width="900" height="560" rx="52" fill="${bg}"/><g transform="translate(138 122)"><path d="M0 148 92 0h142l92 148-92 148H92L0 148Z" fill="${accent}"/><path d="M48 148 118 42h90l70 106-70 106h-90L48 148Z" fill="${bg}"/><path d="M112 95h96M112 148h80M112 201h96" fill="none" stroke="${ink}" stroke-width="22" stroke-linecap="round"/><path d="M226 92 286 148l-60 56" fill="none" stroke="${accent2}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/><text x="164" y="360" text-anchor="middle" fill="${muted}" font-family="Inter, Arial, sans-serif" font-size="36" font-weight="900" letter-spacing="4">${mark}</text></g><text x="506" y="258" fill="${ink}" font-family="Inter, Arial, sans-serif" font-size="${brand.length > 8 ? 70 : 92}" font-weight="900" letter-spacing="8">${brand}</text><path d="M510 306h238" stroke="${accent}" stroke-width="12" stroke-linecap="round"/>${proshotsSymbol}</svg>`;
}

function websiteSvg(workOrder: WorkOrder, variant: "premium" | "commerce" | "editorial") {
  const brand = escapeXml(compactBrand(workOrder.brandName));
  const apparel = workOrder.industry === "apparel" || /linge|vetement|vêtement|apparel|clothing/i.test(workOrder.originalPrompt);
  const title = variant === "editorial" ? "Lookbook essentiel" : variant === "commerce" ? "Collection quotidienne" : apparel ? "Essentiels de linge modernes" : "Une présence web claire";
  const bg = variant === "editorial" ? "#111827" : "#f6f1e8";
  const page = variant === "editorial" ? "#181f2e" : "#fffdf8";
  const ink = variant === "editorial" ? "#f8fafc" : "#111827";
  const muted = variant === "editorial" ? "#cbd5e1" : "#64748b";
  const accent = variant === "commerce" ? "#111827" : "#d7b98c";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 760" role="img" aria-label="Preview site web ${brand}"><rect width="1100" height="760" rx="44" fill="${bg}"/><rect x="48" y="44" width="1004" height="672" rx="34" fill="${page}" stroke="#ded8cc"/><g transform="translate(92 82)" aria-label="nav"><text x="0" y="28" fill="${ink}" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="900" letter-spacing="3">${brand}</text><text x="520" y="26" fill="${muted}" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="800">Collection</text><text x="650" y="26" fill="${muted}" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="800">À propos</text><text x="766" y="26" fill="${muted}" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="800">Contact</text><rect x="854" y="0" width="108" height="42" rx="21" fill="${accent}"/><text x="908" y="27" text-anchor="middle" fill="${variant === "commerce" ? "#ffffff" : "#111827"}" font-family="Inter, Arial, sans-serif" font-size="15" font-weight="900">Acheter</text></g><g transform="translate(92 166)" aria-label="hero"><rect x="0" y="0" width="916" height="286" rx="30" fill="${variant === "editorial" ? "#0b1120" : "#111827"}"/><circle cx="760" cy="74" r="116" fill="${accent}" opacity="0.24"/><text x="54" y="88" fill="#f8fafc" font-family="Inter, Arial, sans-serif" font-size="58" font-weight="950">${escapeXml(title)}</text><text x="58" y="142" fill="#cbd5e1" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="700">Contenu temporaire pour valider la direction, la structure et le ton.</text><rect x="58" y="184" width="164" height="50" rx="25" fill="${accent}"/><text x="140" y="216" text-anchor="middle" fill="${variant === "commerce" ? "#ffffff" : "#111827"}" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="950">Voir la collection</text><g transform="translate(652 78)" aria-label="logo asset"><rect x="0" y="0" width="142" height="142" rx="30" fill="#f8fafc"/><text x="71" y="87" text-anchor="middle" fill="#111827" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="950" letter-spacing="3">${escapeXml(monogram(workOrder.brandName))}</text></g></g><g transform="translate(92 500)" aria-label="sections"><rect x="0" y="0" width="286" height="150" rx="24" fill="${variant === "editorial" ? "#0b1120" : "#f7f3ea"}" stroke="#e5dfd2"/><rect x="315" y="0" width="286" height="150" rx="24" fill="${variant === "editorial" ? "#0b1120" : "#f7f3ea"}" stroke="#e5dfd2"/><rect x="630" y="0" width="286" height="150" rx="24" fill="${variant === "editorial" ? "#0b1120" : "#f7f3ea"}" stroke="#e5dfd2"/><text x="30" y="56" fill="${ink}" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="900">Nouveautés</text><text x="345" y="56" fill="${ink}" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="900">Confort quotidien</text><text x="660" y="56" fill="${ink}" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="900">Lookbook</text><text x="30" y="94" fill="${muted}" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="700">Sélection temporaire.</text><text x="345" y="94" fill="${muted}" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="700">Matières et coupes.</text><text x="660" y="94" fill="${muted}" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="700">Images à remplacer.</text></g></svg>`;
}

function candidateBase(workOrder: WorkOrder, index: number) {
  return {
    missionId: workOrder.missionId,
    turnId: workOrder.turnId,
    deliverableType: workOrder.deliverableType,
    brandName: compactBrand(workOrder.brandName),
    status: "draft" as const,
    metadata: { generatedBy: "candidate-generator", index, readyForArtifact: true },
  };
}

export function generateCandidatesForWorkOrder(workOrder: WorkOrder): AgentCandidate[] {
  if (workOrder.deliverableType === "logo") {
    const variants = [
      ["monogram", "Monogramme propriétaire", "Monogramme EK/E construit avec symbole central."],
      ["geometric", "Symbole géométrique", "Signal graphique dynamique, adapté aux usages digitaux."],
      ["badge", "Emblème moderne", "Badge premium exploitable sur vêtement, favicon ou signalétique."],
      ["wordmark", "Wordmark travaillé", "Mot-symbole renforcé par une composition propriétaire."],
      ["dynamic", "Signature dynamique", "Composition de mouvement pour une marque énergique."],
    ] as const;
    return variants.map(([variant, title, rationale], index) => ({
      ...candidateBase(workOrder, index),
      id: `${workOrder.missionId}-logo-${variant}`,
      kind: "logo_svg",
      createdByAgentRole: "logo_designer",
      title,
      rationale,
      content: logoSvg(workOrder, variant),
      artifactId: `candidate-artifact-${workOrder.missionId}-logo-${variant}`,
    }));
  }

  if (workOrder.requestType === "website") {
    const variants = [
      ["premium", "Landing minimale premium", "Page claire avec hero fort, CTA et sections éditoriales."],
      ["commerce", "Homepage e-commerce légère", "Structure orientée collection, achat et réassurance."],
      ["editorial", "Page éditoriale fashion", "Direction plus visuelle avec lookbook et contenu temporaire."],
    ] as const;
    return variants.map(([variant, title, rationale], index) => ({
      ...candidateBase(workOrder, index),
      id: `${workOrder.missionId}-website-${variant}`,
      kind: "website_preview",
      deliverableType: workOrder.deliverableType,
      createdByAgentRole: "frontend_builder",
      title,
      rationale,
      content: websiteSvg(workOrder, variant),
      artifactId: `candidate-artifact-${workOrder.missionId}-website-${variant}`,
    }));
  }

  return [];
}
