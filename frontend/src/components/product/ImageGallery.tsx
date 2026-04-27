"use client";

import { useState, useCallback, useRef, useEffect } from "react";

import AppImage from "@/components/ui/AppImage";

type GalleryImage = {
  id: number;
  url: string | null;
  thumbnail_url: string | null;
};

export default function ImageGallery({ images, productName }: { images: GalleryImage[]; productName: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);

  const validImages = images.filter((img) => img.url);
  const activeImage = validImages[activeIndex] ?? validImages[0];

  const goTo = useCallback(
    (index: number) => {
      if (index < 0) setActiveIndex(validImages.length - 1);
      else if (index >= validImages.length) setActiveIndex(0);
      else setActiveIndex(index);
    },
    [validImages.length],
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goTo(activeIndex - 1);
      if (e.key === "ArrowRight") goTo(activeIndex + 1);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, goTo]);

  if (validImages.length === 0) {
    return (
      <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-[#dcc9ab] bg-[#f5ebdb]">
        <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.2em] text-[#9f8a6b]">
          No image
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main image with swipe */}
      <div
        className="relative aspect-[4/3] cursor-pointer overflow-hidden rounded-2xl border border-[#dcc9ab] bg-[#f5ebdb] shadow-[0_8px_24px_rgba(146,104,56,0.08)]"
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
          touchDeltaX.current = 0;
        }}
        onTouchMove={(e) => {
          touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
        }}
        onTouchEnd={() => {
          if (touchDeltaX.current > 50) goTo(activeIndex - 1);
          else if (touchDeltaX.current < -50) goTo(activeIndex + 1);
          touchDeltaX.current = 0;
        }}
      >
        {activeImage?.url ? (
          <AppImage
            src={activeImage.url}
            alt={`${productName} - Image ${activeIndex + 1}`}
            width={1200}
            height={900}
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="h-full w-full object-cover"
            priority={activeIndex === 0}
          />
        ) : null}

        {/* Navigation arrows (desktop) */}
        {validImages.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => goTo(activeIndex - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-[#0d0b09]/60 p-2 text-[#f4eee4] backdrop-blur-sm transition hover:bg-[#0d0b09]/80"
              aria-label="Previous image"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => goTo(activeIndex + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-[#0d0b09]/60 p-2 text-[#f4eee4] backdrop-blur-sm transition hover:bg-[#0d0b09]/80"
              aria-label="Next image"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            {/* Dot indicators */}
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {validImages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === activeIndex ? "w-5 bg-[#c89e65]" : "w-2 bg-[#f4eee4]/50"
                  }`}
                  aria-label={`View image ${i + 1}`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      {/* Thumbnails */}
      {validImages.length > 1 ? (
        <div className="grid grid-cols-5 gap-2">
          {validImages.map((image, i) => (
            <button
              key={image.id}
              type="button"
              onClick={() => goTo(i)}
              className={`aspect-square overflow-hidden rounded-lg border transition-all ${
                i === activeIndex
                  ? "border-[#c89e65] ring-2 ring-[#c89e65]/40"
                  : "border-[#dcc9ab] hover:border-[#c4a87a]"
              } bg-[#f5ebdb]`}
            >
              <AppImage
                src={image.thumbnail_url || image.url || ""}
                alt={`${productName} - Thumbnail ${i + 1}`}
                width={160}
                height={160}
                sizes="(max-width: 1024px) 20vw, 120px"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
