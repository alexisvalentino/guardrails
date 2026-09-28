# Claude Code Project Guidelines & Security Mandates

This repository enforces a strict, defense-in-depth security protocol for all AI interactions.

## 🔒 Security Directives (MANDATORY)

1. **Zero-Touch on Environment Files**:
   - **NEVER** view, read, edit, touch, create, or delete `.env` or any `.env.*` file (e.g., `.env.local`, `.env.production`).
   - You may ONLY read `.env.example` to reference required variable names.
   - Do NOT run Bash commands that reveal `.env` contents (e.g., `cat .env`, `less .env`, `grep -i key .env`, `printenv`, `env`).

2. **Protected `.gitignore`**:
   - Do NOT edit or modify `.gitignore`.
   - Never remove or weaken ignore patterns for `.env*`, `*.pem`, `*.key`, or secret certificates.
   - If a new ignore entry is needed, prompt the developer to add it manually.

3. **No Hardcoded Credentials**:
   - Never embed real secrets, API keys, tokens, or passwords in code, comments, or documentation.
   - Use `process.env.VAR_NAME` (or appropriate language runtime).
   - Use safe placeholders (e.g., `'your_api_key_here'`) in documentation and test mocks.

4. **Git Operations & Verification**:
   - Before committing, verify no sensitive files are staged.
   - Run `npm run security:check` (`node scripts/check-secrets.mjs`) to verify staging.
   - Never run git commits with `--no-verify`.

## 🛠️ Project Commands
- Setup git hooks: `npm run security:setup`
- Check staged secrets: `npm run security:check`
- Run test suite: `npm test`
