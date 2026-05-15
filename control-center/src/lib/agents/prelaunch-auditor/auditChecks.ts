export type AuditCategory = "legal" | "secrets" | "owasp" | "headers" | "ratelimit" | "deps" | "storage";

export interface AuditItem {
  id: string;
  category: AuditCategory;
  title: string;
  detail: string;
  severity: "blocker" | "warning" | "pass";
  autoFixable?: boolean;
}

// ─── Legal & Privacy ─────────────────────────────────────────────────────

export function checkLegal(content: string): AuditItem[] {
  const items: AuditItem[] = [];
  const hasPrivacyPolicy = /privacy[- _]?policy|politique\s+de\s+confidentialit[ée]/i.test(content);
  const hasDataCollection = /fetch\s*\(|localStorage|sessionStorage|document\.cookie|navigator\.geolocation|getUserMedia/i.test(content);
  const hasCookies = /document\.cookie|set-cookie|setCookie|useCookies/i.test(content);
  const hasAnalytics = /google.*analytics|gtag|_gaq|mixpanel|amplitude|segment\.identify/i.test(content);
  const hasPayment = /stripe|paypal|braintree|square\.com|card\.number|cvv|credit[- ]?card/i.test(content);
  const hasTerms = /terms[- _]?(of[- _]?)?service|conditions\s+(d[' ]utilisation|g[eé]n[eé]rales)/i.test(content);
  const hasGDPR = /gdpr|rgpd|consent|consentement|cookie.*banner|opt[- _]?in/i.test(content);

  if (hasDataCollection && !hasPrivacyPolicy) {
    items.push({
      id: "legal_no_privacy_policy",
      category: "legal",
      title: "Politique de confidentialité manquante",
      detail: "Le projet collecte des données sans politique de confidentialité visible.",
      severity: "blocker",
      autoFixable: true,
    });
  } else if (hasPrivacyPolicy) {
    items.push({
      id: "legal_privacy_policy_ok",
      category: "legal",
      title: "Politique de confidentialité présente",
      detail: "Une référence à une politique de confidentialité a été détectée.",
      severity: "pass",
    });
  }

  if (hasCookies && !hasGDPR) {
    items.push({
      id: "legal_no_cookie_consent",
      category: "legal",
      title: "Bandeau cookie manquant",
      detail: "Utilisation de cookies sans mécanisme de consentement RGPD détecté.",
      severity: "warning",
    });
  }

  if (hasAnalytics) {
    items.push({
      id: "legal_analytics",
      category: "legal",
      title: "Analytics tiers détecté",
      detail: "Google Analytics ou équivalent détecté — vérifier la conformité RGPD et le consentement.",
      severity: "warning",
    });
  }

  if (hasPayment && !hasTerms) {
    items.push({
      id: "legal_payment_no_terms",
      category: "legal",
      title: "Paiement sans conditions générales",
      detail: "Intégration de paiement détectée sans conditions générales de vente.",
      severity: "blocker",
    });
  }

  if (!hasDataCollection && !hasCookies) {
    items.push({
      id: "legal_no_data_collection",
      category: "legal",
      title: "Pas de collecte de données détectée",
      detail: "Aucune collecte de données sensibles détectée dans le code produit.",
      severity: "pass",
    });
  }

  return items;
}

// ─── Secret / Credentials Detection ─────────────────────────────────────

const SECRET_PATTERNS: Array<{ id: string; label: string; pattern: RegExp }> = [
  { id: "secret_nvidia_key", label: "Clé API NVIDIA exposée", pattern: /nvapi-[A-Za-z0-9._-]{20,}/g },
  { id: "secret_openai_key", label: "Clé API OpenAI exposée", pattern: /sk-[A-Za-z0-9]{32,}/g },
  { id: "secret_anthropic_key", label: "Clé API Anthropic exposée", pattern: /sk-ant-[A-Za-z0-9-]{20,}/g },
  { id: "secret_aws_access", label: "AWS Access Key exposée", pattern: /AKIA[0-9A-Z]{16}/g },
  { id: "secret_aws_secret", label: "AWS Secret Key exposée", pattern: /aws[_-]?secret[_-]?access[_-]?key\s*[=:]\s*["']?[A-Za-z0-9+/]{40}/gi },
  { id: "secret_stripe_key", label: "Clé Stripe exposée", pattern: /(?:sk|pk)_live_[A-Za-z0-9]{24,}/g },
  { id: "secret_github_token", label: "Token GitHub exposé", pattern: /ghp_[A-Za-z0-9]{36}/g },
  { id: "secret_generic_apikey", label: "Clé API générique exposée", pattern: /api[_-]?key\s*[=:]\s*["'][A-Za-z0-9_\-]{16,}["']/gi },
  { id: "secret_db_password", label: "Mot de passe DB exposé", pattern: /(?:password|passwd|pwd)\s*[=:]\s*["'][^"']{8,}["']/gi },
  { id: "secret_jwt_secret", label: "Secret JWT exposé", pattern: /jwt[_-]?secret\s*[=:]\s*["'][^"']{8,}["']/gi },
];

export function checkSecrets(content: string): AuditItem[] {
  const items: AuditItem[] = [];
  let anySecret = false;

  for (const { id, label, pattern } of SECRET_PATTERNS) {
    if (pattern.test(content)) {
      anySecret = true;
      items.push({
        id,
        category: "secrets",
        title: label,
        detail: `Pattern de credentials détecté dans le code — ne jamais exposer de clés dans le code client.`,
        severity: "blocker",
        autoFixable: true,
      });
    }
    pattern.lastIndex = 0;
  }

  const hasConsoleSecret = /console\.(log|warn|error|info)\s*\([^)]*(?:key|token|password|secret|api[_-]?key)[^)]*\)/gi.test(content);
  if (hasConsoleSecret) {
    anySecret = true;
    items.push({
      id: "secret_console_log",
      category: "secrets",
      title: "console.log avec données sensibles",
      detail: "console.log() contenant potentiellement des credentials ou tokens.",
      severity: "blocker",
      autoFixable: true,
    });
  }

  if (!anySecret) {
    items.push({
      id: "secrets_clean",
      category: "secrets",
      title: "Aucun credential exposé",
      detail: "Aucun pattern de clé API, token ou mot de passe détecté dans le code.",
      severity: "pass",
    });
  }

  return items;
}

// ─── OWASP Top 10 Static Analysis ────────────────────────────────────────

export function checkOwasp(content: string): AuditItem[] {
  const items: AuditItem[] = [];

  // A1 - XSS: dangerous innerHTML / dangerouslySetInnerHTML with raw user input
  const xssPattern = /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:\s*(?!`|"[^"]*"|'[^']*')/;
  const innerHtml = /\.innerHTML\s*=\s*(?!['"`])/;
  if (xssPattern.test(content) || innerHtml.test(content)) {
    items.push({
      id: "owasp_xss",
      category: "owasp",
      title: "XSS potentiel (A03:2021)",
      detail: "dangerouslySetInnerHTML ou innerHTML avec une variable non sanitisée détecté.",
      severity: "blocker",
    });
  }

  // A2 - SQL Injection patterns
  const sqlInjection = /['"`]\s*\+\s*(?:req\.|params\.|query\.|body\.|input|user)/i;
  const rawSql = /(?:SELECT|INSERT|UPDATE|DELETE|DROP|UNION)[\s\S]+?\$\{/i;
  if (sqlInjection.test(content) || rawSql.test(content)) {
    items.push({
      id: "owasp_sqli",
      category: "owasp",
      title: "Injection SQL potentielle (A03:2021)",
      detail: "Concaténation directe dans une requête SQL détectée — utiliser des requêtes préparées.",
      severity: "blocker",
    });
  }

  // A3 - eval() with user input
  const evalPattern = /eval\s*\(\s*(?!['"`])/;
  if (evalPattern.test(content)) {
    items.push({
      id: "owasp_eval",
      category: "owasp",
      title: "eval() avec entrée dynamique (A03:2021)",
      detail: "eval() avec une variable dynamique — risque d'injection de code.",
      severity: "blocker",
    });
  }

  // A5 - Security Misconfiguration: CORS wildcard
  const corsWildcard = /Access-Control-Allow-Origin['":\s]+\*/;
  if (corsWildcard.test(content)) {
    items.push({
      id: "owasp_cors",
      category: "owasp",
      title: "CORS wildcard (A05:2021)",
      detail: "Access-Control-Allow-Origin: * autorise tous les origines — restreindre aux domaines nécessaires.",
      severity: "warning",
    });
  }

  // A7 - Authentication: no HTTPS enforcement
  const httpHardcoded = /http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)/;
  if (httpHardcoded.test(content)) {
    items.push({
      id: "owasp_http",
      category: "owasp",
      title: "URL HTTP non sécurisée (A02:2021)",
      detail: "URL HTTP (non HTTPS) vers un serveur externe détectée.",
      severity: "warning",
    });
  }

  // A9 - Outdated components: very old patterns
  const jqueryOld = /jquery[/-]1\.[0-6]\./i;
  if (jqueryOld.test(content)) {
    items.push({
      id: "owasp_jquery_old",
      category: "owasp",
      title: "jQuery obsolète (A06:2021)",
      detail: "Version jQuery < 1.7 détectée — connue pour des vulnérabilités XSS.",
      severity: "warning",
    });
  }

  // Path traversal
  const pathTraversal = /\.\.[/\\]/;
  const unvalidatedPath = /(?:readFile|readFileSync|writeFile)\s*\(\s*(?!path\.join|path\.resolve)/;
  if (pathTraversal.test(content) || unvalidatedPath.test(content)) {
    items.push({
      id: "owasp_path_traversal",
      category: "owasp",
      title: "Path traversal potentiel (A01:2021)",
      detail: "Accès fichier sans validation du chemin — risque de traversée de répertoire.",
      severity: "warning",
    });
  }

  if (!items.length) {
    items.push({
      id: "owasp_clean",
      category: "owasp",
      title: "OWASP Top 10 — Aucun pattern critique",
      detail: "Analyse statique: aucun pattern d'injection, XSS ou misconfiguration critique détecté.",
      severity: "pass",
    });
  }

  return items;
}

// ─── Security Headers ────────────────────────────────────────────────────

export function checkSecurityHeaders(nextConfigContent?: string): AuditItem[] {
  const items: AuditItem[] = [];
  const cfg = nextConfigContent ?? "";

  const hasCSP = /Content-Security-Policy/i.test(cfg);
  const hasXFrame = /X-Frame-Options/i.test(cfg);
  const hasXContent = /X-Content-Type-Options/i.test(cfg);
  const hasReferrer = /Referrer-Policy/i.test(cfg);
  const hasHSTS = /Strict-Transport-Security/i.test(cfg);
  const hasHeaders = /headers\s*\(\s*\)/.test(cfg) || /async\s+headers/.test(cfg);

  if (!hasHeaders || !cfg) {
    items.push({
      id: "headers_missing",
      category: "headers",
      title: "Security headers absents",
      detail: "next.config.js ne définit pas de security headers HTTP (CSP, X-Frame-Options, HSTS…).",
      severity: "warning",
      autoFixable: true,
    });
    return items;
  }

  if (!hasCSP) {
    items.push({
      id: "headers_no_csp",
      category: "headers",
      title: "Content-Security-Policy absent",
      detail: "CSP manquant — réduit la surface XSS.",
      severity: "warning",
      autoFixable: true,
    });
  }

  if (!hasXFrame) {
    items.push({
      id: "headers_no_xframe",
      category: "headers",
      title: "X-Frame-Options absent",
      detail: "X-Frame-Options DENY/SAMEORIGIN absent — risque de clickjacking.",
      severity: "warning",
      autoFixable: true,
    });
  }

  if (!hasXContent) {
    items.push({
      id: "headers_no_xcontent",
      category: "headers",
      title: "X-Content-Type-Options absent",
      detail: "Absence de nosniff — le navigateur peut mal interpréter le MIME type.",
      severity: "warning",
      autoFixable: true,
    });
  }

  if (!hasHSTS) {
    items.push({
      id: "headers_no_hsts",
      category: "headers",
      title: "HSTS absent",
      detail: "Strict-Transport-Security absent — pas de garantie HTTPS forcé.",
      severity: "warning",
      autoFixable: true,
    });
  }

  if (!hasReferrer) {
    items.push({
      id: "headers_no_referrer",
      category: "headers",
      title: "Referrer-Policy absent",
      detail: "Referrer-Policy absent — fuite d'URL potentielle.",
      severity: "warning",
      autoFixable: true,
    });
  }

  if (hasCSP && hasXFrame && hasXContent && hasReferrer && hasHSTS) {
    items.push({
      id: "headers_complete",
      category: "headers",
      title: "Security headers complets",
      detail: "CSP, X-Frame-Options, X-Content-Type-Options, HSTS et Referrer-Policy sont configurés.",
      severity: "pass",
    });
  }

  return items;
}

// ─── Rate Limiting ───────────────────────────────────────────────────────

export function checkRateLimit(content: string): AuditItem[] {
  const items: AuditItem[] = [];

  const hasApiRoutes = /export\s+(async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)/i.test(content)
    || /route\.(ts|js)/.test(content);
  const hasRateLimit = /rate[_-]?limit|ratelimit|upstash|@upstash\/ratelimit|express-rate-limit|slowDown|throttle/i.test(content);

  if (hasApiRoutes && !hasRateLimit) {
    items.push({
      id: "ratelimit_missing",
      category: "ratelimit",
      title: "Rate limiting absent sur les API routes",
      detail: "Routes API détectées sans mécanisme de rate limiting — risque de DoS ou d'abus.",
      severity: "warning",
    });
  } else if (hasRateLimit) {
    items.push({
      id: "ratelimit_present",
      category: "ratelimit",
      title: "Rate limiting configuré",
      detail: "Mécanisme de rate limiting détecté dans le projet.",
      severity: "pass",
    });
  } else {
    items.push({
      id: "ratelimit_noapi",
      category: "ratelimit",
      title: "Pas de routes API exposées",
      detail: "Aucune route API détectée dans le code analysé.",
      severity: "pass",
    });
  }

  return items;
}

// ─── Data & Storage ──────────────────────────────────────────────────────

export function checkStorage(content: string): AuditItem[] {
  const items: AuditItem[] = [];

  const hasLocalStorage = /localStorage\.(set|get)Item\s*\([^)]*(?:token|key|password|secret)/i.test(content);
  const hasCookieSecret = /document\.cookie\s*=\s*[^;]*(?:token|key|password|secret)/i.test(content);

  if (hasLocalStorage) {
    items.push({
      id: "storage_sensitive_localstorage",
      category: "storage",
      title: "Données sensibles dans localStorage",
      detail: "Token ou credential stocké dans localStorage — accessible par JS, risque XSS.",
      severity: "warning",
    });
  }

  if (hasCookieSecret) {
    items.push({
      id: "storage_sensitive_cookie",
      category: "storage",
      title: "Données sensibles dans cookie non sécurisé",
      detail: "Token stocké dans un cookie sans vérification Secure/HttpOnly.",
      severity: "warning",
    });
  }

  if (!hasLocalStorage && !hasCookieSecret) {
    items.push({
      id: "storage_clean",
      category: "storage",
      title: "Stockage de données sécurisé",
      detail: "Aucun stockage de credentials sensibles dans localStorage ou cookies non sécurisés.",
      severity: "pass",
    });
  }

  return items;
}

// ─── Dependencies / .gitignore ───────────────────────────────────────────

export function checkGitignore(gitignoreContent?: string): AuditItem[] {
  const items: AuditItem[] = [];
  const content = gitignoreContent ?? "";

  const hasEnv = /^\.env$/m.test(content) || /^\.env\.local$/m.test(content);
  const hasNodeModules = /^node_modules/m.test(content);
  const hasDist = /^(\.next|dist|build)$/m.test(content);

  if (!hasEnv) {
    items.push({
      id: "deps_gitignore_env",
      category: "deps",
      title: ".env non exclue du git",
      detail: ".env / .env.local absent du .gitignore — risque de commit de credentials.",
      severity: "blocker",
      autoFixable: true,
    });
  } else {
    items.push({
      id: "deps_gitignore_env_ok",
      category: "deps",
      title: ".env correctement ignorée",
      detail: ".env et .env.local sont dans le .gitignore.",
      severity: "pass",
    });
  }

  if (!hasNodeModules) {
    items.push({
      id: "deps_gitignore_node_modules",
      category: "deps",
      title: "node_modules non ignoré",
      detail: "node_modules absent du .gitignore.",
      severity: "warning",
      autoFixable: true,
    });
  }

  if (!hasDist) {
    items.push({
      id: "deps_gitignore_dist",
      category: "deps",
      title: "Dossier build non ignoré",
      detail: ".next / dist / build absent du .gitignore.",
      severity: "warning",
      autoFixable: true,
    });
  }

  if (hasEnv && hasNodeModules && hasDist) {
    items.push({
      id: "deps_gitignore_complete",
      category: "deps",
      title: ".gitignore complet",
      detail: ".env, node_modules et build sont tous ignorés.",
      severity: "pass",
    });
  }

  return items;
}
