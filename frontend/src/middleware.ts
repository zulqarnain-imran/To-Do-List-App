import { NextResponse, type NextRequest } from "next/server";

/**
 * Content Security Policy, with a per-request nonce.
 *
 * The nonce is what makes this policy worth having. A static policy has to
 * allow inline scripts, because Next.js emits a small inline bootstrap script
 * into every page, and allowing inline scripts means an injected <script> tag
 * runs too. Minting a fresh nonce for every response means only the scripts
 * Next.js generated for *this* response are permitted, so an injection has
 * nothing to copy.
 *
 * The nonce is published by setting the policy on the request headers as well as
 * the response. Next.js reads it from there and stamps it onto the scripts it
 * renders, which is the documented mechanism and the reason every route in this
 * app is already `force-dynamic`.
 */
export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";

  const csp = [
    "default-src 'self'",
    // 'strict-dynamic' lets the nonced bootstrap script load the rest of the
    // bundle without every chunk needing its own nonce. 'self' stays in the
    // list for browsers that do not implement strict-dynamic.
    // 'unsafe-eval' is required only by the dev server's hot reloading.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${
      isDev ? " 'unsafe-eval'" : ""
    }`,
    // Tailwind ships an external stylesheet, but the category colours and
    // gradients are applied through React style attributes, which cannot be
    // nonced.
    "style-src 'self' 'unsafe-inline'",
    // data: is required because avatars are base64 data URLs held in state.
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    // The app registers a service worker for offline support.
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    // No plugins, no <base> hijack, no form posting to an attacker's origin.
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // Ask the browser to refuse plain HTTP subresources. Omitted in development
    // so it cannot break a local http:// dev server.
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", csp);

  return response;
}

export const config = {
  // Everything that renders HTML or is fetched by the document. Hashed build
  // output and public assets are excluded: they are immutable, they are not
  // documents, and skipping them keeps a nonce off every asset request.
  matcher: [
    /*
     * Every path except:
     *   _next/static  hashed build output
     *   _next/image   the image optimiser
     *   favicon, icons and the manifest
     *   sw.js         the service worker, fetched outside any document
     */
    "/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|icon-maskable-512.png|manifest.webmanifest|sw.js).*)",
  ],
};