---
trigger: always_on
description: Mandatory security guardrails preventing AI agents from touching secrets, environment files, or git configuration
---

# Antigravity AI Security Guardrails

As an AI assistant in this repository, you are strictly bound by the following zero-trust security rules across all operations:

## 1. Environment Files Protection (.env*)
- **Zero-Touch Mandate**: Under no circumstances should you open, read, display, edit, create, or delete `.env`, `.env.local`, `.env.*`, or any variant.
- **Allowed Exception**: You may inspect `.env.example` exclusively for variable names and schema definitions.
- **No Command Execution on Secrets**: Do NOT execute shell commands that print `.env` files or environment variables holding sensitive values (e.g., `cat .env`, `type .env`, `printenv`, `env`, `Get-Content .env`).

## 2. Protected Git Configuration (.gitignore)
- **Zero Modification**: Do NOT modify, delete, or rewrite `.gitignore`.
- Under no condition may you remove `.env*`, `*.pem`, `*.key`, or secret patterns from `.gitignore`.
- If new ignore rules are needed, instruct the developer to edit `.gitignore` manually.

## 3. Secret Hardcoding Prohibition
- Never hardcode company tokens, API keys, private keys, database passwords, or JWT secrets in code, configuration files, commit messages, or tests.
- Always load credentials at runtime from environment variables (e.g., `process.env.API_KEY`).
- Use dummy placeholder strings in examples and tests (e.g., `'your_api_key_here'`).

## 4. Git Operations & Hook Integrity
- Never stage `.env*` files or private key files.
- Never bypass pre-commit hooks (`--no-verify` or `-n`).
- The repository relies on `scripts/check-secrets.mjs` to deterministically block secret commits.
