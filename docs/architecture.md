# Architecture

## High-level flow

1. Fulfiller opens an HR case (`sn_hr_core_case`).
2. Clicks the **Generate Summary** UI Action.
3. Server-side UI Action:
   - Instantiates `HRCaseAISummariser`
   - Calls `summariseCase(current.sys_id)`
   - Gets structured result
   - Formats it into a text block
   - Appends to Work notes
4. Fulfiller reviews and edits the AI-generated notes.

## Main components

- `HRCaseAISummariser` (Script Include, global)
  - Data collection (case, profile, activity, similar cases)
  - PII redaction
  - Prompt construction
  - OpenAI call (pluggable)
  - Result normalisation

- `HRCaseAISummariserAjax` (Script Include, global, client callable)
  - Thin wrapper used for future client-side UI

- `Generate Summary` UI Action
  - Server-only, writes into Work notes
