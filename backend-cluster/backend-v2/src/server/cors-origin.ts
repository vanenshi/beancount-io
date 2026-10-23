import type { Environment } from "@/config/config";
import { isDevelopmentHostname } from "@/shared/development-hosts";

/**
 * Resolve the value of `Access-Control-Allow-Origin` for a request.
 *
 * Returns the echoed origin when allowed, `"*"` for same-origin requests that
 * carry no `Origin` header, and `""` to reject — an empty string makes
 * `@koa/cors` omit the header entirely.
 */
export function resolveCorsOrigin(origin: string, env: Environment): string {
  // Same-origin request, no CORS involved.
  if (!origin) {
    return "*";
  }

  let hostname: string;
  try {
    hostname = new URL(origin).hostname;
  } catch {
    return "";
  }

  // Production and staging.
  if (hostname === "beancount.io" || hostname.endsWith(".beancount.io")) {
    return origin;
  }

  // Development on the machine itself, any port.
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return origin;
  }

  // A container reached by its OrbStack (or other dev-only) domain.
  if (env !== "production" && isDevelopmentHostname(hostname)) {
    return origin;
  }

  return "";
}
