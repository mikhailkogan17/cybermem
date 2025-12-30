
/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  output: 'standalone',
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
