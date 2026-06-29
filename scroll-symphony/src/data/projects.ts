import {
  Bot,
  BrainCircuit,
  Building2,
  Cable,
  Gamepad2,
  Gem,
  Home,
  Map,
  Network,
  Rocket,
  Sparkles,
  WandSparkles
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Metric = {
  label: string;
  value: string;
  detail: string;
};

export type Project = {
  id: string;
  name: string;
  category: string;
  headline: string;
  shortDescription: string;
  longDescription: string;
  metrics: Metric[];
  role: string;
  icons: LucideIcon[];
  colorTheme: {
    primary: string;
    secondary: string;
    accent: string;
  };
  altText: string;
};

export const projects: Project[] = [
  {
    id: "solcraft",
    name: "Solcraft",
    category: "Crypto Gaming / NFT Launch",
    headline: "Crypto gaming launch with real market traction.",
    shortDescription: "A high-energy crypto gaming project with two major NFT launches.",
    longDescription:
      "Built and launched Solcraft, a crypto gaming project that generated over $150,000 USD in the first 12 hours of its first NFT sale, then repeated similar success with a second sale of approximately $150,000 USD.",
    metrics: [
      { label: "First 12 hours", value: "$150K+", detail: "USD generated during the first NFT sale." },
      { label: "Second launch", value: "$150K+", detail: "Approximate USD generated in the second sale." },
      { label: "Two launches", value: "$300K+", detail: "Total generated across major launches." }
    ],
    role: "Founder, launch strategist, product operator",
    icons: [Gamepad2, Gem, Rocket, Sparkles],
    colorTheme: { primary: "#35a7ff", secondary: "#8a5cff", accent: "#f6c65b" },
    altText: "Solcraft crypto gaming dashboard with floating NFT cards and launch metrics."
  },
  {
    id: "skillfusion",
    name: "Skillfusion.ai",
    category: "AI Marketplace",
    headline: "An AI marketplace scaled to 5,000 users.",
    shortDescription: "A marketplace for AI tools and skills that reached meaningful early adoption.",
    longDescription:
      "Co-founded Skillfusion.ai, an AI marketplace that reached 5,000 users and progressed to the final funding rounds with Founders University by Jason Calacanis.",
    metrics: [
      { label: "Users", value: "5,000", detail: "Reached early marketplace adoption." },
      { label: "Role", value: "Co-founder", detail: "Product, growth, and venture execution." },
      { label: "Funding", value: "Final rounds", detail: "Founders University by Jason Calacanis." }
    ],
    role: "Co-founder, product builder, growth operator",
    icons: [BrainCircuit, Network, Bot, Sparkles],
    colorTheme: { primary: "#42f5d7", secondary: "#35a7ff", accent: "#8a5cff" },
    altText: "Skillfusion AI marketplace dashboard with tool cards and user growth graph."
  },
  {
    id: "ai-agent-automation",
    name: "AI Agent Automation",
    category: "Workflow Systems",
    headline: "AI websites, agents, and automations that replace manual work.",
    shortDescription: "Agent-based websites and workflows that qualify leads, trigger actions, and connect business tools.",
    longDescription:
      "Built AI-powered websites, automation workflows, and agent-based systems designed to reduce manual work, generate leads, and turn business ideas into functional digital products.",
    metrics: [
      { label: "Systems", value: "Multi-agent", detail: "AI sites, forms, voice flows, and workflow routing." },
      { label: "Leverage", value: "Manual -> Auto", detail: "Repeatable business actions handled by connected systems." },
      { label: "Output", value: "Lead engines", detail: "Qualification, booking, follow-up, and CRM-ready payloads." }
    ],
    role: "AI systems builder, workflow architect, automation strategist",
    icons: [Bot, Cable, Network, Sparkles],
    colorTheme: { primary: "#35a7ff", secondary: "#42f5d7", accent: "#8a5cff" },
    altText: "AI Agent Automation network with connected workflow nodes and business dashboards."
  },
  {
    id: "oprealm",
    name: "OPRealm",
    category: "AI Creation Platform",
    headline: "An AI creation platform for stories, games, videos, comics, and worlds.",
    shortDescription: "A creative AI platform that turns children's ideas into interactive outputs.",
    longDescription:
      "Created OPRealm, an AI-powered platform designed to help children turn ideas into storybooks, games, videos, comics, and interactive worlds.",
    metrics: [
      { label: "Creation flow", value: "Ideas -> Worlds", detail: "Story, game, video, comic, and world generation." },
      { label: "Audience", value: "Children", detail: "Creative tools with safety and imagination at the core." },
      { label: "System", value: "AI platform", detail: "Multi-format creative generation." }
    ],
    role: "Founder, product architect, AI workflow designer",
    icons: [WandSparkles, Gamepad2, Sparkles, Bot],
    colorTheme: { primary: "#8a5cff", secondary: "#42f5d7", accent: "#f6c65b" },
    altText: "OPRealm portal with storybook pages, game cards, comic panels, and world builder."
  },
  {
    id: "site-potential",
    name: "Site Potential",
    category: "Property Intelligence / Lead Generation",
    headline: "AI-powered property opportunity detection.",
    shortDescription: "A property feasibility and lead-generation engine for real estate services.",
    longDescription:
      "Built Site Potential, an AI-assisted property feasibility and lead-generation platform designed to identify secondary dwelling opportunities, granny flat potential, pool feasibility, property report automation, and owner-facing unlock funnels.",
    metrics: [
      { label: "Engine", value: "AI feasibility", detail: "Secondary dwelling, pool, and report automation." },
      { label: "Funnel", value: "QR unlock", detail: "Owner-facing report access and lead capture." },
      { label: "Market", value: "Property services", detail: "Builders, property operators, and owner outreach." }
    ],
    role: "Founder, automation strategist, lead-generation architect",
    icons: [Map, Home, Building2, Bot],
    colorTheme: { primary: "#42f5d7", secondary: "#f6c65b", accent: "#35a7ff" },
    altText: "Site Potential property map scan with highlighted parcels and report card."
  }
];

export const projectById = Object.fromEntries(projects.map((project) => [project.id, project])) as Record<
  string,
  Project
>;
