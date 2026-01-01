
/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  output: 'standalone',
  experimental: {
    serverExternalPackages: ['dockerode', 'ssh2'],
  },
  async rewrites() {
    return [
      {
        source: '/docs',
        destination: '/docs/index.html',
      },
      {
        source: '/docs/:slug',
        destination: '/docs/:slug.html',
      },
    ]
  },
}

export default nextConfig
