/** Google's supported Search Element. No Gemini key, proxy or paid API. */
export type GoogleSearchControl = {
  execute: (question: string) => void;
  clearAllResults: () => void;
};
export type GoogleSearchApi = {
  render: (options: {
    div: HTMLElement;
    tag: "searchresults-only";
    gname: string;
    attributes: Record<string, string>;
  }) => void;
  getElement: (name: string) => GoogleSearchControl | null;
};

type SearchWindow = Window & {
  google?: { search?: { cse?: { element?: GoogleSearchApi } } };
  __gcse?: { parsetags: string; initializationCallback: () => void };
};

/** cx is a public engine identifier, never an API key or an application link. */
export function validSearchEngineId(value: unknown): string {
  return typeof value === "string" &&
    !/^AIza/.test(value.trim()) &&
    /^[a-zA-Z0-9:_-]{8,100}$/.test(value.trim())
    ? value.trim()
    : "";
}

let loader: { engineId: string; promise: Promise<GoogleSearchApi> } | undefined;

export function loadGoogleSearch(engineId: string): Promise<GoogleSearchApi> {
  if (typeof window === "undefined" || !validSearchEngineId(engineId)) {
    return Promise.reject(new Error("Chưa có mã công cụ tìm kiếm Google hợp lệ."));
  }
  if (loader) {
    return loader.engineId === engineId
      ? loader.promise
      : Promise.reject(new Error("Hãy tải lại trang để đổi công cụ tìm kiếm."));
  }
  const promise = new Promise<GoogleSearchApi>((resolve, reject) => {
    const searchWindow = window as SearchWindow;
    const timer = window.setTimeout(() => {
      reject(new Error("Chưa tải được tìm kiếm Google. Kiểm tra mạng rồi tải lại trang."));
    }, 15_000);
    searchWindow.__gcse = {
      parsetags: "explicit",
      initializationCallback: () => {
        window.clearTimeout(timer);
        const api = searchWindow.google?.search?.cse?.element;
        if (api) resolve(api);
        else reject(new Error("Google chưa khởi tạo được công cụ tìm kiếm."));
      },
    };
    const script = document.createElement("script");
    script.id = "hoi-google-search-element";
    script.async = true;
    script.referrerPolicy = "origin";
    script.src = `https://cse.google.com/cse.js?cx=${encodeURIComponent(engineId)}&hl=vi`;
    script.onerror = () => {
      window.clearTimeout(timer);
      reject(
        new Error(
          "Trình duyệt hoặc mạng đang chặn tìm kiếm Google. Hãy tải lại trang sau khi kiểm tra.",
        ),
      );
    };
    document.head.appendChild(script);
  });
  loader = { engineId, promise };
  return promise;
}
