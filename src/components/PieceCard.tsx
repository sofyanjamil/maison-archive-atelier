"use client";

import React from "react";
import {
  Sparkles,
  ExternalLink,
  TrendingDown,
  Check,
  Eye,
  ArrowRightLeft,
  Loader2,
  Bot,
} from "lucide-react";
import { SartorialPiece } from "@/lib/types";

interface PieceCardProps {
  piece: SartorialPiece;
  isGeneratingOutfit?: boolean;
  onGenerateOutfitAroundPiece: (piece: SartorialPiece) => void;
  onInspectDossier: (piece: SartorialPiece) => void;
  onToggleCollection: (piece: SartorialPiece) => void;
}

export default function PieceCard({
  piece,
  isGeneratingOutfit = false,
  onGenerateOutfitAroundPiece,
  onInspectDossier,
  onToggleCollection,
}: PieceCardProps) {
  const hasPriceDrop =
    typeof piece.priceChangePct === "number" && piece.priceChangePct < -0.5;
  const savingsAmount =
    piece.originalPrice && piece.originalPrice > piece.price
      ? piece.originalPrice - piece.price
      : 0;

  return (
    <article className="archive-card group relative rounded-sm flex flex-col justify-between overflow-hidden transition-all duration-300 hover:-translate-y-1">
      {/* Top Specimen Header Bar */}
      <div className="px-4 py-2.5 bg-parchment-100/90 border-b border-espresso-900/10 flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-espresso-900 tracking-wider">
            {piece.archiveCode}
          </span>
          <span className="text-espresso-500">•</span>
          <span className="uppercase tracking-widest text-brass-600 font-medium">
            {piece.category}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {piece.addedVia === "grokbot" && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-espresso-900 text-brass-300 text-[10px] rounded-sm">
              <Bot className="w-2.5 h-2.5" />
              GROKBOT
            </span>
          )}
          <span
            className={`px-2 py-0.5 text-[10px] uppercase tracking-wider rounded-sm font-medium ${
              piece.collection === "wardrobe"
                ? "bg-brass-500/20 text-espresso-900 border border-brass-600/30"
                : piece.priority === "grail"
                  ? "bg-oxblood-600 text-parchment-50"
                  : "bg-parchment-200 text-espresso-800"
            }`}
          >
            {piece.collection === "wardrobe"
              ? "OWNED"
              : piece.priority === "grail"
                ? "GRAIL WISH"
                : "WISHLIST"}
          </span>
        </div>
      </div>

      {/* Product Image Frame */}
      <div
        onClick={() => onInspectDossier(piece)}
        className="relative aspect-[4/3] w-full bg-parchment-200/50 overflow-hidden cursor-pointer border-b border-espresso-900/10"
      >
        <img
          src={piece.imageUrl}
          alt={piece.title}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-espresso-950/60 via-transparent to-transparent opacity-60 group-hover:opacity-75 transition-opacity" />

        {/* Price Drop Stamp */}
        {hasPriceDrop && (
          <div className="absolute top-3 left-3 bg-sage-600/95 backdrop-blur-sm text-parchment-50 px-2.5 py-1 rounded-sm border border-brass-400/40 flex items-center gap-1.5 text-[11px] font-mono shadow-md">
            <TrendingDown className="w-3.5 h-3.5 text-brass-300" />
            <span>
              {piece.priceChangePct}%{" "}
              {savingsAmount > 0 ? `(-$${savingsAmount})` : "DROP"}
            </span>
          </div>
        )}

        {/* Color Swatches Overlay */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-espresso-950/75 backdrop-blur-sm px-2.5 py-1 rounded-sm border border-white/10">
          {piece.colorPalette?.slice(0, 3).map((swatch, i) => (
            <span
              key={i}
              title={swatch.name}
              className="w-3 h-3 rounded-full border border-white/40 shadow-sm"
              style={{ backgroundColor: swatch.hex }}
            />
          ))}
          <span className="text-[10px] font-mono text-parchment-100 ml-1 truncate max-w-[140px]">
            {piece.vibe}
          </span>
        </div>

        {/* Price Tag Overlay */}
        <div className="absolute bottom-3 right-3 bg-parchment-50/95 backdrop-blur-sm px-2.5 py-1 rounded-sm border border-espresso-900/20 text-right shadow-md">
          {piece.originalPrice && piece.originalPrice > piece.price && (
            <span className="block text-[10px] font-mono line-through text-espresso-500">
              ${piece.originalPrice.toLocaleString()}
            </span>
          )}
          <span className="text-sm font-mono font-semibold text-espresso-950">
            ${piece.price.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3.5">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-brass-600 font-semibold">
              {piece.brand}
            </span>
            {piece.sourceUrl && (
              <a
                href={piece.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[10px] font-mono text-espresso-500 hover:text-espresso-900 transition"
                title="Open source product listing"
              >
                <span>{piece.storeName || "Source"}</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>

          <h3
            onClick={() => onInspectDossier(piece)}
            className="font-serif text-xl font-semibold text-espresso-950 leading-snug mt-0.5 cursor-pointer hover:text-brass-600 transition line-clamp-2"
          >
            {piece.title}
          </h3>

          <p className="text-xs text-espresso-700 leading-relaxed mt-1.5 line-clamp-2">
            {piece.vibeDescription}
          </p>
        </div>

        {/* DeepSeek V4.1 Flash Labels */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-espresso-500">
            <span>DeepSeek V4.1 Flash Labels</span>
            <span>{piece.season}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {piece.labels.slice(0, 5).map((label) => (
              <span
                key={label}
                className="px-2 py-0.5 bg-parchment-200/70 border border-espresso-900/12 text-[11px] font-mono text-espresso-800 rounded-sm"
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Action Bar: One-Click Outfit Generation + Dossier + Collection Toggle */}
        <div className="pt-2 border-t border-espresso-900/10 flex items-center gap-2">
          <button
            type="button"
            disabled={isGeneratingOutfit}
            onClick={() => onGenerateOutfitAroundPiece(piece)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-espresso-900 hover:bg-espresso-800 text-parchment-50 text-xs font-mono uppercase tracking-wider rounded-sm shadow-sm transition disabled:opacity-60"
            title="Curate a Daily Outfit anchored around this piece and generate a KIE Sunburst 2.5 no-human flat-lay image"
          >
            {isGeneratingOutfit ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-brass-400" />
                <span>Styling Look...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-brass-400" />
                <span>Style Daily Outfit</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onInspectDossier(piece)}
            className="p-2 bg-parchment-100 hover:bg-parchment-200 border border-espresso-900/15 text-espresso-800 rounded-sm transition"
            title="Inspect Archive Dossier & Price History"
          >
            <Eye className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onToggleCollection(piece)}
            className="p-2 bg-parchment-100 hover:bg-parchment-200 border border-espresso-900/15 text-espresso-800 rounded-sm transition"
            title={
              piece.collection === "wishlist"
                ? "Mark as Acquired → Move to Current Wardrobe"
                : "Move back to Acquisition Wishlist"
            }
          >
            {piece.collection === "wishlist" ? (
              <Check className="w-4 h-4 text-sage-600" />
            ) : (
              <ArrowRightLeft className="w-4 h-4 text-brass-600" />
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
