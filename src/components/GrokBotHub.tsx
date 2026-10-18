"use client";

import React, { useState } from "react";
import {
  Bot,
  RefreshCw,
  Send,
  Copy,
  Check,
  TrendingDown,
  Terminal,
  Server,
  Clock,
  Activity,
  Sparkles,
  Loader2,
  ShieldCheck,
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
  events,
  lastDailyCheckAt,
  railwayUrl,
  onReportCreated,
  onPieceCreated,
  onOutfitCreated,
  onRefreshLedger,
}: GrokBotHubProps) {
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<
    Array<{ role: "user" | "grokbot"; text: string; timestamp: string }>
  >([
    {
      role: "grokbot",
      text: "GrokBot Sartorial Bridge connected via Railway + DeepSeek V4.1 Flash (1017). Send a product link to add to your wishlist, upload a wardrobe piece by description, trigger a daily price audit, or ask me to generate today's Sunburst 2.5 outfit.",
      timestamp: "ONLINE",
    },
  ]);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [isRunningCheck, setIsRunningCheck] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const latestReport = reports[0];

  const baseEndpoint =
    railwayUrl ||
    (typeof window !== "undefined" ? window.location.origin : "https://maison-archive.up.railway.app");

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

  const grokbotRoutinePrompt = `Every morning at 09:00, call the Maison Archive MCP tool "archive_run_daily_price_check" (or POST ${baseEndpoint}/api/daily-check) to audit all wishlist links for price drops and stock changes. Then call "archive_generate_daily_outfit" with mode="hybrid_daily" to prepare my no-human KIE Sunburst 2.5 outfit plate of the day, and send me a concise executive briefing.`;

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
    setChatHistory((prev) => [
      ...prev,
      {
        role: "user",
        text: msg,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
    setIsSendingChat(true);

    try {
      const res = await fetch("/api/grokbot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      const reply =
        data.reply || data.error || "Command processed by GrokBot service.";

      setChatHistory((prev) => [
        ...prev,
        {
          role: "grokbot",
          text: reply,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);

      if (data.createdPiece) onPieceCreated(data.createdPiece);
      if (data.createdOutfit) onOutfitCreated(data.createdOutfit);
      if (data.createdReport) onReportCreated(data.createdReport);
      await onRefreshLedger();
    } catch (err: any) {
      setChatHistory((prev) => [
        ...prev,
        {
          role: "grokbot",
          text: `Connection error: ${err?.message || "Failed to reach GrokBot endpoint"}`,
          timestamp: "ERROR",
        },
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Top Status Banner */}
      <section className="archive-double-border bg-espresso-900 text-parchment-50 p-6 md:p-8 rounded-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-brass-300">
              <Server className="w-3.5 h-3.5 text-brass-400" />
              <span>RAILWAY 24/7 DAEMON & GROKBOT MCP BRIDGE</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                ONLINE
              </span>
            </div>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold">
              GrokBot Sartorial Command & Daily Price Intelligence
            </h2>
            <p className="text-sm text-parchment-200 max-w-2xl">
              Your wishlist and wardrobe are synced with a live{" "}
              <strong>Railway Service + Streamable HTTP MCP Server</strong>.
              GrokBot monitors your wishlist links daily for price changes,
              dispatches executive briefings, uploads new pieces directly from
              chat, and triggers KIE Sunburst 2.5 flat-lay renders.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="button"
              onClick={handleRunDailyCheck}
              disabled={isRunningCheck}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-brass-500 hover:bg-brass-400 text-espresso-950 font-mono text-xs uppercase tracking-wider font-semibold rounded-sm shadow-lg transition disabled:opacity-60"
            >
              {isRunningCheck ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Auditing Wishlist Links...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Run Daily Price Audit Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Main Two-Column Grid: GrokBot Live Console + Daily Price Report */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 5 Cols: Interactive GrokBot Console */}
        <div className="lg:col-span-5 archive-card rounded-sm flex flex-col overflow-hidden">
          <div className="px-5 py-3.5 bg-espresso-900 text-parchment-50 border-b border-brass-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-brass-400" />
              <span className="text-xs font-mono uppercase tracking-wider font-semibold">
                GrokBot Live Sartorial Console
              </span>
            </div>
            <span className="text-[10px] font-mono text-brass-300">
              DeepSeek V4.1 Flash (1017)
            </span>
          </div>

          {/* Chat Messages */}
          <div className="p-4 flex-1 min-h-[340px] max-h-[420px] overflow-y-auto space-y-3 bg-parchment-50/70">
            {chatHistory.map((item, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${
                  item.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[90%] rounded-sm px-3.5 py-2.5 text-xs leading-relaxed ${
                    item.role === "user"
                      ? "bg-espresso-900 text-parchment-50 font-mono"
                      : "bg-parchment-200/80 border border-espresso-900/15 text-espresso-900"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{item.text}</div>
                </div>
                <span className="text-[10px] font-mono text-espresso-500 mt-1">
                  {item.role === "user" ? "YOU" : "GROKBOT"} • {item.timestamp}
                </span>
              </div>
            ))}
            {isSendingChat && (
              <div className="flex items-center gap-2 text-xs font-mono text-espresso-600 p-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-brass-600" />
                <span>GrokBot executing archive tools...</span>
              </div>
            )}
          </div>

          {/* Quick Command Chips */}
          <div className="px-4 py-2 bg-parchment-100 border-t border-espresso-900/10 flex flex-wrap gap-1.5">
            {[
              "Run daily price check and report",
              "Add Creed Green Irish Tweed 100ml ($365) to my wishlist",
              "Add my grey cashmere crewneck sweater to my wardrobe",
              "Generate a rainy Milan daily outfit",
            ].map((cmd) => (
              <button
                key={cmd}
                type="button"
                onClick={() => setChatInput(cmd)}
                className="px-2 py-1 bg-parchment-50 hover:bg-parchment-200 border border-espresso-900/15 text-[10px] font-mono text-espresso-800 rounded-sm transition"
              >
                {cmd}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSendChat}
            className="p-3 bg-parchment-100 border-t border-espresso-900/15 flex items-center gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Paste a link, upload a piece, or ask GrokBot..."
              className="flex-1 px-3 py-2 bg-white border border-espresso-900/20 rounded-sm text-xs font-mono text-espresso-900 focus:outline-none focus:border-brass-600"
            />
            <button
              type="submit"
              disabled={isSendingChat}
              className="px-3.5 py-2 bg-espresso-900 hover:bg-espresso-800 text-parchment-50 rounded-sm text-xs font-mono uppercase tracking-wider inline-flex items-center gap-1.5 transition disabled:opacity-60"
            >
              <Send className="w-3.5 h-3.5 text-brass-400" />
              <span>Send</span>
            </button>
          </form>
        </div>

        {/* Right 7 Cols: Latest Daily Price & Stock Briefing Report */}
        <div className="lg:col-span-7 archive-card rounded-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-6 py-3.5 bg-parchment-200/80 border-b border-espresso-900/15 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-espresso-900 font-semibold">
                <Clock className="w-4 h-4 text-brass-600" />
                <span>
                  Daily Wishlist Audit Report ({latestReport?.date || "Today"})
                </span>
              </div>
              <span className="text-[11px] font-mono text-espresso-600">
                Last Sweep:{" "}
                {lastDailyCheckAt
                  ? new Date(lastDailyCheckAt).toLocaleString()
                  : "Today 08:30 UTC"}
              </span>
            </div>

            {latestReport && (
              <div className="p-6 space-y-5">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-sage-600 text-parchment-50 text-[10px] font-mono uppercase tracking-widest rounded-sm">
                    <ShieldCheck className="w-3 h-3 text-brass-300" />
                    <span>VERIFIED BY DEEPSEEK V4.1 FLASH</span>
                  </div>
                  <h3 className="font-serif text-2xl font-semibold text-espresso-950">
                    {latestReport.summaryHeadline}
                  </h3>
                  <p className="text-sm text-espresso-700 leading-relaxed">
                    {latestReport.executiveBrief}
                  </p>
                </div>

                {/* KPI Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-parchment-100 border border-espresso-900/12 rounded-sm">
                    <div className="text-[10px] font-mono uppercase text-espresso-600">
                      Audited Links
                    </div>
                    <div className="text-xl font-mono font-semibold text-espresso-950 mt-0.5">
                      {latestReport.checkedCount}
                    </div>
                  </div>
                  <div className="p-3 bg-parchment-100 border border-espresso-900/12 rounded-sm">
                    <div className="text-[10px] font-mono uppercase text-espresso-600">
                      Price Drops
                    </div>
                    <div className="text-xl font-mono font-semibold text-sage-600 mt-0.5">
                      {latestReport.priceDropsCount} Active
                    </div>
                  </div>
                  <div className="p-3 bg-parchment-100 border border-espresso-900/12 rounded-sm">
                    <div className="text-[10px] font-mono uppercase text-espresso-600">
                      Wishlist Valuation
                    </div>
                    <div className="text-xl font-mono font-semibold text-espresso-950 mt-0.5">
                      ${latestReport.totalWishlistValue.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 bg-sage-600/10 border border-sage-600/30 rounded-sm">
                    <div className="text-[10px] font-mono uppercase text-sage-600 font-semibold">
                      Available Savings
                    </div>
                    <div className="text-xl font-mono font-semibold text-sage-600 mt-0.5">
                      -${latestReport.totalSavingsAvailable.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Item Updates Ledger Table */}
                <div className="border border-espresso-900/15 rounded-sm overflow-hidden bg-white">
                  <div className="px-4 py-2 bg-parchment-100 border-b border-espresso-900/15 text-[10px] font-mono uppercase tracking-wider text-espresso-600 grid grid-cols-12">
                    <span className="col-span-5">Specimen</span>
                    <span className="col-span-3 text-right">Baseline → Live</span>
                    <span className="col-span-4 text-right">Curator Verdict</span>
                  </div>
                  <div className="divide-y divide-espresso-900/10 max-h-64 overflow-y-auto">
                    {latestReport.itemUpdates.map((upd) => (
                      <div
                        key={upd.pieceId}
                        className="px-4 py-2.5 grid grid-cols-12 items-center gap-2 text-xs"
                      >
                        <div className="col-span-5 min-w-0">
                          <div className="font-mono text-[10px] uppercase text-brass-600">
                            {upd.brand} • {upd.category}
                          </div>
                          <div className="font-medium text-espresso-950 truncate">
                            {upd.title}
                          </div>
                        </div>
                        <div className="col-span-3 text-right font-mono">
                          {upd.previousPrice > upd.currentPrice && (
                            <span className="text-[10px] line-through text-espresso-400 mr-1">
                              ${upd.previousPrice}
                            </span>
                          )}
                          <span className="font-semibold text-espresso-950">
                            ${upd.currentPrice}
                          </span>
                          {upd.status === "drop" && (
                            <span className="block text-[10px] text-sage-600 font-semibold">
                              {upd.changePct}% DROP
                            </span>
                          )}
                        </div>
                        <div className="col-span-4 text-right text-[11px] text-espresso-700 leading-tight">
                          {upd.verdict}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* GrokBot MCP & Webhook Integration Blueprint + Live Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 7 Cols: Ready-to-Connect GrokBot Configs */}
        <div className="lg:col-span-7 archive-card p-6 rounded-sm space-y-5">
          <div className="flex items-center justify-between border-b border-espresso-900/15 pb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-brass-600" />
              <h3 className="font-serif text-xl font-semibold text-espresso-950">
                GrokBot & Railway Integration Blueprint
              </h3>
            </div>
            <span className="text-[11px] font-mono uppercase text-brass-600">
              MCP Streamable HTTP + Webhooks
            </span>
          </div>

          <div className="space-y-4">
            {/* 1. MCP Server JSON */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-mono uppercase tracking-wider text-espresso-800 font-semibold">
                  1. GrokBot Custom MCP Connector Config (`/mcp`)
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
                      <span>Copy MCP JSON</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 bg-espresso-950 text-parchment-100 text-xs font-mono rounded-sm overflow-x-auto">
                {mcpConfigJson}
              </pre>
            </div>

            {/* 2. Daily Scheduled Routine Prompt */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-mono uppercase tracking-wider text-espresso-800 font-semibold">
                  2. GrokBot Daily Scheduled Routine Prompt
                </span>
                <button
                  type="button"
                  onClick={() => copyText("routine", grokbotRoutinePrompt)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-espresso-900 text-parchment-50 text-[10px] font-mono uppercase rounded-sm"
                >
                  {copiedKey === "routine" ? (
                    <>
                      <Check className="w-3 h-3 text-brass-300" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-brass-300" />
                      <span>Copy Routine</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-3 bg-parchment-100 border border-espresso-900/15 text-xs font-mono text-espresso-800 rounded-sm leading-relaxed">
                {grokbotRoutinePrompt}
              </div>
            </div>

            {/* Exposed MCP Tools Summary */}
            <div>
              <span className="block text-xs font-mono uppercase tracking-wider text-espresso-700 mb-2">
                Exposed GrokBot MCP Tools (9 Tools Active):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "archive_upload_link",
                  "archive_upload_piece",
                  "archive_list_pieces",
                  "archive_run_daily_price_check",
                  "archive_get_daily_reports",
                  "archive_generate_daily_outfit",
                  "archive_check_outfit_image",
                  "archive_move_or_update_piece",
                  "archive_grokbot_ask",
                ].map((tool) => (
                  <span
                    key={tool}
                    className="px-2 py-1 bg-parchment-200/80 border border-espresso-900/15 text-[11px] font-mono text-espresso-900 rounded-sm"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Real-Time Telemetry Stream */}
        <div className="lg:col-span-5 archive-card p-6 rounded-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-espresso-900/15 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-brass-600" />
                <h3 className="font-serif text-xl font-semibold text-espresso-950">
                  Live Archive & GrokBot Telemetry
                </h3>
              </div>
              <span className="text-[10px] font-mono uppercase text-espresso-500">
                {events.length} Events
              </span>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {events.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3 bg-white border border-espresso-900/12 rounded-sm space-y-1"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="px-1.5 py-0.5 bg-espresso-900 text-brass-300 rounded-sm uppercase">
                      {evt.actor}
                    </span>
                    <span className="text-espresso-500">
                      {new Date(evt.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-espresso-950">
                    {evt.title}
                  </div>
                  <p className="text-[11px] text-espresso-600 leading-relaxed">
                    {evt.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
