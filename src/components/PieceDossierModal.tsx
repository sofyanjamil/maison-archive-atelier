"use client";

import React, { useState, useRef } from "react";
import {
  X,
  ExternalLink,
  Trash2,
  ArrowRightLeft,
  TrendingDown,
  Save,
  Calendar,
  Tag,
  Pencil,
  Upload,
  Search,
  Loader2,
} from "lucide-react";
import { SartorialPiece, SARTORIAL_CATEGORIES } from "@/lib/types";

interface PieceDossierModalProps {
  piece: SartorialPiece | null;
  onClose: () => void;
  onGenerateOutfit: (piece: SartorialPiece) => void;
  onUpdatePiece: (id: string, patch: Partial<SartorialPiece>) => Promise<void>;
  onDeletePiece: (id: string) => Promise<void>;
  onRefreshPiece?: (piece: SartorialPiece) => void;
}

export default function PieceDossierModal({
  piece,
  onClose,
  onGenerateOutfit,
  onUpdatePiece,
  onDeletePiece,
  onRefreshPiece,
}: PieceDossierModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRediscovering, setIsRediscovering] = useState(false);

  const [form, setForm] = useState({
    title: "",
    brand: "",
    category: "Men's Apparel",
    collection: "wishlist" as "wishlist" | "wardrobe",
    price: "",
    avgPriceIls: "",
    israelPriceNote: "",
    targetPrice: "",
    imageUrl: "",
    notes: "",
  });

  React.useEffect(() => {
    if (piece) {
      setForm({
        title: piece.title,
        brand: piece.brand,
        category: piece.category,
        collection: piece.collection,
        price: String(piece.price),
        avgPriceIls: piece.avgPriceIls ? String(piece.avgPriceIls) : "",
        israelPriceNote: piece.israelPriceNote || "",
        targetPrice: piece.targetPrice ? String(piece.targetPrice) : "",
        imageUrl: piece.imageUrl,
        notes: piece.notes || "",
      });
      setIsEditing(false);
    }
  }, [piece]);

  if (!piece) return null;

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onUpdatePiece(piece.id, {
        title: form.title.trim() || piece.title,
        brand: form.brand.trim() || piece.brand,
        category: form.category as SartorialPiece["category"],
        collection: form.collection,
        price: Number(form.price) || piece.price,
        avgPriceIls: form.avgPriceIls ? Number(form.avgPriceIls) : undefined,
        israelPriceNote: form.israelPriceNote || undefined,
        targetPrice: form.targetPrice ? Number(form.targetPrice) : undefined,
        imageUrl: form.imageUrl.trim() || piece.imageUrl,
        notes: form.notes || undefined,
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoDiscover = async () => {
    setIsRediscovering(true);
    try {
      const res = await fetch(`/api/pieces/${piece.id}/rediscover`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.piece) {
        onRefreshPiece?.(data.piece);
        setForm((f) => ({
          ...f,
          imageUrl: data.piece.imageUrl || f.imageUrl,
          avgPriceIls: data.piece.avgPriceIls ? String(data.piece.avgPriceIls) : f.avgPriceIls,
          israelPriceNote: data.piece.israelPriceNote || f.israelPriceNote,
          price: String(data.piece.price ?? f.price),
        }));
      }
    } finally {
      setIsRediscovering(false);
    }
  };

  const handlePickGalleryImage = async (url: string) => {
    setForm((f) => ({ ...f, imageUrl: url }));
    await onUpdatePiece(piece.id, { imageUrl: url });
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImageFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setIsSaving(true);
      try {
        const res = await fetch("/api/upload-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: dataUrl }),
        });
        const data = await res.json();
        if (res.ok && data.url) {
          setForm((f) => ({ ...f, imageUrl: data.url }));
          await onUpdatePiece(piece.id, { imageUrl: data.url });
        }
      } finally {
        setIsSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-parchment-50 border border-espresso-900/20 shadow-2xl rounded-sm overflow-hidden my-8">
        {/* Header */}
        <div className="bg-espresso-900 text-parchment-50 px-6 py-4 flex items-center justify-between border-b border-brass-500/30">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-brass-500/20 border border-brass-400/40 text-brass-300 text-xs font-mono">
              {piece.archiveCode}
            </span>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-parchment-300">
                {piece.brand} • {piece.category}
              </div>
              <h2 className="font-serif text-xl font-semibold">
                {piece.title}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-[11px] font-mono uppercase tracking-wider transition ${
                isEditing
                  ? "bg-brass-500 text-espresso-950"
                  : "bg-parchment-50/10 hover:bg-parchment-50/20 text-parchment-100"
              }`}
            >
              <Pencil className="w-3 h-3" />
              <span>{isEditing ? "Editing" : "Edit Entry"}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-parchment-200 hover:text-white rounded-sm"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* Left Column: Image, Gallery & Color Palette */}
          <div className="md:col-span-5 bg-parchment-100/70 border-b md:border-b-0 md:border-r border-espresso-900/15 p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="aspect-[4/3] w-full rounded-sm overflow-hidden border border-espresso-900/15 bg-white">
                <img
                  src={isEditing ? form.imageUrl : piece.imageUrl}
                  alt={piece.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Auto-find + Upload */}
              <div className="mt-2.5 flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={isRediscovering}
                  onClick={handleAutoDiscover}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 bg-brass-600 hover:bg-brass-500 disabled:opacity-60 text-parchment-50 text-[10px] font-mono uppercase tracking-wider rounded-sm transition"
                >
                  {isRediscovering ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Search className="w-3 h-3" />
                  )}
                  <span>
                    {isRediscovering
                      ? "Searching Web..."
                      : "Find Product Image & Israel Price"}
                  </span>
                </button>
                {isEditing && (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center justify-center gap-1 px-2.5 py-2 bg-parchment-200 hover:bg-parchment-300 border border-espresso-900/15 text-espresso-900 text-[10px] font-mono uppercase tracking-wider rounded-sm transition"
                      title="Upload your own image"
                    >
                      <Upload className="w-3 h-3" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleImageFile(f);
                        e.target.value = "";
                      }}
                    />
                  </>
                )}
              </div>

              {/* Gallery */}
              {piece.galleryImages && piece.galleryImages.length > 1 && (
                <div className="mt-3">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-espresso-600 mb-1.5">
                    Found Images — tap to set main photo
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {piece.galleryImages.slice(0, 8).map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handlePickGalleryImage(img)}
                        className={`aspect-square rounded-sm overflow-hidden border bg-white transition ${
                          (isEditing ? form.imageUrl : piece.imageUrl) === img
                            ? "border-brass-600 ring-1 ring-brass-500"
                            : "border-espresso-900/15 hover:border-brass-500"
                        }`}
                      >
                        <img
                          src={img}
                          alt={`gallery-${i}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Editable image URL */}
              {isEditing && (
                <div className="mt-3">
                  <label className="block text-[10px] font-mono uppercase text-espresso-600 mb-1">
                    Main Image URL
                  </label>
                  <input
                    type="url"
                    value={form.imageUrl}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, imageUrl: e.target.value }))
                    }
                    placeholder="https://..."
                    className="w-full px-2.5 py-1.5 bg-white border border-espresso-900/20 rounded-sm text-[11px] font-mono"
                  />
                </div>
              )}
            </div>

            {/* Color Swatches */}
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-espresso-600 mb-2">
                DeepSeek Extracted Chromatic Profile
              </div>
              <div className="space-y-1.5">
                {piece.colorPalette.map((c, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-parchment-50 px-2.5 py-1.5 rounded-sm border border-espresso-900/10 text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-espresso-900/20"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span className="text-espresso-900">{c.name}</span>
                    </div>
                    <span className="text-espresso-500">{c.hex}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Primary CTA */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onGenerateOutfit(piece);
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-espresso-900 hover:bg-espresso-800 text-parchment-50 text-xs font-mono uppercase tracking-wider rounded-sm shadow-md transition"
            >
              <span>Generate Sunburst 2.5 Outfit</span>
            </button>
          </div>

          {/* Right Column: Curatorial Dossier & Price History */}
          <div className="md:col-span-7 p-6 space-y-5">
            {isEditing ? (
              <form onSubmit={handleSaveAll} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-mono uppercase text-espresso-600 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, title: e.target.value }))
                      }
                      className="w-full px-2.5 py-2 bg-white border border-espresso-900/20 rounded-sm text-sm font-serif"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-espresso-600 mb-1">
                      Brand
                    </label>
                    <input
                      type="text"
                      value={form.brand}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, brand: e.target.value }))
                      }
                      className="w-full px-2.5 py-2 bg-white border border-espresso-900/20 rounded-sm text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-espresso-600 mb-1">
                      Category
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, category: e.target.value }))
                      }
                      className="w-full px-2.5 py-2 bg-white border border-espresso-900/20 rounded-sm text-xs font-mono"
                    >
                      {SARTORIAL_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-espresso-600 mb-1">
                      Collection
                    </label>
                    <select
                      value={form.collection}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          collection: e.target.value as "wishlist" | "wardrobe",
                        }))
                      }
                      className="w-full px-2.5 py-2 bg-white border border-espresso-900/20 rounded-sm text-xs font-mono"
                    >
                      <option value="wishlist">Buylist</option>
                      <option value="wardrobe">Wardrobe</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-espresso-600 mb-1">
                      Price ($ USD)
                    </label>
                    <input
                      type="number"
                      value={form.price}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, price: e.target.value }))
                      }
                      className="w-full px-2.5 py-2 bg-white border border-espresso-900/20 rounded-sm text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-espresso-600 mb-1">
                      Avg Price in Israel (₪ ILS)
                    </label>
                    <input
                      type="number"
                      value={form.avgPriceIls}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, avgPriceIls: e.target.value }))
                      }
                      placeholder="e.g. 590"
                      className="w-full px-2.5 py-2 bg-white border border-espresso-900/20 rounded-sm text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-espresso-600 mb-1">
                      Target Alert ($ USD)
                    </label>
                    <input
                      type="number"
                      value={form.targetPrice}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, targetPrice: e.target.value }))
                      }
                      placeholder="None"
                      className="w-full px-2.5 py-2 bg-white border border-espresso-900/20 rounded-sm text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-espresso-600 mb-1">
                      Israel Price Note
                    </label>
                    <input
                      type="text"
                      value={form.israelPriceNote}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          israelPriceNote: e.target.value,
                        }))
                      }
                      placeholder="e.g. Avg ₪590 (Zap / KSP: ₪550–₪650)"
                      className="w-full px-2.5 py-2 bg-white border border-espresso-900/20 rounded-sm text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 bg-parchment-200 hover:bg-parchment-300 text-espresso-900 text-[11px] font-mono uppercase tracking-wider rounded-sm transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brass-600 hover:bg-brass-500 disabled:opacity-60 text-parchment-50 text-[11px] font-mono uppercase tracking-wider rounded-sm transition"
                  >
                    <Save className="w-3 h-3" />
                    <span>{isSaving ? "Saving..." : "Save Entry"}</span>
                  </button>
                </div>
              </form>
            ) : (
              <>
                {/* Vibe & Curator Analysis */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-brass-600 font-semibold">
                      Vibe: “{piece.vibe}”
                    </span>
                    <span className="text-xs font-mono text-espresso-500">
                      {piece.season} • {piece.formality}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-espresso-800 leading-relaxed font-serif italic text-base">
                    “{piece.vibeDescription}”
                  </p>
                  <div className="mt-3 p-3 bg-parchment-100 border-l-2 border-brass-600 text-xs text-espresso-800">
                    <span className="font-mono uppercase text-[10px] tracking-wider text-brass-600 block mb-0.5">
                      Sartorial Pairing Directive:
                    </span>
                    {piece.pairingNotes}
                  </div>
                </div>

                {/* Labels */}
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-espresso-600 mb-2">
                    <Tag className="w-3.5 h-3.5 text-brass-600" />
                    <span>DeepSeek V4.1 Flash (1017) Specimen Labels</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {piece.labels.map((label) => (
                      <span
                        key={label}
                        className="px-2.5 py-1 bg-parchment-200/80 border border-espresso-900/15 text-xs font-mono text-espresso-900 rounded-sm"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Price Panel */}
                <div className="p-3.5 bg-parchment-100/80 border border-espresso-900/15 rounded-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-espresso-800 font-semibold">
                      GrokBot Price & Alert Configuration
                    </span>
                    {piece.priceChangePct && piece.priceChangePct < 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-mono text-sage-600 font-semibold">
                        <TrendingDown className="w-3.5 h-3.5" />
                        {piece.priceChangePct}% vs Baseline
                      </span>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-parchment-50 border border-espresso-900/10 rounded-sm px-2.5 py-2">
                      <div className="text-[10px] font-mono uppercase text-espresso-500">
                        Price ($ USD)
                      </div>
                      <div className="text-sm font-mono font-semibold text-espresso-950">
                        ${piece.price.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-parchment-50 border border-espresso-900/10 rounded-sm px-2.5 py-2">
                      <div className="text-[10px] font-mono uppercase text-espresso-500">
                        Avg in Israel (₪)
                      </div>
                      <div className="text-sm font-mono font-semibold text-espresso-950">
                        {piece.avgPriceIls
                          ? `₪${piece.avgPriceIls.toLocaleString()}`
                          : "—"}
                      </div>
                    </div>
                    <div className="bg-parchment-50 border border-espresso-900/10 rounded-sm px-2.5 py-2">
                      <div className="text-[10px] font-mono uppercase text-espresso-500">
                        Target Alert ($)
                      </div>
                      <div className="text-sm font-mono font-semibold text-espresso-950">
                        {piece.targetPrice
                          ? `$${piece.targetPrice.toLocaleString()}`
                          : "—"}
                      </div>
                    </div>
                  </div>
                  {piece.israelPriceNote && (
                    <div className="text-[11px] font-mono text-espresso-600">
                      {piece.israelPriceNote}
                    </div>
                  )}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brass-600 hover:bg-brass-500 text-parchment-50 text-[11px] font-mono uppercase tracking-wider rounded-sm transition"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit Prices & Details</span>
                    </button>
                  </div>
                </div>

                {/* Price History Ledger */}
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-espresso-600 mb-2">
                    <Calendar className="w-3.5 h-3.5 text-brass-600" />
                    <span>Historical Price Ledger (GrokBot Daily Checks)</span>
                  </div>
                  <div className="max-h-32 overflow-y-auto border border-espresso-900/15 rounded-sm divide-y divide-espresso-900/10 bg-white">
                    {piece.priceHistory.map((snap, i) => (
                      <div
                        key={i}
                        className="px-3 py-2 flex items-center justify-between text-xs font-mono"
                      >
                        <span className="text-espresso-600">{snap.date}</span>
                        <span className="text-espresso-700 truncate max-w-[200px]">
                          {snap.note || "Audit snapshot"}
                        </span>
                        <span className="font-semibold text-espresso-950">
                          ${snap.price.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-espresso-900/15 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await onUpdatePiece(piece.id, {
                          collection:
                            piece.collection === "wishlist"
                              ? "wardrobe"
                              : "wishlist",
                        });
                        onClose();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-parchment-200 hover:bg-parchment-300 text-espresso-900 text-xs font-mono uppercase tracking-wider rounded-sm transition"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 text-brass-600" />
                      <span>
                        {piece.collection === "wishlist"
                          ? "Move to Current Wardrobe"
                          : "Move to Buylist"}
                      </span>
                    </button>

                    {piece.sourceUrl && (
                      <a
                        href={piece.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-parchment-100 hover:bg-parchment-200 border border-espresso-900/15 text-espresso-800 text-xs font-mono uppercase tracking-wider rounded-sm transition"
                      >
                        <span>Visit Store</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      await onDeletePiece(piece.id);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-oxblood-600 hover:bg-oxblood-500/10 text-xs font-mono uppercase rounded-sm transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
