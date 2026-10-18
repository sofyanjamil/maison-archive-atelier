"use client";

import React, { useState } from "react";
import {
  RefreshCw,
  Copy,
  Check,
  Loader2,
  Activity,
} from "lucide-react";
import {
  DailyPriceReport,
  GrokBotEvent,
} from "@/lib/types";

interface GrokBotHubProps {
  reports: DailyPriceReport[];
  events: GrokBotEvent[];
  lastDailyCheckAt?: string;
  railwayUrl?: string | null;
  onReportCreated: (report: DailyPriceReport) => void;
  onRefreshLedger: () => Promise<void>;
}

export default function GrokBotHub({
  reports,
  events,
  railwayUrl,
  onReportCreated,
  onRefreshLedger,
}: GrokBotHubProps) {
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: Daily Price Report */}
      <div className="lg:col-span-7 archive-card p-6 rounded-sm space-y-4">
        <div className="flex items-center justify-between border-b border-espresso-900/10 pb-3">
          <h3 className="font-serif text-2xl font-semibold text-espresso-950">
            Daily Price Reports
          </h3>
          <button
            type="button"
            onClick={handleRunDailyCheck}
            disabled={isRunningCheck}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-espresso-900 hover:bg-espresso-800 text-parchment-50 font-mono text-xs uppercase rounded-sm transition disabled:opacity-60"
          >
            {isRunningCheck ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-brass-400" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 text-brass-400" />
            )}
            <span>Run Price Check</span>
          </button>
        </div>

        {!latestReport ? (
          <div className="text-xs font-mono text-espresso-500 py-12 text-center">
            No price checks recorded yet.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-mono text-espresso-600">
              <span>{latestReport.date}</span>
              <span>
                {latestReport.checkedCount} items •{" "}
                {latestReport.priceDropsCount} drops
              </span>
            </div>
            <div className="text-base font-medium text-espresso-950">
              {latestReport.summaryHeadline}
            </div>
            <p className="text-xs text-espresso-700 leading-relaxed">
              {latestReport.executiveBrief}
            </p>
            {latestReport.itemUpdates.length > 0 && (
              <div className="border border-espresso-900/15 rounded-sm divide-y divide-espresso-900/10 bg-white max-h-60 overflow-y-auto">
                {latestReport.itemUpdates.map((upd) => (
                  <div
                    key={upd.pieceId}
                    className="px-4 py-2.5 flex items-center justify-between text-xs font-mono"
                  >
                    <span className="truncate max-w-[240px] text-espresso-900">
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

      {/* Right: GrokBot MCP Endpoint & Incoming Sync Log */}
      <div className="lg:col-span-5 space-y-6">
        <div className="archive-card p-5 rounded-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-espresso-800 font-semibold">
              GrokBot MCP Server (Railway)
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
                  <span>Copy JSON</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-3 bg-espresso-950 text-parchment-100 text-xs font-mono rounded-sm overflow-x-auto">
            {mcpConfigJson}
          </pre>
        </div>

        <div className="archive-card p-5 rounded-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-espresso-800 font-semibold">
            <Activity className="w-3.5 h-3.5 text-brass-600" />
            <span>Incoming Sync Activity</span>
          </div>

          {events.length === 0 ? (
            <div className="text-xs font-mono text-espresso-500 py-6 text-center">
              Waiting for activity from GrokBot or web uploads.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {events.map((evt) => (
                <div
                  key={evt.id}
                  className="p-2.5 bg-white border border-espresso-900/10 rounded-sm text-xs"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-espresso-500">
                    <span className="text-brass-600 font-semibold">
                      {evt.actor}
                    </span>
                    <span>
                      {new Date(evt.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="font-medium text-espresso-950 mt-0.5">
                    {evt.title}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
