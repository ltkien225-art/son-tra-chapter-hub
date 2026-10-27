import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleLegalSearch } from "@/components/hoi/GoogleLegalSearch";
import { loadGoogleSearch } from "@/lib/google-search-element";

vi.mock("@/lib/google-search-element", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/google-search-element")>()),
  loadGoogleSearch: vi.fn(),
}));

const execute = vi.fn();
const clearAllResults = vi.fn();
const renderGoogle = vi.fn();
const engineId = "test-preview-engine";
const question = "Khi bị bạo lực gia đình có thể báo cho ai?";
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loadGoogleSearch).mockResolvedValue({
    render: renderGoogle,
    getElement: () => ({ execute, clearAllResults }),
  });
});
afterEach(cleanup);

describe("Google search stays inside the application", () => {
  it("does not load Google or send a question just by opening the page", () => {
    render(<GoogleLegalSearch engineId={engineId} />);
    expect(loadGoogleSearch).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });
  it("cannot send a question without an engine, or with detected personal data", () => {
    const view = render(<GoogleLegalSearch engineId="" />);
    expect(screen.getByRole("button", { name: "Tìm với Google" })).toBeDisabled();
    view.rerender(<GoogleLegalSearch engineId={engineId} />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Tư vấn cho tôi qua số điện thoại 0905123456" },
    });
    expect(screen.getByRole("button", { name: "Tìm với Google" })).toBeDisabled();
    const form = screen.getByRole("textbox").closest("form");
    if (!form) throw new Error("Missing search form");
    fireEvent.submit(form);
    expect(execute).not.toHaveBeenCalled();
    expect(loadGoogleSearch).not.toHaveBeenCalled();
  });
  it("executes into a real result host without a navigation, popup, or URL query", async () => {
    const open = vi.spyOn(window, "open");
    const url = location.href;
    render(<GoogleLegalSearch engineId={engineId} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: question } });
    fireEvent.click(screen.getByRole("button", { name: "Tìm với Google" }));
    await waitFor(() => expect(execute).toHaveBeenCalledWith(question));
    expect(renderGoogle).toHaveBeenCalledWith(
      expect.objectContaining({
        div: expect.any(HTMLDivElement),
        tag: "searchresults-only",
        attributes: expect.objectContaining({ autoSearchOnLoad: "false", enableHistory: "false" }),
      }),
    );
    expect(location.href).toBe(url);
    expect(open).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Xóa" }));
    expect(clearAllResults).toHaveBeenCalledOnce();
    expect(screen.getByRole("textbox")).toHaveValue("");
    open.mockRestore();
  });
  it("shows load failure without fabricating search results or switching to AI", async () => {
    vi.mocked(loadGoogleSearch).mockRejectedValue(new Error("Không tải được Google."));
    render(<GoogleLegalSearch engineId={engineId} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: question } });
    fireEvent.click(screen.getByRole("button", { name: "Tìm với Google" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toHaveTextContent("Không tải được Google.");
    expect(execute).not.toHaveBeenCalled();
  });
  it("does not execute a pending query after leaving the page", async () => {
    let resolve: ((api: Awaited<ReturnType<typeof loadGoogleSearch>>) => void) | undefined;
    vi.mocked(loadGoogleSearch).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const view = render(<GoogleLegalSearch engineId={engineId} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: question } });
    fireEvent.click(screen.getByRole("button", { name: "Tìm với Google" }));
    view.unmount();
    await act(async () =>
      resolve?.({ render: renderGoogle, getElement: () => ({ execute, clearAllResults }) }),
    );
    expect(execute).not.toHaveBeenCalled();
  });
});
