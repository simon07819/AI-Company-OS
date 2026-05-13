import fs from "fs";
import path from "path";

// ─── Types ────────────────────────────────────────────────────────────────

export type FileCategory = "image" | "pdf" | "text" | "data" | "unknown";

export interface FileAnalysis {
  summary: string;
  delegateTo: string;
  delegationMessage: string;
  taskType: string;
  analyzedAt: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  category: FileCategory;
  storagePath: string;
  uploadedAt: string;
  analysis?: FileAnalysis;
}

interface CeoFilesData {
  files: UploadedFile[];
}

// ─── Paths ────────────────────────────────────────────────────────────────

const REPO_ROOT = process.cwd();
const DATA_DIR = path.join(REPO_ROOT, "data");
const FILES_PATH = path.join(DATA_DIR, "ceo-files.json");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

let _idBase = Date.now();
function nextId(): string {
  return `file-${(_idBase++).toString(36)}`;
}

function sanitizeFileName(name: string): string {
  const baseName = path.basename(name).replace(/[^\w.\- ]+/g, "_").trim();
  return baseName && baseName !== "." && baseName !== ".." ? baseName : "upload.bin";
}

// ─── File Type Detection ──────────────────────────────────────────────────

export function detectFileCategory(mimeType: string, fileName: string): FileCategory {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "application/json") return "data";
  if (mimeType.startsWith("text/")) return "text";

  const ext = path.extname(fileName).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"].includes(ext)) return "image";
  if (ext === ".pdf") return "pdf";
  if ([".txt", ".md", ".markdown"].includes(ext)) return "text";
  if ([".json", ".yaml", ".yml", ".csv"].includes(ext)) return "data";
  return "unknown";
}

// ─── CEO Analysis Generator ────────────────────────────────────────────────

export function generateFileAnalysis(name: string, category: FileCategory): FileAnalysis {
  const lower = name.toLowerCase();
  const now = new Date().toISOString();

  if (category === "image") {
    if (lower.includes("logo")) {
      return {
        summary: "Logo reçu — analyse branding, cohérence visuelle et recommandations.",
        delegateTo: "cmo",
        delegationMessage: `Sophie — logo reçu (${name}). Analyse: cohérence branding, usages possibles, déclinaisons recommandées.`,
        taskType: "design_review",
        analyzedAt: now,
      };
    }
    if (lower.includes("screenshot") || lower.includes("screen") || lower.includes("concurrent") || lower.includes("competitor")) {
      return {
        summary: "Screenshot concurrent détecté — analyse positionnement, UX et différenciation.",
        delegateTo: "cmo",
        delegationMessage: `Sophie — screenshot concurrent reçu (${name}). Analyse: positionnement, CTA, branding, différenciation vs nous.`,
        taskType: "competitive_analysis",
        analyzedAt: now,
      };
    }
    if (lower.includes("product") || lower.includes("produit")) {
      return {
        summary: "Photo produit reçue — évaluation qualité, angle et potentiel e-commerce.",
        delegateTo: "cmo",
        delegationMessage: `Sophie, Emma — photo produit reçue (${name}). Évalue: qualité visuelle, potentiel marketing, recommandations e-commerce.`,
        taskType: "product_review",
        analyzedAt: now,
      };
    }
    return {
      summary: "Image reçue — analyse contenu visuel et recommandations usage.",
      delegateTo: "cmo",
      delegationMessage: `Sophie — image reçue (${name}). Recommandation d'usage dans nos assets marketing.`,
      taskType: "visual_review",
      analyzedAt: now,
    };
  }

  if (category === "pdf") {
    if (lower.includes("facture") || lower.includes("invoice") || lower.includes("devis") || lower.includes("quote")) {
      return {
        summary: "Document financier détecté — analyse montants, termes et suivi paiement.",
        delegateTo: "cfo",
        delegationMessage: `Diana — document financier reçu (${name}). Vérifie montants, termes de paiement, intègre au suivi financier.`,
        taskType: "finance_review",
        analyzedAt: now,
      };
    }
    if (lower.includes("brief") || lower.includes("strategy") || lower.includes("strateg") || lower.includes("plan")) {
      return {
        summary: "Brief stratégique reçu — analyse objectifs, ressources et plan d'exécution.",
        delegateTo: "coo",
        delegationMessage: `Marcus — brief stratégique reçu (${name}). Évalue faisabilité opérationnelle et propose plan d'exécution.`,
        taskType: "strategy_review",
        analyzedAt: now,
      };
    }
    if (lower.includes("contrat") || lower.includes("contract") || lower.includes("legal") || lower.includes("juridique")) {
      return {
        summary: "Document juridique détecté — révision termes et conditions contractuelles.",
        delegateTo: "cfo",
        delegationMessage: `Diana — document juridique reçu (${name}). Révise termes, identifie risques, recommande une action.`,
        taskType: "legal_review",
        analyzedAt: now,
      };
    }
    return {
      summary: "Document PDF reçu — analyse contenu et extraction des points clés.",
      delegateTo: "coo",
      delegationMessage: `Marcus — PDF reçu (${name}). Analyse contenu, extrais points d'action et donne recommandation.`,
      taskType: "document_review",
      analyzedAt: now,
    };
  }

  if (category === "data") {
    return {
      summary: "Fichier de données reçu — analyse structure, qualité et insights.",
      delegateTo: "cto",
      delegationMessage: `Raj — fichier de données reçu (${name}). Analyse structure, identifie insights clés, recommande comment l'exploiter.`,
      taskType: "data_analysis",
      analyzedAt: now,
    };
  }

  if (category === "text") {
    return {
      summary: "Document texte reçu — synthèse contenu et plan d'action.",
      delegateTo: "coo",
      delegationMessage: `Marcus — document texte reçu (${name}). Synthétise contenu et propose plan d'action.`,
      taskType: "content_review",
      analyzedAt: now,
    };
  }

  return {
    summary: "Fichier reçu — analyse en cours pour déterminer la meilleure action.",
    delegateTo: "coo",
    delegationMessage: `Marcus — fichier reçu (${name}). Analyse et détermine comment procéder.`,
    taskType: "general_review",
    analyzedAt: now,
  };
}

// ─── Persistence ──────────────────────────────────────────────────────────

function readData(): CeoFilesData {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILES_PATH)) return { files: [] };
  try {
    return JSON.parse(fs.readFileSync(FILES_PATH, "utf-8")) as CeoFilesData;
  } catch {
    return { files: [] };
  }
}

function writeData(data: CeoFilesData): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILES_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

// ─── Public API ───────────────────────────────────────────────────────────

export function saveUpload(
  name: string,
  size: number,
  mimeType: string,
  buffer: Buffer,
): UploadedFile {
  const id = nextId();
  const safeName = sanitizeFileName(name);
  const category = detectFileCategory(mimeType, safeName);
  const fileDir = path.join(UPLOADS_DIR, id);
  fs.mkdirSync(fileDir, { recursive: true });
  const storagePath = path.join(fileDir, safeName);
  if (!storagePath.startsWith(fileDir + path.sep)) {
    throw new Error("Invalid upload path");
  }
  fs.writeFileSync(storagePath, buffer);

  const analysis = generateFileAnalysis(safeName, category);
  const record: UploadedFile = {
    id,
    name: safeName,
    size,
    mimeType,
    category,
    storagePath,
    uploadedAt: new Date().toISOString(),
    analysis,
  };

  const data = readData();
  data.files.push(record);
  if (data.files.length > 100) data.files = data.files.slice(-100);
  writeData(data);

  return record;
}

export function getFileById(id: string): UploadedFile | null {
  return readData().files.find((f) => f.id === id) ?? null;
}

export function getFileMemory(): CeoFilesData {
  return readData();
}
