/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["sharp"],
    outputFileTracingIncludes: {
      "/api/process": ["./src/app/fonts/**/*"],
    },
  },
  webpack: (config) => {
    config.externals.push({ sharp: "commonjs sharp" });
    return config;
  },
};

export default nextConfig;
