import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  devIndicators: false,
  turbopack: {
    root: projectRoot
  },
  images: {
    unoptimized: true
  }
};

export default nextConfig;
