
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
        processedContent = processedContent.replace(/\.([A-Z])/g, '. $1');

        // 2. Formatting Salutations (e.g. "Hi Adnan,")
        // Ensure "Hi [Name]," is followed by a double newline
        // Matches: Start of string or newline -> Hi/Hello/Dear -> Name -> Comma/Colon -> Content
        processedContent = processedContent.replace(/(^(?:Hi|Hello|Dear)\s+[^,\n]+[,:])([^\n])/gi, '$1\n\n$2');

        // 3. Formatting Signatures
        // Ensure "Best," "Regards," etc. are preceded by double newline and followed by newline (for name)
        const closings = ["Best,", "Regards,", "Cheers,", "Warm regards,", "Sincerely,"];
        closings.forEach(closing => {
            // Preceded by non-newline: add double newline
            const rePre = new RegExp(`([^\\n])\\s*(${closing})`, 'gi');
            processedContent = processedContent.replace(rePre, '$1\n\n$2');

            // Followed by non-newline: add single newline (for the name)
            const rePost = new RegExp(`(${closing})\\s*([^\\n])`, 'gi');
            processedContent = processedContent.replace(rePost, '$1\n$2');
        });

        // 4. Formatting Company / Signature lines (e.g. "TaraLotus" -> "Tara\nLotus")
        // Specific fix for "Lotus Manor Real Estate" being attached to the name
        processedContent = processedContent.replace(/([a-zA-Z])(Lotus Manor Real Estate)/g, '$1\n$2');
        processedContent = processedContent.replace(/([a-zA-Z])(Sent from my iPhone)/g, '$1\n$2');

        // 4. Try to break long blocks? (Simple heuristic: period followed by space and capital letter could be new sentence, 
        // but we don't want to break every sentence. Let's stick to the specific user example first:
        // "back then.Before I assume" was fixed by step 1.
        // The user wants readable format. The example had distinct thoughts.
        // Let's look for "If you" or "Before I" which are common sentence starts in these templates and add breaks?
        // Maybe better to just rely on the fixed periods and salutation/signature separation for now.

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

export const getEmailDetailsFromTemplates = (stage: string, leadName: string = "Valued Client", allTemplates: any[]) => {
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
        processedContent = processedContent.replace(/\.([A-Z])/g, '. $1');

        // 2. Formatting Salutations (e.g. "Hi Adnan,")
        processedContent = processedContent.replace(/(^(?:Hi|Hello|Dear)\s+[^,\n]+[,:])([^\n])/gi, '$1\n\n$2');

        // 3. Formatting Signatures
        const closings = ["Best,", "Regards,", "Cheers,", "Warm regards,", "Sincerely,"];
        closings.forEach(closing => {
            const rePre = new RegExp(`([^\\n])\\s*(${closing})`, 'gi');
            processedContent = processedContent.replace(rePre, '$1\n\n$2');

            const rePost = new RegExp(`(${closing})\\s*([^\\n])`, 'gi');
            processedContent = processedContent.replace(rePost, '$1\n$2');
        });

        // 4. Formatting Company / Signature lines (e.g. "TaraLotus" -> "Tara\nLotus")
        // Specific fix for "Lotus Manor Real Estate" being attached to the name
        processedContent = processedContent.replace(/([a-zA-Z])(Lotus Manor Real Estate)/g, '$1\n$2');
        processedContent = processedContent.replace(/([a-zA-Z])(Sent from my iPhone)/g, '$1\n$2');

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
