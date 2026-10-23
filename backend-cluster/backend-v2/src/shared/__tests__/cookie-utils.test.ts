import {
  COOKIE_NAME,
  authCookieDomain,
  setAuthCookie,
  clearAuthCookie,
  getAuthCookieFromCtx,
} from "../cookie-utils";

const mockCtx = {
  cookies: {
    set: jest.fn(),
    get: jest.fn(),
  },
  URL: new URL("https://api.v3.beancount.io"),
} as any;

describe("cookie-utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("COOKIE_NAME", () => {
    it('should be "authSess:beancount.io"', () => {
      expect(COOKIE_NAME).toBe("authSess:beancount.io");
    });
  });

  describe("setAuthCookie", () => {
    it("should set cookie with secure=true for https context in production", () => {
      const expireAt = new Date(Date.now() + 60 * 60 * 1000);
      setAuthCookie(mockCtx, "mytoken", expireAt, true);
      expect(mockCtx.cookies.set).toHaveBeenCalledWith(
        COOKIE_NAME,
        "mytoken",
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
          domain: ".beancount.io",
        }),
      );
    });

    it("should set cookie with secure=false for http context in development", () => {
      const httpCtx = {
        cookies: { set: jest.fn(), get: jest.fn() },
        URL: new URL("http://localhost:4104"),
      } as any;
      const expireAt = new Date(Date.now() + 60 * 60 * 1000);
      setAuthCookie(httpCtx, "mytoken", expireAt, false);
      expect(httpCtx.cookies.set).toHaveBeenCalledWith(
        COOKIE_NAME,
        "mytoken",
        expect.objectContaining({
          secure: false,
          domain: undefined,
        }),
      );
    });

    it("should derive maxAge from the token's own expireAt", () => {
      const expireAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      setAuthCookie(mockCtx, "mytoken", expireAt, true);
      const options = mockCtx.cookies.set.mock.calls[0][2];
      expect(options.maxAge).toBeGreaterThan(4 * 60 * 1000);
      expect(options.maxAge).toBeLessThanOrEqual(5 * 60 * 1000);
    });
  });

  describe("authCookieDomain", () => {
    it("shares the cookie across beancount.io in production", () => {
      expect(authCookieDomain("api.v3.beancount.io", true)).toBe(
        ".beancount.io",
      );
    });

    it("shares an OrbStack API host's cookie with its sibling dashboard", () => {
      // backend-v2.beancount-io.orb.local sets it; dashboard.beancount-io.orb.local reads it.
      expect(authCookieDomain("backend-v2.beancount-io.orb.local", false)).toBe(
        "beancount-io.orb.local",
      );
    });

    it("keeps localhost and bare dev suffixes host-only", () => {
      for (const host of [
        "localhost",
        "127.0.0.1",
        "api.localhost",
        "api.test",
        "x.orb.local",
      ]) {
        expect(authCookieDomain(host, false)).toBeUndefined();
      }
    });
  });

  describe("clearAuthCookie", () => {
    it("clears with the Domain the cookie was set with", () => {
      clearAuthCookie(mockCtx, true);
      expect(mockCtx.cookies.set).toHaveBeenCalledWith(COOKIE_NAME, "", {
        maxAge: 0,
        domain: ".beancount.io",
      });
    });

    it("clears host-only on localhost", () => {
      const httpCtx = {
        cookies: { set: jest.fn(), get: jest.fn() },
        URL: new URL("http://localhost:4104"),
      } as any;
      clearAuthCookie(httpCtx, false);
      expect(httpCtx.cookies.set).toHaveBeenCalledWith(COOKIE_NAME, "", {
        maxAge: 0,
        domain: undefined,
      });
    });
  });

  describe("getAuthCookieFromCtx", () => {
    it("should return value from ctx.cookies.get", () => {
      mockCtx.cookies.get.mockReturnValue("returnedtoken");
      const result = getAuthCookieFromCtx(mockCtx);
      expect(mockCtx.cookies.get).toHaveBeenCalledWith(COOKIE_NAME);
      expect(result).toBe("returnedtoken");
    });

    it("should return undefined when cookie is not set", () => {
      mockCtx.cookies.get.mockReturnValue(undefined);
      const result = getAuthCookieFromCtx(mockCtx);
      expect(result).toBeUndefined();
    });
  });
});
