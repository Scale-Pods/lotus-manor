export interface RawLeadsResponse {
    nr_wf: any[];
    followup: any[];
    nurture: any[];
}

export interface ConsolidatedLead {
    id: string;
    lead_id?: string;
    name: string;
    phone: string;
    email: string;
    replied: string;
    current_loop: string;
    source_loop: string;
    stages_passed: string[];
    stage_data: Record<string, any>; // Stores raw column values for each stage
    created_at: string;
    updated_at: string;
    last_contacted?: string;
    sender_email?: string;
    dropped?: string | boolean;
    collapsed_date?: string;
    email_replied?: string;
    whatsapp_replied?: string;
    "W.P_1 TS"?: string;
    "W.P_2 TS"?: string;
    [key: string]: any;
}

function getVal(obj: any, keys: string[]) {
    if (!obj) return undefined;
    for (const key of keys) {
        if (obj[key] !== undefined && obj[key] !== null) return obj[key];
    }
    const normalizedTargetKeys = keys.map(k => k.toLowerCase().replace(/[\s._-]/g, ''));
    for (const actualKey in obj) {
        const normalizedActual = actualKey.toLowerCase().replace(/[\s._-]/g, '');
        if (normalizedTargetKeys.includes(normalizedActual)) {
            return obj[actualKey];
        }
    }
    return undefined;
}

function getWhatsAppHistory(l: any) {
    const history: any = {};
    for (let i = 1; i <= 10; i++) {
        history[`W.P_Replied_${i}`] = getVal(l, [`W.P_Replied ${i}`, `W.P_Replied_${i}`]);
        history[`W.P_FollowUp_${i}`] = getVal(l, [`W.P_FollowUp ${i}`, `W.P_FollowUp_${i}`]);
    }
    return history;
}

export function consolidateLeads(data: RawLeadsResponse): ConsolidatedLead[] {
    const consolidatedLeads: ConsolidatedLead[] = [];

    // 1. Map nr_wf (Intro Loop)
    if (Array.isArray(data.nr_wf)) {
        data.nr_wf.forEach((l: any, idx: number) => {
            const stages: string[] = [];
            const stage_data: Record<string, any> = {};

            const emailKeys = ["Email_1", "Email_2", "Email_3"];
            emailKeys.forEach((key, i) => {
                const val = getVal(l, [key, `Email ${i + 1}`]);
                if (val) {
                    const stageName = `Email ${i + 1}`;
                    stages.push(stageName);
                    stage_data[stageName] = val;
                }
            });

            const wpKeys = ["W.P_1", "W.P_2"];
            wpKeys.forEach((key, i) => {
                const val = getVal(l, [key]);
                if (val) {
                    const stageName = `WhatsApp ${i + 1}`;
                    stages.push(stageName);
                    stage_data[stageName] = val;
                }
            });

            const others = ["Voice 1", "Voice 2", "FollowUp 48 Hr"];
            others.forEach(key => {
                const val = getVal(l, [key]);
                if (val) {
                    stages.push(key);
                    stage_data[key] = val;
                }
            });

            consolidatedLeads.push({
                id: String(getVal(l, ["Lead ID", "id"]) || `intro-${idx}`),
                lead_id: getVal(l, ["Lead ID"]),
                name: String(getVal(l, ["Name"]) || "Lead"),
                phone: String(getVal(l, ["Phone"]) || ""),
                email: String(getVal(l, ["Email"]) || "No Email"),
                replied: String(getVal(l, ["Replied", "W.P_Replied"]) || "No"),
                current_loop: "Intro",
                source_loop: "Intro",
                stages_passed: stages,
                stage_data,
                created_at: getVal(l, ["Created At", "created_at"]) || new Date().toISOString(),
                updated_at: getVal(l, ["Updated At", "updated_at"]),
                last_contacted: getVal(l, ["Last Contacted", "last_contacted"]),
                sender_email: getVal(l, ["Senders email", "sender_email"]),
                email_replied: getVal(l, ["Email_Replied", "Email Replied"]),
                whatsapp_replied: getVal(l, ["W.P_Replied", "Replied", "whatsapp_replied"]),
                "W.P_1": getVal(l, ["W.P_1"]),
                "W.P_2": getVal(l, ["W.P_2"]),
                "W.P_3": getVal(l, ["W.P_3"]),
                "W.P_4": getVal(l, ["W.P_4"]),
                "W.P_5": getVal(l, ["W.P_5"]),
                "W.P_6": getVal(l, ["W.P_6"]),
                "W.P_FollowUp": getVal(l, ["W.P_FollowUp"]),
                "W.P_Replied": getVal(l, ["W.P_Replied", "whatsapp_replied"]),
                "W.P_1 TS": getVal(l, ["W.P_1 TS"]),
                "W.P_2 TS": getVal(l, ["W.P_2 TS"]),
                ...getWhatsAppHistory(l)
            });
        });
    }

    // 2. Map followup (Follow Up Loop)
    if (Array.isArray(data.followup)) {
        data.followup.forEach((l: any, idx: number) => {
            const stages: string[] = [];
            const stage_data: Record<string, any> = {};

            // Follow-up Emails 1-3 map to Dashboard Email 4-6
            for (let i = 1; i <= 3; i++) {
                const val = getVal(l, [`Email ${i}`, `Email_${i}`]);
                if (val) {
                    const stageName = `Email ${3 + i}`;
                    stages.push(stageName);
                    stage_data[stageName] = val;
                }
            }

            const wpVal = getVal(l, ["W.P_FollowUp"]);
            if (wpVal) {
                stages.push("WhatsApp FollowUp");
                stage_data["WhatsApp FollowUp"] = wpVal;
            }

            consolidatedLeads.push({
                id: String(getVal(l, ["Lead ID", "id"]) || `followup-${idx}`),
                lead_id: getVal(l, ["Lead ID"]),
                name: String(getVal(l, ["Name"]) || "Lead"),
                phone: String(getVal(l, ["Phone"]) || ""),
                email: String(getVal(l, ["Email"]) || "No Email"),
                replied: String(getVal(l, ["Replied", "Email_Replied"]) || "No"),
                current_loop: "Follow Up",
                source_loop: "followup",
                stages_passed: stages,
                stage_data,
                created_at: getVal(l, ["Created At", "created_at"]) || new Date().toISOString(),
                updated_at: getVal(l, ["Updated At", "updated_at"]),
                last_contacted: getVal(l, ["Last Contacted"]),
                dropped: getVal(l, ["Dropped"]),
                sender_email: getVal(l, ["Senders email"]),
                email_replied: getVal(l, ["Email_Replied", "Email Replied"]),
                whatsapp_replied: getVal(l, ["W.P_Replied", "Replied", "whatsapp_replied"]),
                "W.P_1": getVal(l, ["W.P_1"]),
                "W.P_2": getVal(l, ["W.P_2"]),
                "W.P_3": getVal(l, ["W.P_3"]),
                "W.P_4": getVal(l, ["W.P_4"]),
                "W.P_5": getVal(l, ["W.P_5"]),
                "W.P_6": getVal(l, ["W.P_6"]),
                "W.P_FollowUp": getVal(l, ["W.P_FollowUp"]),
                "W.P_Replied": getVal(l, ["W.P_Replied", "whatsapp_replied"]),
                "W.P_1 TS": getVal(l, ["W.P_1 TS"]),
                "W.P_2 TS": getVal(l, ["W.P_2 TS"]),
                ...getWhatsAppHistory(l)
            });
        });
    }

    // 3. Map nurture (Nurture Loop)
    if (Array.isArray(data.nurture)) {
        data.nurture.forEach((l: any, idx: number) => {
            const stages: string[] = [];
            const stage_data: Record<string, any> = {};

            // Nurture Email_1-9 map to Dashboard Email 7-15
            for (let i = 1; i <= 9; i++) {
                const val = getVal(l, [`Email_${i}`, `Email ${i}`]);
                if (val) {
                    const stageName = `Email ${6 + i}`;
                    stages.push(stageName);
                    stage_data[stageName] = val;
                }
            }

            for (let i = 1; i <= 6; i++) {
                const val = getVal(l, [`W.P_${i}`]);
                if (val) {
                    const stageName = `WhatsApp ${i}`;
                    stages.push(stageName);
                    stage_data[stageName] = val;
                }
            }

            const wpFollowVal = getVal(l, ["W.P_FollowUp"]);
            if (wpFollowVal) {
                stages.push("WhatsApp FollowUp");
                stage_data["WhatsApp FollowUp"] = wpFollowVal;
            }

            let currentWeek = "";
            if (getVal(l, ["Week 1"])) currentWeek = "Week 1";
            if (getVal(l, ["Week 2"])) currentWeek = "Week 2";
            if (getVal(l, ["Week 3"])) currentWeek = "Week 3";

            consolidatedLeads.push({
                id: String(getVal(l, ["Lead ID", "id"]) || `nurture-${idx}`),
                lead_id: getVal(l, ["Lead ID"]),
                name: String(getVal(l, ["Name"]) || "Lead"),
                phone: String(getVal(l, ["Phone"]) || ""),
                email: String(getVal(l, ["Email"]) || "No Email"),
                replied: String(getVal(l, ["Replied", "Email_Replied", "W.P_Replied"]) || "No"),
                current_loop: "Nurture",
                source_loop: "nurture",
                stages_passed: stages,
                stage_data,
                current_week: currentWeek,
                created_at: getVal(l, ["Created At", "created_at"]) || new Date().toISOString(),
                updated_at: getVal(l, ["Updated At", "updated_at"]),
                last_contacted: getVal(l, ["Last Contacted"]),
                dropped: getVal(l, ["Dropped"]),
                sender_email: getVal(l, ["Senders email"]),
                email_replied: getVal(l, ["Email_Replied", "Email Replied"]),
                whatsapp_replied: getVal(l, ["W.P_Replied", "Replied", "whatsapp_replied"]),
                "W.P_1": getVal(l, ["W.P_1"]),
                "W.P_2": getVal(l, ["W.P_2"]),
                "W.P_3": getVal(l, ["W.P_3"]),
                "W.P_4": getVal(l, ["W.P_4"]),
                "W.P_5": getVal(l, ["W.P_5"]),
                "W.P_6": getVal(l, ["W.P_6"]),
                "W.P_FollowUp": getVal(l, ["W.P_FollowUp"]),
                "W.P_Replied": getVal(l, ["W.P_Replied", "whatsapp_replied"]),
                "W.P_1 TS": getVal(l, ["W.P_1 TS"]),
                "W.P_2 TS": getVal(l, ["W.P_2 TS"]),
                ...getWhatsAppHistory(l)
            });
        });
    }

    return consolidatedLeads;
}
