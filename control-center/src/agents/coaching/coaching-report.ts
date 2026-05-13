import type { CoachingRunResult } from "./types";

export function generateCoachingReport(result: CoachingRunResult) {
  return {
    lessonsCreated: result.lessonsCreated.length,
    profiles: result.coachingProfiles.map((profile) => ({
      agentRole: profile.agentRole,
      activeLessons: profile.activeLessons.length,
      weakSkills: profile.weakSkills,
    })),
    skillOptimizations: result.skillOptimizations,
  };
}
