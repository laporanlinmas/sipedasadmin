/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Serve public/pedestrian and public/poskamling as static directories
  // Next.js automatically serves all files in /public as static assets
  experimental: {
    serverComponentsExternalPackages: []
  }
};

module.exports = nextConfig;
