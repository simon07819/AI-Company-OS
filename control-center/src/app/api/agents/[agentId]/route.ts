import { NextRequest, NextResponse } from "next/server";
import { getProfile, updateProfile, resetProfile, getMemory, addXp, learnPreference, learnStylePreference, getCareer, addSpecialty } from "@/lib/agentProfiles";
import { type AgentId } from "@/lib/agentTypes";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const profile = getProfile(agentId as AgentId);
  if (!profile) return NextResponse.json({ ok: false, message: "Agent not found" }, { status: 404 });
  const memory = getMemory(agentId as AgentId);
  const career = getCareer(agentId as AgentId);
  return NextResponse.json({ ok: true, profile, memory, career });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};

    const allowedFields = [
      "systemPrompt", "creativityLevel", "tone", "visualStyle",
      "personality", "preferredWorkflows", "communicationStyle",
      "currentlyWorkingOn", "online", "status",
      "name", "firstName", "lastName", "displayName", "role", "title",
      "department", "bio", "avatarColor", "avatarEmoji", "avatarUrl",
      "profilePhotoStyle", "strengths", "weaknesses",
      "expertise", "specialization", "expertiseBadges",
    ];
    for (const field of allowedFields) {
      if (body[field] !== undefined) updates[field] = body[field];
    }

    const profile = updateProfile(agentId as AgentId, updates);
    if (!profile) return NextResponse.json({ ok: false, message: "Agent not found" }, { status: 404 });

    if (body.learnPreference) {
      learnPreference(agentId as AgentId, body.learnPreference.key, body.learnPreference.value);
    }
    if (body.learnStyle) {
      learnStylePreference(agentId as AgentId, body.learnStyle);
    }
    if (body.addXp) {
      addXp(agentId as AgentId, body.addXp);
    }
    if (body.addSpecialty) {
      addSpecialty(agentId as AgentId, body.addSpecialty.name, body.addSpecialty.level);
    }

    const memory = getMemory(agentId as AgentId);
    const career = getCareer(agentId as AgentId);
    return NextResponse.json({ ok: true, profile, memory, career });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const profile = resetProfile(agentId as AgentId);
  if (!profile) return NextResponse.json({ ok: false, message: "Agent not found" }, { status: 404 });
  const memory = getMemory(agentId as AgentId);
  const career = getCareer(agentId as AgentId);
  return NextResponse.json({ ok: true, profile, memory, career, reset: true });
}
