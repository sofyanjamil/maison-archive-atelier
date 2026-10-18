"use client";

import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import {
  X,
  Link2,
  Upload,
  Bot,
  Sparkles,
  Loader2,
  CheckCircle2,
  Image as ImageIcon,
  ArrowUpRight,
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

const SAMPLE_LUXURY_LINKS = [
  {
    label: "Omega Speedmaster Moonwatch",
    url: "https://www.omegawatches.com/en-us/watch-omega-speedmaster-moonwatch-professional-co-axial-master-chronometer-chronograph-42-mm-31030425001001",
    category: "Watches",
  },
  {
    label: "Le Labo Santal 33 Eau de Parfum",
    url: "https://www.lelabofragrances.com/santal-33.html",
    category: "Fragrances",
  },
  {
    label: "Jacques Marie Mage Enzo Sunglasses",
    url: "https://www.jacquesmariemage.com/shop/product/enzo",
    category: "Sunglasses",
  },
  {
    label: "Sunspel Sea Island Cotton Riviera Polo",
    url: "https://us.sunspel.com/products/mens-sea-island-cotton-knit-polo-shirt-in-ecru",
    category: "Shirts",
  },
];

export default function AddPieceModal({
  isOpen,
  defaultCollection = "wishlist",
  onClose,
  onPieceAdded,
}: AddPieceModalProps) {
  const [activeTab, setActiveTab] = useState<"link" | "upload" | "grokbot">(
    "link"
  );
  const [collection, setCollection] =
    useState<CollectionType>(defaultCollection);

  // Link state
  const [url, setUrl] = useState("");
  const [categoryHint, setCategoryHint] = useState<string>("");
  const [targetPrice, setTargetPrice] = useState<string>("");
  const [notes, setNotes] = useState("");

  // Upload / Manual state
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState<SartorialCategory>("Jackets");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageBase64, setImageBase64] = useState<string | undefined>(undefined);

  // GrokBot quick ingest state
  const [grokPrompt, setGrokPrompt] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusStep, setStatusStep] = useState("");
  const [error, setError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCollection(defaultCollection);
  }, [defaultCollection]);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, y: 24, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.38, ease: "power3.out" }
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
    setStatusStep(
      "Scraping product listing & extracting images, price & metadata..."
    );

    try {
      const stepTimer = setTimeout(() => {
        setStatusStep(
          "DeepSeek V4.1 Flash (1017) assigning sartorial labels, vibe & color story..."
        );
      }, 1600);

      const res = await fetch("/api/pieces/extract-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          collection,
          category: categoryHint || undefined,
          targetPrice: targetPrice ? Number(targetPrice) : undefined,
          notes: notes || undefined,
        }),
      });
      clearTimeout(stepTimer);
      const data = await res.json();
      if (!res.ok || !data.piece) {
        throw new Error(data.error || "Failed to extract product from link");
      }
      onPieceAdded(data.piece);
      onClose();
      setUrl("");
      setTargetPrice("");
      setNotes("");
    } catch (err: any) {
      setError(err?.message || "Could not analyze link");
    } finally {
      setIsSubmitting(false);
      setStatusStep("");
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !imageBase64 && !imageUrl.trim()) {
      setError("Please provide at least a title or product image.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    setStatusStep(
      "Uploading image to KIE CDN & running DeepSeek V4.1 Flash multimodal labeling..."
    );

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
          targetPrice: targetPrice ? Number(targetPrice) : undefined,
          imageBase64,
          imageUrl: imageUrl.trim() || undefined,
          notes: notes.trim() || undefined,
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
      setImageUrl("");
      setImageBase64(undefined);
    } catch (err: any) {
      setError(err?.message || "Upload failed");
    } finally {
      setIsSubmitting(false);
      setStatusStep("");
    }
  };

  const handleGrokBotIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grokPrompt.trim()) return;
    setError(null);
    setIsSubmitting(true);
    setStatusStep(
      "Dispatching instruction to GrokBot + DeepSeek V4.1 Flash agent..."
    );

    try {
      const res = await fetch("/api/grokbot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: grokPrompt.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "GrokBot command failed");
      }
      if (data.createdPiece) {
        onPieceAdded(data.createdPiece);
        onClose();
        setGrokPrompt("");
      } else {
        setError(
          data.reply ||
            "GrokBot processed your message. Try specifying an item or link to add."
        );
      }
    } catch (err: any) {
      setError(err?.message || "GrokBot ingestion failed");
    } finally {
      setIsSubmitting(false);
      setStatusStep("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        ref={modalRef}
        className="w-full max-w-2xl bg-parchment-50 border border-espresso-900/20 shadow-2xl rounded-sm overflow-hidden my-8"
      >
        {/* Top Vintage Header */}
        <div className="bg-espresso-900 text-parchment-50 px-6 py-5 flex items-center justify-between border-b border-brass-500/30">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-brass-300">
              <span>ARCHIVE ACCESSION FORM</span>
              <span>•</span>
              <span>DEEPSEEK V4.1 FLASH (1017)</span>
            </div>
            <h2 className="font-serif text-2xl font-semibold tracking-wide mt-0.5">
              Catalogue New Sartorial Specimen
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-parchment-200 hover:text-white hover:bg-espresso-800 rounded-sm transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Collection Toggle */}
        <div className="px-6 pt-5 pb-3 bg-parchment-100/70 border-b border-espresso-900/10 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-mono uppercase tracking-wider text-espresso-600">
            Destination Ledger:
          </div>
          <div className="inline-flex rounded-sm border border-espresso-900/20 bg-parchment-50 p-1">
            <button
              type="button"
              onClick={() => setCollection("wishlist")}
              className={`px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider transition rounded-sm ${
                collection === "wishlist"
                  ? "bg-espresso-900 text-parchment-50 shadow-sm"
                  : "text-espresso-700 hover:text-espresso-950"
              }`}
            >
              Acquisition Wishlist
            </button>
            <button
              type="button"
              onClick={() => setCollection("wardrobe")}
              className={`px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider transition rounded-sm ${
                collection === "wardrobe"
                  ? "bg-brass-600 text-parchment-50 shadow-sm"
                  : "text-espresso-700 hover:text-espresso-950"
              }`}
            >
              Current Wardrobe (Owned)
            </button>
          </div>
        </div>

        {/* Method Tabs */}
        <div className="grid grid-cols-3 border-b border-espresso-900/15 bg-parchment-100/40">
          <button
            type="button"
            onClick={() => {
              setActiveTab("link");
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 py-3.5 text-xs font-mono uppercase tracking-wider border-b-2 transition ${
              activeTab === "link"
                ? "border-brass-600 bg-parchment-50 text-espresso-950 font-semibold"
                : "border-transparent text-espresso-600 hover:text-espresso-900"
            }`}
          >
            <Link2 className="w-3.5 h-3.5 text-brass-600" />
            <span>1. Paste Product Link</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("upload");
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 py-3.5 text-xs font-mono uppercase tracking-wider border-b-2 transition ${
              activeTab === "upload"
                ? "border-brass-600 bg-parchment-50 text-espresso-950 font-semibold"
                : "border-transparent text-espresso-600 hover:text-espresso-900"
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-brass-600" />
            <span>2. Photo / Manual</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("grokbot");
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 py-3.5 text-xs font-mono uppercase tracking-wider border-b-2 transition ${
              activeTab === "grokbot"
                ? "border-brass-600 bg-parchment-50 text-espresso-950 font-semibold"
                : "border-transparent text-espresso-600 hover:text-espresso-900"
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-brass-600" />
            <span>3. Via GrokBot</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3.5 bg-oxblood-500/10 border border-oxblood-500/30 text-oxblood-700 text-xs font-mono rounded-sm">
              {error}
            </div>
          )}

          {activeTab === "link" && (
            <form onSubmit={handleExtractLink} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-espresso-700 mb-1.5">
                  Product Listing URL *
                </label>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.mrporter.com/en-us/mens/product/..."
                  className="w-full px-3.5 py-2.5 bg-white border border-espresso-900/20 rounded-sm text-sm font-mono text-espresso-900 focus:outline-none focus:border-brass-600"
                />
                <p className="mt-1.5 text-[11px] text-espresso-600">
                  DeepSeek V4.1 Flash (1017) fetches the full page, extracts the
                  product image & live price, and assigns vintage sartorial
                  labels + aesthetic vibes.
                </p>
              </div>

              {/* Quick sample links */}
              <div>
                <span className="block text-[11px] font-mono uppercase tracking-wider text-espresso-500 mb-1.5">
                  Or test with a curated archive link:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SAMPLE_LUXURY_LINKS.map((sample) => (
                    <button
                      key={sample.label}
                      type="button"
                      onClick={() => {
                        setUrl(sample.url);
                        setCategoryHint(sample.category);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-parchment-100 hover:bg-parchment-200 border border-espresso-900/15 text-[11px] font-mono text-espresso-800 rounded-sm transition"
                    >
                      <span>{sample.label}</span>
                      <ArrowUpRight className="w-3 h-3 text-brass-600" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-espresso-700 mb-1.5">
                    Category Override (Optional)
                  </label>
                  <select
                    value={categoryHint}
                    onChange={(e) => setCategoryHint(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-espresso-900/20 rounded-sm text-sm text-espresso-900 focus:outline-none focus:border-brass-600"
                  >
                    <option value="">Auto-Detect via DeepSeek V4.1</option>
                    {SARTORIAL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-espresso-700 mb-1.5">
                    GrokBot Price Alert Target ($ USD)
                  </label>
                  <input
                    type="number"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    placeholder="Auto (90% of retail)"
                    className="w-full px-3 py-2.5 bg-white border border-espresso-900/20 rounded-sm text-sm font-mono text-espresso-900 focus:outline-none focus:border-brass-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-espresso-700 mb-1.5">
                  Curator Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Check size 40R or 50ml flacon; pair with autumn flannels"
                  className="w-full px-3.5 py-2 bg-white border border-espresso-900/20 rounded-sm text-sm text-espresso-900 focus:outline-none focus:border-brass-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-mono uppercase tracking-wider text-espresso-700 hover:text-espresso-950"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-espresso-900 hover:bg-espresso-800 text-parchment-50 text-xs font-mono uppercase tracking-wider rounded-sm shadow-md transition disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-brass-400" />
                      <span>Extracting & Labeling...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-brass-400" />
                      <span>Extract Link & Auto-Label</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {activeTab === "upload" && (
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-espresso-700 mb-1.5">
                    Piece Title / Description
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Vintage Brown Leather Bomber Jacket"
                    className="w-full px-3 py-2 bg-white border border-espresso-900/20 rounded-sm text-sm text-espresso-900 focus:outline-none focus:border-brass-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-espresso-700 mb-1.5">
                    Brand / Maison
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g., Schott NYC / Creed / Rolex"
                    className="w-full px-3 py-2 bg-white border border-espresso-900/20 rounded-sm text-sm text-espresso-900 focus:outline-none focus:border-brass-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-espresso-700 mb-1.5">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as SartorialCategory)
                    }
                    className="w-full px-3 py-2 bg-white border border-espresso-900/20 rounded-sm text-sm text-espresso-900 focus:outline-none focus:border-brass-600"
                  >
                    {SARTORIAL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-espresso-700 mb-1.5">
                    Valuation / Price ($ USD)
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Auto-estimate if blank"
                    className="w-full px-3 py-2 bg-white border border-espresso-900/20 rounded-sm text-sm font-mono text-espresso-900 focus:outline-none focus:border-brass-600"
                  />
                </div>
              </div>

              {/* Photo Upload or Image URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-espresso-700 mb-1.5">
                    Upload Garment / Product Photo
                  </label>
                  <label className="flex flex-col items-center justify-center border border-dashed border-espresso-900/30 bg-parchment-100/50 hover:bg-parchment-100 rounded-sm p-4 cursor-pointer transition">
                    {imageBase64 ? (
                      <div className="flex items-center gap-2 text-xs font-mono text-sage-600">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Photo attached for KIE + DeepSeek Vision</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center">
                        <ImageIcon className="w-5 h-5 text-brass-600 mb-1" />
                        <span className="text-xs font-mono text-espresso-700">
                          Click to upload image file
                        </span>
                      </div>
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
                  <label className="block text-xs font-mono uppercase tracking-wider text-espresso-700 mb-1.5">
                    Or Paste Direct Image URL
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 bg-white border border-espresso-900/20 rounded-sm text-sm font-mono text-espresso-900 focus:outline-none focus:border-brass-600"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-mono uppercase tracking-wider text-espresso-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-espresso-900 hover:bg-espresso-800 text-parchment-50 text-xs font-mono uppercase tracking-wider rounded-sm shadow-md transition disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-brass-400" />
                      <span>Analyzing with DeepSeek V4.1...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-brass-400" />
                      <span>Catalogue & Auto-Label Piece</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {activeTab === "grokbot" && (
            <form onSubmit={handleGrokBotIngest} className="space-y-4">
              <div className="p-3.5 bg-parchment-100 border border-brass-500/30 rounded-sm text-xs text-espresso-800 space-y-1">
                <div className="font-mono uppercase tracking-wider text-brass-600 font-semibold">
                  Direct GrokBot Ingestion Bridge
                </div>
                <p>
                  Send any natural-language instruction or link just as you
                  would from GrokBot chat. DeepSeek V4.1 Flash parses your
                  request, extracts metadata, and logs it into your archive.
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-espresso-700 mb-1.5">
                  GrokBot Command / Product Link
                </label>
                <textarea
                  rows={3}
                  required
                  value={grokPrompt}
                  onChange={(e) => setGrokPrompt(e.target.value)}
                  placeholder="e.g., Add Creed Aventus 100ml Eau de Parfum at $365 to my wishlist, or paste a product link..."
                  className="w-full px-3.5 py-2.5 bg-white border border-espresso-900/20 rounded-sm text-sm text-espresso-900 focus:outline-none focus:border-brass-600"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  "Add Acqua di Parma Colonia 100ml ($190) to my wishlist",
                  "Add my vintage olive M-65 field jacket to my wardrobe",
                  "Add Ray-Ban Clubmaster Classic tortoiseshell sunglasses ($180) to my wishlist",
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setGrokPrompt(preset)}
                    className="px-2.5 py-1 bg-parchment-100 hover:bg-parchment-200 border border-espresso-900/15 text-[11px] font-mono text-espresso-700 rounded-sm transition"
                  >
                    “{preset}”
                  </button>
                ))}
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-mono uppercase tracking-wider text-espresso-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-espresso-900 hover:bg-espresso-800 text-parchment-50 text-xs font-mono uppercase tracking-wider rounded-sm shadow-md transition disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-brass-400" />
                      <span>GrokBot Executing...</span>
                    </>
                  ) : (
                    <>
                      <Bot className="w-4 h-4 text-brass-400" />
                      <span>Execute via GrokBot</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {isSubmitting && statusStep && (
            <div className="mt-4 p-3 bg-espresso-900 text-parchment-100 rounded-sm flex items-center gap-3 text-xs font-mono">
              <Loader2 className="w-4 h-4 animate-spin text-brass-400 shrink-0" />
              <span>{statusStep}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
