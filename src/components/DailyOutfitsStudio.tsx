"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Loader2,
  Check,
  RefreshCw,
  Eye,
} from "lucide-react";
import {
  DailyOutfit,
  OutfitGenerationMode,
  SartorialPiece,
} from "@/lib/types";

interface DailyOutfitsStudioProps {
  pieces: SartorialPiece[];
  outfits: DailyOutfit[];
  onOutfitCreated: (outfit: DailyOutfit) => void;
  onOutfitUpdated: (outfit: DailyOutfit) => void;
  onInspectPiece: (piece: SartorialPiece) => void;
}

export default function DailyOutfitsStudio({
  pieces,
  outfits,
  onOutfitCreated,
  onOutfitUpdated,
  onInspectPiece,
}: DailyOutfitsStudioProps) {
  const [mode, setMode] = useState<OutfitGenerationMode>("hybrid_daily");
  const [occasion, setOccasion] = useState("Daily Rotation");
  const [weather, setWeather] = useState("Mild / All-Season");
  const [imageModel, setImageModel] = useState<string>(
    "gpt-image-2-5-sunburst-text-to-image"
  );
  const [useReferenceImages, setUseReferenceImages] = useState(false);
  const [customSelectedIds, setCustomSelectedIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generatingOutfits = outfits.filter(
      (o) => o.status === "generating" && o.kieTaskId
    );
    if (generatingOutfits.length === 0) return;

    const interval = setInterval(async () => {
      for (const item of generatingOutfits) {
        try {
          const res = await fetch(`/api/outfits/${item.id}/status`);
          if (res.ok) {
            const data = await res.json();
            if (data.outfit && data.outfit.status !== "generating") {
              onOutfitUpdated(data.outfit);
            }
          }
        } catch {
          // ignore
        }
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [outfits, onOutfitUpdated]);

  const toggleCustomPiece = (id: string) => {
    setCustomSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCurateAndRender = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pieces.length === 0) {
      setError("Add at least one piece to your Wishlist or Wardrobe first.");
      return;
    }
    setError(null);
    setIsGenerating(true);

    try {
      const res = await fetch("/api/outfits/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          selectedPieceIds:
            mode === "custom_selection" ? customSelectedIds : undefined,
          occasion,
          weather,
          imageModel,
          useReferenceImages,
          createdVia: "web",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.outfit) {
        throw new Error(data.error || "Failed to generate daily outfit");
      }
      onOutfitCreated(data.outfit);
    } catch (err: any) {
      setError(err?.message || "Outfit generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Studio Controls */}
      <section className="archive-card p-6 rounded-sm">
        <form onSubmit={handleCurateAndRender} className="space-y-5">
          {error && (
            <div className="p-3 bg-oxblood-500/10 border border-oxblood-500/30 text-oxblood-700 text-xs font-mono rounded-sm">
              {error}
            </div>
          )}

          {/* Mode Selector */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {[
              { id: "hybrid_daily", title: "Wardrobe + Wishlist" },
              { id: "wishlist_daily", title: "Wishlist Only" },
              { id: "wardrobe_daily", title: "Wardrobe Only" },
              { id: "custom_selection", title: "Pick Pieces" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setMode(opt.id as OutfitGenerationMode)}
                className={`p-3 rounded-sm border text-xs font-mono uppercase tracking-wider flex items-center justify-between transition ${
                  mode === opt.id
                    ? "bg-espresso-900 text-parchment-50 border-brass-500"
                    : "bg-parchment-50 text-espresso-800 border-espresso-900/15 hover:border-brass-500/50"
                }`}
              >
                <span>{opt.title}</span>
                {mode === opt.id && (
                  <Check className="w-3.5 h-3.5 text-brass-400" />
                )}
              </button>
            ))}
          </div>

          {mode === "custom_selection" && pieces.length > 0 && (
            <div className="p-3.5 bg-parchment-50 border border-espresso-900/15 rounded-sm">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 max-h-48 overflow-y-auto">
                {pieces.map((p) => {
                  const selected = customSelectedIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleCustomPiece(p.id)}
                      className={`flex items-center gap-2 p-2 rounded-sm border text-left transition ${
                        selected
                          ? "bg-espresso-900 text-parchment-50 border-brass-500"
                          : "bg-white text-espresso-900 border-espresso-900/15"
                      }`}
                    >
                      <img
                        src={p.imageUrl}
                        alt={p.title}
                        className="w-8 h-8 object-cover rounded-sm shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-[10px] font-mono uppercase truncate text-brass-500">
                          {p.category}
                        </div>
                        <div className="text-xs truncate">{p.title}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              placeholder="Occasion"
              className="px-3.5 py-2 bg-white border border-espresso-900/20 rounded-sm text-sm text-espresso-900 focus:outline-none focus:border-brass-600"
            />
            <input
              type="text"
              value={weather}
              onChange={(e) => setWeather(e.target.value)}
              placeholder="Weather"
              className="px-3.5 py-2 bg-white border border-espresso-900/20 rounded-sm text-sm text-espresso-900 focus:outline-none focus:border-brass-600"
            />
            <select
              value={
                useReferenceImages
                  ? "gpt-image-2-5-sunburst-image-to-image"
                  : imageModel
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val === "gpt-image-2-5-sunburst-image-to-image") {
                  setUseReferenceImages(true);
                  setImageModel("gpt-image-2-5-sunburst-image-to-image");
                } else {
                  setUseReferenceImages(false);
                  setImageModel(val);
                }
              }}
              className="px-3 py-2 bg-white border border-espresso-900/20 rounded-sm text-xs font-mono text-espresso-900 focus:outline-none focus:border-brass-600"
            >
              <option value="gpt-image-2-5-sunburst-text-to-image">
                Sunburst 2.5 (High Quality)
              </option>
              <option value="gpt-image-2-5-sunburst-image-to-image">
                Sunburst 2.5 (Reference Images)
              </option>
              <option value="gpt-image-2-5-flare-text-to-image">
                Flare 2.5 (Fast)
              </option>
            </select>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isGenerating}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-espresso-900 hover:bg-espresso-800 text-parchment-50 text-xs font-mono uppercase tracking-wider rounded-sm transition disabled:opacity-60"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-brass-400" />
                  <span>Generating Outfit...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-brass-400" />
                  <span>Generate Daily Outfit</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Outfits List */}
      {outfits.length === 0 ? (
        <div className="archive-card p-12 text-center rounded-sm">
          <p className="font-serif text-xl text-espresso-700">
            No outfits generated yet.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {outfits.map((outfit) => {
            const constituentPieces = outfit.pieceIds
              .map((id) => pieces.find((p) => p.id === id))
              .filter(Boolean) as SartorialPiece[];

            return (
              <article
                key={outfit.id}
                className="archive-card rounded-sm overflow-hidden"
              >
                <div className="px-5 py-3 bg-espresso-900 text-parchment-50 flex items-center justify-between text-xs font-mono">
                  <span>{outfit.title}</span>
                  <span className="text-brass-300">
                    ${outfit.totalEstimateUsd.toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12">
                  <div className="lg:col-span-7 bg-parchment-100/60 border-b lg:border-b-0 lg:border-r border-espresso-900/15 p-5 flex flex-col justify-center">
                    {outfit.status === "completed" && outfit.imageUrl ? (
                      <div className="rounded-sm overflow-hidden border border-espresso-900/15 bg-white">
                        <img
                          src={outfit.imageUrl}
                          alt={outfit.title}
                          className="w-full h-auto object-cover"
                        />
                        <div className="px-3.5 py-2 bg-espresso-950 text-parchment-100 flex items-center justify-between text-[10px] font-mono">
                          <span>{outfit.imageModel}</span>
                          <a
                            href={outfit.imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brass-300 hover:underline flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Open Image</span>
                          </a>
                        </div>
                      </div>
                    ) : outfit.status === "generating" ? (
                      <div className="aspect-[4/3] w-full bg-espresso-950 text-parchment-100 rounded-sm p-6 flex flex-col items-center justify-center text-center space-y-3">
                        <Loader2 className="w-7 h-7 animate-spin text-brass-400" />
                        <div className="text-sm font-serif">
                          Rendering Sunburst 2.5 Flat-Lay...
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await fetch(
                              `/api/outfits/${outfit.id}/status`
                            );
                            if (res.ok) {
                              const data = await res.json();
                              if (data.outfit) onOutfitUpdated(data.outfit);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-brass-600/30 border border-brass-400/40 text-brass-200 text-[11px] font-mono uppercase rounded-sm"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Refresh</span>
                        </button>
                      </div>
                    ) : (
                      <div className="aspect-[4/3] w-full bg-oxblood-700/10 rounded-sm p-6 flex items-center justify-center text-xs font-mono text-oxblood-700">
                        {outfit.errorMessage || "Generation failed"}
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-5 p-5 space-y-4">
                    <p className="text-sm text-espresso-800 leading-relaxed">
                      {outfit.editorialNote}
                    </p>

                    {outfit.scentPairingNote && (
                      <div className="p-3 bg-parchment-100 border-l-2 border-brass-600 text-xs text-espresso-800">
                        {outfit.scentPairingNote}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {constituentPieces.map((piece) => (
                        <button
                          key={piece.id}
                          type="button"
                          onClick={() => onInspectPiece(piece)}
                          className="flex items-center gap-2 p-2 bg-white hover:bg-parchment-100 border border-espresso-900/15 rounded-sm text-left transition"
                        >
                          <img
                            src={piece.imageUrl}
                            alt={piece.title}
                            className="w-9 h-9 object-cover rounded-sm shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-[9px] font-mono uppercase text-brass-600">
                              {piece.category}
                            </div>
                            <div className="text-xs font-medium text-espresso-950 truncate">
                              {piece.title}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
