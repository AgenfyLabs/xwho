import type { NextConfig } from "next";

const config: NextConfig = {
  agentRules: false,
  outputFileTracingIncludes: { "/*": ["./data/**/*.json", "./data/creators/.gitkeep"] },
  poweredByHeader: false,
};

export default config;
