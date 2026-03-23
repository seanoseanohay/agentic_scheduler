/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict mode catches double-render bugs early
  reactStrictMode: true,
  // Standalone output for Docker/Azure Container Apps
  output: 'standalone',
  // Transpile internal workspace packages
  transpilePackages: ['@oneshot/shared-types'],
  experimental: {
    // Server Actions enabled for form submissions
    serverActions: { allowedOrigins: ['localhost:3000'] },
  },
}

export default nextConfig
