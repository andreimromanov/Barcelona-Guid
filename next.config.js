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
};

module.exports = nextConfig;
