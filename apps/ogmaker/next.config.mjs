/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["sharp", "satori"],
    outputFileTracingIncludes: {
      "/api/process": ["./src/lib/fonts/**/*", "./src/app/fonts/**/*"],
    },
  },
  webpack: (config) => {
    config.externals.push({ sharp: "commonjs sharp" });
    return config;
  },
};

export default nextConfig;
