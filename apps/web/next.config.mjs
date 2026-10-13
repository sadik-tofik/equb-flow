/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@equbflow/domain', '@equbflow/db'],
};

export default nextConfig;
