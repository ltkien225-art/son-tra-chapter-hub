import { describe, expect, it } from "vitest";
import { dailyTokenFromHash, ownerVerificationOptions } from "@/lib/office-link";
describe("office owner verification and daily capability", () => {
  it("verifies exactly the owner, without signup", () => {
    expect(ownerVerificationOptions("https://son-tra-chapter-hub.lovable.app")).toEqual({
      email: "ubmttqvnphuongsontra@gmail.com",
      options: { shouldCreateUser: false, emailRedirectTo: "https://son-tra-chapter-hub.lovable.app/cap-link-van-phong" },
    });
  });
  it("rejects an injected redirect path or insecure origin", () => {
    expect(() => ownerVerificationOptions("https://son-tra-chapter-hub.lovable.app/evil")).toThrow();
    expect(() => ownerVerificationOptions("https://user@son-tra-chapter-hub.lovable.app")).toThrow();
    expect(() => ownerVerificationOptions("http://example.com")).toThrow();
  });
  it("accepts capability only in exact fragment form", () => {
    expect(dailyTokenFromHash("#k=" + "a".repeat(43))).toBe("a".repeat(43));
    expect(dailyTokenFromHash("?k=" + "a".repeat(43))).toBeNull();
    expect(dailyTokenFromHash("#k=short")).toBeNull();
    expect(dailyTokenFromHash("#k=" + "a".repeat(43) + "&redirect=evil")).toBeNull();
  });
});