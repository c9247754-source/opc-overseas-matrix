/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["sharp"],
  },
  webpack: (config, { isServer }) => {
    config.externals.push({
      sharp: "commonjs sharp",
      "onnxruntime-node": "commonjs onnxruntime-node",
    });

    config.resolve.alias = {
      ...config.resolve.alias,
      "onnxruntime-node$": false,
    };

    // Prefer browser builds of onnxruntime-web (avoid ort.node.min.mjs parse errors)
    if (!isServer) {
      config.resolve.conditionNames = [
        "browser",
        "import",
        "module",
        "require",
        "default",
      ];
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    config.module.rules.push({
      test: /ort(\.node)?.*\.mjs$/,
      include: /node_modules/,
      type: "javascript/auto",
    });

    return config;
  },
};

export default nextConfig;
