#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const RESET_CONFIRMATION = "AI_COMPANY_OS_RESET";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const controlDataDir = path.join(rootDir, "data");
const parentDataDir = path.resolve(rootDir, "..", "data");
const parentLogsDir = path.resolve(rootDir, "..", "logs");

const emptyRuntimeState = {
  agents: [],
  queue: [],
  pausedAgents: [],
  stats: { totalEventsEmitted: 0 },
  savedAt: "",
};

const controlDataFiles = {
  "approvals.json": { approvals: [] },
  "ceo-chat.json": { messages: [] },
  "ceo-files.json": { files: [] },
  "ceo-memory.json": { entries: [], recentIntents: [], messageCount: 0, lastSeen: "" },
  "ceo-projects.json": { projects: [] },
  "client-crm.json": { leads: [], clients: [], opportunities: [], interactions: [] },
  "company-workspaces.json": { workspaces: [] },
  "conversations.json": { folders: [], threads: [] },
  "distribution-engine.json": { jobs: [], assets: [], campaigns: [] },
  "executive-discussions.json": { discussions: [] },
  "loop-state.json": [],
  "project-archive.json": { entities: [] },
  "revenue-system.json": { proposals: [], invoices: [], records: [] },
  "revisions.json": { revisions: [] },
  "visible-outputs.json": { outputs: [] },
};

const parentDataFiles = {
  "autopilot-sessions.json": [],
  "runtime-state.json": emptyRuntimeState,
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

if (process.env.CONFIRM_RESET !== RESET_CONFIRMATION) {
  fail(`Reset annule. Relance avec CONFIRM_RESET=${RESET_CONFIRMATION} npm run reset:company-os.`);
  process.exit();
}

if (process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_RESET !== "true") {
  fail("Reset refuse en production. Ajoute ALLOW_PRODUCTION_RESET=true seulement si tu sais exactement ce que tu fais.");
  process.exit();
}

function readCount(filePath) {
  if (!fs.existsSync(filePath)) return 0;
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    if (Array.isArray(parsed)) return parsed.length;
    if (parsed && typeof parsed === "object") {
      return Object.values(parsed).reduce((sum, value) => sum + (Array.isArray(value) ? value.length : 0), 0);
    }
  } catch {
    return 1;
  }
  return 0;
}

function writeJson(filePath, value) {
  const count = readCount(filePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf-8");
  return count;
}

function removePath(targetPath) {
  if (!fs.existsSync(targetPath)) return 0;
  const stat = fs.statSync(targetPath);
  const count = stat.isDirectory() ? fs.readdirSync(targetPath).length : 1;
  fs.rmSync(targetPath, { recursive: true, force: true });
  return count;
}

function writeText(filePath, value) {
  const count = fs.existsSync(filePath) ? 1 : 0;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, "utf-8");
  return count;
}

console.log("Reset AI Company OS");
console.log("Donnees supprimees: entreprises, projets, missions, conversations, resultats, approvals, CRM/revenue/distribution lies aux anciennes missions, logs runtime.");
console.log("Donnees conservees: code, routes, agents, configs, adapters, NVIDIA adapter, .env.local et secrets.");

const emptied = {};
const deleted = {};

for (const [file, emptyValue] of Object.entries(controlDataFiles)) {
  emptied[`data/${file}`] = writeJson(path.join(controlDataDir, file), emptyValue);
}
for (const [file, emptyValue] of Object.entries(parentDataFiles)) {
  emptied[`../data/${file}`] = writeJson(path.join(parentDataDir, file), emptyValue);
}

deleted["data/uploads"] = removePath(path.join(controlDataDir, "uploads"));
deleted["data/workspaces"] = removePath(path.join(controlDataDir, "workspaces"));
deleted["data/invoices"] = removePath(path.join(controlDataDir, "invoices"));
deleted["data/backups"] = removePath(path.join(controlDataDir, "backups"));
emptied["../logs/agent_activity.jsonl"] = writeText(path.join(parentLogsDir, "agent_activity.jsonl"), "");
deleted["../logs/autopilot_session.json"] = removePath(path.join(parentLogsDir, "autopilot_session.json"));

console.log("Elements vides:");
for (const [label, count] of Object.entries(emptied)) console.log(`- ${label}: ${count}`);
console.log("Elements supprimes:");
for (const [label, count] of Object.entries(deleted)) console.log(`- ${label}: ${count}`);
console.log("Reset termine. AI Company OS est pret pour un nouveau depart.");
