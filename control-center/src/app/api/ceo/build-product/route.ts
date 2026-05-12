import { NextResponse } from "next/server";
import { analyzeCeoIntent } from "@/lib/ai/ceoIntent";
import { buildProductArtifacts } from "@/lib/product-builder/artifactWriter";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) {
      return NextResponse.json({ ok: false, error: "Missing prompt" }, { status: 400 });
    }

    const intent = await analyzeCeoIntent(prompt);
    if (intent.requestType !== "saas" && intent.requestType !== "website" && intent.requestType !== "app") {
      return NextResponse.json({ ok: false, error: "Prompt must describe a SaaS, website, or app product." }, { status: 400 });
    }

    const result = buildProductArtifacts({
      requestText: prompt,
      requestType: intent.requestType,
      projectName: intent.projectName,
      brandName: intent.brandName,
      industry: intent.industry,
      targetUser: intent.targetUser,
      goal: intent.goal,
      constraints: intent.constraints,
      coreFeatures: intent.coreFeatures,
      language: intent.language,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown build error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
