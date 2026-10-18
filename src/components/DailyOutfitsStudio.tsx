"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Loader2,
  Layers,
  Check,
  RefreshCw,
  Wand2,
  Eye,
  Compass,
  CloudSun,
  Award,
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

const OCCASION_PRESETS = [
  {
    occasion: "Milanese Espresso & Gallery Morning",
    weather: "16°C Crisp Autumn Sun",
  },
  {
    occasion: "Nocturnal Jazz Bar & Late Dinner",
    weather: "12°C Cool Evening Air",
  },
  {
    occasion: "Mediterranean Villa & Coastal Drive",
    weather: "23°C Warm Coastal Breeze",
  },
  {
    occasion: "Savile Row Collector's Study",
    weather: "14°C Overcast London Afternoon",
  },
];

export default function DailyOutfitsStudio({
  pieces,
  outfits,
  onOutfitCreated,
  onOutfitUpdated,
  onInspectPiece,
}: DailyOutfitsStudioProps) {
  const [mode, setMode] = useState<OutfitGenerationMode>("hybrid_daily");
  const [occasion, setOccasion] = useState(OCCASION_PRESETS[0].occasion);
  const [weather, setWeather] = useState(OCCASION_PRESETS[0].weather);
  const [imageModel, setImageModel] = useState<string>(
    "gpt-image-2-5-sunburst-text-to-image"
  );
  const [useReferenceImages, setUseReferenceImages] = useState(false);
  const [customSelectedIds, setCustomSelectedIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedPromptId, setExpandedPromptId] = useState<string | null>(null);

  // Poll any outfit currently in "generating" state every 3.5 seconds
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
          // ignore transient network error
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
    <div className="space-y-10">
      {/* Studio Control Deck */}
      <section className="archive-double-border bg-parchment-100/80 p-6 md:p-8 rounded-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-espresso-900/15">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-brass-600">
              <Wand2 className="w-3.5 h-3.5" />
              <span>DAILY SARTORIAL LOOKBOOK STUDIO</span>
              <span>•</span>
              <span>KIE.AI GPT IMAGE 2.5 SUNBURST</span>
            </div>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold text-espresso-950 mt-1">
              Compose Today’s Flat-Lay Rotation
            </h2>
            <p className="text-sm text-espresso-700 mt-1 max-w-2xl">
              DeepSeek V4.1 Flash (1017) harmonizes pieces across your{" "}
              <strong>Acquisition Wishlist</strong> and{" "}
              <strong>Current Wardrobe</strong>, then renders a single overhead{" "}
              <strong>no-human editorial flat-lay photograph</strong> via KIE.AI{" "}
              <code className="font-mono text-xs bg-parchment-200 px-1.5 py-0.5 rounded-sm">
                gpt-image-2-5-sunburst
              </code>
              .
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 bg-espresso-900 text-parchment-50 px-4 py-3 rounded-sm border border-brass-500/40 text-xs font-mono">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-brass-300">
                Active Image Engine
              </div>
              <div className="font-semibold">
                KIE GPT Image 2.5 Sunburst (1K Overhead Knolling)
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleCurateAndRender} className="mt-6 space-y-6">
          {error && (
            <div className="p-3.5 bg-oxblood-500/10 border border-oxblood-500/30 text-oxblood-700 text-xs font-mono rounded-sm">
              {error}
            </div>
          )}

          {/* Mode Selection Cards */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-espresso-700 mb-2.5">
              1. Select Curation Source
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  id: "hybrid_daily",
                  title: "Wardrobe + Wishlist Hybrid",
                  desc: "Combines owned garments with grail wishlist pieces",
                },
                {
                  id: "wishlist_daily",
                  title: "Wishlist Daily Outfit",
                  desc: "Pure dream rotation built strictly from your wishlist",
                },
                {
                  id: "wardrobe_daily",
                  title: "Current Wardrobe Rotation",
                  desc: "Styled exclusively from pieces you already own",
                },
                {
                  id: "custom_selection",
                  title: "Bespoke Piece Combiner",
                  desc: "Hand-pick exact pieces to combine into one image",
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMode(opt.id as OutfitGenerationMode)}
                  className={`text-left p-3.5 rounded-sm border transition ${
                    mode === opt.id
                      ? "bg-espresso-900 text-parchment-50 border-brass-500 shadow-md"
                      : "bg-parchment-50 text-espresso-900 border-espresso-900/15 hover:border-brass-500/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase tracking-wider font-semibold">
                      {opt.title}
                    </span>
                    {mode === opt.id && (
                      <Check className="w-3.5 h-3.5 text-brass-400" />
                    )}
                  </div>
                  <p
                    className={`text-xs mt-1 ${
                      mode === opt.id
                        ? "text-parchment-200"
                        : "text-espresso-600"
                    }`}
                  >
                    {opt.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Piece Picker when mode === custom_selection */}
          {mode === "custom_selection" && (
            <div className="p-4 bg-parchment-50 border border-espresso-900/15 rounded-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-espresso-800 font-semibold">
                  Select Pieces to Combine in Flat-Lay ({customSelectedIds.length}{" "}
                  selected)
                </span>
                <span className="text-[11px] font-mono text-espresso-500">
                  Pick 3–7 pieces across categories
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 max-h-60 overflow-y-auto p-1">
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
                          : "bg-white text-espresso-900 border-espresso-900/15 hover:border-brass-500"
                      }`}
                    >
                      <img
                        src={p.imageUrl}
                        alt={p.title}
                        className="w-9 h-9 object-cover rounded-sm shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-[10px] font-mono uppercase truncate text-brass-500">
                          {p.category}
                        </div>
                        <div className="text-xs font-medium truncate">
                          {p.brand} {p.title}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Occasion, Weather & KIE Model */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-espresso-700 mb-1.5">
                2. Occasion / Setting
              </label>
              <input
                type="text"
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-espresso-900/20 rounded-sm text-sm text-espresso-900 focus:outline-none focus:border-brass-600"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-espresso-700 mb-1.5">
                3. Weather & Atmosphere
              </label>
              <input
                type="text"
                value={weather}
                onChange={(e) => setWeather(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-espresso-900/20 rounded-sm text-sm text-espresso-900 focus:outline-none focus:border-brass-600"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-espresso-700 mb-1.5">
                4. KIE.AI Image 2.5 Engine
              </label>
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
                className="w-full px-3 py-2.5 bg-white border border-espresso-900/20 rounded-sm text-xs font-mono text-espresso-900 focus:outline-none focus:border-brass-600"
              >
                <option value="gpt-image-2-5-sunburst-text-to-image">
                  GPT Image 2.5 Sunburst (High-Quality Flagship)
                </option>
                <option value="gpt-image-2-5-sunburst-image-to-image">
                  GPT Image 2.5 Sunburst Image-to-Image (With Piece Refs)
                </option>
                <option value="gpt-image-2-5-flare-text-to-image">
                  GPT Image 2.5 Flare (Fast Preview Mode)
                </option>
              </select>
            </div>
          </div>

          {/* Preset chips + Submit */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-mono uppercase text-espresso-500 mr-1">
                Atmosphere Presets:
              </span>
              {OCCASION_PRESETS.map((preset) => (
                <button
                  key={preset.occasion}
                  type="button"
                  onClick={() => {
                    setOccasion(preset.occasion);
                    setWeather(preset.weather);
                  }}
                  className="px-2.5 py-1 bg-parchment-50 hover:bg-parchment-200 border border-espresso-900/15 text-[11px] font-mono text-espresso-800 rounded-sm transition"
                >
                  {preset.occasion}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="inline-flex items-center gap-2.5 px-6 py-3 bg-espresso-900 hover:bg-espresso-800 text-parchment-50 text-xs font-mono uppercase tracking-[0.15em] rounded-sm shadow-lg transition disabled:opacity-60"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-brass-400" />
                  <span>Curating with DeepSeek & KIE Sunburst...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-brass-400" />
                  <span>Curate & Render Sunburst 2.5 Flat-Lay</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Generated Lookbook Plates */}
      <div className="space-y-8">
        {outfits.map((outfit) => {
          const constituentPieces = outfit.pieceIds
            .map((id) => pieces.find((p) => p.id === id))
            .filter(Boolean) as SartorialPiece[];

          return (
            <article
              key={outfit.id}
              className="archive-card rounded-sm overflow-hidden shadow-archive"
            >
              {/* Plate Top Bar */}
              <div className="px-6 py-3.5 bg-espresso-900 text-parchment-50 flex flex-wrap items-center justify-between gap-3 border-b border-brass-500/30">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 bg-brass-500/20 border border-brass-400/40 text-brass-300 text-xs font-mono font-semibold">
                    {outfit.lookNumber}
                  </span>
                  <span className="text-xs font-mono uppercase tracking-wider text-parchment-200">
                    {outfit.subtitle}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-brass-300">
                    ENGINE: {outfit.imageModel}
                  </span>
                  <span>•</span>
                  <span>
                    EST. ENSEMBLE: ${outfit.totalEstimateUsd.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Plate Body */}
              <div className="grid grid-cols-1 lg:grid-cols-12">
                {/* Left 7 Cols: High-Res KIE Sunburst 2.5 No-Human Flat-Lay Image */}
                <div className="lg:col-span-7 bg-parchment-100/60 border-b lg:border-b-0 lg:border-r border-espresso-900/15 p-6 flex flex-col justify-center">
                  {outfit.status === "completed" && outfit.imageUrl ? (
                    <div className="relative rounded-sm overflow-hidden border border-espresso-900/15 bg-white shadow-md group">
                      <img
                        src={outfit.imageUrl}
                        alt={outfit.title}
                        className="w-full h-auto object-cover"
                      />
                      <div className="px-4 py-2.5 bg-espresso-950/90 text-parchment-100 flex items-center justify-between text-[11px] font-mono">
                        <span>
                          NO-HUMAN SARTORIAL FLAT-LAY • RENDERED VIA{" "}
                          {outfit.imageModel.toUpperCase()}
                        </span>
                        <a
                          href={outfit.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brass-300 hover:underline flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Full Plate</span>
                        </a>
                      </div>
                    </div>
                  ) : outfit.status === "generating" ? (
                    <div className="aspect-[4/3] w-full bg-espresso-950 text-parchment-100 rounded-sm border border-brass-500/40 p-8 flex flex-col items-center justify-center text-center space-y-4">
                      <div className="w-14 h-14 rounded-full border-2 border-brass-400/30 border-t-brass-400 animate-spin flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-brass-300" />
                      </div>
                      <div className="space-y-1 max-w-md">
                        <div className="text-xs font-mono uppercase tracking-[0.2em] text-brass-300">
                          KIE.AI DARKROOM DEVELOPING PLATE
                        </div>
                        <h4 className="font-serif text-2xl font-semibold">
                          Rendering {outfit.imageModel} Flat-Lay...
                        </h4>
                        <p className="text-xs text-parchment-300 font-mono">
                          Task ID: {outfit.kieTaskId || "Initializing"} •
                          Combining {constituentPieces.length} pieces into a
                          single overhead no-human photograph (~45s).
                        </p>
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
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brass-600/30 hover:bg-brass-600/50 border border-brass-400/40 text-brass-200 text-xs font-mono uppercase rounded-sm transition"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Poll Status Now</span>
                      </button>
                    </div>
                  ) : (
                    <div className="aspect-[4/3] w-full bg-oxblood-700/10 border border-oxblood-600/30 rounded-sm p-6 flex flex-col items-center justify-center text-center">
                      <p className="text-sm font-mono text-oxblood-700">
                        {outfit.errorMessage ||
                          "Image generation encountered an issue."}
                      </p>
                    </div>
                  )}
                </div>

                {/* Right 5 Cols: DeepSeek V4.1 Flash Curatorial Breakdown & Pieces */}
                <div className="lg:col-span-5 p-6 flex flex-col justify-between space-y-5">
                  <div className="space-y-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-espresso-600">
                        <span className="inline-flex items-center gap-1">
                          <Compass className="w-3.5 h-3.5 text-brass-600" />
                          {outfit.occasion}
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <CloudSun className="w-3.5 h-3.5 text-brass-600" />
                          {outfit.weather}
                        </span>
                      </div>

                      <h3 className="font-serif text-2xl md:text-3xl font-semibold text-espresso-950 mt-1">
                        {outfit.title}
                      </h3>
                    </div>

                    <p className="text-sm text-espresso-800 leading-relaxed">
                      {outfit.editorialNote}
                    </p>

                    <div className="p-3.5 bg-parchment-100 border-l-2 border-brass-600 rounded-r-sm space-y-1">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-brass-600 font-semibold">
                        Olfactory & Texture Pairing
                      </div>
                      <p className="text-xs text-espresso-800 leading-relaxed">
                        {outfit.scentPairingNote}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2 bg-espresso-900/5 border border-espresso-900/10 rounded-sm text-xs font-mono text-espresso-900">
                      <Award className="w-4 h-4 text-brass-600 shrink-0" />
                      <span>{outfit.stylistVerdict}</span>
                    </div>

                    {/* Color Story Swatches */}
                    <div className="flex flex-wrap items-center gap-2">
                      {outfit.colorStory?.map((swatch, idx) => (
                        <div
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-espresso-900/15 rounded-sm text-[11px] font-mono"
                        >
                          <span
                            className="w-3 h-3 rounded-full border border-espresso-900/20"
                            style={{ backgroundColor: swatch.hex }}
                          />
                          <span>{swatch.name}</span>
                        </div>
                      ))}
                    </div>

                    {/* Constituent Pieces List */}
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-espresso-700 mb-2">
                        <Layers className="w-3.5 h-3.5 text-brass-600" />
                        <span>
                          Combined Archive Specimens ({constituentPieces.length}
                          )
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {constituentPieces.map((piece) => (
                          <button
                            key={piece.id}
                            type="button"
                            onClick={() => onInspectPiece(piece)}
                            className="flex items-center gap-2.5 p-2 bg-white hover:bg-parchment-100 border border-espresso-900/15 rounded-sm text-left transition"
                          >
                            <img
                              src={piece.imageUrl}
                              alt={piece.title}
                              className="w-10 h-10 object-cover rounded-sm shrink-0 border border-espresso-900/10"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] font-mono uppercase text-brass-600">
                                  {piece.category}
                                </span>
                                <span className="text-[9px] font-mono uppercase px-1 bg-parchment-200 text-espresso-800 rounded-sm">
                                  {piece.collection === "wardrobe"
                                    ? "OWNED"
                                    : "WISH"}
                                </span>
                              </div>
                              <div className="text-xs font-semibold text-espresso-950 truncate">
                                {piece.brand} {piece.title}
                              </div>
                              <div className="text-[10px] font-mono text-espresso-600">
                                ${piece.price.toLocaleString()}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Prompt Disclosure */}
                  <div className="pt-3 border-t border-espresso-900/10">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedPromptId(
                          expandedPromptId === outfit.id ? null : outfit.id
                        )
                      }
                      className="text-[11px] font-mono uppercase tracking-wider text-brass-600 hover:text-espresso-950 transition"
                    >
                      {expandedPromptId === outfit.id
                        ? "Hide KIE Sunburst 2.5 Art Direction Prompt ▲"
                        : "Inspect KIE Sunburst 2.5 Art Direction Prompt ▼"}
                    </button>
                    {expandedPromptId === outfit.id && (
                      <div className="mt-2 p-3 bg-espresso-950 text-parchment-200 text-[11px] font-mono rounded-sm leading-relaxed">
                        {outfit.sunburstPrompt}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
