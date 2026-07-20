/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["sharp"],
  },
  // Allow CDN ESM import for @imgly/background-removal (avoids onnxruntime webpack bug)
  images: {
    remotePatterns: [],
  },
  webpack: (config, { isServer }) => {
    config.externals.push({
      sharp: "commonjs sharp",
      "onnxruntime-node": "commonjs onnxruntime-node",
    });

    // Critical: stop webpack rewriting import.meta.url → file:// (breaks ort RelativeURL)
    config.module = config.module || {};
    config.module.parser = config.module.parser || {};
    config.module.parser.javascript = {
      ...(config.module.parser.javascript || {}),
      importMeta: false,
    };

    config.resolve.alias = {
      ...config.resolve.alias,
      "onnxruntime-node$": false,
    };

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    return config;
  },
};

export default nextConfig;
