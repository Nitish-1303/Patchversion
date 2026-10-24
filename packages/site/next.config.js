/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@patchversion/shared'],
};

module.exports = nextConfig;

