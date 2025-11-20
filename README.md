# ServiceNow HR Case AI Summarisation

AI-powered summarisation, fact extraction and resolution suggestions for HR Cases in ServiceNow.

---

## 🚀 Overview

This project enhances ServiceNow’s HR Case Management by adding a lightweight AI summariser that:

- Reads HR case details and recent worknotes / comments  
- Filters out PII before sending to OpenAI  
- Summarises the case  
- Extracts important facts and risks  
- Suggests resolution options  
- Generates:
  - A draft note to the employee  
  - A draft internal work note  

The current implementation focuses on **one-click generation into Work notes** via a server-side UI Action.

---

## 🔧 Components

### 1. Script Include: `HRCaseAISummariser`

Core engine that:

- Collects case context
- Fetches recent activity
- Looks up similar closed cases
- Redacts PII
- Builds the LLM prompt
- Calls OpenAI (via a pluggable helper)
- Normalises the response into a stable JSON structure

File: `src/script-includes/HRCaseAISummariser.js`

---

### 2. Script Include: `HRCaseAISummariserAjax`

Client-callable wrapper around the summariser (for future UI usage).

File: `src/script-includes/HRCaseAISummariserAjax.js`

---

### 3. UI Action: `AI – Generate Worknotes`

Server-side UI Action on `sn_hr_core_case` that:

- Calls `HRCaseAISummariser.summariseCase(current.sys_id)`
- Builds a formatted text block
- Appends it to **Work notes**

File: `src/ui-actions/AI_Generate_Worknotes_UIAction.xml`

---

## 🔒 PII Filtering

The summariser includes a simple redaction layer that masks:

- Email addresses
- Phone numbers
- Employee IDs (configurable pattern)
- Postcodes / numeric IDs (basic heuristic)

See: `examples/pii-filtering-examples.md`

---

## 🧠 Prompt Engineering

Prompt includes:

- Case metadata (number, service, state, priority)
- Employee profile basics
- Recent activity on the case
- Similar historical cases with their resolutions
- Clear JSON output contract

Details: `docs/prompt-engineering.md`

---

## 🧪 Example Output

Sample JSON and rendered worknote output: `examples/sample-ai-output.md`

---

## 🗺️ Roadmap

- v1 – Worknotes only (current)
- v1.5 – Better similarity, basic risk flagging
- v2 – Full UI dialog, buttons to push drafts to Additional comments / Work notes

See: `docs/roadmap.md`

---

## ⚙️ Setup

1. Import `HRCaseAISummariser.js` and `HRCaseAISummariserAjax.js` as Script Includes.
2. Ensure `HRCaseAISummariserAjax`:
   - Is in **Global** scope
   - Is marked **Client callable**
3. Configure OpenAI integration in `_callOpenAI()` to use:
   - A REST Message, **or**
   - A shared OpenAI helper Script Include
4. Import the UI Action XML for `AI – Generate Worknotes`.
5. Open any HR case and click **AI – Generate Worknotes**.

---

## 📄 License

MIT – use freely, modify, and extend.

---

## 👤 Author

Created by Nikhil as part of a broader generative AI solutions toolkit for ServiceNow HR.
