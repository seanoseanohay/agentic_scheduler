/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict mode catches double-render bugs early
  reactStrictMode: true,
  // Standalone output for Docker/Azure Container Apps
  output: 'standalone',
  // Transpile internal workspace packages
  transpilePackages: ['@oneshot/shared-types'],
  experimental: {
    // Server Actions enabled for form submissions (production + local)
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        'oneshot-web.greenocean-2a0e4b84.centralus.azurecontainerapps.io',
      ],
    },
  },
}

export default nextConfig
