/** @type {import('next').NextConfig} */
const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || (repoName ? `/${repoName}` : "");

const nextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  basePath,
  assetPrefix: basePath,
  images: {
    unoptimized: true
  }
};

export default nextConfig;
