export const aiMalakiKnowledge = {
  profile: {
    name: "Malaki Aiono",
    positioning: ["Founder", "AI Product Builder", "Automation Strategist", "Growth Operator"],
    coreMessage: "I build digital systems that turn ideas into traction."
  },
  projects: {
    solcraft: {
      category: "Crypto gaming / NFT project",
      facts: [
        "Generated over $150,000 USD in the first 12 hours.",
        "Generated approximately another $150,000 USD in a second NFT launch.",
        "Generated over $300,000 USD across two major launches."
      ]
    },
    skillfusion: {
      category: "AI marketplace",
      facts: [
        "Co-founded by Malaki.",
        "Reached 5,000 users.",
        "Reached final funding rounds with Founders University by Jason Calacanis."
      ]
    },
    oprealm: {
      category: "AI-powered creative platform for children",
      facts: ["Turns ideas into storybooks, games, videos, comics, and interactive worlds."]
    },
    sitePotential: {
      category: "AI-assisted property opportunity engine",
      facts: [
        "Secondary dwelling feasibility.",
        "Granny flat potential.",
        "Pool feasibility.",
        "Property report automation.",
        "QR mailer campaigns.",
        "Lead generation for builders, property operators, and owner outreach."
      ]
    }
  },
  capabilities: [
    "AI product strategy",
    "Automation workflows",
    "AI websites",
    "Lead-generation systems",
    "MVP development",
    "Funnels",
    "Product launches",
    "Go-to-market strategy"
  ]
};

export type FollowUpPayload = {
  name: string;
  email: string;
  phone?: string;
  enquiryType: "booking" | "project-enquiry" | "callback" | "strategy-session";
  projectInterest?: string;
  preferredTime?: string;
  conversationSummary: string;
  sourcePage: string;
  consentTimestamp: string;
};
