import { generateWithLlm, type LlmRequest } from "./llmClient";

function extractJson(text: string): unknown | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const direct = tryParse(trimmed);
  if (direct !== null) return direct;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  if (fenced) {
    const parsed = tryParse(fenced.trim());
    if (parsed !== null) return parsed;
  }

  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last > first) return tryParse(trimmed.slice(first, last + 1));
  return null;
}

function tryParse(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function generateStructuredObject<T>(
  request: LlmRequest,
  fallback: T,
  validate: (value: unknown, fallback: T) => T,
): Promise<{ value: T; mode: "nvidia" | "prototype"; warnings: string[] }> {
  const response = await generateWithLlm(request);
  if (!response.ok) return { value: fallback, mode: response.mode, warnings: response.warnings };

  const parsed = extractJson(response.text);
  if (!parsed) {
    return {
      value: fallback,
      mode: "prototype",
      warnings: ["mode prototype — réponse NVIDIA non-JSON, fallback local activé"],
    };
  }

  return {
    value: validate(parsed, fallback),
    mode: response.mode,
    warnings: response.warnings,
  };
}
