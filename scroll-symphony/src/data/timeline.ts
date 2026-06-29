import { Bot, BrainCircuit, Gamepad2, Map, WandSparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type TimelineMilestoneData = {
  id: string;
  year: string;
  title: string;
  category: string;
  description: string;
  badges: string[];
  icon: LucideIcon;
  logo?: {
    src: string;
    alt: string;
    tone?: "light" | "dark";
  };
  accent: "cyan" | "blue" | "violet" | "gold";
};

export const timeline: TimelineMilestoneData[] = [
  {
    id: "solcraft-2022",
    year: "2022",
    title: "Solcraft",
    category: "Crypto Gaming / NFT Launch",
    description:
      "Generated $150,000+ USD in the first 12 hours of the first NFT sale, then repeated the result with a second sale of approximately $150,000+ USD.",
    badges: ["$150K+ First 12 Hours", "$300K+ Across Launches", "Crypto Gaming", "NFT Launch"],
    icon: Gamepad2,
    logo: {
      src: "/logos/solcraft-logo.png",
      alt: "Solcraft logo",
      tone: "dark"
    },
    accent: "gold"
  },
  {
    id: "skillfusion-2024",
    year: "2024",
    title: "Skillfusion.ai",
    category: "AI Marketplace",
    description:
      "Co-founded an AI marketplace that reached 5,000 users and progressed to the final rounds of funding with Founders University by Jason Calacanis.",
    badges: ["5,000 Users", "AI Marketplace", "Co-Founder", "Final Funding Rounds"],
    icon: BrainCircuit,
    logo: {
      src: "/logos/skillfusion-logo.png",
      alt: "Skillfusion.ai logo",
      tone: "dark"
    },
    accent: "cyan"
  },
  {
    id: "ai-agent-automation-2025",
    year: "2025",
    title: "AI Agent Automation",
    category: "Websites, Workflows & Business Systems",
    description:
      "Built AI-powered websites, automation workflows, and agent-based systems designed to reduce manual work, generate leads, and turn business ideas into functional digital products.",
    badges: ["AI Websites", "Agent Systems", "Workflow Automation", "Lead Engines"],
    icon: Bot,
    accent: "blue"
  },
  {
    id: "oprealm-2026",
    year: "2026",
    title: "OPRealm",
    category: "AI Creation Platform",
    description:
      "Created an AI-powered platform for kids to turn ideas into storybooks, games, comics, videos, characters, and interactive worlds.",
    badges: ["AI Storybooks", "Game Creation", "World Builder", "Kids Platform"],
    icon: WandSparkles,
    accent: "violet"
  },
  {
    id: "site-potential-2026",
    year: "2026",
    title: "Site Potential",
    category: "Property Intelligence / Lead Generation",
    description:
      "Built an AI-assisted property opportunity engine for identifying granny flat potential, generating feasibility reports, creating QR mailer funnels, and capturing property-owner leads.",
    badges: ["Property AI", "Feasibility Reports", "QR Mailers", "Lead Generation"],
    icon: Map,
    logo: {
      src: "/logos/site-potential-logo-polished.svg",
      alt: "Polished Site Potential logo with transparent background",
      tone: "dark"
    },
    accent: "cyan"
  }
];
