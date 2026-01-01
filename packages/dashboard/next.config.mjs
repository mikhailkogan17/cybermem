
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
  transpilePackages: ['recharts'],
  serverExternalPackages: ['dockerode', 'ssh2'],
  experimental: {
  },
  webpack: (config) => {
    config.externals = [...(config.externals || []), 'ssh2', 'dockerode'];
    return config;
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
