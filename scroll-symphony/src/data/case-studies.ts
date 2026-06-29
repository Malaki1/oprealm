import { projects } from "./projects";

export type CaseStudy = {
  id: string;
  title: string;
  problem: string;
  productBuilt: string;
  role: string;
  strategy: string;
  result: string;
  proves: string;
  metrics: string[];
};

export const caseStudies: CaseStudy[] = [
  ...projects.map((project) => ({
    id: project.id,
    title: project.name,
    problem:
      project.id === "site-potential"
        ? "Property owners need a simple way to understand hidden feasibility and service providers need qualified demand."
        : project.id === "oprealm"
          ? "Creative AI tools often stop at a single output instead of becoming a connected creation platform."
          : project.id === "ai-agent-automation"
            ? "Businesses lose leverage when websites, forms, follow-up, and operations stay disconnected."
          : project.id === "skillfusion"
            ? "AI tool discovery needed a marketplace structure with a clear user growth path."
            : "A crypto gaming launch needed attention, trust, and conversion in a compressed window.",
    productBuilt: project.longDescription,
    role: project.role,
    strategy:
      "Position the product around a sharp promise, build a visual interface that makes the value obvious, then connect launch, automation, and follow-up systems.",
    result: project.metrics.map((metric) => `${metric.value} ${metric.label}`).join(" | "),
    proves:
      project.id === "solcraft"
        ? "Can build, launch, and generate serious early traction around a digital product."
        : project.id === "skillfusion"
          ? "Can co-found, position, and grow an AI marketplace to thousands of users."
          : project.id === "ai-agent-automation"
            ? "Can turn manual business workflows into automated systems and AI-powered web experiences."
            : project.id === "oprealm"
              ? "Can design a large creative AI product ecosystem with story, game, video, and world-building outputs."
              : "Can combine property data, lead generation, AI reporting, and conversion funnels into a commercial system.",
    metrics: project.metrics.map((metric) => `${metric.value} - ${metric.detail}`)
  })),
  {
    id: "ai-websites",
    title: "AI Websites & Automations",
    problem: "Most websites capture attention but fail to qualify, route, and follow up with the right people.",
    productBuilt:
      "AI websites, lead capture systems, booking workflows, report generators, CRM automations, voice AI agents, and product MVPs.",
    role: "Product builder and automation strategist",
    strategy:
      "Connect every front-end action to a back-end workflow so the website behaves like a revenue system.",
    result: "Visitor intent becomes booked calls, CRM records, follow-up sequences, and product insights.",
    proves: "A website can operate as a growth engine instead of a static brochure.",
    metrics: ["Form -> qualification -> booking", "QR -> report -> lead", "Voice -> transcript -> follow-up"]
  },
  {
    id: "ai-malaki",
    title: "AI Malaki",
    problem: "Visitors need quick answers without waiting for a human conversation.",
    productBuilt:
      "A voice-enabled AI interface with consent messaging, transcript preview, booking intent capture, n8n webhook handoffs, and callback support.",
    role: "AI product builder and automation architect",
    strategy:
      "Use a polished demo mode by default, then activate ElevenLabs, Twilio, calendar, and n8n integrations through environment variables.",
    result: "The portfolio demonstrates the exact AI automation capability it sells.",
    proves: "AI product claims are stronger when the site itself becomes the proof.",
    metrics: ["Voice AI", "Lead qualification", "Calendar booking", "Follow-up automation"]
  }
];
