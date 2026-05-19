"use client";

import { useState, useRef, useCallback } from "react";

type UploadedImage = {
  id: number;
  url: string;
  thumbnailUrl: string;
  displayOrder: number;
  isNew?: boolean;
  file?: File;
};

type ImageUploadManagerProps = {
  productId: number;
  initialImages: Array<{ id: number; url: string; thumbnail_url: string; display_order: number }>;
  onImagesChange?: (images: UploadedImage[]) => void;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const COMPRESSED_QUALITY = 0.8;
const COMPRESSED_MAX_WIDTH = 1920;
const COMPRESSED_MAX_HEIGHT = 1440;

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > COMPRESSED_MAX_WIDTH || height > COMPRESSED_MAX_HEIGHT) {
          const ratio = Math.min(COMPRESSED_MAX_WIDTH / width, COMPRESSED_MAX_HEIGHT / height);
          width *= ratio;
          height *= ratio;
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Compression failed"));
          },
          "image/jpeg",
          COMPRESSED_QUALITY,
        );
      };
      img.onerror = () => reject(new Error("Image load failed"));
    };
    reader.onerror = () => reject(new Error("File read failed"));
  });
}

export default function ImageUploadManager({ productId, initialImages, onImagesChange }: ImageUploadManagerProps) {
  const [images, setImages] = useState<UploadedImage[]>(
    initialImages.map((img, idx) => ({
      id: img.id,
      url: img.url,
      thumbnailUrl: img.thumbnail_url,
      displayOrder: img.display_order,
    })),
  );
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const handleFileSelect = useCallback(
    async (files: FileList) => {
      setError(null);
      const fileArray = Array.from(files);

      if (fileArray.length === 0) return;

      const validFiles: File[] = [];
      for (const file of fileArray) {
        if (!file.type.startsWith("image/")) {
          setError(`${file.name} is not an image`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          setError(`${file.name} exceeds 5MB limit`);
          continue;
        }
        validFiles.push(file);
      }

      if (validFiles.length === 0) return;

      setUploading(true);

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const tempId = Date.now() + i;

        try {
          const compressed = await compressImage(file);
          const reader = new FileReader();
          reader.readAsDataURL(compressed);

          reader.onload = async () => {
            const base64 = reader.result as string;

            try {
              setUploadProgress((prev) => ({ ...prev, [tempId]: 50 }));

              const response = await fetch(
                `/api/v1/admin/products/${productId}/images`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ image_data: base64 }),
                }
              );

              if (!response.ok) {
                throw new Error("Upload failed");
              }

              const responseData = await response.json();
              // Support both response shapes: { data: { image: {...} } } and { data: { ...image fields... } }
              const imageData = (responseData.data && responseData.data.image) ? responseData.data.image : responseData.data;
              const newImg: UploadedImage = {
                id: imageData.id,
                url: imageData.url || imageData.path,
                thumbnailUrl: imageData.thumbnail_url || imageData.thumbnailUrl || null,
                displayOrder: imageData.display_order || imageData.displayOrder || 0,
                isNew: true,
              };

              setImages((prev) => {
                const updated = [...prev, newImg];
                onImagesChange?.(updated);
                return updated;
              });

              setUploadProgress((prev) => ({ ...prev, [tempId]: 100 }));
              setTimeout(() => {
                setUploadProgress((prev) => {
                  const next = { ...prev };
                  delete next[tempId];
                  return next;
                });
              }, 1000);
            } catch (err) {
              setError(`Failed to upload ${file.name}`);
              setUploadProgress((prev) => {
                const next = { ...prev };
                delete next[tempId];
                return next;
              });
            }
          };
        } catch (err) {
          setError(`Failed to compress ${file.name}`);
        }
      }

      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [productId, onImagesChange],
  );

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragOver(false);
    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    const img = images.find((i) => i.id === imageId);
    if (!img) return;

    try {
      const response = await fetch(`/api/v1/admin/products/${productId}/images/${imageId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Delete failed");

      setImages((prev) => prev.filter((i) => i.id !== imageId));
      onImagesChange?.(images.filter((i) => i.id !== imageId));
    } catch (err) {
      setError("Failed to delete image");
    }
  };

  const handleReorder = (fromIdx: number, toIdx: number) => {
    const newImages = [...images];
    const [movedImage] = newImages.splice(fromIdx, 1);
    newImages.splice(toIdx, 0, movedImage);

    const reordered = newImages.map((img, idx) => ({
      ...img,
      displayOrder: idx,
    }));

    setImages(reordered);
    onImagesChange?.(reordered);

    // Persist reorder in background
    reordered.forEach(async (img) => {
      try {
        await fetch(`/api/v1/admin/products/${productId}/images/${img.id}/reorder`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ display_order: img.displayOrder }),
        });
      } catch (err) {
        // Silent fail for now
      }
    });
  };

  return (
    <div className="space-y-4 rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#d8c19a]">Product Images</h3>
        <span className="text-xs text-[#9a7147]">{images.length} image(s)</span>
      </div>

      {/* Upload Area */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-all ${
          dragOver
            ? "border-[#c89e65] bg-[#c89e65]/10"
            : "border-[#8b6f47]/40 bg-[#120f0c] hover:border-[#8b6f47]/60"
        } cursor-pointer`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
          className="absolute inset-0 opacity-0 cursor-pointer"
          disabled={uploading}
        />

        <div className="space-y-2">
          <svg className="mx-auto h-10 w-10 text-[#8b6f47]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <div className="text-sm text-[#d8c19a]">
            Drag images here or <span className="font-semibold text-[#c89e65]">click to browse</span>
          </div>
          <div className="text-xs text-[#9a7147]">JPG, PNG up to 5MB • Auto-compressed</div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-[#a94442]/50 bg-[#2b1414]/70 p-3 text-xs text-[#f4c2c2]">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Images Grid */}
      {images.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs text-[#9a7147]">
            Drag to reorder • Click delete to remove
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {images.map((img, idx) => (
              <div
                key={img.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer?.setData("text/plain", String(idx));
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const fromIdx = Number(e.dataTransfer?.getData("text/plain"));
                  handleReorder(fromIdx, idx);
                }}
                className="group relative aspect-square overflow-hidden rounded-lg border border-[#8b6f47]/40 bg-[#120f0c] transition-all hover:border-[#8b6f47]/60 cursor-move"
              >
                {/* Image */}
                <img
                  src={img.thumbnailUrl || img.url}
                  alt={`Product image ${idx + 1}`}
                  className="h-full w-full object-cover"
                />

                {/* Overlay on hover */}
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-[#0d0b09]/60 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(img.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-[#a94442] text-white transition-colors hover:bg-[#c84040]"
                    title="Delete image"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* Badge */}
                <div className="absolute right-2 top-2 rounded-full bg-[#0d0b09]/70 px-2 py-1 text-[10px] font-semibold text-[#d8c19a]">
                  {idx + 1}
                </div>

                {/* Upload progress */}
                {uploadProgress[img.id] && uploadProgress[img.id] < 100 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#0d0b09]/80">
                    <div className="h-1.5 w-12 overflow-hidden rounded-full bg-[#8b6f47]/40">
                      <div
                        className="h-full bg-[#c89e65] transition-all duration-300"
                        style={{ width: `${uploadProgress[img.id]}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {images.length === 0 && !uploading && (
        <div className="text-center py-8 text-xs text-[#9a7147]">
          No images yet. Upload your first product image above.
        </div>
      )}
    </div>
  );
}
