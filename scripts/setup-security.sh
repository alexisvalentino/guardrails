#!/usr/bin/env bash

# =========================================================================
# AI Security Guardrails - Bash Setup Script (macOS / Linux / WSL)
# Configures git to use .githooks directory for pre-commit protection
# =========================================================================

set -e

echo ""
echo "===================================================="
echo "  AI Security Guardrails: Local Setup (Bash)        "
echo "===================================================="
echo ""

# 1. Check Git
if ! command -v git >/dev/null 2>&1; then
  echo "❌ Git is not installed or not in PATH. Please install Git first."
  exit 1
fi
echo "✔ [1/3] Git found: $(git --version)"

# 2. Make pre-commit hook executable
if [ -f ".githooks/pre-commit" ]; then
  chmod +x .githooks/pre-commit
  echo "✔ [2/3] Made .githooks/pre-commit executable"
else
  echo "⚠️ Warning: .githooks/pre-commit not found!"
fi

# 3. Configure Git core.hooksPath
git config core.hooksPath .githooks
echo "✔ [3/3] Configured git core.hooksPath -> $(git config core.hooksPath)"

echo ""
echo "🎉 SUCCESS! AI Security Guardrails are active for this repository."
echo "Git will automatically run pre-commit checks before every commit."
echo "You can run manual checks at any time with: npm run security:check"
echo ""
