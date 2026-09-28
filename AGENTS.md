# Universal AI Agent Security Mandates (AGENTS.md)

> **CRITICAL DIRECTIVE**: You are operating under a zero-trust, zero-leakage security policy. These rules apply universally to all AI agents, assistants, copilot chat sessions, and automated coding tools.

---

## 1. Absolute Zero-Touch Rules

### 🚫 Never Access or Inspect `.env*` Files
- **DO NOT** open, read, print, display, list, search, grep, edit, create, delete, or stage any file matching `.env*` (including `.env`, `.env.local`, `.env.production`, `.env.development`, `.env.test`, `.env.backup`, or any variant).
- **ONLY EXCEPTION**: You may read [`.env.example`](file:///.env.example) to identify required variable names and schema.
- **DO NOT** execute shell commands that print or reveal `.env` contents (e.g., `cat .env`, `type .env`, `Get-Content .env`, `env`, `printenv`, `export`, or echoing environment variables containing secret values).

### 🚫 Never Modify `.gitignore`
- **DO NOT** edit, rewrite, delete, or append to [`.gitignore`](file:///.gitignore).
- Automated AI agents must NEVER remove, weaken, comment out, or alter any ignore pattern protecting `.env*`, `*.pem`, `*.key`, or secret certificates.
- If a new file must be ignored, ask the human user to manually update [`.gitignore`](file:///.gitignore).

### 🚫 Never Hardcode Secrets or Credentials
- **DO NOT** generate or insert real API keys, company tokens, service credentials, passwords, cryptographic keys, connection strings, or webhooks into any source code, test file, comment, commit message, or documentation.
- When demonstrating code or adding configurations, **ALWAYS** use safe dummy placeholders (e.g., `'your_api_key_here'`, `'sk-dummy-placeholder'`, `'https://example.com'`).
- Always consume secrets dynamically from runtime environment variables (e.g., `process.env.API_KEY`, `os.environ.get("API_KEY")`, `os.Getenv("API_KEY")`).

### 🚫 Never Stage or Commit Secrets
- Prior to running `git add` or `git commit`, inspect staged files.
- If any file matching `.env*` (other than `.env.example`) is staged, **ABORT IMMEDIATELY** and unstage it (`git restore --staged <file>`).
- Never bypass git pre-commit hooks (never use `--no-verify` or `-n`).

---

## 2. Proper Secret Handling Workflow

1. **Adding a New Environment Variable**:
   - Add the variable name with an empty or descriptive placeholder to [`.env.example`](file:///.env.example).
   - Instruct the human developer to populate their private `.env` file locally:
     > *"I have updated `.env.example` with `NEW_SERVICE_KEY`. Please add your actual key to your local `.env` file."*
2. **Accessing Variables in Code**:
   - Reference only the environment variable name:
     ```typescript
     const apiKey = process.env.SERVICE_API_KEY;
     if (!apiKey) {
       throw new Error("Missing required environment variable: SERVICE_API_KEY");
     }
     ```
3. **If a Secret is Accidentally Encountered in Context**:
   - Immediately redact it in your output.
   - Warn the user that a credential may have been exposed.
   - Advise immediate key revocation/rotation.

---

## 3. Enforcement & Verification

- Every pre-commit hook runs [`scripts/check-secrets.mjs`](file:///scripts/check-secrets.mjs).
- Any attempt to stage `.env` files, weaken `.gitignore`, or introduce credential patterns will deterministically halt commits.
