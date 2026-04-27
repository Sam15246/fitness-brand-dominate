import type { ImageLoaderProps } from "next/image";

const PUBLIC_BACKEND_BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "http://localhost:5000").replace(/\/$/, "");

function canTransform(src: string): boolean {
  return src.startsWith("http://") || src.startsWith("https://");
}

function resolveSource(src: string): string {
  if (src.startsWith("/static/")) {
    return `${PUBLIC_BACKEND_BASE_URL}${src}`;
  }
  return src;
}

export function cloudflareR2Loader({ src, width, quality }: ImageLoaderProps): string {
  const resolvedSrc = resolveSource(src);

  if (!canTransform(resolvedSrc)) {
    if (resolvedSrc.startsWith("/")) {
      const separator = resolvedSrc.includes("?") ? "&" : "?";
      return `${resolvedSrc}${separator}w=${width}&q=${quality || 80}`;
    }
    return resolvedSrc;
  }

  try {
    const url = new URL(resolvedSrc);
    url.searchParams.set("width", String(width));
    url.searchParams.set("quality", String(quality || 80));
    url.searchParams.set("format", "webp");
    url.searchParams.set("fit", "contain");
    return url.toString();
  } catch {
    return resolvedSrc;
  }
}
