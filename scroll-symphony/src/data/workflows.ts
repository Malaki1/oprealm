import { Bot, CalendarCheck, Database, FileText, Mail, Mic, Phone, QrCode, UserCheck } from "lucide-react";

export type WorkflowStep = {
  label: string;
  detail: string;
  icon: typeof Bot;
};

export const aiMalakiWorkflow: WorkflowStep[] = [
  { label: "Visitor", detail: "Asks about projects or a build idea.", icon: UserCheck },
  { label: "Voice AI", detail: "ElevenLabs conversation layer.", icon: Mic },
  { label: "AI Malaki Agent", detail: "Answers, qualifies, and routes intent.", icon: Bot },
  { label: "Lead Qualified", detail: "Project type and urgency captured.", icon: FileText },
  { label: "Meeting Booked", detail: "Calendly or Google Calendar handoff.", icon: CalendarCheck },
  { label: "Follow-Up Email", detail: "n8n confirmation and summary.", icon: Mail },
  { label: "CRM Entry", detail: "Record stored for follow-up.", icon: Database }
];

export const automationWorkflows = [
  [
    { label: "Visitor submits form", detail: "Intent and contact captured.", icon: UserCheck },
    { label: "AI qualifies lead", detail: "Budget, timing, and goal scored.", icon: Bot },
    { label: "Calendar booking", detail: "Strategy session created.", icon: CalendarCheck },
    { label: "Follow-up email", detail: "Context sent automatically.", icon: Mail },
    { label: "CRM updated", detail: "Pipeline record created.", icon: Database }
  ],
  [
    { label: "Owner scans QR", detail: "Mailer unlock begins.", icon: QrCode },
    { label: "Report unlocked", detail: "Property potential revealed.", icon: FileText },
    { label: "Lead captured", detail: "Owner details collected.", icon: UserCheck },
    { label: "Builder notified", detail: "Opportunity routed.", icon: Phone },
    { label: "Next action routed", detail: "Follow-up workflow triggered.", icon: Database }
  ]
];
