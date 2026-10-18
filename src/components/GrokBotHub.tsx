"use client";

import React, { useState } from "react";
import {
  Bot,
  RefreshCw,
  Send,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import {
  DailyOutfit,
  DailyPriceReport,
  GrokBotEvent,
  SartorialPiece,
} from "@/lib/types";

interface GrokBotHubProps {
  reports: DailyPriceReport[];
  events: GrokBotEvent[];
  lastDailyCheckAt?: string;
  railwayUrl?: string | null;
  onReportCreated: (report: DailyPriceReport) => void;
  onPieceCreated: (piece: SartorialPiece) => void;
  onOutfitCreated: (outfit: DailyOutfit) => void;
  onRefreshLedger: () => Promise<void>;
}

export default function GrokBotHub({
  reports,
  railwayUrl,
  onReportCreated,
  onPieceCreated,
  onOutfitCreated,
  onRefreshLedger,
}: GrokBotHubProps) {
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<
    Array<{ role: "user" | "grokbot"; text: string }>
  >([]);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [isRunningCheck, setIsRunningCheck] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const latestReport = reports[0];
  const baseEndpoint =
    railwayUrl || "https://maison-archive-grokbot-production.up.railway.app";

  const mcpConfigJson = JSON.stringify(
    {
      mcpServers: {
        "maison-archive": {
          type: "http",
          url: `${baseEndpoint}/mcp`,
        },
      },
    },
    null,
    2
  );

  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRunDailyCheck = async () => {
    setIsRunningCheck(true);
    try {
      const res = await fetch("/api/daily-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggeredBy: "manual_web" }),
      });
      const data = await res.json();
      if (res.ok && data.report) {
        onReportCreated(data.report);
        await onRefreshLedger();
      }
    } finally {
      setIsRunningCheck(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput("");
    setChatHistory((prev) => [...prev, { role: "user", text: msg }]);
    setIsSendingChat(true);

    try {
      const res = await fetch("/api/grokbot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      const reply = data.reply || data.error || "Done.";

      setChatHistory((prev) => [...prev, { role: "grokbot", text: reply }]);

      if (data.createdPiece) onPieceCreated(data.createdPiece);
      if (data.createdOutfit) onOutfitCreated(data.createdOutfit);
      if (data.createdReport) onReportCreated(data.createdReport);
      await onRefreshLedger();
    } catch (err: any) {
      setChatHistory((prev) => [
        ...prev,
        {
          role: "grokbot",
          text: err?.message || "Failed to reach GrokBot endpoint",
        },
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: GrokBot Chat */}
      <div className="lg:col-span-6 archive-card rounded-sm flex flex-col overflow-hidden">
        <div className="px-5 py-3.5 bg-espresso-900 text-parchment-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-brass-400" />
            <span className="text-xs font-mono uppercase tracking-wider font-semibold">
              GrokBot Console
            </span>
          </div>
          <button
            type="button"
            onClick={handleRunDailyCheck}
            disabled={isRunningCheck}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-brass-500 hover:bg-brass-400 text-espresso-950 font-mono text-[11px] uppercase font-semibold rounded-sm transition disabled:opacity-60"
          >
            {isRunningCheck ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            <span>Check Prices</span>
          </button>
        </div>

        <div className="p-4 flex-1 min-h-[300px] max-h-[380px] overflow-y-auto space-y-3 bg-parchment-50/70">
          {chatHistory.length === 0 && (
            <div className="text-xs font-mono text-espresso-500 py-8 text-center">
              Paste a product URL, add a wardrobe item, or ask GrokBot to style
              an outfit.
            </div>
          )}
          {chatHistory.map((item, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${
                item.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[90%] rounded-sm px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                  item.role === "user"
                    ? "bg-espresso-900 text-parchment-50 font-mono"
                    : "bg-parchment-200/80 border border-espresso-900/15 text-espresso-900"
                }`}
              >
                {item.text}
              </div>
            </div>
          ))}
          {isSendingChat && (
            <div className="flex items-center gap-2 text-xs font-mono text-espresso-600 p-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-brass-600" />
              <span>Working...</span>
            </div>
          )}
        </div>

        <form
          onSubmit={handleSendChat}
          className="p-3 bg-parchment-100 border-t border-espresso-900/15 flex items-center gap-2"
        >
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Message GrokBot or paste link..."
            className="flex-1 px-3 py-2 bg-white border border-espresso-900/20 rounded-sm text-xs font-mono text-espresso-900 focus:outline-none focus:border-brass-600"
          />
          <button
            type="submit"
            disabled={isSendingChat}
            className="px-3.5 py-2 bg-espresso-900 hover:bg-espresso-800 text-parchment-50 rounded-sm text-xs font-mono uppercase inline-flex items-center gap-1.5 transition disabled:opacity-60"
          >
            <Send className="w-3.5 h-3.5 text-brass-400" />
          </button>
        </form>
      </div>

      {/* Right: Daily Price Report & MCP Config */}
      <div className="lg:col-span-6 space-y-6">
        <div className="archive-card p-5 rounded-sm space-y-4">
          <div className="flex items-center justify-between border-b border-espresso-900/10 pb-2.5">
            <h3 className="font-serif text-xl font-semibold text-espresso-950">
              Daily Price Report
            </h3>
            {latestReport && (
              <span className="text-xs font-mono text-espresso-500">
                {latestReport.date}
              </span>
            )}
          </div>

          {!latestReport ? (
            <div className="text-xs font-mono text-espresso-600 py-6 text-center">
              No price report yet. Click &ldquo;Check Prices&rdquo; to audit
              your wishlist.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm font-medium text-espresso-950">
                {latestReport.summaryHeadline}
              </div>
              <p className="text-xs text-espresso-700 leading-relaxed">
                {latestReport.executiveBrief}
              </p>
              {latestReport.itemUpdates.length > 0 && (
                <div className="border border-espresso-900/15 rounded-sm divide-y divide-espresso-900/10 bg-white max-h-48 overflow-y-auto">
                  {latestReport.itemUpdates.map((upd) => (
                    <div
                      key={upd.pieceId}
                      className="px-3.5 py-2 flex items-center justify-between text-xs font-mono"
                    >
                      <span className="truncate max-w-[200px] text-espresso-900">
                        {upd.brand} {upd.title}
                      </span>
                      <span className="font-semibold text-espresso-950">
                        ${upd.currentPrice}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* MCP Connector Snippet */}
        <div className="archive-card p-5 rounded-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-espresso-800 font-semibold">
              GrokBot MCP Config
            </span>
            <button
              type="button"
              onClick={() => copyText("mcp", mcpConfigJson)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-espresso-900 text-parchment-50 text-[10px] font-mono uppercase rounded-sm"
            >
              {copiedKey === "mcp" ? (
                <>
                  <Check className="w-3 h-3 text-brass-300" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-brass-300" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-3 bg-espresso-950 text-parchment-100 text-xs font-mono rounded-sm overflow-x-auto">
            {mcpConfigJson}
          </pre>
        </div>
      </div>
    </div>
  );
}
