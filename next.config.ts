import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ["jackylkenbhvhszghcra.supabase.co"],
  },
  // Suppress hydration warnings in development for Radix UI components
  reactStrictMode: true,
  experimental: {
    // This helps with hydration issues
    optimizePackageImports: [
      "@radix-ui/react-dialog",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-dropdown-menu",
    ],
  },
};

export default nextConfig;
