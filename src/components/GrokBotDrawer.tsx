"use client";

import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import {
  Bot,
  X,
  Send,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  DailyOutfit,
  DailyPriceReport,
  SartorialPiece,
} from "@/lib/types";

interface GrokBotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onPieceCreated: (piece: SartorialPiece) => void;
  onOutfitCreated: (outfit: DailyOutfit) => void;
  onReportCreated: (report: DailyPriceReport) => void;
  onRefreshLedger: () => Promise<void>;
}

export default function GrokBotDrawer({
  isOpen,
  onClose,
  onPieceCreated,
  onOutfitCreated,
  onReportCreated,
  onRefreshLedger,
}: GrokBotDrawerProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "grokbot"; text: string }>
  >([
    {
      role: "grokbot",
      text: "Paste a product link, add a wardrobe item, check wishlist prices, or ask me to generate an outfit.",
    },
  ]);
  const [isSending, setIsSending] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && drawerRef.current) {
      gsap.fromTo(
        drawerRef.current,
        { x: 380, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.32, ease: "power3.out" }
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const msg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: msg }]);
    setIsSending(true);

    try {
      const res = await fetch("/api/grokbot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "grokbot",
          text: data.reply || data.error || "Done.",
        },
      ]);
      if (data.createdPiece) onPieceCreated(data.createdPiece);
      if (data.createdOutfit) onOutfitCreated(data.createdOutfit);
      if (data.createdReport) onReportCreated(data.createdReport);
      await onRefreshLedger();
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "grokbot",
          text: err?.message || "Failed to reach GrokBot.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-espresso-950/50 backdrop-blur-xs">
      <div
        ref={drawerRef}
        className="w-full max-w-md bg-parchment-50 h-full border-l border-espresso-900/20 shadow-2xl flex flex-col justify-between"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-espresso-900 text-parchment-50 flex items-center justify-between border-b border-brass-500/30">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-brass-400" />
            <span className="font-serif text-lg font-semibold">GrokBot</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-parchment-200 hover:text-white rounded-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="px-4 py-2.5 bg-parchment-100 border-b border-espresso-900/10 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setInput("Run daily price check")}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-parchment-50 hover:bg-parchment-200 border border-espresso-900/15 text-[11px] font-mono text-espresso-800 rounded-sm"
          >
            <RefreshCw className="w-3 h-3 text-brass-600" />
            <span>Price Check</span>
          </button>
          <button
            type="button"
            onClick={() => setInput("Generate a daily outfit")}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-parchment-50 hover:bg-parchment-200 border border-espresso-900/15 text-[11px] font-mono text-espresso-800 rounded-sm"
          >
            <Sparkles className="w-3 h-3 text-brass-600" />
            <span>Generate Outfit</span>
          </button>
        </div>

        {/* Messages */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex flex-col ${
                m.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[88%] rounded-sm px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-espresso-900 text-parchment-50 font-mono"
                    : "bg-parchment-200/80 border border-espresso-900/15 text-espresso-900"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {isSending && (
            <div className="flex items-center gap-2 text-xs font-mono text-espresso-600">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-brass-600" />
              <span>Working...</span>
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="p-3.5 bg-parchment-100 border-t border-espresso-900/15 flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste link or message GrokBot..."
            className="flex-1 px-3 py-2 bg-white border border-espresso-900/20 rounded-sm text-xs font-mono text-espresso-900 focus:outline-none focus:border-brass-600"
          />
          <button
            type="submit"
            disabled={isSending}
            className="px-3.5 py-2 bg-espresso-900 hover:bg-espresso-800 text-parchment-50 rounded-sm text-xs font-mono uppercase inline-flex items-center gap-1.5 disabled:opacity-60"
          >
            <Send className="w-3.5 h-3.5 text-brass-400" />
          </button>
        </form>
      </div>
    </div>
  );
}
