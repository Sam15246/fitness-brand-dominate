"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import AdminShell from "@/components/admin/AdminShell";
import {
  createAdminProductImage,
  deleteAdminProductImage,
  getAdminProductImages,
  uploadAdminProductImage,
  updateAdminProductImage,
  type ProductImage,
} from "@/lib/api";

export default function AdminProductImagesPage() {
  const params = useParams<{ productId: string }>();
  const productId = Number(params.productId || 0);
  const [items, setItems] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingImageId, setSavingImageId] = useState<number | null>(null);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePath, setNewImagePath] = useState("");
  const [error, setError] = useState<string | null>(null);

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
        const response = await getAdminProductImages(productId);
        if (active) {
          setItems(response);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load images");
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

  async function handleCreateImage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newImageFile && !newImagePath.trim()) {
      setError("Select an image file or provide an image URL/path");
      return;
    }

    if (!productId || Number.isNaN(productId)) {
      return;
    }

    setError(null);
    setSavingImageId(0);
    try {
      const created = newImageFile
        ? await uploadAdminProductImage(productId, {
            file: newImageFile,
            display_order: items.length,
          })
        : await createAdminProductImage(productId, {
            image_path: newImagePath.trim(),
            display_order: items.length,
          });
      setItems((prev) => [...prev, created]);
      setNewImageFile(null);
      setNewImagePath("");

      const fileInput = document.getElementById("new-image-file") as HTMLInputElement | null;
      if (fileInput) {
        fileInput.value = "";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create image");
    } finally {
      setSavingImageId(null);
    }
  }

  async function handlePrimary(imageId: number) {
    if (!productId || Number.isNaN(productId)) {
      return;
    }
    setError(null);
    setSavingImageId(imageId);
    try {
      await updateAdminProductImage(productId, imageId, { is_primary: true });
      setItems((prev) => prev.map((image) => ({ ...image, is_primary: image.id === imageId })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set primary image");
    } finally {
      setSavingImageId(null);
    }
  }

  async function handleOrder(imageId: number, displayOrder: number) {
    if (!productId || Number.isNaN(productId)) {
      return;
    }
    setError(null);
    setSavingImageId(imageId);
    try {
      const updated = await updateAdminProductImage(productId, imageId, { display_order: Math.max(0, displayOrder) });
      setItems((prev) =>
        prev
          .map((image) => (image.id === imageId ? updated : image))
          .sort((a, b) => a.display_order - b.display_order || a.id - b.id),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update image order");
    } finally {
      setSavingImageId(null);
    }
  }

  async function handleDelete(imageId: number) {
    if (!productId || Number.isNaN(productId)) {
      return;
    }
    setError(null);
    setSavingImageId(imageId);
    try {
      await deleteAdminProductImage(productId, imageId);
      setItems((prev) => prev.filter((image) => image.id !== imageId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete image");
    } finally {
      setSavingImageId(null);
    }
  }

  return (
    <AdminShell title="Product Images" subtitle={`Product ID: ${productId || "-"}`}>
      <form onSubmit={handleCreateImage} className="mb-4 rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-4">
        <label htmlFor="new-image-file" className="mb-1 block text-xs uppercase tracking-[0.12em] text-[#b59a73]">Upload image file</label>
        <input
          id="new-image-file"
          type="file"
          accept="image/*"
          onChange={(event) => setNewImageFile(event.target.files?.[0] ?? null)}
          className="mb-3 block w-full rounded-lg border border-[#8b6f47]/40 bg-[#120f0c] px-3 py-2 text-sm text-[#f4eee4] file:mr-3 file:rounded file:border-0 file:bg-[#2a2119] file:px-2 file:py-1 file:text-xs file:font-semibold file:uppercase file:tracking-[0.06em] file:text-[#d8c19a]"
        />
        <label htmlFor="new-image-path" className="mb-1 block text-xs uppercase tracking-[0.12em] text-[#b59a73]">Or provide image URL/path</label>
        <div className="flex gap-2">
          <input
            id="new-image-path"
            value={newImagePath}
            onChange={(event) => setNewImagePath(event.target.value)}
            placeholder="https://... or /static/images/..."
            className="flex-1 rounded-lg border border-[#8b6f47]/40 bg-[#120f0c] px-3 py-2 text-sm text-[#f4eee4] outline-none focus:border-[#b59a73]"
          />
          <button
            type="submit"
            disabled={savingImageId === 0}
            className="rounded-lg border border-[#8b6f47]/60 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#d8c19a] disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </form>

      {loading ? <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5 text-sm text-[#d8c19a]">Loading images...</div> : null}
      {error ? <div className="rounded-xl border border-[#a94442]/50 bg-[#2b1414]/70 p-5 text-sm text-[#f4c2c2]">{error}</div> : null}

      {!loading && !error ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.thumbnail_url || item.url || ""} alt="Product" className="h-36 w-full rounded-md object-cover" />
              <p className="mt-2 text-xs text-[#cdb793]">{item.is_primary ? "Primary" : "Secondary"} • Order {item.display_order}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  disabled={savingImageId === item.id}
                  onClick={() => void handlePrimary(item.id)}
                  className="rounded border border-[#8b6f47]/50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#d8c19a] disabled:opacity-40"
                >
                  Set Primary
                </button>
                <button
                  disabled={savingImageId === item.id}
                  onClick={() => void handleOrder(item.id, item.display_order - 1)}
                  className="rounded border border-[#8b6f47]/50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#d8c19a] disabled:opacity-40"
                >
                  Up
                </button>
                <button
                  disabled={savingImageId === item.id}
                  onClick={() => void handleOrder(item.id, item.display_order + 1)}
                  className="rounded border border-[#8b6f47]/50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#d8c19a] disabled:opacity-40"
                >
                  Down
                </button>
                <button
                  disabled={savingImageId === item.id}
                  onClick={() => void handleDelete(item.id)}
                  className="rounded border border-[#a94442]/50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#f4c2c2] disabled:opacity-40"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 ? <p className="text-sm text-[#d8c19a]">No images found for this product.</p> : null}
        </div>
      ) : null}
    </AdminShell>
  );
}
