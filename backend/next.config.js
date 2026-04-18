/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // 限制 API 请求体大小：普通接口 1MB，vision 接口单独处理（图片最大 10MB）
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb',
    },
  },
}

module.exports = nextConfig


