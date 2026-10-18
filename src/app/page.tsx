"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import gsap from "gsap";
import {
  Plus,
  Search,
  Bookmark,
  Briefcase,
  Layers,
  Activity,
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
import PieceCard from "@/components/PieceCard";
import AddPieceModal from "@/components/AddPieceModal";
import PieceDossierModal from "@/components/PieceDossierModal";
import DailyOutfitsStudio from "@/components/DailyOutfitsStudio";
import GrokBotHub from "@/components/GrokBotHub";

type ActiveSection = "wishlist" | "wardrobe" | "outfits" | "reports";

export default function MaisonArchivePage() {
  const [activeSection, setActiveSection] = useState<ActiveSection>("wishlist");
  const [pieces, setPieces] = useState<SartorialPiece[]>([]);
  const [outfits, setOutfits] = useState<DailyOutfit[]>([]);
  const [reports, setReports] = useState<DailyPriceReport[]>([]);
  const [events, setEvents] = useState<GrokBotEvent[]>([]);
  const [lastDailyCheckAt, setLastDailyCheckAt] = useState<string | undefined>(
    undefined
  );
  const [railwayUrl, setRailwayUrl] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<
    SartorialCategory | "All"
  >("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  // Modals
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
    setTimeout(() => setToastBanner(null), 4000);
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
      }
    } catch {
      // ignore
    }
  }, []);

  // Initial load + background sync every 6s so items pushed by GrokBot appear live
  useEffect(() => {
    fetchLedger();
    const interval = setInterval(fetchLedger, 6000);
    return () => clearInterval(interval);
  }, [fetchLedger]);

  useEffect(() => {
    if (mastheadRef.current) {
      gsap.fromTo(
        mastheadRef.current.querySelectorAll(".gsap-reveal"),
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 0.55,
          stagger: 0.06,
          ease: "power3.out",
        }
      );
    }
  }, []);

  useEffect(() => {
    if (gridRef.current && gridRef.current.children.length > 0) {
      gsap.fromTo(
        gridRef.current.children,
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          stagger: 0.04,
          ease: "power2.out",
        }
      );
    }
  }, [activeSection, selectedCategory, selectedLabel, pieces.length]);

  const handleGenerateOutfitAroundPiece = async (piece: SartorialPiece) => {
    setGeneratingAnchorId(piece.id);
    showToast(`Styling outfit around ${piece.brand} ${piece.title}...`);
    try {
      const res = await fetch("/api/outfits/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "anchor_piece",
          anchorPieceId: piece.id,
          occasion: `Styled Around ${piece.brand} ${piece.title}`,
          weather: piece.season || "All-Season",
          imageModel: "gpt-image-2-5-sunburst-text-to-image",
          createdVia: "web",
        }),
      });
      const data = await res.json();
      if (res.ok && data.outfit) {
        setOutfits((prev) => [data.outfit, ...prev]);
        setActiveSection("outfits");
        showToast(`Rendering ${data.outfit.title}...`);
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
          `Moved to ${
            nextCollection === "wardrobe" ? "Wardrobe" : "Buylist"
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
        showToast("Updated.");
      }
    }
  };

  const handleRefreshPiece = (piece: SartorialPiece) => {
    setPieces((prev) => prev.map((p) => (p.id === piece.id ? piece : p)));
    setInspectedPiece(piece);
    showToast("Entry refreshed from live web search.");
  };

  const handleDeletePiece = async (id: string) => {
    const res = await fetch(`/api/pieces/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPieces((prev) => prev.filter((p) => p.id !== id));
      showToast("Removed.");
    }
  };

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

  const allLabels = Array.from(
    new Set(activeCollectionPieces.flatMap((p) => p.labels))
  ).slice(0, 10);

  const wishlistPieces = pieces.filter((p) => p.collection === "wishlist");
  const wardrobePieces = pieces.filter((p) => p.collection === "wardrobe");

  return (
    <div className="min-h-screen flex flex-col">
      {toastBanner && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm bg-espresso-900 text-parchment-50 border border-brass-400 px-4 py-2.5 rounded-sm shadow-2xl flex items-center gap-2.5 text-xs font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-brass-400 shrink-0" />
          <span>{toastBanner}</span>
        </div>
      )}

      {/* Clean Vintage Header */}
      <header
        ref={mastheadRef}
        className="border-b border-espresso-900/15 bg-parchment-100/80 px-4 sm:px-6 py-5"
      >
        <div className="max-w-7xl mx-auto flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="gsap-reveal font-serif text-3xl sm:text-4xl font-semibold text-espresso-950 tracking-tight">
              Maison Archive
            </h1>

            <div className="gsap-reveal flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setAddModalCollection(
                    activeSection === "wardrobe" ? "wardrobe" : "wishlist"
                  );
                  setIsAddModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-espresso-900 hover:bg-espresso-800 text-parchment-50 text-xs font-mono uppercase tracking-wider rounded-sm transition"
              >
                <Plus className="w-3.5 h-3.5 text-brass-400" />
                <span>Add Piece</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="gsap-reveal flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-espresso-900/10">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                {
                  id: "wishlist",
                  label: `Buylist (${wishlistPieces.length})`,
                  icon: Bookmark,
                },
                {
                  id: "wardrobe",
                  label: `Wardrobe (${wardrobePieces.length})`,
                  icon: Briefcase,
                },
                {
                  id: "outfits",
                  label: `Daily Outfits (${outfits.length})`,
                  icon: Layers,
                },
                {
                  id: "reports",
                  label: "Price Reports & Sync",
                  icon: Activity,
                },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeSection === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSection(tab.id as ActiveSection)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono uppercase tracking-wider rounded-sm transition ${
                      active
                        ? "bg-espresso-900 text-parchment-50"
                        : "bg-parchment-50/80 hover:bg-parchment-200 text-espresso-800"
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

            {(activeSection === "wishlist" || activeSection === "wardrobe") && (
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-espresso-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-8 pr-3 py-1.5 bg-parchment-50 border border-espresso-900/20 rounded-sm text-xs font-mono text-espresso-900 focus:outline-none focus:border-brass-600"
                />
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {(activeSection === "wishlist" || activeSection === "wardrobe") && (
          <div className="space-y-5">
            {/* Categories Filter */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(["All", ...SARTORIAL_CATEGORIES] as const).map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 text-xs font-mono uppercase tracking-wider rounded-sm transition ${
                      active
                        ? "bg-espresso-900 text-parchment-50"
                        : "bg-parchment-100 hover:bg-parchment-200 border border-espresso-900/12 text-espresso-800"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Label Filter Pills */}
            {allLabels.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {selectedLabel && (
                  <button
                    type="button"
                    onClick={() => setSelectedLabel(null)}
                    className="px-2 py-0.5 bg-oxblood-600 text-parchment-50 text-[10px] font-mono rounded-sm"
                  >
                    {selectedLabel} ×
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
                        : "bg-parchment-50 hover:bg-parchment-200 border-espresso-900/10 text-espresso-700"
                    }`}
                  >
                    #{lbl}
                  </button>
                ))}
              </div>
            )}

            {/* Grid or Empty State */}
            {filteredPieces.length === 0 ? (
              <div className="archive-card p-14 text-center rounded-sm space-y-4">
                <p className="font-serif text-xl text-espresso-700">
                  {activeSection === "wishlist"
                    ? "Your buylist is empty."
                    : "Your wardrobe is empty."}
                </p>
                <div className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAddModalCollection(activeSection);
                      setIsAddModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-espresso-900 text-parchment-50 text-xs font-mono uppercase tracking-wider rounded-sm"
                  >
                    <Plus className="w-3.5 h-3.5 text-brass-400" />
                    <span>
                      Add to{" "}
                      {activeSection === "wishlist" ? "Buylist" : "Wardrobe"}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                ref={gridRef}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
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
              showToast(`Generating ${newOutfit.title}...`);
            }}
            onOutfitUpdated={(updatedOutfit) => {
              setOutfits((prev) =>
                prev.map((o) =>
                  o.id === updatedOutfit.id ? updatedOutfit : o
                )
              );
              if (updatedOutfit.status === "completed") {
                showToast("Outfit image ready.");
              }
            }}
            onInspectPiece={(p) => setInspectedPiece(p)}
          />
        )}

        {activeSection === "reports" && (
          <GrokBotHub
            reports={reports}
            events={events}
            lastDailyCheckAt={lastDailyCheckAt}
            railwayUrl={railwayUrl}
            onReportCreated={(rep) => {
              setReports((prev) => [rep, ...prev]);
              showToast("Price check complete.");
            }}
            onRefreshLedger={fetchLedger}
          />
        )}
      </main>

      {/* Modals */}
      <AddPieceModal
        isOpen={isAddModalOpen}
        defaultCollection={addModalCollection}
        onClose={() => setIsAddModalOpen(false)}
        onPieceAdded={(newPiece) => {
          setPieces((prev) => [newPiece, ...prev]);
          setActiveSection(newPiece.collection);
          showToast(`Added ${newPiece.title}.`);
        }}
      />

      <PieceDossierModal
        piece={inspectedPiece}
        onClose={() => setInspectedPiece(null)}
        onGenerateOutfit={handleGenerateOutfitAroundPiece}
        onUpdatePiece={handleUpdatePiece}
        onDeletePiece={handleDeletePiece}
        onRefreshPiece={handleRefreshPiece}
      />
    </div>
  );
}
