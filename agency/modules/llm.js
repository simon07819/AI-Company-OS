import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-6";

function extractJson(text) {
  const trimmed = text.trim();
  // Direct JSON
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try { return JSON.parse(trimmed); } catch {}
  }
  // Fenced code block
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]+?)\s*```/i);
  if (fenced) {
    try { return JSON.parse(fenced[1]); } catch {}
  }
  // Last-resort: find first { ... }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try { return JSON.parse(trimmed.slice(start, end + 1)); } catch {}
  }
  throw new Error(`No valid JSON found in LLM response:\n${text.slice(0, 400)}`);
}

export async function callAgent(agentName, systemPrompt, userContent, maxTokens = 1800) {
  const start = Date.now();
  process.stdout.write(`  [${agentName}] calling Claude... `);

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }],
  });

  const ms = Date.now() - start;
  const text = message.content[0].text;
  process.stdout.write(`done (${ms}ms, ${message.usage.output_tokens} tokens)\n`);

  return extractJson(text);
}
