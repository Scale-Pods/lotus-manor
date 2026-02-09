
export const fetchEmailTemplates = async () => {
    try {
        const res = await fetch('/api/templates');
        if (!res.ok) throw new Error("Failed to fetch templates");
        const templates = await res.json();
        // Templates is now an array. We can return it as is or transform it.
        // For caching if needed we can add logic here.
        return templates;
    } catch (e) {
        console.error("Error loading email templates", e);
        return [];
    }
};

export const getEmailDetails = async (stage: string, leadName: string = "Valued Client") => {
    const allTemplates = await fetchEmailTemplates();

    // Filter for email templates and find the one matching the stage
    // stage e.g. "Email 1", "Week 1 - Email 7"
    const template = allTemplates.find((t: any) => t.type === 'email' && stage.includes(t.name));

    if (template) {
        const agentName = process.env.NEXT_PUBLIC_AGENT_NAME || "Adnan Shaikh";

        // Replace placeholders from the fetched content
        let processedContent = template.content
            .replace(/\{\{\s*\$json\.Name\s*\}\}/gi, leadName)
            .replace(/\{\{\s*Name\s*\}\}/gi, leadName)
            .replace(/\[Name\]/gi, leadName)
            .replace(/\{\{\s*Agent\s*Name\s*\}\}/gi, agentName)
            .replace(/\[Agent Name\]/gi, agentName)
            .replace(/\{\{\s*BD_Name\s*\}\}/gi, agentName);

        // Prettify Content:
        // 1. Fix missing space after period (e.g. "me.You") -> "me. You"
        //    Avoids URLs or numbers (simplistic check for Capital letter)
        processedContent = processedContent.replace(/\.([A-Z])/g, '. $1');

        // 2. Ensure Signatures have a newline before them if missing
        //    (e.g. "Best,Adnan" -> "Best,\nAdnan")
        //    Actually, "Best,{{Agent Name}}Lotus..." -> "Best,\nAdnan Shaikh\nLotus..."
        //    Fix specific case from webhook: "Best,Adnan ShaikhLotus" is hard to separate if no delimiter.
        //    But "Best,{{Agent Name}}" usually became "Best,Adnan Shaikh".
        //    Let's try to put a newline before common closings if they are inline.
        const closings = ["Best,", "Regards,", "Cheers,", "Warm regards,"];
        closings.forEach(closing => {
            // If closing is preceded by non-newline char, add newline
            // regex: ([^\n])(Best,) -> $1\n$2
            const re = new RegExp(`([^\\n])(${closing})`, 'g');
            processedContent = processedContent.replace(re, '$1\n\n$2');
        });

        // 3. Ensure double newlines for paragraphs?
        //    If there are single newlines, make them double for wider spacing in UI
        //    But don't double existing double newlines.
        //    processedContent = processedContent.replace(/\n(?!\n)/g, '\n\n'); 
        //    (Maybe too aggressive if list items exist? But valid for these emails)

        // Let's just ensure clear spacing.

        const processedSubject = template.subject
            .replace(/\{\{\s*\$json\.Name\s*\}\}/gi, leadName)
            .replace(/\{\{\s*Name\s*\}\}/gi, leadName)
            .replace(/\[Name\]/gi, leadName);

        return {
            subject: processedSubject,
            content: processedContent,
            loop: template.category || "Intro Loop"
        };
    }

    return {
        subject: `Outreach: ${stage}`,
        content: "Content not available in current data view.",
        loop: "Unknown Loop"
    };
};
