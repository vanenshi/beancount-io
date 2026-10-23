import { resolveCorsOrigin } from "../cors-origin";

describe("resolveCorsOrigin", () => {
  it("allows same-origin requests that carry no Origin header", () => {
    expect(resolveCorsOrigin("", "production")).toBe("*");
  });

  it("allows beancount.io and its subdomains in every environment", () => {
    expect(resolveCorsOrigin("https://beancount.io", "production")).toBe(
      "https://beancount.io",
    );
    expect(resolveCorsOrigin("https://app.beancount.io", "production")).toBe(
      "https://app.beancount.io",
    );
  });

  it("allows localhost on any port in every environment", () => {
    expect(resolveCorsOrigin("http://localhost:5173", "production")).toBe(
      "http://localhost:5173",
    );
    expect(resolveCorsOrigin("http://127.0.0.1:4104", "production")).toBe(
      "http://127.0.0.1:4104",
    );
  });

  it("allows OrbStack and reserved development TLDs outside production", () => {
    for (const origin of [
      "https://dashboard.beancount-io.orb.local",
      "http://api.localhost:3000",
      "http://dashboard.test",
    ]) {
      expect(resolveCorsOrigin(origin, "development")).toBe(origin);
    }
  });

  it("rejects development hostnames in production", () => {
    expect(
      resolveCorsOrigin(
        "https://dashboard.beancount-io.orb.local",
        "production",
      ),
    ).toBe("");
  });

  it("rejects unrelated origins and a lookalike suffix", () => {
    expect(resolveCorsOrigin("https://evil.com", "development")).toBe("");
    expect(resolveCorsOrigin("https://notbeancount.io", "development")).toBe(
      "",
    );
  });

  it("rejects a malformed Origin header", () => {
    expect(resolveCorsOrigin("not-a-url", "development")).toBe("");
  });
});
