import type { WorkOrder } from "@/agents/runtime/types";
import type { MissionMemorySnapshot } from "./types";

function normalize(input: string) {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function isModification(prompt: string) {
  return /\b(modifie|modifier|change|changer|garde le meme|garde le même|variante|reprends|mets le|mets-le|fond noir|plus sportif|plus moderne)\b/i.test(normalize(prompt));
}

function isStrongNewDeliverable(prompt: string) {
  return /\b(je veux|fais-moi|fais moi|cree|crée|maintenant|site|page web|landing|homepage|app|application|logo\s+[a-z0-9])/i.test(normalize(prompt));
}

export function decideContextReuse(input: {
  currentPrompt: string;
  currentWorkOrder: WorkOrder;
  memory: MissionMemorySnapshot;
}) {
  const modification = isModification(input.currentPrompt);
  const latest = [...input.memory.memories].reverse().find((entry) => entry.primaryArtifactId) ?? null;
  const sameType = Boolean(latest && latest.deliverableType === input.currentWorkOrder.deliverableType);
  const sameBrand = Boolean(!latest?.brandName || !input.currentWorkOrder.brandName || latest.brandName.toLowerCase() === input.currentWorkOrder.brandName.toLowerCase());
  const selectedAssets = input.memory.memories
    .flatMap((entry) => entry.reusableAssets)
    .filter((asset) => {
      const brandOk = !input.currentWorkOrder.brandName || !asset.brandName || asset.brandName.toLowerCase() === input.currentWorkOrder.brandName.toLowerCase();
      return brandOk && (asset.canBeSecondaryFor.includes(input.currentWorkOrder.deliverableType) || (modification && asset.canBePrimaryFor.includes(input.currentWorkOrder.deliverableType)));
    });
  const canReusePrimary = modification && sameType && sameBrand && latest?.primaryArtifactId;
  const forbidden = input.memory.memories
    .filter((entry) => entry.primaryArtifactFingerprint)
    .filter((entry) => !modification || entry.deliverableType !== input.currentWorkOrder.deliverableType || (input.currentWorkOrder.brandName && entry.brandName && entry.brandName.toLowerCase() !== input.currentWorkOrder.brandName.toLowerCase()))
    .map((entry) => entry.primaryArtifactFingerprint!)
    .filter(Boolean);

  return {
    currentPrompt: input.currentPrompt,
    currentDeliverableType: input.currentWorkOrder.deliverableType,
    currentBrandName: input.currentWorkOrder.brandName,
    isModification: modification,
    isNewDeliverable: !canReusePrimary || isStrongNewDeliverable(input.currentPrompt) && !modification,
    selectedPreviousArtifactId: canReusePrimary ? latest?.primaryArtifactId : undefined,
    selectedReusableAssets: selectedAssets,
    forbiddenPrimaryArtifactFingerprints: forbidden,
    reason: canReusePrimary
      ? "Modification explicite compatible avec le dernier livrable."
      : selectedAssets.length > 0
        ? "Assets compatibles sélectionnés comme contexte secondaire."
        : "Nouvelle mission sans réutilisation primaire.",
  };
}
