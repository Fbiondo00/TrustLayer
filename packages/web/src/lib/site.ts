export const siteConfig = {
  name: "TrustLayer",
  title: "TrustLayer — Credit score for smart contracts",
  description:
    "TrustLayer is the wallet-agnostic preflight check for AI agents. Before you connect your wallet, you check the score. Mechanical first, AI explains.",
  url: "https://trustlayer.xyz",
  locale: "en_US",
  keywords: [
    "AI agents",
    "crypto security",
    "trust score",
    "smart contract audit",
    "Slither",
    "Dedaub",
    "wallet safety",
    "preflight check",
  ],
  contact: {
    email: "hello@trustlayer.xyz",
  },
  social: {
    twitter: "https://twitter.com/trustlayer",
    github: "https://github.com/Fbiondo00/TrustLayer",
  },
} as const;

export type NavItem = {
  label: string;
  href: string;
};

export const navLinks: NavItem[] = [
  { label: "Scanner", href: "/scanner" },
  { label: "Layers", href: "#services" },
  { label: "Pipeline", href: "#process" },
  { label: "Numbers", href: "#results" },
  { label: "Access", href: "#packages" },
  { label: "FAQ", href: "#faq" },
];

export const footerLinks: NavItem[] = [
  { label: "Scanner", href: "/scanner" },
  { label: "Layers", href: "#services" },
  { label: "Pipeline", href: "#process" },
  { label: "Numbers", href: "#results" },
  { label: "Access", href: "#packages" },
];
