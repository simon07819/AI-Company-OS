export type ConversationTurn = {
  id: string;
  conversationId: string;
  userPrompt: string;
  createdAt: string;
  workOrderId?: string;
  missionId?: string;
  deliverableType?: string;
  brandName?: string;
  visibleOutputKind?: string;
  primaryArtifactId?: string;
  primaryArtifactFingerprint?: string;
  status: "pending" | "approved" | "failed";
};

export type ReusableAsset = {
  id: string;
  kind: "logo" | "brand_asset" | "website_preview" | "copy" | "palette" | "component";
  brandName?: string;
  artifactId: string;
  fingerprint: string;
  canBePrimaryFor: string[];
  canBeSecondaryFor: string[];
  constraints: string[];
};

export type MissionMemoryEntry = {
  id: string;
  conversationId: string;
  turnId: string;
  missionId: string;
  workOrderId: string;
  deliverableType: string;
  brandName?: string;
  primaryArtifactId?: string;
  primaryArtifactFingerprint?: string;
  reusableAssets: ReusableAsset[];
  summary: string;
  hiddenDetailsRef?: string;
  createdAt: string;
};

export type ContextSelection = {
  currentPrompt: string;
  currentDeliverableType: string;
  currentBrandName?: string;
  isModification: boolean;
  isNewDeliverable: boolean;
  selectedPreviousArtifactId?: string;
  selectedReusableAssets: ReusableAsset[];
  forbiddenPrimaryArtifactFingerprints: string[];
  reason: string;
};

export type AgentContextSelection = {
  agentRole: string;
  prompt: string;
  deliverableType: string;
  brandName?: string;
  constraints: string[];
  reusableAssets: ReusableAsset[];
  forbiddenPrimaryArtifactFingerprints: string[];
};

export type MissionMemorySnapshot = {
  conversationId: string;
  turns: ConversationTurn[];
  memories: MissionMemoryEntry[];
};
