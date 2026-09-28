# Contributing to AI Security Guardrails

Thank you for your interest in contributing to **AI Security Guardrails**! This project aims to make developing with AI coding assistants safe, transparent, and leak-free for developers and teams worldwide.

---

## 🛠️ Development & Testing

1. **Clone the repository**:
   ```bash
   git clone https://github.com/alexisvalentino/guardrails.git
   cd guardrails
   ```

2. **Activate the local security hook**:
   ```bash
   npm run security:setup
   ```

3. **Run the self-test suite**:
   ```bash
   npm test
   ```

4. **Verify staging**:
   ```bash
   npm run security:check
   ```

---

## ➕ Adding New Secret Detection Patterns

We welcome additions of new credential patterns (e.g., cloud providers, payment gateways, SaaS tokens, AI model APIs):

1. **Update `scripts/check-secrets.mjs`**:
   Add your new pattern to `SECRET_PATTERNS`:
   ```javascript
   {
     name: "Provider Name Secret",
     regex: /provider_prefix_[a-zA-Z0-9]{32,}/,
     validator: (match) => !isPlaceholder(match),
     severity: "CRITICAL", // or "HIGH", "MEDIUM"
   }
   ```
2. **Add a Test Case to `scripts/test-guardrails.mjs`**:
   Add a test verifying both detection and placeholder tolerance:
   ```javascript
   {
     const fakeDiff = `
   diff --git a/src/provider.ts b/src/provider.ts
   --- a/src/provider.ts
   +++ b/src/provider.ts
   @@ -1,3 +1,4 @@
   +const key = "provider_prefix_12345678901234567890123456789012";
   `;
     const violations = scanDiffContent(fakeDiff);
     assert(
       violations.some((v) => v.secretType === "Provider Name Secret"),
       "Detects Provider Name Secret in added diff"
     );
   }
   ```
3. **Run tests**:
   Ensure `npm test` passes cleanly with 0 failures.

---

## 🤖 Adding Support for New AI Tools

If a new AI coding tool introduces a configuration, ignore, or rules format:
- Add appropriate ignore patterns (`.<tool>ignore`) to Layer 1.
- Add system instructions or rules (`.<tool>/rules/...`) to Layer 2.
- Document the integration in `README.md`.

---

## 📝 Pull Request Guidelines

- Keep changes focused and self-contained.
- Do NOT commit real secrets or credentials in tests or docs (always use safe placeholders like `your_...` or `placeholder_...`).
- Verify that `npm test` and `npm run security:check` pass before submitting your PR.
