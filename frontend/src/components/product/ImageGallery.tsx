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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);

  const validImages = images.filter((img) => img.url);
  const activeImage = validImages[activeIndex] ?? validImages[0];

  const goTo = useCallback(
    (index: number) => {
      const next = index < 0 ? validImages.length - 1 : index >= validImages.length ? 0 : index;
      if (next === activeIndex) return;
      setIsTransitioning(true);
      setTimeout(() => {
        setActiveIndex(next);
        setIsTransitioning(false);
      }, 150);
    },
    [validImages.length, activeIndex],
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
      <div className="aspect-[16/10] overflow-hidden rounded-2xl border border-[#d9c8ad] bg-[#f5ebdb] sm:aspect-[4/3]">
        <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.2em] text-[#b5a08a]">
          No image available
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main image with swipe */}
      <div
        className="group relative aspect-[16/10] overflow-hidden rounded-2xl border border-[#d9c8ad] bg-[#f5ebdb] shadow-[0_8px_32px_rgba(146,104,56,0.1)] sm:aspect-[4/3]"
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
        {activeImage?.url && (
          <AppImage
            src={activeImage.url}
            alt={`${productName} - Image ${activeIndex + 1}`}
            width={1200}
            height={900}
            sizes="(max-width: 1024px) 100vw, 50vw"
            className={`h-full w-full object-cover transition-all duration-300 ${
              isTransitioning ? "scale-[1.02] opacity-0" : "scale-100 opacity-100"
            }`}
            priority={activeIndex === 0}
          />
        )}

        {/* Image count badge */}
        {validImages.length > 1 && (
          <div className="absolute right-3 top-3 rounded-full bg-[#0d0b09]/60 px-3 py-1 text-[10px] font-semibold text-[#f4eee4] backdrop-blur-sm">
            {activeIndex + 1} / {validImages.length}
          </div>
        )}

        {/* Navigation arrows */}
        {validImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(activeIndex - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-[#fffefb]/90 text-[#302115] shadow-lg backdrop-blur-sm transition-all hover:bg-[#fffefb] sm:left-3 sm:opacity-0 sm:group-hover:opacity-100"
              aria-label="Previous image"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => goTo(activeIndex + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-[#fffefb]/90 text-[#302115] shadow-lg backdrop-blur-sm transition-all hover:bg-[#fffefb] sm:right-3 sm:opacity-0 sm:group-hover:opacity-100"
              aria-label="Next image"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Dot indicators */}
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
              {validImages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === activeIndex
                      ? "w-6 bg-[#a67126]"
                      : "w-2 bg-[#302115]/25 hover:bg-[#302115]/40"
                  }`}
                  aria-label={`View image ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {validImages.length > 1 && (
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5 sm:gap-2">
          {validImages.map((image, i) => (
            <button
              key={image.id}
              type="button"
              onClick={() => goTo(i)}
              className={`aspect-square overflow-hidden rounded-xl border-2 transition-all duration-200 ${
                i === activeIndex
                  ? "border-[#a67126] shadow-[0_0_0_2px_rgba(166,113,38,0.2)]"
                  : "border-transparent opacity-60 hover:opacity-100"
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
      )}
    </div>
  );
}
