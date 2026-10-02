/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === "development";

// HSTS is only sent from a production build. Sending it over plain HTTP in
// development is at best pointless, and browsers that honour it will then
// refuse to talk to a local dev server over http.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Redundant with frame-ancestors in the CSP, and deliberately kept: CSP is
  // set per response by the middleware, this one is unconditional.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), midi=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]),
];

const nextConfig = {
  // Stop the server advertising the exact framework and version it runs on.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;