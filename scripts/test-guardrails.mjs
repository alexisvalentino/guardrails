#!/usr/bin/env node

/**
 * =============================================================================
 * AI Security Guardrails - Automated Self-Test Suite
 * =============================================================================
 * Verifies that the guardrail detection logic reliably catches secrets,
 * rejects forbidden files, detects .gitignore tampering, and permits safe templates.
 * =============================================================================
 */

import {
  checkStagedFilenames,
  checkGitignoreIntegrity,
  scanDiffContent,
  isPlaceholder,
  redactSecret,
} from "./check-secrets.mjs";

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✔ [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    failedCount++;
  }
}

console.log("\n====================================================");
console.log("  Running AI Security Guardrails Test Suite         ");
console.log("====================================================\n");

// -----------------------------------------------------------------------------
// Test Group 1: Staged Filename Detection
// -----------------------------------------------------------------------------
console.log("Test Group 1: Staged Filename Detection");

{
  const violations = checkStagedFilenames([
    "src/index.ts",
    ".env.example",
    "package.json",
  ]);
  assert(violations.length === 0, "Permits legitimate source files and .env.example");
}

{
  const violations = checkStagedFilenames([".env"]);
  assert(
    violations.length === 1 && violations[0].type === "STAGED_ENV_FILE",
    "Blocks staged '.env' file"
  );
}

{
  const violations = checkStagedFilenames(["apps/api/.env.production"]);
  assert(
    violations.length === 1 && violations[0].type === "STAGED_ENV_FILE",
    "Blocks nested '.env.production' file"
  );
}

{
  const violations = checkStagedFilenames(["server.key", "certs/cert.pem"]);
  assert(
    violations.length === 2 && violations.every((v) => v.type === "STAGED_PRIVATE_KEY"),
    "Blocks staged .pem and .key cryptographic files"
  );
}

{
  const violations = checkStagedFilenames(["id_rsa", "credentials.json"]);
  assert(
    violations.length === 2 && violations.every((v) => v.type === "STAGED_CREDENTIALS_FILE"),
    "Blocks staged id_rsa and credentials.json"
  );
}

// -----------------------------------------------------------------------------
// Test Group 2: .gitignore Tampering Detection
// -----------------------------------------------------------------------------
console.log("\nTest Group 2: .gitignore Tampering Detection");

{
  const diff = `
@@ -5,1 +5,0 @@
-.env
`;
  const content = `# gitignore without env`;
  const violations = checkGitignoreIntegrity(diff, content);
  assert(
    violations.some((v) => v.type === "GITIGNORE_TAMPERING"),
    "Flags deletion of '.env' from .gitignore"
  );
}

{
  const diff = `
@@ -10,0 +10,1 @@
+dist/
`;
  const content = `.env\n.env*\n!.env.example\ndist/`;
  const violations = checkGitignoreIntegrity(diff, content);
  assert(violations.length === 0, "Permits safe additions to .gitignore with .env intact");
}

// -----------------------------------------------------------------------------
// Test Group 3: Secret Pattern Detection in Diffs
// -----------------------------------------------------------------------------
console.log("\nTest Group 3: Secret Pattern Detection in Diffs");

{
  const mockStripeKey = ["sk", "live", "9999999999999999999999999999"].join("_");
  const fakeDiff = `
diff --git a/src/stripe.ts b/src/stripe.ts
--- a/src/stripe.ts
+++ b/src/stripe.ts
@@ -1,3 +1,4 @@
+const stripeSecret = "${mockStripeKey}";
`;
  const violations = scanDiffContent(fakeDiff);
  assert(
    violations.some((v) => v.secretType === "Stripe Live Secret Key"),
    "Detects Stripe live secret key in added diff"
  );
}

{
  const mockAwsKey = ["AKIA", "1234567890ABCDEF"].join("");
  const fakeDiff = `
diff --git a/src/aws.ts b/src/aws.ts
--- a/src/aws.ts
+++ b/src/aws.ts
@@ -1,3 +1,4 @@
+export const AWS_KEY = "${mockAwsKey}";
`;
  const violations = scanDiffContent(fakeDiff);
  assert(
    violations.some((v) => v.secretType === "AWS Access Key ID"),
    "Detects AWS Access Key ID in added diff"
  );
}

{
  const fakeDiff = `
diff --git a/src/cert.ts b/src/cert.ts
--- a/src/cert.ts
+++ b/src/cert.ts
@@ -1,3 +1,4 @@
+-----BEGIN RSA PRIVATE KEY-----
`;
  const violations = scanDiffContent(fakeDiff);
  assert(
    violations.some((v) => v.secretType === "Private Cryptographic Key"),
    "Detects Private Key headers in added diff"
  );
}

{
  const fakeDiff = `
diff --git a/src/config.ts b/src/config.ts
--- a/src/config.ts
+++ b/src/config.ts
@@ -1,3 +1,4 @@
+const apiKey = "your_api_key_here";
+const dummyToken = "placeholder_token_value_12345";
`;
  const violations = scanDiffContent(fakeDiff);
  assert(
    violations.length === 0,
    "Correctly ignores safe placeholders ('your_api_key_here', 'placeholder_...')"
  );
}

// -----------------------------------------------------------------------------
// Test Group 4: Placeholder and Redaction Utilities
// -----------------------------------------------------------------------------
console.log("\nTest Group 4: Placeholder and Redaction Utilities");

{
  const testRealKey = ["sk", "live", "realprodsecret1234567890"].join("_");
  const testRedactKey = ["sk", "live", "1234567890abcdef"].join("_");
  assert(isPlaceholder("your_openai_key"), "Recognizes 'your_' as placeholder");
  assert(isPlaceholder("dummy_token_123"), "Recognizes 'dummy_' as placeholder");
  assert(!isPlaceholder(testRealKey), "Distinguishes real key from placeholder");
  assert(redactSecret(testRedactKey) === "sk_l...cdef", "Redacts secret with head and tail preserved");
}

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log("\n----------------------------------------------------");
console.log(`Results: ${passedCount} passed, ${failedCount} failed`);
console.log("----------------------------------------------------\n");

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log("🎉 All guardrail unit tests passed successfully!\n");
  process.exit(0);
}
