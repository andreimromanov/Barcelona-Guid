/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias['@react-native-async-storage/async-storage'] = false;
    return config;
  },
  images: {
    domains: [
      "upload.wikimedia.org", // для Википедии
    ],
  },
  async headers() {
    return [
      {
        source: '/.well-known/farcaster.json',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ]
  },
};

module.exports = nextConfig;
