var HRCaseAISummariserAjax = Class.create();
HRCaseAISummariserAjax.prototype = Object.extendsObject(AbstractAjaxProcessor, {

    /**
     * Client-callable entry point.
     * Expected to be invoked via GlideAjax from client-side code.
     */
    getSummary: function () {
        var caseId = this.getParameter('sysparm_case_sys_id');
        if (!caseId)
            return JSON.stringify({ success: false, error: 'No case id provided' });

        try {
            var s = new HRCaseAISummariser();
            var result = s.summariseCase(caseId);

            return JSON.stringify({
                success: true,
                data: result
            });
        } catch (e) {
            gs.error('HRCaseAISummariserAjax.getSummary error: ' + e);
            return JSON.stringify({
                success: false,
                error: '' + e
            });
        }
    },

    type: 'HRCaseAISummariserAjax'
});
