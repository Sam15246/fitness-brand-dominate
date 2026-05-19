"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";

import AdminShell from "@/components/admin/AdminShell";
import AppImage from "@/components/ui/AppImage";
import {
  createAdminProductImage,
  deleteAdminProductImage,
  getAdminProductImages,
  listAdminVariants,
  uploadAdminProductImage,
  updateAdminProductImage,
  type ProductImage,
  type AdminVariant,
} from "@/lib/api";

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

export default function AdminProductImagesPage() {
  const params = useParams<{ productId: string }>();
  const productId = Number(params.productId || 0);

  // Images & variants
  const [images, setImages] = useState<ProductImage[]>([]);
  const [variants, setVariants] = useState<AdminVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});
  const [dragOver, setDragOver] = useState(false);
  const [selectedVariantIds, setSelectedVariantIds] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  // UI state
  const [savingImageId, setSavingImageId] = useState<number | null>(null);
  const [editingVariantsFor, setEditingVariantsFor] = useState<number | null>(null);

  // Load images and variants
  useEffect(() => {
    let active = true;
    async function load() {
      if (!productId || Number.isNaN(productId)) {
        setError("Invalid product id");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const [loadedImages, loadedVariants] = await Promise.all([
          getAdminProductImages(productId),
          listAdminVariants(productId),
        ]);
        if (active) {
          setImages(loadedImages);
          setVariants(loadedVariants);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load data");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [productId]);

  // File selection (from input or drop)
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

              const uploaded = await uploadAdminProductImage(productId, {
                file: new File([compressed], file.name, { type: "image/jpeg" }),
                variant_ids: selectedVariantIds.length > 0 ? selectedVariantIds : undefined,
              });

              setImages((prev) => [...prev, uploaded]);
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
      setSelectedVariantIds([]); // Clear variant selection after upload
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [productId, selectedVariantIds],
  );

  // Drag handlers
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

  // Image actions
  async function handlePrimary(imageId: number) {
    if (!productId) return;
    setSavingImageId(imageId);
    try {
      setError(null);
      await updateAdminProductImage(productId, imageId, { is_primary: true });
      setImages((prev) => prev.map((img) => ({ ...img, is_primary: img.id === imageId })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set primary image");
    } finally {
      setSavingImageId(null);
    }
  }

  async function handleDelete(imageId: number) {
    if (!productId) return;
    setSavingImageId(imageId);
    try {
      setError(null);
      await deleteAdminProductImage(productId, imageId);
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete image");
    } finally {
      setSavingImageId(null);
    }
  }

  async function handleReorder(fromIdx: number, toIdx: number) {
    if (!productId) return;

    const reordered = [...images];
    const [movedImage] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, movedImage);

    setImages(reordered);

    // Persist reorder
    reordered.forEach(async (img, idx) => {
      try {
        await updateAdminProductImage(productId, img.id, { display_order: idx });
      } catch (err) {
        // Silent fail for now
      }
    });
  }

  async function handleUpdateVariants(imageId: number, variantIds: number[]) {
    if (!productId) return;
    setSavingImageId(imageId);
    try {
      setError(null);
      const updated = await updateAdminProductImage(productId, imageId, { variant_ids: variantIds });
      setImages((prev) => prev.map((img) => (img.id === imageId ? updated : img)));
      setEditingVariantsFor(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update image variants");
    } finally {
      setSavingImageId(null);
    }
  }

  return (
    <AdminShell title="Product Images" subtitle={`Product ID: ${productId || "-"}`}>
      {/* Upload Area */}
      <div className="mb-6 space-y-4">
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

        {/* Variant selector for upload */}
        {variants.length > 0 && (
          <div className="rounded-lg border border-[#8b6f47]/30 bg-[#17120f] p-4">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-[#b59a73]">
              Link to variants (optional - leave empty for general images)
            </label>
            <div className="flex flex-wrap gap-2">
              {variants.map((variant) => (
                <label key={variant.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedVariantIds.includes(variant.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedVariantIds((prev) => [...prev, variant.id]);
                      } else {
                        setSelectedVariantIds((prev) => prev.filter((id) => id !== variant.id));
                      }
                    }}
                    className="rounded border-[#8b6f47] bg-[#120f0c]"
                  />
                  <span className="text-xs text-[#d8c19a]">
                    {Object.values(variant.option_values).join(" / ") || `Variant ${variant.id}`}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

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
      </div>

      {/* Images Grid */}
      {loading && <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5 text-sm text-[#d8c19a]">Loading images...</div>}

      {!loading && images.length > 0 && (
        <div className="space-y-4">
          <div className="text-xs text-[#9a7147]">Drag to reorder • Manage variant assignments</div>
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
                <AppImage
                  src={img.thumbnail_url || img.url || ""}
                  alt={`Product image ${idx + 1}`}
                  width={720}
                  height={360}
                  className="h-full w-full object-cover"
                />

                {/* Overlay on hover */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0d0b09]/60 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                  {/* Primary button */}
                  <button
                    type="button"
                    disabled={savingImageId === img.id || img.is_primary}
                    onClick={() => void handlePrimary(img.id)}
                    className="text-[10px] font-semibold uppercase tracking-[0.08em] rounded px-2 py-1 bg-[#4a6b5e]/70 text-[#c5e8da] disabled:opacity-40 hover:bg-[#4a6b5e]"
                    title="Set as primary"
                  >
                    {img.is_primary ? "Primary" : "Set Primary"}
                  </button>

                  {/* Variants button */}
                  <button
                    type="button"
                    disabled={savingImageId === img.id || variants.length === 0}
                    onClick={() => setEditingVariantsFor(editingVariantsFor === img.id ? null : img.id)}
                    className="text-[10px] font-semibold uppercase tracking-[0.08em] rounded px-2 py-1 bg-[#8b7047]/70 text-[#d8c19a] disabled:opacity-40 hover:bg-[#8b7047]"
                    title="Manage variant links"
                  >
                    Variants
                  </button>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => void handleDelete(img.id)}
                    disabled={savingImageId === img.id}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-[#a94442] text-white transition-colors hover:bg-[#c84040] disabled:opacity-40"
                    title="Delete image"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* Badge showing primary status */}
                <div className="absolute right-2 top-2 rounded-full bg-[#0d0b09]/70 px-2 py-1 text-[10px] font-semibold text-[#d8c19a]">
                  {img.is_primary ? "★" : img.display_order + 1}
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

          {/* Variant assignment modal */}
          {editingVariantsFor !== null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-lg border border-[#8b6f47]/30 bg-[#17120f] p-5">
                <h3 className="mb-4 text-sm font-semibold text-[#d8c19a]">Assign to Variants</h3>
                <div className="space-y-2 mb-4">
                  {variants.map((variant) => (
                    <label key={variant.id} className="flex items-center gap-3 p-2 hover:bg-[#1f1814] rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(images.find((i) => i.id === editingVariantsFor)?.variant_ids || []).includes(variant.id)}
                        onChange={(e) => {
                          const img = images.find((i) => i.id === editingVariantsFor);
                          if (!img) return;
                          const currentVariantIds = img.variant_ids ?? [];
                          const newVariantIds = e.target.checked
                            ? [...currentVariantIds, variant.id]
                            : currentVariantIds.filter((id) => id !== variant.id);
                          handleUpdateVariants(editingVariantsFor, newVariantIds);
                        }}
                        className="rounded border-[#8b6f47] bg-[#120f0c]"
                      />
                      <span className="text-xs text-[#d8c19a]">
                        {Object.values(variant.option_values).join(" / ") || `Variant ${variant.id}`}
                      </span>
                    </label>
                  ))}
                </div>
                <button
                  onClick={() => setEditingVariantsFor(null)}
                  className="w-full rounded border border-[#8b6f47]/50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#d8c19a] hover:bg-[#1f1814]"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && images.length === 0 && (
        <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-8 text-center text-sm text-[#d8c19a]">
          No images found for this product. Upload your first product image above.
        </div>
      )}
    </AdminShell>
  );
}
