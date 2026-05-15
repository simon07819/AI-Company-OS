import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProviderName = "anthropic" | "replicate" | "vercel";

interface TestResult {
  provider: ProviderName;
  connected: boolean;
  message: string;
}

function checkEnvKey(envKey: string, label: string): TestResult & { provider: ProviderName } {
  const val = process.env[envKey];
  const provider = label.toLowerCase() as ProviderName;
  if (!val || val.length < 8) {
    return { provider, connected: false, message: `${envKey} manquante ou trop courte dans l'environnement.` };
  }
  return { provider, connected: true, message: `${label} clé détectée (${val.length} chars, commence par ${val.slice(0, 6)}…).` };
}

async function testAnthropic(): Promise<TestResult> {
  const env = checkEnvKey("ANTHROPIC_API_KEY", "anthropic");
  if (!env.connected) return env;
  try {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
    });
    if (res.ok) return { provider: "anthropic", connected: true, message: `Anthropic API accessible (HTTP ${res.status}).` };
    return { provider: "anthropic", connected: false, message: `Anthropic API error: HTTP ${res.status}.` };
  } catch (e) {
    return { provider: "anthropic", connected: false, message: `Anthropic unreachable: ${e instanceof Error ? e.message : String(e)}` };
  }
}

async function testReplicate(): Promise<TestResult> {
  const env = checkEnvKey("REPLICATE_API_TOKEN", "replicate");
  if (!env.connected) return env;
  try {
    const res = await fetch("https://api.replicate.com/v1/account", {
      headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` },
    });
    if (res.ok) return { provider: "replicate", connected: true, message: `Replicate API accessible (HTTP ${res.status}).` };
    return { provider: "replicate", connected: false, message: `Replicate API error: HTTP ${res.status}.` };
  } catch (e) {
    return { provider: "replicate", connected: false, message: `Replicate unreachable: ${e instanceof Error ? e.message : String(e)}` };
  }
}

function testVercel(): TestResult {
  // Vercel provides VERCEL_TOKEN or VERCEL_API_TOKEN in env
  const tokenKey = process.env.VERCEL_TOKEN ? "VERCEL_TOKEN" : "VERCEL_API_TOKEN";
  return checkEnvKey(tokenKey, "vercel");
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const provider = body.provider as ProviderName | undefined;

  let result: TestResult;
  if (provider === "anthropic") {
    result = await testAnthropic();
  } else if (provider === "replicate") {
    result = await testReplicate();
  } else if (provider === "vercel") {
    result = testVercel();
  } else {
    return NextResponse.json({ ok: false, error: "Provider inconnu. Options: anthropic, replicate, vercel." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, result });
}
