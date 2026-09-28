#!/usr/bin/env node

/**
 * =============================================================================
 * AI Security Guardrail: Pre-Commit Secrets & Staging Inspector
 * =============================================================================
 * Cross-platform verification script that inspects git staging before any commit.
 *
 * Deterministic checks:
 * 1. Blocks any staged file matching .env* (except .env.example)
 * 2. Blocks any staged private cryptographic keys (*.pem, *.key, etc.)
 * 3. Blocks tampering with .gitignore that would unignore .env*
 * 4. Scans staged code diff additions for API keys, tokens, and credentials
 * =============================================================================
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ANSI Terminal Colors
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

/**
 * Regex patterns for credentials, tokens, and private keys.
 */
export const SECRET_PATTERNS = [
  {
    name: "Private Cryptographic Key",
    regex: /-----BEGIN (?:(?:RSA|DSA|EC|OPENSSH|PGP|ENCRYPTED)\s+)?(?:PRIVATE\s+)?KEY-----/,
    severity: "CRITICAL",
  },
  {
    name: "Stripe Live Secret Key",
    regex: /(?:sk|rk)_live_[0-9a-zA-Z]{24,}/,
    severity: "CRITICAL",
  },
  {
    name: "Supabase Service Role JWT",
    regex: /eyJhbGciOi[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/,
    validator: (match) => {
      try {
        const parts = match.split(".");
        if (parts.length < 2) return false;
        const payload = Buffer.from(parts[1], "base64url").toString("utf-8");
        return payload.includes("service_role") || payload.includes("supabase");
      } catch {
        return false;
      }
    },
    severity: "CRITICAL",
  },
  {
    name: "OpenAI API Key",
    regex: /sk-(?:proj-)?[a-zA-Z0-9_-]{32,}/,
    validator: (match) => !isPlaceholder(match),
    severity: "HIGH",
  },
  {
    name: "Anthropic API Key",
    regex: /sk-ant-api03-[a-zA-Z0-9_-]{90,}/,
    validator: (match) => !isPlaceholder(match),
    severity: "CRITICAL",
  },
  {
    name: "AWS Access Key ID",
    regex: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/,
    validator: (match) => !isPlaceholder(match),
    severity: "HIGH",
  },
  {
    name: "AWS Secret Access Key",
    regex: /(?:aws_secret_access_key|aws_secret_key)\s*[:=]\s*['"]([a-zA-Z0-9/+=]{40})['"]/i,
    extractGroup: 1,
    validator: (match) => !isPlaceholder(match),
    severity: "CRITICAL",
  },
  {
    name: "GitHub Personal Access Token",
    regex: /(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{82}/,
    validator: (match) => !isPlaceholder(match),
    severity: "CRITICAL",
  },
  {
    name: "Google Cloud / Gemini API Key",
    regex: /AIzaSy[0-9A-Za-z_-]{33}/,
    validator: (match) => !isPlaceholder(match),
    severity: "HIGH",
  },
  {
    name: "Slack Token",
    regex: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24,32}/,
    validator: (match) => !isPlaceholder(match),
    severity: "HIGH",
  },
  {
    name: "Generic High-Entropy Secret Assignment",
    regex: /(?:api[_-]?key|secret[_-]?key|api[_-]?secret|auth[_-]?token|access[_-]?token|private[_-]?key|client[_-]?secret)\s*[:=]\s*['"]([^'"]{20,})['"]/i,
    extractGroup: 1,
    validator: (match) => {
      if (isPlaceholder(match)) return false;
      // Filter out common false positives like URLs, paths, or purely alphabet strings
      if (match.startsWith("http://") || match.startsWith("https://")) return false;
      if (match.startsWith("/") || match.includes(" ")) return false;
      return true;
    },
    severity: "MEDIUM",
  },
];

/**
 * Filter out obvious placeholder values used in docs and examples.
 */
export function isPlaceholder(val) {
  if (!val) return true;
  const lower = val.toLowerCase();
  const placeholders = [
    "your_",
    "placeholder",
    "dummy",
    "example",
    "sample",
    "test_",
    "my_",
    "insert_",
    "replace_with",
    "todo",
    "changeme",
    "xxxx",
    "....",
    "<your-",
    "${",
  ];
  return placeholders.some((p) => lower.includes(p));
}

/**
 * Redact secret for safe display in console output.
 */
export function redactSecret(secret) {
  if (!secret || secret.length <= 8) return "[REDACTED]";
  return `${secret.slice(0, 4)}...${secret.slice(-4)}`;
}

/**
 * Executes a git command safely and returns its output.
 */
function runGit(command) {
  try {
    return execSync(command, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch (err) {
    if (err.status === 1 && err.stdout === "") {
      return "";
    }
    throw err;
  }
}

/**
 * 1. Check staged filenames for .env or private key files.
 */
export function checkStagedFilenames(stagedFiles) {
  const violations = [];

  for (const filePath of stagedFiles) {
    const norm = filePath.replace(/\\/g, "/");
    const basename = path.basename(norm);

    // Whitelist .env.example
    if (basename === ".env.example") {
      continue;
    }

    // Check for .env*
    if (basename === ".env" || basename.startsWith(".env.") || norm.includes("/.env")) {
      violations.push({
        type: "STAGED_ENV_FILE",
        file: filePath,
        message: `Attempted to commit an environment file (${basename}). Only .env.example is permitted in version control.`,
        severity: "CRITICAL",
      });
    }

    // Check for cryptographic keys and keystores
    const forbiddenExts = [".pem", ".key", ".keystore", ".jks", ".pfx", ".p12"];
    if (forbiddenExts.some((ext) => basename.endsWith(ext))) {
      violations.push({
        type: "STAGED_PRIVATE_KEY",
        file: filePath,
        message: `Attempted to commit a private key or certificate file (${basename}).`,
        severity: "CRITICAL",
      });
    }

    if (basename === "id_rsa" || basename === "id_ed25519" || basename === "credentials.json") {
      violations.push({
        type: "STAGED_CREDENTIALS_FILE",
        file: filePath,
        message: `Attempted to commit a sensitive credentials file (${basename}).`,
        severity: "CRITICAL",
      });
    }
  }

  return violations;
}

/**
 * 2. Check if .gitignore was modified to remove or unignore .env*
 */
export function checkGitignoreIntegrity(gitignoreDiff, gitignoreContent) {
  const violations = [];

  // Check deleted lines in gitignore diff
  const lines = gitignoreDiff.split("\n");
  for (const line of lines) {
    if (line.startsWith("-") && !line.startsWith("---")) {
      const removedText = line.substring(1).trim();
      if (removedText === ".env" || removedText === ".env*" || removedText.startsWith(".env")) {
        violations.push({
          type: "GITIGNORE_TAMPERING",
          file: ".gitignore",
          message: `Detected removal of environment protection pattern '${removedText}' from .gitignore!`,
          severity: "CRITICAL",
        });
      }
    }
  }

  // Ensure resulting gitignore still explicitly ignores .env
  if (gitignoreContent) {
    const hasEnvIgnore = gitignoreContent
      .split("\n")
      .map((l) => l.trim())
      .some((l) => l === ".env" || l === ".env*" || l === ".env.*");

    if (!hasEnvIgnore) {
      violations.push({
        type: "GITIGNORE_INSECURE",
        file: ".gitignore",
        message: `.gitignore does not contain an active ignore rule for .env files!`,
        severity: "CRITICAL",
      });
    }
  }

  return violations;
}

/**
 * 3. Inspect staged additions in diffs for secret patterns.
 */
export function scanDiffContent(diffText) {
  const violations = [];
  const lines = diffText.split("\n");

  let currentFile = "unknown";
  let lineIndex = 0;

  for (const line of lines) {
    if (line.startsWith("diff --git")) {
      const match = line.match(/b\/(.+)$/);
      if (match) currentFile = match[1];
      continue;
    }

    // Ignore deletions or header lines
    if (!line.startsWith("+") || line.startsWith("+++")) {
      continue;
    }

    // Skip scanning .env.example or test files designed to test guardrails
    if (
      currentFile.endsWith(".env.example") ||
      currentFile.includes("check-secrets.mjs") ||
      currentFile.includes("test-guardrails.mjs")
    ) {
      continue;
    }

    const addedLine = line.substring(1).replace(/\0/g, "").replace(/^\uFEFF/, "");
    lineIndex++;

    for (const pattern of SECRET_PATTERNS) {
      const match = addedLine.match(pattern.regex);
      if (match) {
        const secretVal = pattern.extractGroup ? match[pattern.extractGroup] : match[0];
        if (pattern.validator && !pattern.validator(secretVal)) {
          continue;
        }

        violations.push({
          type: "SECRET_PATTERN_DETECTED",
          file: currentFile,
          secretType: pattern.name,
          preview: redactSecret(secretVal),
          severity: pattern.severity,
          snippet: addedLine.trim().slice(0, 100),
        });
      }
    }
  }

  return violations;
}

/**
 * Main execution handler.
 */
export async function runSecurityCheck() {
  console.log(`\n${colors.bold}${colors.cyan}====================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  AI SECURITY GUARDRAIL: PRE-COMMIT SCANNER        ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}\n`);

  let stagedFiles = [];
  try {
    const rawStaged = runGit("git diff --cached --name-only");
    if (rawStaged) {
      stagedFiles = rawStaged.split("\n").map((f) => f.trim()).filter(Boolean);
    }
  } catch (err) {
    console.error(`${colors.yellow}⚠️ Not a git repository or git error occurred. Skipping staged checks.${colors.reset}`);
    return 0;
  }

  if (stagedFiles.length === 0) {
    console.log(`${colors.green}✔ No files staged for commit. Staging is clean.${colors.reset}\n`);
    return 0;
  }

  console.log(`${colors.gray}Inspecting ${stagedFiles.length} staged file(s)...${colors.reset}`);

  const allViolations = [];

  // Check 1: Staged Filenames
  const fileViolations = checkStagedFilenames(stagedFiles);
  allViolations.push(...fileViolations);

  // Check 2: .gitignore tampering
  if (stagedFiles.includes(".gitignore")) {
    const gitignoreDiff = runGit("git diff --cached -U0 -- .gitignore");
    let gitignoreContent = "";
    if (fs.existsSync(".gitignore")) {
      gitignoreContent = fs.readFileSync(".gitignore", "utf-8");
    }
    const giViolations = checkGitignoreIntegrity(gitignoreDiff, gitignoreContent);
    allViolations.push(...giViolations);
  }

  // Check 3: Staged diff content scanner
  try {
    const stagedDiff = runGit("git diff --cached --text -U0");
    if (stagedDiff) {
      const diffViolations = scanDiffContent(stagedDiff);
      allViolations.push(...diffViolations);
    }
  } catch (err) {
    console.error(`${colors.yellow}Warning: Failed to fetch diff: ${err.message}${colors.reset}`);
  }

  // Report Results
  if (allViolations.length === 0) {
    console.log(`\n${colors.bold}${colors.green}✔ PASSED: All staged files comply with AI zero-leakage security guardrails.${colors.reset}\n`);
    return 0;
  }

  console.error(`\n${colors.bold}${colors.red}❌ COMMIT REJECTED: ${allViolations.length} Security Violation(s) Detected!${colors.reset}\n`);

  allViolations.forEach((v, idx) => {
    console.error(
      `${colors.bold}${colors.red}[Violation ${idx + 1}]${colors.reset} ${colors.yellow}${v.type}${colors.reset} in ${colors.cyan}${v.file}${colors.reset}`
    );
    if (v.secretType) {
      console.error(`  ${colors.bold}Type:${colors.reset}    ${v.secretType} [${v.severity}]`);
      console.error(`  ${colors.bold}Secret:${colors.reset}  ${v.preview}`);
    }
    if (v.message) {
      console.error(`  ${colors.bold}Details:${colors.reset} ${v.message}`);
    }
    if (v.snippet) {
      console.error(`  ${colors.bold}Line:${colors.reset}    ${colors.gray}${v.snippet}${colors.reset}`);
    }
    console.error("");
  });

  console.error(`${colors.bold}${colors.yellow}Remediation Instructions:${colors.reset}`);
  console.error(`1. Unstage sensitive files: ${colors.cyan}git restore --staged <filename>${colors.reset}`);
  console.error(`2. Place secrets in your private local ${colors.cyan}.env${colors.reset} file instead of code.`);
  console.error(`3. If adding a new variable, document its dummy schema in ${colors.cyan}.env.example${colors.reset}.`);
  console.error(`4. Re-run ${colors.cyan}npm run security:check${colors.reset} before committing.\n`);

  return 1;
}

// Execute when invoked directly
const isDirectCall = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectCall) {
  runSecurityCheck().then((exitCode) => {
    process.exit(exitCode);
  });
}
