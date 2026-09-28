# =========================================================================
# AI Security Guardrails - Windows PowerShell Setup Script
# Configures git to use .githooks directory for pre-commit protection
# =========================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  AI Security Guardrails: Local Setup (PowerShell) " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verify Git is installed
try {
    $gitVersion = git --version
    Write-Host "[1/3] Found Git: $gitVersion" -ForegroundColor Green
} catch {
    Write-Error "Git is not installed or not in PATH. Please install Git first."
    exit 1
}

# 2. Configure Git core.hooksPath to .githooks
try {
    git config core.hooksPath .githooks
    $configuredPath = git config core.hooksPath
    Write-Host "[2/3] Configured git core.hooksPath -> $configuredPath" -ForegroundColor Green
} catch {
    Write-Error "Failed to set git core.hooksPath: $_"
    exit 1
}

# 3. Verify Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "[3/3] Found Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Warning "Node.js was not detected in PATH. Ensure Node.js 18+ is installed to run pre-commit checks."
}

Write-Host ""
Write-Host " SUCCESS! AI Security Guardrails are active for this repository." -ForegroundColor Green
Write-Host " Git will automatically run pre-commit checks before every commit."
Write-Host " You can run manual checks at any time with: npm run security:check" -ForegroundColor Yellow
Write-Host ""
