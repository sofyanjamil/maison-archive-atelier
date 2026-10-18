"use client";

import React, { useState } from "react";
import {
  X,
  Sparkles,
  ExternalLink,
  Trash2,
  ArrowRightLeft,
  TrendingDown,
  Save,
  Calendar,
  Tag,
} from "lucide-react";
import { SartorialPiece } from "@/lib/types";

interface PieceDossierModalProps {
  piece: SartorialPiece | null;
  onClose: () => void;
  onGenerateOutfit: (piece: SartorialPiece) => void;
  onUpdatePiece: (id: string, patch: Partial<SartorialPiece>) => Promise<void>;
  onDeletePiece: (id: string) => Promise<void>;
}

export default function PieceDossierModal({
  piece,
  onClose,
  onGenerateOutfit,
  onUpdatePiece,
  onDeletePiece,
}: PieceDossierModalProps) {
  const [editPrice, setEditPrice] = useState<string>(
    piece ? String(piece.price) : ""
  );
  const [editTarget, setEditTarget] = useState<string>(
    piece?.targetPrice ? String(piece.targetPrice) : ""
  );
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (piece) {
      setEditPrice(String(piece.price));
      setEditTarget(piece.targetPrice ? String(piece.targetPrice) : "");
    }
  }, [piece]);

  if (!piece) return null;

  const handleSavePrices = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onUpdatePiece(piece.id, {
        price: Number(editPrice) || piece.price,
        targetPrice: editTarget ? Number(editTarget) : undefined,
      });
    } finally {
      setIsSaving(false);
    }
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
          <button
            onClick={onClose}
            className="p-2 text-parchment-200 hover:text-white rounded-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* Left Column: Image & Color Palette */}
          <div className="md:col-span-5 bg-parchment-100/70 border-b md:border-b-0 md:border-r border-espresso-900/15 p-5 flex flex-col justify-between space-y-4">
            <div className="aspect-[4/3] w-full rounded-sm overflow-hidden border border-espresso-900/15 bg-white">
              <img
                src={piece.imageUrl}
                alt={piece.title}
                className="w-full h-full object-cover"
              />
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
              <Sparkles className="w-4 h-4 text-brass-400" />
              <span>Generate Sunburst 2.5 Outfit</span>
            </button>
          </div>

          {/* Right Column: Curatorial Dossier & Price History */}
          <div className="md:col-span-7 p-6 space-y-5">
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

            {/* Price & Target Alert Editor */}
            <form
              onSubmit={handleSavePrices}
              className="p-3.5 bg-parchment-100/80 border border-espresso-900/15 rounded-sm space-y-3"
            >
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-espresso-600 mb-1">
                    Current Price ($ USD)
                  </label>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-espresso-900/20 rounded-sm text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-espresso-600 mb-1">
                    Target Alert ($ USD)
                  </label>
                  <input
                    type="number"
                    value={editTarget}
                    onChange={(e) => setEditTarget(e.target.value)}
                    placeholder="None"
                    className="w-full px-2.5 py-1.5 bg-white border border-espresso-900/20 rounded-sm text-xs font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brass-600 hover:bg-brass-500 text-parchment-50 text-[11px] font-mono uppercase tracking-wider rounded-sm transition"
                >
                  <Save className="w-3 h-3" />
                  <span>{isSaving ? "Saving..." : "Update Ledger Price"}</span>
                </button>
              </div>
            </form>

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
                      : "Move to Wishlist"}
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
          </div>
        </div>
      </div>
    </div>
  );
}
