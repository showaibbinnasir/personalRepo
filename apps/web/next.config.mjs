/**
 * The browser never calls the API directly. Requests to /backend/* on this site are
 * passed through to the Express API, so the admin login cookie is a first-party cookie
 * on the website's own domain. That avoids CORS and third-party-cookie problems
 * (localhost vs 127.0.0.1 locally, Safari in production).
 */
const apiUrl = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ibb.co" },
      { protocol: "https", hostname: "ibb.co" },
      { protocol: "https", hostname: "*.imgbb.com" }
    ]
  },
  // Fonts used by the generated story-card images.
  outputFileTracingIncludes: {
    "/blog/[slug]/story": ["./assets/fonts/**/*"],
    "/projects/[id]/story": ["./assets/fonts/**/*"]
  },
  async rewrites() {
    return [{ source: "/backend/:path*", destination: `${apiUrl}/:path*` }];
  }
};

export default nextConfig;
