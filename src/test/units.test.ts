import { describe, expect, it } from "vitest";
import { codeLoginUnit, newPin, PIN_RE, UNIT_RE } from "@/lib/units";

describe("unit access codes", () => {
  it("accepts exactly office + ch01..ch42", () => {
    expect(UNIT_RE.test("office")).toBe(true);
    expect(UNIT_RE.test("ch42")).toBe(true);
    expect(UNIT_RE.test("ch43")).toBe(false);
    expect(UNIT_RE.test("ch00")).toBe(false);
  });
  it("generates 8-digit codes", () => {
    for (let i = 0; i < 50; i++) expect(PIN_RE.test(newPin())).toBe(true);
  });
  it("recognises only code-login identities", () => {
    expect(codeLoginUnit("ch07-vmh2k-abc123@ma-truy-cap.hoisontra.app")).toBe("ch07");
    expect(codeLoginUnit("office-v1-x@ma-truy-cap.hoisontra.app")).toBe("office");
    expect(codeLoginUnit("ch07-v1-x@gmail.com")).toBe(null);
    expect(codeLoginUnit("ubmttqvnphuongsontra@gmail.com")).toBe(null);
  });
});
