import { Context } from "koa";
import { isDevelopmentHostname } from "./development-hosts";

export const COOKIE_NAME = "authSess:beancount.io";

interface CookieOptions {
  maxAge: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "strict" | "lax" | "none";
  path: string;
  domain?: string;
}

export function setAuthCookie(
  ctx: Context,
  token: string,
  expireAt: Date,
  isProduction: boolean,
): void {
  ctx.cookies.set(
    COOKIE_NAME,
    token,
    getCookieOptions(ctx, expireAt, isProduction),
  );
}

function getCookieOptions(
  context: Context,
  expireAt: Date,
  isProduction: boolean,
): CookieOptions {
  return {
    // Mirrors the JWT's own expiry so the cookie never outlives the token it carries.
    maxAge: Math.max(0, expireAt.getTime() - Date.now()),
    httpOnly: true, // Prevent JavaScript access
    secure: context.URL.protocol === "https:", // HTTPS only in production
    sameSite: "lax", // CSRF protection
    path: "/",
    domain: authCookieDomain(context.URL.hostname, isProduction),
  };
}

/**
 * The Domain the auth cookie is shared under, so the dashboard's server render
 * receives the cookie the API set on a sibling host.
 *
 * - Production: `.beancount.io`, shared across api.v3.beancount.io,
 *   dashboard.v3.beancount.io, etc.
 * - Development on a dev-only domain: the API host's parent, e.g.
 *   backend-v2.beancount-io.orb.local → beancount-io.orb.local, so
 *   dashboard.beancount-io.orb.local receives it. The parent must itself be
 *   under the dev suffix; a bare `orb.local` or `test` would be rejected.
 * - Otherwise (localhost): host-only. Cookies ignore ports, so the dashboard on
 *   localhost:42600 already receives what localhost:42601 set.
 */
export function authCookieDomain(
  hostname: string,
  isProduction: boolean,
): string | undefined {
  if (isProduction) {
    return ".beancount.io";
  }
  const parent = hostname.slice(hostname.indexOf(".") + 1);
  return isDevelopmentHostname(parent) ? parent : undefined;
}

// Duck-typed on the one call made: Koa and @koa/router contexts carry
// structurally identical cookie jars whose fluent `set` return type (`this`)
// defeats nominal assignability between the two type graphs. The Domain must
// match the one the cookie was set with, or the browser keeps the cookie.
export function clearAuthCookie(
  ctx: {
    URL: URL;
    cookies: {
      set(
        name: string,
        value: string,
        opts: { maxAge: number; domain?: string },
      ): unknown;
    };
  },
  isProduction: boolean,
): void {
  ctx.cookies.set(COOKIE_NAME, "", {
    maxAge: 0,
    domain: authCookieDomain(ctx.URL.hostname, isProduction),
  });
}

/**
 * Read the auth cookie, tolerating a context that has no cookie jar.
 *
 * Not every caller holds a full Koa context: the shared identity gate
 * (`server/api/identity.ts`) accepts anything header-shaped, and Apollo hands
 * GraphQL a context whose declared type is headers-only. A missing jar means
 * "no cookie was presented", which is a legitimate answer — not a crash.
 */
export function getAuthCookieFromCtx(ctx: Context): string | undefined {
  return ctx.cookies?.get(COOKIE_NAME);
}
