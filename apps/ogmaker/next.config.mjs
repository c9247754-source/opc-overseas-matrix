/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["sharp"],
  },
  webpack: (config) => {
    config.externals.push({ sharp: "commonjs sharp" });
    return config;
  },
};

export default nextConfig;
