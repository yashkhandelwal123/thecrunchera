import type { RequestHandler } from "express";

/** Baseline headers without restricting third-party scripts, frames or API calls. */
export function securityHeaders(production = process.env.NODE_ENV === "production"): RequestHandler {
  return (req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    if (production) {
      res.setHeader("X-Frame-Options", "SAMEORIGIN");
      // This controls who embeds our site, not Razorpay/Google frames we embed.
      // A script-src policy requires a separate integration audit before enforcement.
      res.setHeader("Content-Security-Policy", "frame-ancestors 'self'; base-uri 'self'; object-src 'none'");
      // Start with one day, HTTPS only; do not opt other subdomains into HSTS.
      if (req.secure) res.setHeader("Strict-Transport-Security", "max-age=86400");
    }
    next();
  };
}
