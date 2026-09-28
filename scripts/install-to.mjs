#!/usr/bin/env node

/**
 * =============================================================================
 * AI Security Guardrails - One-Command Installer to Any Project
 * =============================================================================
 * Usage:
 *   node scripts/install-to.mjs <path-to-target-project>
 *
 * Example:
 *   node scripts/install-to.mjs ../my-existing-app
 * =============================================================================
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
};

const targetArg = process.argv[2];

if (!targetArg) {
  console.log(`\n${colors.bold}${colors.cyan}====================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  AI SECURITY GUARDRAILS: PROJECT INSTALLER       ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}\n`);
  console.log(`${colors.yellow}Usage:${colors.reset} node scripts/install-to.mjs <target-project-directory>\n`);
  console.log(`${colors.gray}Example:${colors.reset}`);
  console.log(`  node scripts/install-to.mjs ../my-nextjs-app`);
  console.log(`  node scripts/install-to.mjs C:\\Users\\Dev\\Projects\\api-service\n`);
  process.exit(1);
}

const sourceRoot = path.resolve(import.meta.dirname, "..");
const targetRoot = path.resolve(process.cwd(), targetArg);

if (!fs.existsSync(targetRoot)) {
  console.error(`${colors.red}❌ Error: Target directory does not exist:${colors.reset} ${targetRoot}`);
  process.exit(1);
}

console.log(`\n${colors.bold}${colors.cyan}Installing AI Security Guardrails to:${colors.reset} ${colors.bold}${targetRoot}${colors.reset}\n`);

// Helper to copy file
function copyFileSafe(srcRel, destRel = srcRel) {
  const src = path.join(sourceRoot, srcRel);
  const dest = path.join(targetRoot, destRel);
  const destDir = path.dirname(dest);

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  fs.copyFileSync(src, dest);
  console.log(`  ${colors.green}✔${colors.reset} Copied ${colors.cyan}${srcRel}${colors.reset} -> ${colors.gray}${destRel}${colors.reset}`);
}

// Helper to copy directory recursively
function copyDirRecursive(srcRel, destRel = srcRel) {
  const src = path.join(sourceRoot, srcRel);
  const dest = path.join(targetRoot, destRel);

  if (!fs.existsSync(src)) return;

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const entrySrc = path.join(srcRel, entry.name);
    const entryDest = path.join(destRel, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(entrySrc, entryDest);
    } else {
      copyFileSafe(entrySrc, entryDest);
    }
  }
}

// 1. Copy Layer 1 (Indexing Exclusions)
console.log(`${colors.bold}[1/5] Installing Indexing Exclusions (Layer 1)...${colors.reset}`);
copyFileSafe(".cursorignore");
copyFileSafe(".copilotignore");

// 2. Copy Layer 2 (Multi-Harness AI Rules)
console.log(`\n${colors.bold}[2/5] Installing Multi-Harness AI Rules (Layer 2)...${colors.reset}`);
copyFileSafe("AGENTS.md");
copyFileSafe(".cursorrules");
copyFileSafe("CLAUDE.md");
copyDirRecursive(".cursor");
copyDirRecursive(".agents");

// 3. Setup Layer 3 (.env.example)
console.log(`\n${colors.bold}[3/5] Checking Environment Template (Layer 3)...${colors.reset}`);
const targetEnvExample = path.join(targetRoot, ".env.example");
if (!fs.existsSync(targetEnvExample)) {
  copyFileSafe(".env.example");
} else {
  console.log(`  ${colors.yellow}ℹ${colors.reset} Target already has .env.example (kept existing).`);
}

// 4. Update Layer 4 (.gitignore)
console.log(`\n${colors.bold}[4/5] Updating .gitignore Protection (Layer 4)...${colors.reset}`);
const targetGitignore = path.join(targetRoot, ".gitignore");
if (!fs.existsSync(targetGitignore)) {
  copyFileSafe(".gitignore");
} else {
  const currentContent = fs.readFileSync(targetGitignore, "utf-8");
  if (!currentContent.includes(".env*") && !currentContent.includes(".env")) {
    const appendBlock = `\n# AI Security Guardrails - Secret Protection\n.env\n.env*\n!.env.example\n*.pem\n*.key\n*.keystore\n`;
    fs.appendFileSync(targetGitignore, appendBlock);
    console.log(`  ${colors.green}✔${colors.reset} Appended .env protection rules to existing .gitignore.`);
  } else {
    console.log(`  ${colors.green}✔${colors.reset} Target .gitignore already protects .env.`);
  }
}

// 5. Install Layer 5 (Pre-Commit Hook & Scripts)
console.log(`\n${colors.bold}[5/5] Installing Git Pre-Commit Security Hook (Layer 5)...${colors.reset}`);
copyDirRecursive(".githooks");
copyFileSafe("scripts/check-secrets.mjs");
copyFileSafe("scripts/setup-security.ps1");
copyFileSafe("scripts/setup-security.sh");
copyFileSafe("scripts/test-guardrails.mjs");

// 6. Update Target package.json if present
const targetPackageJson = path.join(targetRoot, "package.json");
if (fs.existsSync(targetPackageJson)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(targetPackageJson, "utf-8"));
    pkg.scripts = pkg.scripts || {};
    let modified = false;

    if (!pkg.scripts["security:check"]) {
      pkg.scripts["security:check"] = "node scripts/check-secrets.mjs";
      modified = true;
    }
    if (!pkg.scripts["security:setup"]) {
      pkg.scripts["security:setup"] = "git config core.hooksPath .githooks";
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(targetPackageJson, JSON.stringify(pkg, null, 2) + "\n");
      console.log(`  ${colors.green}✔${colors.reset} Added security scripts to target package.json`);
    }
  } catch (err) {
    console.warn(`  ${colors.yellow}⚠️ Could not parse target package.json: ${err.message}${colors.reset}`);
  }
}

// 7. Configure Git core.hooksPath if target is a git repo
const targetGit = path.join(targetRoot, ".git");
if (fs.existsSync(targetGit)) {
  try {
    execSync("git config core.hooksPath .githooks", { cwd: targetRoot, stdio: "ignore" });
    console.log(`  ${colors.green}✔${colors.reset} Activated git core.hooksPath -> .githooks in target project`);
  } catch (err) {
    console.warn(`  ${colors.yellow}⚠️ Could not configure git hooksPath automatically.${colors.reset}`);
  }
}

console.log(`\n${colors.bold}${colors.green}🎉 Installation Complete!${colors.reset}`);
console.log(`Your target project is now protected by the 5-Layer AI Security Guardrails.\n`);
console.log(`Next steps in ${colors.cyan}${targetArg}${colors.reset}:`);
console.log(`  1. Run ${colors.yellow}npm run security:check${colors.reset} to verify your staging area`);
console.log(`  2. Add your variable keys to ${colors.yellow}.env.example${colors.reset}`);
console.log(`  3. Happy and safe AI pair-programming!\n`);
