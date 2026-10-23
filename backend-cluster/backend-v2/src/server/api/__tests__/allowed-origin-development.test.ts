import { isAllowedOrigin } from "../allowed-origin";

describe("isAllowedOrigin for development hosts", () => {
  it("allows OrbStack and reserved development TLDs in development", () => {
    for (const origin of [
      "https://dashboard.beancount-io.orb.local",
      "http://api.localhost:3000",
      "http://dashboard.test",
    ]) {
      expect(isAllowedOrigin(origin, "development")).toBe(true);
    }
  });

  it("rejects development hostnames outside development", () => {
    for (const env of ["production", "test"] as const) {
      expect(
        isAllowedOrigin("https://dashboard.beancount-io.orb.local", env),
      ).toBe(false);
    }
  });

  it("keeps beancount.io and localhost in every environment", () => {
    expect(isAllowedOrigin("https://app.beancount.io", "production")).toBe(
      true,
    );
    expect(isAllowedOrigin("http://localhost:5173", "production")).toBe(true);
  });

  it("rejects unrelated origins, a lookalike suffix and a malformed one", () => {
    expect(isAllowedOrigin("https://evil.com", "development")).toBe(false);
    expect(isAllowedOrigin("https://notbeancount.io", "development")).toBe(
      false,
    );
    expect(isAllowedOrigin("not-a-url", "development")).toBe(false);
  });
});
