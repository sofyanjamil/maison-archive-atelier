"use client";

import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import {
  X,
  Link2,
  Upload,
  Loader2,
  CheckCircle2,
  Image as ImageIcon,
} from "lucide-react";
import {
  CollectionType,
  SARTORIAL_CATEGORIES,
  SartorialCategory,
  SartorialPiece,
} from "@/lib/types";

interface AddPieceModalProps {
  isOpen: boolean;
  defaultCollection?: CollectionType;
  onClose: () => void;
  onPieceAdded: (piece: SartorialPiece) => void;
}

export default function AddPieceModal({
  isOpen,
  defaultCollection = "wishlist",
  onClose,
  onPieceAdded,
}: AddPieceModalProps) {
  const [activeTab, setActiveTab] = useState<"link" | "upload">("link");
  const [collection, setCollection] =
    useState<CollectionType>(defaultCollection);

  // Link state
  const [url, setUrl] = useState("");
  const [categoryHint, setCategoryHint] = useState<string>("");
  const [targetPrice, setTargetPrice] = useState<string>("");

  // Upload / Manual state
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState<SartorialCategory>("Jackets");
  const [price, setPrice] = useState("");
  const [avgPriceIls, setAvgPriceIls] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageBase64, setImageBase64] = useState<string | undefined>(undefined);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCollection(defaultCollection);
  }, [defaultCollection]);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, y: 20, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: "power3.out" }
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImageBase64(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExtractLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/pieces/extract-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          collection,
          category: categoryHint || undefined,
          targetPrice: targetPrice ? Number(targetPrice) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.piece) {
        throw new Error(data.error || "Failed to extract product from link");
      }
      onPieceAdded(data.piece);
      onClose();
      setUrl("");
      setTargetPrice("");
    } catch (err: any) {
      setError(err?.message || "Could not analyze link");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !imageBase64 && !imageUrl.trim()) {
      setError("Provide a title or image.");
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/pieces/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collection,
          title: title.trim() || undefined,
          brand: brand.trim() || undefined,
          category,
          price: price ? Number(price) : undefined,
          avgPriceIls: avgPriceIls ? Number(avgPriceIls) : undefined,
          targetPrice: targetPrice ? Number(targetPrice) : undefined,
          imageBase64,
          imageUrl: imageUrl.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.piece) {
        throw new Error(data.error || "Failed to catalog piece");
      }
      onPieceAdded(data.piece);
      onClose();
      setTitle("");
      setBrand("");
      setPrice("");
      setAvgPriceIls("");
      setImageUrl("");
      setImageBase64(undefined);
    } catch (err: any) {
      setError(err?.message || "Upload failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso-950/70 backdrop-blur-sm p-4">
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-parchment-50 border border-espresso-900/20 shadow-2xl rounded-sm overflow-hidden"
      >
        {/* Header */}
        <div className="bg-espresso-900 text-parchment-50 px-5 py-4 flex items-center justify-between border-b border-brass-500/30">
          <h2 className="font-serif text-xl font-semibold tracking-wide">
            Add Piece
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-parchment-200 hover:text-white rounded-sm transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Destination Toggle */}
        <div className="px-5 py-3 bg-parchment-100/70 border-b border-espresso-900/10 flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-espresso-600">
            Collection
          </span>
          <div className="inline-flex rounded-sm border border-espresso-900/20 bg-parchment-50 p-0.5">
            <button
              type="button"
              onClick={() => setCollection("wishlist")}
              className={`px-3 py-1 text-xs font-mono uppercase tracking-wider transition rounded-sm ${
                collection === "wishlist"
                  ? "bg-espresso-900 text-parchment-50"
                  : "text-espresso-700"
              }`}
            >
              Buylist
            </button>
            <button
              type="button"
              onClick={() => setCollection("wardrobe")}
              className={`px-3 py-1 text-xs font-mono uppercase tracking-wider transition rounded-sm ${
                collection === "wardrobe"
                  ? "bg-brass-600 text-parchment-50"
                  : "text-espresso-700"
              }`}
            >
              Wardrobe
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 border-b border-espresso-900/15 bg-parchment-100/40">
          <button
            type="button"
            onClick={() => {
              setActiveTab("link");
              setError(null);
            }}
            className={`flex items-center justify-center gap-1.5 py-3 text-xs font-mono uppercase tracking-wider border-b-2 transition ${
              activeTab === "link"
                ? "border-brass-600 bg-parchment-50 text-espresso-950 font-semibold"
                : "border-transparent text-espresso-600"
            }`}
          >
            <Link2 className="w-3.5 h-3.5 text-brass-600" />
            <span>Paste Link</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("upload");
              setError(null);
            }}
            className={`flex items-center justify-center gap-1.5 py-3 text-xs font-mono uppercase tracking-wider border-b-2 transition ${
              activeTab === "upload"
                ? "border-brass-600 bg-parchment-50 text-espresso-950 font-semibold"
                : "border-transparent text-espresso-600"
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-brass-600" />
            <span>Upload Photo / Details</span>
          </button>
        </div>

        <div className="p-5">
          {error && (
            <div className="mb-4 p-3 bg-oxblood-500/10 border border-oxblood-500/30 text-oxblood-700 text-xs font-mono rounded-sm">
              {error}
            </div>
          )}

          {activeTab === "link" && (
            <form onSubmit={handleExtractLink} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-espresso-700 mb-1">
                  Product URL
                </label>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 bg-white border border-espresso-900/20 rounded-sm text-sm font-mono text-espresso-900 focus:outline-none focus:border-brass-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-espresso-700 mb-1">
                    Category
                  </label>
                  <select
                    value={categoryHint}
                    onChange={(e) => setCategoryHint(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-espresso-900/20 rounded-sm text-sm text-espresso-900 focus:outline-none focus:border-brass-600"
                  >
                    <option value="">Auto-Detect</option>
                    {SARTORIAL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-espresso-700 mb-1">
                    Target Alert ($)
                  </label>
                  <input
                    type="number"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-3 py-2 bg-white border border-espresso-900/20 rounded-sm text-sm font-mono text-espresso-900 focus:outline-none focus:border-brass-600"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-mono uppercase text-espresso-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-espresso-900 hover:bg-espresso-800 text-parchment-50 text-xs font-mono uppercase tracking-wider rounded-sm transition disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-brass-400" />
                      <span>Extracting...</span>
                    </>
                  ) : (
                    <span>Extract & Label</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {activeTab === "upload" && (
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-espresso-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Piece name"
                    className="w-full px-3 py-2 bg-white border border-espresso-900/20 rounded-sm text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-espresso-700 mb-1">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Brand"
                    className="w-full px-3 py-2 bg-white border border-espresso-900/20 rounded-sm text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-espresso-700 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as SartorialCategory)
                    }
                    className="w-full px-3 py-2 bg-white border border-espresso-900/20 rounded-sm text-sm"
                  >
                    {SARTORIAL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-espresso-700 mb-1">
                    Price ($)
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-white border border-espresso-900/20 rounded-sm text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-espresso-700 mb-1">
                    Avg in Israel (₪)
                  </label>
                  <input
                    type="number"
                    value={avgPriceIls}
                    onChange={(e) => setAvgPriceIls(e.target.value)}
                    placeholder="Auto-find"
                    className="w-full px-3 py-2 bg-white border border-espresso-900/20 rounded-sm text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-espresso-700 mb-1">
                    Photo File
                  </label>
                  <label className="flex items-center justify-center border border-dashed border-espresso-900/30 bg-parchment-100/50 hover:bg-parchment-100 rounded-sm p-2.5 cursor-pointer transition text-xs font-mono">
                    {imageBase64 ? (
                      <span className="flex items-center gap-1.5 text-sage-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Attached
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-espresso-700">
                        <ImageIcon className="w-3.5 h-3.5 text-brass-600" />
                        Upload Image
                      </span>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-espresso-700 mb-1">
                    Or Image URL
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-white border border-espresso-900/20 rounded-sm text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-mono uppercase text-espresso-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-espresso-900 hover:bg-espresso-800 text-parchment-50 text-xs font-mono uppercase tracking-wider rounded-sm transition disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-brass-400" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Piece</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
