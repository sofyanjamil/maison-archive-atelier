"use client";

import React from "react";
import {
  ExternalLink,
  TrendingDown,
  Check,
  Eye,
  ArrowRightLeft,
  Loader2,
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

  return (
    <article className="archive-card group relative rounded-sm flex flex-col justify-between overflow-hidden transition-all duration-300 hover:-translate-y-1">
      {/* Top Bar */}
      <div className="px-3.5 py-2 bg-parchment-100/90 border-b border-espresso-900/10 flex items-center justify-between text-[10px] font-mono">
        <span className="uppercase tracking-widest text-brass-600 font-semibold">
          {piece.category}
        </span>
        <span className="text-espresso-500 uppercase">
          {piece.collection === "wardrobe" ? "Wardrobe" : "Wishlist"}
        </span>
      </div>

      {/* Image */}
      <div
        onClick={() => onInspectDossier(piece)}
        className="relative aspect-[4/3] w-full bg-parchment-200/40 overflow-hidden cursor-pointer border-b border-espresso-900/10"
      >
        <img
          src={piece.imageUrl}
          alt={piece.title}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
          loading="lazy"
        />

        {hasPriceDrop && (
          <div className="absolute top-2.5 left-2.5 bg-sage-600/95 text-parchment-50 px-2 py-0.5 rounded-sm flex items-center gap-1 text-[10px] font-mono">
            <TrendingDown className="w-3 h-3 text-brass-300" />
            <span>{piece.priceChangePct}%</span>
          </div>
        )}

        <div className="absolute bottom-2.5 right-2.5 bg-parchment-50/95 px-2.5 py-0.5 rounded-sm border border-espresso-900/15 text-xs font-mono font-semibold text-espresso-950">
          ${piece.price.toLocaleString()}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-brass-600 font-semibold">
              {piece.brand}
            </span>
            {piece.sourceUrl && (
              <a
                href={piece.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-espresso-400 hover:text-espresso-900 transition"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <h3
            onClick={() => onInspectDossier(piece)}
            className="font-serif text-lg font-semibold text-espresso-950 leading-snug mt-0.5 cursor-pointer hover:text-brass-600 transition line-clamp-1"
          >
            {piece.title}
          </h3>

          <div className="text-[11px] font-serif italic text-espresso-600 mt-0.5">
            {piece.vibe}
          </div>
        </div>

        {/* Labels */}
        <div className="flex flex-wrap gap-1">
          {piece.labels.slice(0, 4).map((label) => (
            <span
              key={label}
              className="px-2 py-0.5 bg-parchment-200/70 border border-espresso-900/10 text-[10px] font-mono text-espresso-800 rounded-sm"
            >
              {label}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="pt-2 border-t border-espresso-900/10 flex items-center gap-1.5">
          <button
            type="button"
            disabled={isGeneratingOutfit}
            onClick={() => onGenerateOutfitAroundPiece(piece)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-espresso-900 hover:bg-espresso-800 text-parchment-50 text-[11px] font-mono uppercase tracking-wider rounded-sm transition disabled:opacity-60"
          >
            {isGeneratingOutfit ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-brass-400" />
                <span>Styling...</span>
              </>
            ) : (
              <span>Style Outfit</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onInspectDossier(piece)}
            className="p-2 bg-parchment-100 hover:bg-parchment-200 border border-espresso-900/15 text-espresso-800 rounded-sm transition"
            title="Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onToggleCollection(piece)}
            className="p-2 bg-parchment-100 hover:bg-parchment-200 border border-espresso-900/15 text-espresso-800 rounded-sm transition"
            title={
              piece.collection === "wishlist"
                ? "Move to Wardrobe"
                : "Move to Wishlist"
            }
          >
            {piece.collection === "wishlist" ? (
              <Check className="w-3.5 h-3.5 text-sage-600" />
            ) : (
              <ArrowRightLeft className="w-3.5 h-3.5 text-brass-600" />
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
