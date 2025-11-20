# Sample AI Output

```json
{
  "case_summary": [
    "Employee reports incorrect leave balance after recent system migration.",
    "Payroll adjustment has been partially applied but not visible in the employee portal.",
    "Employee is seeking confirmation and a corrected statement before the next pay cycle."
  ],
  "key_facts": [
    "Case relates to leave and payroll integration.",
    "Recent HR system migration is likely involved.",
    "No indication of misconduct or ER risk at this stage."
  ],
  "resolution_options": [
    "Validate the leave balance directly in the source payroll system and compare with HR system.",
    "Raise a ticket with the HR IT team if a sync issue is confirmed.",
    "Send a clear explanation to the employee including expected correction date.",
    "Add internal notes to capture any manual adjustments for audit."
  ],
  "draft_note_employee": "Hi [Employee],\n\nThank you for raising this. I have reviewed your leave balance and can see that a correction is required following the recent system update. I am coordinating with our payroll and HR systems team to ensure the correct balance is reflected. I will provide you with an update and a confirmed leave balance by [date].\n\nPlease let me know if you have any urgent leave planned before then.\n\nKind regards,\n[Your Name]",
  "draft_work_note": "AI summary: Employee reports incorrect leave balance after system migration. Initial review indicates a mismatch between HR system and payroll. Next steps: 1) Confirm correct balance in source payroll system, 2) Log issue with HR IT if sync problem is confirmed, 3) Communicate updated balance and expected correction date to employee. No ER risk identified at this time."
}


---

## 🧪 `examples/pii-filtering-examples.md`

```md
# PII Filtering Examples

Input snippet:

> "Hi, my name is John Smith, employee ID EMP123456.  
> You can reach me at john.smith@company.com or +61 400 123 456.  
> My postal code is 2000."

After `_redactPII()`:

> "Hi, my name is John Smith, employee ID [REDACTED_EMP_ID].  
> You can reach me at [REDACTED_EMAIL] or [REDACTED_PHONE].  
> My postal code is [REDACTED_NUM]."

Extend patterns based on your org’s identifiers:

- Staff numbers
- Customer numbers
- National IDs (if present)

