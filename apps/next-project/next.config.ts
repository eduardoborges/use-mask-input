import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: '../../',
    resolveAlias: {
      'use-mask-input': '../../packages/use-mask-input/src/index.tsx',
    },
  },
};

export default nextConfig;
