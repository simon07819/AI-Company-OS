import fs from "fs";
import path from "path";

// ─── Paths ──────────────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(process.cwd(), "..");
const WORKSPACES_ROOT = path.join(REPO_ROOT, "generated", "autopilot-workspaces");

function projectDir(sessionId: string): string {
  return path.join(WORKSPACES_ROOT, sessionId, "project");
}

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface ValidationCheck {
  name: string;
  path: string;
  passed: boolean;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  score: number;
  checks: ValidationCheck[];
  warnings: string[];
  generatedAt: string;
}

// ─── Checks ────────────────────────────────────────────────────────────────

const REQUIRED_FILES = [
  { path: "package.json", label: "package.json exists and is parseable" },
  { path: "app/page.tsx", label: "app/page.tsx exists" },
  { path: "app/layout.tsx", label: "app/layout.tsx exists" },
  { path: "components/Hero.tsx", label: "components/Hero.tsx exists" },
  { path: "lib/config.ts", label: "lib/config.ts exists" },
];

const NON_EMPTY_FILES = [
  { path: "package.json", label: "package.json is not empty" },
  { path: "app/page.tsx", label: "app/page.tsx is not empty" },
  { path: "app/layout.tsx", label: "app/layout.tsx is not empty" },
  { path: "components/Hero.tsx", label: "components/Hero.tsx is not empty" },
  { path: "lib/config.ts", label: "lib/config.ts is not empty" },
];

const OPTIONAL_FILES = [
  "app/globals.css",
  "components/Pricing.tsx",
  "components/DashboardPreview.tsx",
  "README.md",
];

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Validate the generated project scaffold for a session.
 * Returns a ValidationResult with score, checks, and warnings.
 */
export function validateGeneratedProject(sessionId: string): ValidationResult {
  const dir = projectDir(sessionId);
  const checks: ValidationCheck[] = [];
  const warnings: string[] = [];
  const generatedAt = new Date().toISOString();

  // Check 1: Project directory exists
  const dirExists = fs.existsSync(dir);
  checks.push({
    name: "project-directory",
    path: "project/",
    passed: dirExists,
    message: dirExists ? "Project directory exists" : "Project directory not found",
  });

  if (!dirExists) {
    warnings.push("No project directory found. Generate a scaffold first.");
    return { ok: false, score: 0, checks, warnings, generatedAt };
  }

  // Check 2: Required files exist
  for (const file of REQUIRED_FILES) {
    const fullPath = path.join(dir, file.path);
    const exists = fs.existsSync(fullPath);
    checks.push({
      name: `exists:${file.path}`,
      path: file.path,
      passed: exists,
      message: exists ? file.label : `${file.path} missing`,
    });
    if (!exists) {
      warnings.push(`Required file missing: ${file.path}`);
    }
  }

  // Check 3: Critical files are not empty
  for (const file of NON_EMPTY_FILES) {
    const fullPath = path.join(dir, file.path);
    if (!fs.existsSync(fullPath)) {
      // Already flagged as missing above
      checks.push({
        name: `non-empty:${file.path}`,
        path: file.path,
        passed: false,
        message: `Cannot check emptiness: ${file.path} missing`,
      });
      continue;
    }
    try {
      const content = fs.readFileSync(fullPath, "utf-8").trim();
      const nonEmpty = content.length > 0;
      checks.push({
        name: `non-empty:${file.path}`,
        path: file.path,
        passed: nonEmpty,
        message: nonEmpty ? file.label : `${file.path} is empty`,
      });
      if (!nonEmpty) {
        warnings.push(`Critical file is empty: ${file.path}`);
      }
    } catch {
      checks.push({
        name: `non-empty:${file.path}`,
        path: file.path,
        passed: false,
        message: `Cannot read ${file.path}`,
      });
      warnings.push(`Cannot read file: ${file.path}`);
    }
  }

  // Check 4: package.json is valid JSON
  const pkgPath = path.join(dir, "package.json");
  let pkgParsed = false;
  if (fs.existsSync(pkgPath)) {
    try {
      const raw = fs.readFileSync(pkgPath, "utf-8");
      const parsed = JSON.parse(raw);
      pkgParsed = true;
      // Check for essential fields
      if (!parsed.name) {
        warnings.push("package.json missing 'name' field");
      }
      if (!parsed.dependencies || Object.keys(parsed.dependencies).length === 0) {
        warnings.push("package.json has no dependencies listed");
      }
    } catch {
      warnings.push("package.json is not valid JSON");
    }
  }
  checks.push({
    name: "package-json-parseable",
    path: "package.json",
    passed: pkgParsed,
    message: pkgParsed ? "package.json is valid JSON" : "package.json is not parseable",
  });

  // Check 5: Optional files (informational, not failing)
  const optionalFound: string[] = [];
  for (const filePath of OPTIONAL_FILES) {
    if (fs.existsSync(path.join(dir, filePath))) {
      optionalFound.push(filePath);
    }
  }
  if (optionalFound.length < OPTIONAL_FILES.length) {
    const missing = OPTIONAL_FILES.filter((f) => !optionalFound.includes(f));
    warnings.push(`Optional files not present: ${missing.join(", ")}`);
  }

  // Calculate score
  const totalChecks = checks.length;
  const passedChecks = checks.filter((c) => c.passed).length;
  const score = Math.round((passedChecks / Math.max(totalChecks, 1)) * 100);
  const ok = score >= 80;

  const result: ValidationResult = { ok, score, checks, warnings, generatedAt };

  // Write validation reports to project dir
  writeValidationReports(sessionId, result);

  return result;
}

/**
 * Get the last validation result from the saved report.
 */
export function getValidationResult(sessionId: string): ValidationResult | null {
  const dir = projectDir(sessionId);
  const reportPath = path.join(dir, "validation-report.json");
  if (!fs.existsSync(reportPath)) return null;
  try {
    const raw = fs.readFileSync(reportPath, "utf-8");
    return JSON.parse(raw) as ValidationResult;
  } catch {
    return null;
  }
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function writeValidationReports(sessionId: string, result: ValidationResult) {
  const dir = projectDir(sessionId);
  if (!fs.existsSync(dir)) return;

  // JSON report
  fs.writeFileSync(
    path.join(dir, "validation-report.json"),
    JSON.stringify(result, null, 2) + "\n",
    "utf-8"
  );

  // Markdown report
  const md = [
    `# Project Validation Report`,
    "",
    `**Session:** ${sessionId}`,
    `**Date:** ${result.generatedAt}`,
    `**Score:** ${result.score}%`,
    `**Status:** ${result.ok ? "BUILD-READY" : "NEEDS ATTENTION"}`,
    "",
    "## Checks",
    "",
    "| Check | File | Status | Message |",
    "|-------|------|--------|---------|",
    ...result.checks.map((c) =>
      `| ${c.name} | ${c.path} | ${c.passed ? "PASS" : "FAIL"} | ${c.message} |`
    ),
    "",
    ...(result.warnings.length > 0
      ? [
          "## Warnings",
          "",
          ...result.warnings.map((w) => `- ${w}`),
          "",
        ]
      : []),
    `_Generated by AI Company OS Autopilot_`,
    "",
  ].join("\n");

  fs.writeFileSync(
    path.join(dir, "validation-report.md"),
    md,
    "utf-8"
  );
}
