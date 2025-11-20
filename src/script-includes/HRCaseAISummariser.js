var HRCaseAISummariser = Class.create();
HRCaseAISummariser.prototype = {
    initialize: function () {},

    /**
     * Public entry point.
     * Returns a stable JSON structure used by:
     *  - UI Action (worknotes)
     *  - Ajax Script Include (future UI)
     */
    summariseCase: function (caseSysId) {
        if (!caseSysId)
            throw 'No HR Case sys_id provided';

        var ctx = this._buildCaseContext(caseSysId);

        var prompt = this._buildPrompt(ctx);
        var redactedPrompt = this._redactPII(prompt);

        var llmResponse = this._callOpenAI(redactedPrompt); // { case_summary, key_facts, resolution_options, draft_note_employee, draft_work_note }

        return {
            success: true,
            case_sys_id: caseSysId,
            case_summary: llmResponse.case_summary || [],
            key_facts: llmResponse.key_facts || [],
            resolution_options: llmResponse.resolution_options || [],
            draft_note_employee: llmResponse.draft_note_employee || '',
            draft_work_note: llmResponse.draft_work_note || ''
        };
    },

    /**
     * Build raw context from the HR case.
     */
    _buildCaseContext: function (caseSysId) {
        var gr = new GlideRecord('sn_hr_core_case');
        if (!gr.get(caseSysId))
            throw 'HR Case not found: ' + caseSysId;

        var ctx = {};

        ctx.case = {
            sys_id: gr.getUniqueValue(),
            number: gr.getValue('number'),
            short_description: gr.getValue('short_description'),
            description: gr.getValue('description'),
            state: gr.getDisplayValue('state'),
            priority: gr.getDisplayValue('priority'),
            hr_service: gr.getDisplayValue('hr_service'),
            opened_by: gr.getDisplayValue('opened_for') || gr.getDisplayValue('opened_by'),
            opened_at: gr.getDisplayValue('opened_at'),
            assigned_to: gr.getDisplayValue('assigned_to'),
            assignment_group: gr.getDisplayValue('assignment_group')
        };

        ctx.profile = this._getHRProfile(gr.getValue('opened_for'));
        ctx.activity = this._getRecentActivity(gr.getUniqueValue(), 10);
        ctx.similar_cases = this._getSimilarCases(gr, 5);

        return ctx;
    },

    /**
     * Basic HR profile context for opened_for.
     */
    _getHRProfile: function (userSysId) {
        var profile = {
            user_sys_id: userSysId || '',
            title: '',
            department: '',
            location: '',
            employment_status: ''
        };

        if (!userSysId)
            return profile;

        var u = new GlideRecord('sys_user');
        if (!u.get(userSysId))
            return profile;

        profile.title = u.getValue('title') || '';
        profile.department = u.getDisplayValue('department') || '';
        profile.location = u.getDisplayValue('location') || '';
        profile.employment_status = u.getValue('u_employment_status') || '';

        return profile;
    },

    /**
     * Get recent work_notes & comments for the case.
     */
    _getRecentActivity: function (caseSysId, limit) {
        var results = [];
        var max = limit || 10;

        var j = new GlideRecord('sys_journal_field');
        j.addQuery('element_id', caseSysId);
        j.addQuery('name', 'sn_hr_core_case');
        j.addQuery('element', 'IN', 'work_notes,comments');
        j.orderByDesc('sys_created_on');
        j.setLimit(max);
        j.query();

        while (j.next()) {
            results.push({
                type: j.getValue('element'),
                created_on: j.getDisplayValue('sys_created_on'),
                created_by: j.getDisplayValue('sys_created_by'),
                value: j.getValue('value')
            });
        }

        return results;
    },

    /**
     * Very simple "similar cases" lookup based on hr_service and short_description.
     */
    _getSimilarCases: function (currentCaseGR, limit) {
        var results = [];

        if (!currentCaseGR || !currentCaseGR.isValidRecord())
            return results;

        var hrService = currentCaseGR.getValue('hr_service');
        var shortDesc = currentCaseGR.getValue('short_description') || '';
        var max = limit || 5;

        var gr = new GlideRecord('sn_hr_core_case');
        if (hrService)
            gr.addQuery('hr_service', hrService);

        // adjust states for your implementation
        gr.addQuery('state', 'IN', '3,7'); // Closed / Resolved (example)

        // naive match: first "meaningful" word in short description
        var words = shortDesc.split(/\s+/);
        var searchTerm = '';
        for (var i = 0; i < words.length && i < 4; i++) {
            if (words[i].length > 3) {
                searchTerm = words[i];
                break;
            }
        }
        if (searchTerm) {
            gr.addQuery('short_description', 'CONTAINS', searchTerm);
        }

        // exclude current case
        gr.addQuery('sys_id', '!=', currentCaseGR.getUniqueValue());

        gr.orderByDesc('sys_updated_on');
        gr.setLimit(max);
        gr.query();

        while (gr.next()) {
            results.push(this._buildSimilarCaseSummary(gr));
        }

        return results;
    },

    _buildSimilarCaseSummary: function (caseGR) {
        var obj = {
            number: caseGR.getValue('number'),
            short_description: caseGR.getValue('short_description'),
            resolution_summary: ''
        };

        var closeNotes = caseGR.getValue('close_notes') || caseGR.getValue('u_resolution_notes');
        if (closeNotes) {
            obj.resolution_summary = closeNotes;
        } else {
            // last work_note as a fallback
            var j = new GlideRecord('sys_journal_field');
            j.addQuery('element_id', caseGR.getUniqueValue());
            j.addQuery('name', 'sn_hr_core_case');
            j.addQuery('element', 'work_notes');
            j.orderByDesc('sys_created_on');
            j.setLimit(1);
            j.query();
            if (j.next()) {
                obj.resolution_summary = j.getValue('value');
            }
        }

        return obj;
    },

    /**
     * Prompt builder: includes case details, profile, activity, similar cases and the JSON contract.
     */
    _buildPrompt: function (ctx) {
        var lines = [];

        lines.push('Context: You are assisting an HR fulfiller working on an HR case in ServiceNow.');
        lines.push('');

        lines.push('Case details:');
        lines.push('- Case number: ' + ctx.case.number);
        lines.push('- HR service: ' + ctx.case.hr_service);
        lines.push('- Priority: ' + ctx.case.priority);
        lines.push('- State: ' + ctx.case.state);
        lines.push('- Opened: ' + ctx.case.opened_at + ' by ' + ctx.case.opened_by);
        lines.push('- Assigned to: ' + ctx.case.assigned_to + ' / ' + ctx.case.assignment_group);
        lines.push('');

        lines.push('Employee profile (for context):');
        lines.push('- Role/title: ' + ctx.profile.title);
        lines.push('- Department: ' + ctx.profile.department);
        lines.push('- Location: ' + ctx.profile.location);
        lines.push('- Employment status: ' + ctx.profile.employment_status);
        lines.push('');

        lines.push('Current case description:');
        lines.push('Short description: ' + ctx.case.short_description);
        lines.push('Full description: ' + ctx.case.description);
        lines.push('');

        lines.push('Recent activity on the current case (most recent first):');
        for (var i = 0; i < ctx.activity.length; i++) {
            var a = ctx.activity[i];
            lines.push('- [' + a.type + '] ' + a.created_on + ' by ' + a.created_by + ': ' + a.value);
        }
        lines.push('');

        lines.push('Similar historical cases (already resolved/closed):');
        if (ctx.similar_cases && ctx.similar_cases.length > 0) {
            for (var j = 0; j < ctx.similar_cases.length; j++) {
                var c = ctx.similar_cases[j];
                lines.push('- Case ' + c.number + ': ' + c.short_description);
                if (c.resolution_summary) {
                    lines.push('  Resolution summary: ' + c.resolution_summary);
                }
            }
        } else {
            lines.push('- None found.');
        }
        lines.push('');

        lines.push('Using the above, focus on practical next steps for the current case.');
        lines.push('When suggesting options, prefer approaches that are consistent with how similar cases were resolved,');
        lines.push('but always adapt to the specific details and risks of the current case.');
        lines.push('');

        lines.push('Return ONLY a valid JSON object, no surrounding text or markdown, with the following shape:');
        lines.push('{');
        lines.push('  "case_summary": [ "string", "string", "..." ],');
        lines.push('  "key_facts": [ "string", "string", "..." ],');
        lines.push('  "resolution_options": [ "string", "string", "..." ],');
        lines.push('  "draft_note_employee": "string",');
        lines.push('  "draft_work_note": "string"');
        lines.push('}');
        lines.push('');
        lines.push('Guidelines:');
        lines.push('- "case_summary": 3–5 bullet points, max ~150 words total.');
        lines.push('- "key_facts": bullets for policies, missing info, and risks (ER, legal, privacy, etc.).');
        lines.push('- "resolution_options": 2–4 concrete next steps, informed by patterns from similar cases where appropriate.');
        lines.push('- "draft_note_employee": short, professional, neutral; never commit to actions not yet taken.');
        lines.push('- "draft_work_note": short internal summary + next steps for HR team members.');
        lines.push('- Strict JSON only. No comments, no extra text.');

        return lines.join('\n');
    },

    /**
     * Very simple PII redaction. Extend as needed.
     */
    _redactPII: function (text) {
        if (!text)
            return '';

        var t = text;

        // emails
        t = t.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[REDACTED_EMAIL]');

        // phone numbers (very rough)
        t = t.replace(/\b(\+?\d[\d\-\s]{7,}\d)\b/g, '[REDACTED_PHONE]');

        // employee IDs (example: EMP123456)
        t = t.replace(/\bEMP\d{4,}\b/g, '[REDACTED_EMP_ID]');

        // postcodes / short numeric ids (rough)
        t = t.replace(/\b\d{4,6}\b/g, '[REDACTED_NUM]');

        return t;
    },

    /**
     * Call OpenAI (or compatible) and parse JSON.
     * Replace the body of this method with your actual REST call / helper.
     */
    _callOpenAI: function (prompt) {
        // TODO: wire this up to your existing OpenAI integration.
        // Example pattern using a REST Message:
        //
        // var rm = new sn_ws.RESTMessageV2('x_your_app_openai', 'chat_completion');
        // rm.setStringParameterNoEscape('prompt', prompt);
        // var response = rm.execute();
        // var body = response.getBody();
        // var obj = JSON.parse(body);
        // return obj;
        //
        // For now, return a dummy object to keep structure clear.

        return {
            case_summary: [
                'Example summary line 1',
                'Example summary line 2'
            ],
            key_facts: [
                'Example fact 1',
                'Example fact 2'
            ],
            resolution_options: [
                'Example option 1',
                'Example option 2'
            ],
            draft_note_employee: 'Example draft message to employee.',
            draft_work_note: 'Example internal work note for HR team.'
        };
    },

    type: 'HRCaseAISummariser'
};
