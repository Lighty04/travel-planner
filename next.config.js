/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    // Force axios and node-html-parser to be included in standalone build
    serverComponentsExternalPackages: ['axios', 'node-html-parser'],
  },
}

module.exports = nextConfig
