import fs from "fs";
import path from "path";
import { assertNoCompletedStepWithoutArtifacts, readExecutionLedger } from "@/lib/product-builder/executionLedger";
import type { ProductSpec } from "@/lib/product-builder/types";
import { buildQualityReport, containsPlaceholder, normalizeQualityText, type OutputQualityReport, type QualityCheck } from "./outputQuality";

export interface ProductQualityInput {
  projectDir: string;
  spec: ProductSpec;
  expectedDomain?: string;
  expectedName?: string;
}

function exists(projectDir: string, relativePath: string) {
  return fs.existsSync(path.join(projectDir, relativePath));
}

function read(projectDir: string, relativePath: string) {
  const filePath = path.join(projectDir, relativePath);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : "";
}

function check(id: string, label: string, passed: boolean, details: string): QualityCheck {
  return { id, label, passed, details };
}

function domainKeywords(domain: string): string[] {
  if (domain === "clinic") return ["patients", "appointments", "practitioners", "billing", "rendez-vous", "facturation"];
  if (domain === "fitness") return ["members", "classes", "coaches", "payments", "membres", "cours"];
  if (domain === "real-estate") return ["properties", "clients", "showings", "contracts", "propriétés", "visites"];
  if (domain === "ecommerce") return ["products", "orders", "customers", "revenue", "produits", "commandes"];
  return [];
}

export function evaluateProductQuality(input: ProductQualityInput): OutputQualityReport {
  const domain = input.expectedDomain ?? input.spec.domain;
  const allText = [
    read(input.projectDir, "README.md"),
    read(input.projectDir, "product-spec.json"),
    read(input.projectDir, "app-routes.md"),
    read(input.projectDir, "feature-map.md"),
    read(input.projectDir, "next-app/lib/mockData.ts"),
  ].join("\n");
  const normalizedText = normalizeQualityText(allText);
  const keywords = domainKeywords(domain);
  const reflectedKeywords = keywords.filter((keyword) => normalizedText.includes(normalizeQualityText(keyword)));
  const ledger = readExecutionLedger(input.projectDir);

  let ledgerOk = false;
  if (ledger) {
    try {
      assertNoCompletedStepWithoutArtifacts(ledger);
      ledgerOk = true;
    } catch {
      ledgerOk = false;
    }
  }

  const checks = [
    check("artifact-readme", "README présent", exists(input.projectDir, "README.md"), "README.md doit exister."),
    check("artifact-spec", "Spec produit présente", exists(input.projectDir, "product-spec.json"), "product-spec.json doit exister."),
    check("artifact-next-app", "Starter Next présent", exists(input.projectDir, "next-app/package.json"), "next-app/package.json doit exister."),
    check("artifact-manifest", "Manifest présent", exists(input.projectDir, "artifact-manifest.json"), "artifact-manifest.json doit lister les fichiers."),
    check("completed-step-artifacts", "Étapes complétées avec artifacts", ledgerOk, "Aucune étape completed ne doit être sans artifactPaths."),
    check("domain-reflected", "Domaine reflété", reflectedKeywords.length >= Math.min(3, keywords.length), `Mots domaine détectés: ${reflectedKeywords.join(", ") || "aucun"}.`),
    check("features-relevant", "Features pertinentes", input.spec.coreFeatures.length >= 4, "Le produit doit contenir plusieurs features propres au domaine."),
    check("mock-data-relevant", "Mock data pertinent", reflectedKeywords.some((keyword) => normalizeQualityText(read(input.projectDir, "next-app/lib/mockData.ts")).includes(normalizeQualityText(keyword))), "mockData doit refléter le domaine demandé."),
    check("name-respected", "Nom demandé respecté", input.expectedName ? normalizeQualityText(input.spec.name).includes(normalizeQualityText(input.expectedName)) : true, "Le nom demandé doit être conservé."),
    check("placeholder-free", "Pas de template générique", !containsPlaceholder(allText), "Le résultat ne doit pas contenir de placeholder ou template générique."),
  ];

  return buildQualityReport("saas", checks, [
    "Créer les fichiers manquants avant de présenter le résultat.",
    "Ajouter les routes, features et mock data propres au domaine demandé.",
    "Corriger le nom du produit si le prompt contenait un nom explicite.",
    "Relancer le quality gate avant de marquer le projet prêt.",
  ]);
}
