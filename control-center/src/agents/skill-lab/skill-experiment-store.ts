import type { SkillExperimentRecord } from "./types";

class SkillExperimentStore {
  private records = new Map<string, SkillExperimentRecord>();

  add(record: SkillExperimentRecord) {
    const safeText = JSON.stringify(record);
    if (/NVIDIA_API_KEY|\.env|secret/i.test(safeText)) throw new Error("Skill experiment records cannot store secrets.");
    this.records.set(record.id, record);
    return record;
  }

  byCandidate(candidateId: string) {
    return Array.from(this.records.values()).filter((record) => record.candidateId === candidateId);
  }

  all() {
    return Array.from(this.records.values());
  }

  clear() {
    this.records.clear();
  }
}

export const defaultSkillExperimentStore = new SkillExperimentStore();

export function createSkillExperimentStore() {
  return new SkillExperimentStore();
}

