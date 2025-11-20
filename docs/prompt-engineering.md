# Prompt Engineering Notes

The prompt is designed to:

- Provide enough context for useful suggestions
- Stay generic across HR services
- Avoid leaking PII to OpenAI
- Enforce a **strict JSON** response format

Sections included:

1. Case metadata
2. Employee profile (high-level)
3. Current description
4. Recent activity
5. Similar closed cases
6. JSON schema + guidelines

Future enhancements:

- Service-specific instruction sets (payroll, leave, ER, etc.)
- Risk flags (bullying, harassment, safety, etc.)
