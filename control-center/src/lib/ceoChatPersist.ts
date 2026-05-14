/**
 * Persistance légère des échanges CEO depuis le route /api/ceo/command.
 * Stocke les tours de conversation dans ceo-chat.json sans dupliquer
 * la logique complète de ceoCommand.ts.
 */

import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const CEO_CHAT_PATH = path.join(DATA_DIR, "ceo-chat.json");

interface LightMessage {
  id: string;
  role: "user" | "ceo";
  text: string;
  intent?: string;
  timestamp: string;
  source?: "command" | "chat";
  directorApproved?: boolean;
  qualityScore?: number;
  requestType?: string;
}

interface CeoChatData {
  messages: LightMessage[];
}

let idBase = Date.now();
function nextId(): string {
  return `cmd-${(idBase++).toString(36)}`;
}

function readChat(): CeoChatData {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(CEO_CHAT_PATH)) return { messages: [] };
  try {
    return JSON.parse(fs.readFileSync(CEO_CHAT_PATH, "utf-8")) as CeoChatData;
  } catch {
    return { messages: [] };
  }
}

function writeChat(data: CeoChatData): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(CEO_CHAT_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

export function persistCommandConversation(
  userPrompt: string,
  ceoResponseText: string,
  metadata?: {
    requestType?: string;
    directorApproved?: boolean;
    qualityScore?: number;
    intent?: string;
  },
): void {
  try {
    const data = readChat();
    const now = new Date().toISOString();

    data.messages.push({
      id: nextId(),
      role: "user",
      text: userPrompt,
      timestamp: now,
      source: "command",
    });

    data.messages.push({
      id: nextId(),
      role: "ceo",
      text: ceoResponseText,
      timestamp: now,
      source: "command",
      intent: metadata?.intent,
      directorApproved: metadata?.directorApproved,
      qualityScore: metadata?.qualityScore,
      requestType: metadata?.requestType,
    });

    // Keep last 200 messages to avoid unbounded growth
    if (data.messages.length > 200) {
      data.messages = data.messages.slice(-200);
    }

    writeChat(data);
  } catch {
    // Non-critical — don't break the response if persistence fails
  }
}
