import { describe, expect, it } from "vitest";
import { findPersonalData, searchFaqs, validateQuestion } from "@/lib/legal";

describe("legal Q&A input guard", () => {
  it("blocks phone numbers", () => expect(findPersonalData("gọi 0905 123 456 giúp")).toContain("số điện thoại"));
  it("blocks CCCD numbers", () => expect(findPersonalData("CCCD 048123456789")).toContain("số CMND/CCCD"));
  it("blocks emails", () => expect(findPersonalData("a.b@gmail.com")).toContain("địa chỉ email"));
  it("blocks Vietnamese personal-name introductions", () => expect(findPersonalData("Tôi tên là Nguyễn Thị A, cần đăng ký kết hôn")).toContain("họ tên người cụ thể"));
  it("allows a general question", () => expect(validateQuestion("Khi bị bạo lực gia đình có thể báo cho ai?")).toBeNull());
  it("rejects over-long questions", () => expect(validateQuestion("a".repeat(501))).not.toBeNull());
  it("finds FAQ by accent-insensitive keyword", () => {
    const f = [{ id: "1", topic: "Gia đình", question: "Bạo lực gia đình là gì?", answer: "x", source_title: "", source_article: "" }];
    expect(searchFaqs(f, "bao luc")[0]?.id).toBe("1");
  });
});
