/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // pdf-parse (and its bundled pdf.js) must not be bundled by Next's
    // compiler — bundling breaks its runtime file access and can crash the
    // serverless function. Keep it external so it's required from node_modules
    // at runtime and traced into the Netlify function.
    serverComponentsExternalPackages: ["pdf-parse"],
  },
};

module.exports = nextConfig;
