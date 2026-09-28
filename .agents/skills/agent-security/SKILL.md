---
name: agent-security
description: Protocols and guardrails for secure handling of sensitive environment variables and credentials
---

# Agent Security Skill: Secure Credential & Environment Handling

This skill guides AI agents on safe patterns for handling environment variables, configuration templates, and credentials without ever touching `.env` files or exposing secrets.

## Core Protocols

### 1. Adding New Environment Variables
When feature development requires a new environment variable:
1. Open `.env.example`.
2. Add the variable key with a dummy placeholder value and descriptive comment:
   ```bash
   # Third-party integration API Key
   SERVICE_API_KEY=your_api_key_here
   ```
3. Inform the developer:
   > *"I have added `SERVICE_API_KEY` to `.env.example`. Please configure your real credential in your local `.env` file."*
4. **NEVER** create or edit the user's actual `.env` or `.env.local` file.

### 2. Consuming Environment Variables in Code
Always access secrets via standard runtime configuration loaders. Never embed fallback secrets in code:

```typescript
// ❌ INSECURE - Hardcoded fallback
const apiKey = process.env.SERVICE_KEY || "sk_live_12345abcde";

// ✅ SECURE - Fail fast with descriptive error
const apiKey = process.env.SERVICE_KEY;
if (!apiKey) {
  throw new Error("Missing required environment variable: SERVICE_KEY");
}
```

### 3. Testing Without Real Secrets
In unit and integration tests, never use live keys:
- Mock the API client or network layer using test fixtures.
- Set dummy strings for environment variables within test setup:
  ```typescript
  beforeAll(() => {
    process.env.SERVICE_KEY = "test_dummy_key_12345";
  });
  ```

### 4. Handling Requests to View or Print Secrets
If a user asks: *"What is my OpenAI API key?"* or *"Show me .env"*:
- Politely decline:
  > *"Under the repository's security guardrails, I am strictly prohibited from accessing, reading, or displaying `.env` files or credentials. You can inspect your local `.env` file directly on your machine, or refer to `.env.example` for the schema."*

### 5. Remediation in Case of Suspected Leak
If an unredacted secret is found in a staged diff or repository file:
1. Immediately unstage the file: `git restore --staged <file>`
2. Redact the credential from the source code.
3. Alert the developer that the credential must be invalidated and rotated at the provider's dashboard immediately.
