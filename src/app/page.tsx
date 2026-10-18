"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import gsap from "gsap";
import {
  Sparkles,
  Plus,
  Search,
  Bookmark,
  Briefcase,
  Wand2,
  Bot,
  TrendingDown,
  Layers,
  Watch,
  Shirt,
  Glasses,
  Wallet,
  SprayCan,
  SlidersHorizontal,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import {
  CollectionType,
  DailyOutfit,
  DailyPriceReport,
  GrokBotEvent,
  SARTORIAL_CATEGORIES,
  SartorialCategory,
  SartorialPiece,
} from "@/lib/types";
import { INITIAL_ARCHIVE_STATE } from "@/lib/seed-data";
import PieceCard from "@/components/PieceCard";
import AddPieceModal from "@/components/AddPieceModal";
import PieceDossierModal from "@/components/PieceDossierModal";
import DailyOutfitsStudio from "@/components/DailyOutfitsStudio";
import GrokBotHub from "@/components/GrokBotHub";

type ActiveSection = "wishlist" | "wardrobe" | "outfits" | "grokbot";

export default function MaisonArchivePage() {
  const [activeSection, setActiveSection] = useState<ActiveSection>("wishlist");
  const [pieces, setPieces] = useState<SartorialPiece[]>(
    INITIAL_ARCHIVE_STATE.pieces
  );
  const [outfits, setOutfits] = useState<DailyOutfit[]>(
    INITIAL_ARCHIVE_STATE.outfits
  );
  const [reports, setReports] = useState<DailyPriceReport[]>(
    INITIAL_ARCHIVE_STATE.reports
  );
  const [events, setEvents] = useState<GrokBotEvent[]>(
    INITIAL_ARCHIVE_STATE.events
  );
  const [lastDailyCheckAt, setLastDailyCheckAt] = useState<string | undefined>(
    INITIAL_ARCHIVE_STATE.lastDailyCheckAt
  );
  const [railwayUrl, setRailwayUrl] = useState<string | null>(null);
  const [kieCredits, setKieCredits] = useState<number | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<
    SartorialCategory | "All"
  >("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  // Modals & action states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalCollection, setAddModalCollection] =
    useState<CollectionType>("wishlist");
  const [inspectedPiece, setInspectedPiece] = useState<SartorialPiece | null>(
    null
  );
  const [generatingAnchorId, setGeneratingAnchorId] = useState<string | null>(
    null
  );
  const [toastBanner, setToastBanner] = useState<string | null>(null);

  const mastheadRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastBanner(msg);
    setTimeout(() => setToastBanner(null), 5000);
  };

  const fetchLedger = useCallback(async () => {
    try {
      const res = await fetch("/api/ledger", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.pieces)) setPieces(data.pieces);
        if (Array.isArray(data.outfits)) setOutfits(data.outfits);
        if (Array.isArray(data.reports)) setReports(data.reports);
        if (Array.isArray(data.events)) setEvents(data.events);
        if (data.lastDailyCheckAt) setLastDailyCheckAt(data.lastDailyCheckAt);
        if (data.meta?.railwayUrl) setRailwayUrl(data.meta.railwayUrl);
        if (typeof data.meta?.kieCredits === "number") {
          setKieCredits(data.meta.kieCredits);
        }
      }
    } catch {
      // keep initial seed on network error
    }
  }, []);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  // Entrance GSAP choreography
  useEffect(() => {
    if (mastheadRef.current) {
      gsap.fromTo(
        mastheadRef.current.querySelectorAll(".gsap-reveal"),
        { opacity: 0, y: 18 },
        {
          opacity: 1,
          y: 0,
          duration: 0.65,
          stagger: 0.08,
          ease: "power3.out",
        }
      );
    }
  }, []);

  // Animate cards when section or category changes
  useEffect(() => {
    if (gridRef.current) {
      const cards = gridRef.current.children;
      if (cards.length > 0) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.45,
            stagger: 0.05,
            ease: "power2.out",
          }
        );
      }
    }
  }, [activeSection, selectedCategory, selectedLabel]);

  const handleGenerateOutfitAroundPiece = async (piece: SartorialPiece) => {
    setGeneratingAnchorId(piece.id);
    showToast(
      `DeepSeek V4.1 Flash is styling a complete Daily Outfit anchored around ${piece.brand} ${piece.title} & launching KIE Sunburst 2.5...`
    );
    try {
      const res = await fetch("/api/outfits/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "anchor_piece",
          anchorPieceId: piece.id,
          occasion: `Styled Around ${piece.brand} ${piece.title}`,
          weather: piece.season === "Autumn / Winter" ? "15°C Crisp Autumn" : "20°C Mild Sun",
          imageModel: "gpt-image-2-5-sunburst-text-to-image",
          createdVia: "web",
        }),
      });
      const data = await res.json();
      if (res.ok && data.outfit) {
        setOutfits((prev) => [data.outfit, ...prev]);
        setActiveSection("outfits");
        showToast(
          `Created ${data.outfit.lookNumber}: "${data.outfit.title}"! KIE Sunburst 2.5 is now rendering the overhead flat-lay.`
        );
      }
    } finally {
      setGeneratingAnchorId(null);
    }
  };

  const handleToggleCollection = async (piece: SartorialPiece) => {
    const nextCollection: CollectionType =
      piece.collection === "wishlist" ? "wardrobe" : "wishlist";
    const res = await fetch(`/api/pieces/${piece.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collection: nextCollection }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.piece) {
        setPieces((prev) =>
          prev.map((p) => (p.id === piece.id ? data.piece : p))
        );
        showToast(
          `Moved "${piece.brand} ${piece.title}" to ${
            nextCollection === "wardrobe"
              ? "Current Wardrobe"
              : "Acquisition Wishlist"
          }.`
        );
      }
    }
  };

  const handleUpdatePiece = async (
    id: string,
    patch: Partial<SartorialPiece>
  ) => {
    const res = await fetch(`/api/pieces/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.piece) {
        setPieces((prev) => prev.map((p) => (p.id === id ? data.piece : p)));
        setInspectedPiece(data.piece);
        showToast(`Updated ledger record for ${data.piece.title}.`);
      }
    }
  };

  const handleDeletePiece = async (id: string) => {
    const res = await fetch(`/api/pieces/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPieces((prev) => prev.filter((p) => p.id !== id));
      showToast("Removed specimen from archive.");
    }
  };

  // Filtered pieces for Wishlist or Wardrobe
  const activeCollectionPieces = pieces.filter((p) =>
    activeSection === "wardrobe"
      ? p.collection === "wardrobe"
      : p.collection === "wishlist"
  );

  const filteredPieces = activeCollectionPieces.filter((p) => {
    if (selectedCategory !== "All" && p.category !== selectedCategory) {
      return false;
    }
    if (selectedLabel && !p.labels.includes(selectedLabel)) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const hay =
        `${p.title} ${p.brand} ${p.category} ${p.vibe} ${p.labels.join(" ")}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // Collect popular DeepSeek labels for quick filtering
  const allLabels = Array.from(
    new Set(activeCollectionPieces.flatMap((p) => p.labels))
  ).slice(0, 12);

  // Portfolio metrics
  const wishlistPieces = pieces.filter((p) => p.collection === "wishlist");
  const wardrobePieces = pieces.filter((p) => p.collection === "wardrobe");
  const totalWishlistValue = wishlistPieces.reduce(
    (s, p) => s + (Number(p.price) || 0),
    0
  );
  const priceDropPieces = wishlistPieces.filter(
    (p) => typeof p.priceChangePct === "number" && p.priceChangePct < -0.5
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Archival Telemetry Ticker */}
      <div className="bg-espresso-950 text-parchment-200 border-b border-brass-500/30 px-4 py-2 text-[11px] font-mono">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-brass-300 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              MAISON ARCHIVE • EDITION 1974 / DIGITAL
            </span>
            <span className="hidden md:inline text-espresso-500">|</span>
            <span className="hidden md:inline">
              CURATOR:{" "}
              <strong className="text-parchment-50">
                DeepSeek V4.1 Flash (1017)
              </strong>
            </span>
            <span className="hidden lg:inline text-espresso-500">|</span>
            <span className="hidden lg:inline">
              FLAT-LAY ENGINE:{" "}
              <strong className="text-brass-300">
                KIE.AI GPT Image 2.5 Sunburst
              </strong>
              {kieCredits !== null ? ` (${Math.round(kieCredits)} credits)` : ""}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveSection("grokbot")}
              className="inline-flex items-center gap-1.5 text-brass-300 hover:text-white transition"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>GrokBot + Railway Daily Monitor Active</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {toastBanner && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md bg-espresso-900 text-parchment-50 border border-brass-400 px-4 py-3 rounded-sm shadow-2xl flex items-center gap-3 text-xs font-mono">
          <Sparkles className="w-4 h-4 text-brass-400 shrink-0" />
          <span>{toastBanner}</span>
        </div>
      )}

      {/* Editorial Masthead */}
      <header
        ref={mastheadRef}
        className="border-b border-espresso-900/15 bg-gradient-to-b from-parchment-100/90 to-parchment-50 pt-8 pb-6 px-4 sm:px-6"
      >
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-2">
              <div className="gsap-reveal inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-brass-600">
                <span>L’ATELIER SARTORIAL & HOROLOGICAL LEDGER</span>
                <span>•</span>
                <span>EST. MCMLXXIV</span>
              </div>
              <h1 className="gsap-reveal font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold text-espresso-950 tracking-tight leading-none">
                Maison Archive
              </h1>
              <p className="gsap-reveal font-serif italic text-lg sm:text-xl text-espresso-700 max-w-2xl">
                Curated acquisitions, personal wardrobe rotation, DeepSeek V4.1
                Flash specimen labeling, KIE Sunburst 2.5 no-human flat-lay
                plates, and daily GrokBot price intelligence.
              </p>
            </div>

            {/* Primary Action Buttons */}
            <div className="gsap-reveal flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setAddModalCollection("wishlist");
                  setIsAddModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-3 bg-espresso-900 hover:bg-espresso-800 text-parchment-50 text-xs font-mono uppercase tracking-[0.15em] rounded-sm shadow-md transition"
              >
                <Plus className="w-4 h-4 text-brass-400" />
                <span>Add Wishlist Link / Piece</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAddModalCollection("wardrobe");
                  setIsAddModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-3 bg-parchment-100 hover:bg-parchment-200 border border-espresso-900/25 text-espresso-900 text-xs font-mono uppercase tracking-[0.14em] rounded-sm transition"
              >
                <Briefcase className="w-4 h-4 text-brass-600" />
                <span>Upload Current Wardrobe</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection("outfits")}
                className="inline-flex items-center gap-2 px-4 py-3 bg-brass-500/20 hover:bg-brass-500/30 border border-brass-600/40 text-espresso-950 text-xs font-mono uppercase tracking-[0.14em] rounded-sm transition"
              >
                <Wand2 className="w-4 h-4 text-brass-600" />
                <span>Daily Outfits Studio</span>
              </button>
            </div>
          </div>

          {/* KPI Ledger Strip */}
          <div className="gsap-reveal grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div
              onClick={() => setActiveSection("wishlist")}
              className="cursor-pointer p-3.5 bg-parchment-50/90 hover:bg-white border border-espresso-900/15 rounded-sm transition"
            >
              <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-espresso-600">
                <span>Wishlist Ledger</span>
                <Bookmark className="w-3.5 h-3.5 text-brass-600" />
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="font-serif text-2xl font-semibold text-espresso-950">
                  {wishlistPieces.length} Pieces
                </span>
                <span className="text-xs font-mono text-espresso-700">
                  ${totalWishlistValue.toLocaleString()}
                </span>
              </div>
            </div>

            <div
              onClick={() => setActiveSection("wardrobe")}
              className="cursor-pointer p-3.5 bg-parchment-50/90 hover:bg-white border border-espresso-900/15 rounded-sm transition"
            >
              <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-espresso-600">
                <span>Current Wardrobe</span>
                <Briefcase className="w-3.5 h-3.5 text-brass-600" />
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="font-serif text-2xl font-semibold text-espresso-950">
                  {wardrobePieces.length} Owned
                </span>
                <span className="text-xs font-mono text-brass-600">
                  Outfit-Ready
                </span>
              </div>
            </div>

            <div
              onClick={() => setActiveSection("outfits")}
              className="cursor-pointer p-3.5 bg-parchment-50/90 hover:bg-white border border-espresso-900/15 rounded-sm transition"
            >
              <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-espresso-600">
                <span>Sunburst 2.5 Plates</span>
                <Sparkles className="w-3.5 h-3.5 text-brass-600" />
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="font-serif text-2xl font-semibold text-espresso-950">
                  {outfits.length} Outfits
                </span>
                <span className="text-xs font-mono text-espresso-700">
                  No-Human Flat-Lays
                </span>
              </div>
            </div>

            <div
              onClick={() => setActiveSection("grokbot")}
              className="cursor-pointer p-3.5 bg-parchment-50/90 hover:bg-white border border-espresso-900/15 rounded-sm transition"
            >
              <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-espresso-600">
                <span>GrokBot Price Drops</span>
                <TrendingDown className="w-3.5 h-3.5 text-sage-600" />
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="font-serif text-2xl font-semibold text-sage-600">
                  {priceDropPieces.length} Drops
                </span>
                <span className="text-xs font-mono text-sage-600">
                  Daily Cron Active
                </span>
              </div>
            </div>
          </div>

          {/* Primary Navigation Tabs */}
          <nav className="gsap-reveal flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-espresso-900/10">
            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
              {[
                {
                  id: "wishlist",
                  label: `Acquisition Wishlist (${wishlistPieces.length})`,
                  icon: Bookmark,
                },
                {
                  id: "wardrobe",
                  label: `Current Wardrobe (${wardrobePieces.length})`,
                  icon: Briefcase,
                },
                {
                  id: "outfits",
                  label: `Daily Outfits Studio (${outfits.length})`,
                  icon: Wand2,
                },
                {
                  id: "grokbot",
                  label: "GrokBot & Railway Hub",
                  icon: Bot,
                },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeSection === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSection(tab.id as ActiveSection)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-mono uppercase tracking-wider rounded-sm transition ${
                      active
                        ? "bg-espresso-900 text-parchment-50 shadow-sm"
                        : "bg-parchment-100/70 hover:bg-parchment-200 text-espresso-800"
                    }`}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 ${
                        active ? "text-brass-400" : "text-brass-600"
                      }`}
                    />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={fetchLedger}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-espresso-600 hover:text-espresso-950 transition"
              title="Sync live ledger with Railway & GrokBot"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync Ledger</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {(activeSection === "wishlist" || activeSection === "wardrobe") && (
          <div className="space-y-6">
            {/* Section Banner + Search + Category Filter Ribbon */}
            <div className="bg-parchment-100/70 border border-espresso-900/15 p-5 rounded-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-espresso-950">
                    {activeSection === "wishlist"
                      ? "The Acquisition Wishlist — Pieces to Acquire"
                      : "Current Personal Wardrobe — Owned Rotation"}
                  </h2>
                  <p className="text-xs text-espresso-700 mt-0.5">
                    {activeSection === "wishlist"
                      ? "Upload any product link or piece. DeepSeek V4.1 Flash extracts photos, prices & labels; GrokBot monitors daily price drops; click 'Style Daily Outfit' on any card to render a KIE Sunburst 2.5 look."
                      : "Upload your current wardrobe pieces. DeepSeek V4.1 Flash assigns sartorial labels & vibes and combines them with your wishlist to create daily flat-lay outfits."}
                  </p>
                </div>

                {/* Search Input */}
                <div className="relative w-full md:w-72">
                  <Search className="w-4 h-4 text-espresso-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search brand, label, vibe..."
                    className="w-full pl-9 pr-3 py-2 bg-parchment-50 border border-espresso-900/20 rounded-sm text-xs font-mono text-espresso-900 focus:outline-none focus:border-brass-600"
                  />
                </div>
              </div>

              {/* 9 Categories Ribbon */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-espresso-900/10">
                <span className="text-[10px] font-mono uppercase tracking-wider text-espresso-500 mr-1.5 flex items-center gap-1">
                  <SlidersHorizontal className="w-3 h-3" />
                  Department:
                </span>
                {(["All", ...SARTORIAL_CATEGORIES] as const).map((cat) => {
                  const active = selectedCategory === cat;
                  const count =
                    cat === "All"
                      ? activeCollectionPieces.length
                      : activeCollectionPieces.filter((p) => p.category === cat)
                          .length;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm transition ${
                        active
                          ? "bg-espresso-900 text-parchment-50 shadow-sm"
                          : "bg-parchment-50 hover:bg-parchment-200 border border-espresso-900/15 text-espresso-800"
                      }`}
                    >
                      <span>{cat}</span>
                      <span
                        className={`ml-1.5 text-[10px] ${
                          active ? "text-brass-300" : "text-espresso-500"
                        }`}
                      >
                        ({count})
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* DeepSeek Label Filter Pills */}
              {allLabels.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-espresso-500 mr-1">
                    DeepSeek Labels:
                  </span>
                  {selectedLabel && (
                    <button
                      type="button"
                      onClick={() => setSelectedLabel(null)}
                      className="px-2 py-0.5 bg-oxblood-600 text-parchment-50 text-[10px] font-mono rounded-sm"
                    >
                      Clear: {selectedLabel} ×
                    </button>
                  )}
                  {allLabels.map((lbl) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() =>
                        setSelectedLabel(selectedLabel === lbl ? null : lbl)
                      }
                      className={`px-2 py-0.5 text-[10px] font-mono rounded-sm border transition ${
                        selectedLabel === lbl
                          ? "bg-brass-600 text-parchment-50 border-brass-600"
                          : "bg-parchment-50 hover:bg-parchment-200 border-espresso-900/12 text-espresso-700"
                      }`}
                    >
                      #{lbl}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cards Grid */}
            {filteredPieces.length === 0 ? (
              <div className="archive-card p-12 text-center rounded-sm space-y-4">
                <p className="font-serif text-2xl text-espresso-800">
                  No sartorial specimens match the current filter.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory("All");
                      setSelectedLabel(null);
                      setSearchQuery("");
                    }}
                    className="px-4 py-2 bg-parchment-200 text-espresso-900 text-xs font-mono uppercase rounded-sm"
                  >
                    Reset Filters
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddModalCollection(activeSection);
                      setIsAddModalOpen(true);
                    }}
                    className="px-4 py-2 bg-espresso-900 text-parchment-50 text-xs font-mono uppercase rounded-sm"
                  >
                    + Catalogue New Specimen
                  </button>
                </div>
              </div>
            ) : (
              <div
                ref={gridRef}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {filteredPieces.map((piece) => (
                  <PieceCard
                    key={piece.id}
                    piece={piece}
                    isGeneratingOutfit={generatingAnchorId === piece.id}
                    onGenerateOutfitAroundPiece={
                      handleGenerateOutfitAroundPiece
                    }
                    onInspectDossier={(p) => setInspectedPiece(p)}
                    onToggleCollection={handleToggleCollection}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === "outfits" && (
          <DailyOutfitsStudio
            pieces={pieces}
            outfits={outfits}
            onOutfitCreated={(newOutfit) => {
              setOutfits((prev) => [newOutfit, ...prev]);
              showToast(
                `Curated ${newOutfit.lookNumber}: "${newOutfit.title}" via DeepSeek V4.1 Flash + KIE Sunburst 2.5!`
              );
            }}
            onOutfitUpdated={(updatedOutfit) => {
              setOutfits((prev) =>
                prev.map((o) =>
                  o.id === updatedOutfit.id ? updatedOutfit : o
                )
              );
              if (updatedOutfit.status === "completed") {
                showToast(
                  `${updatedOutfit.lookNumber} flat-lay photograph finished developing!`
                );
              }
            }}
            onInspectPiece={(p) => setInspectedPiece(p)}
          />
        )}

        {activeSection === "grokbot" && (
          <GrokBotHub
            reports={reports}
            events={events}
            lastDailyCheckAt={lastDailyCheckAt}
            railwayUrl={railwayUrl}
            onReportCreated={(rep) => {
              setReports((prev) => [rep, ...prev]);
              showToast(`Daily Price Audit Complete: ${rep.summaryHeadline}`);
            }}
            onPieceCreated={(p) => {
              setPieces((prev) => [p, ...prev]);
              showToast(`GrokBot added ${p.brand} ${p.title} to ${p.collection}!`);
            }}
            onOutfitCreated={(o) => {
              setOutfits((prev) => [o, ...prev]);
              showToast(`GrokBot launched Sunburst 2.5 outfit: ${o.title}`);
            }}
            onRefreshLedger={fetchLedger}
          />
        )}
      </main>

      {/* Vintage Footer */}
      <footer className="mt-16 border-t border-espresso-900/15 bg-parchment-100/80 py-8 px-4 sm:px-6 text-xs font-mono text-espresso-600">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-semibold text-espresso-900">
              MAISON ARCHIVE (EST. 1974 / DIGITAL EDITION)
            </span>{" "}
            — Fragrances · Watches · Sunglasses · Wallets · Shirts · T-Shirts ·
            Men’s Apparel · Pants · Jackets
          </div>
          <div className="flex items-center gap-4">
            <span>OpenRouter: DeepSeek V4.1 Flash (1017)</span>
            <span>•</span>
            <span>KIE.AI: GPT Image 2.5 Sunburst</span>
            <span>•</span>
            <span>Railway + Vercel + GrokBot MCP</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AddPieceModal
        isOpen={isAddModalOpen}
        defaultCollection={addModalCollection}
        onClose={() => setIsAddModalOpen(false)}
        onPieceAdded={(newPiece) => {
          setPieces((prev) => [newPiece, ...prev]);
          setActiveSection(newPiece.collection);
          showToast(
            `Catalogued "${newPiece.brand} ${newPiece.title}" (${newPiece.archiveCode}) with ${newPiece.labels.length} DeepSeek V4.1 Flash labels!`
          );
        }}
      />

      <PieceDossierModal
        piece={inspectedPiece}
        onClose={() => setInspectedPiece(null)}
        onGenerateOutfit={handleGenerateOutfitAroundPiece}
        onUpdatePiece={handleUpdatePiece}
        onDeletePiece={handleDeletePiece}
      />
    </div>
  );
}
