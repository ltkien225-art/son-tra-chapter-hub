import artwork from "@/assets/hoi-approved-v20261025.png.asset.json";

/** The approved artwork is displayed whole, including its original opaque background. */
export function BrandLogo() {
  return <img src={artwork.url} alt="Phụ nữ Sơn Trà" width={768} height={768}
    className="mb-3 h-28 w-28 shrink-0 object-contain md:h-32 md:w-32" />;
}