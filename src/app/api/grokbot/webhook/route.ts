import { NextRequest, NextResponse } from "next/server";
import {
  executeDailyPriceCheck,
  handleGrokBotMessage,
  ingestPieceFromLink,
} from "@/lib/store";
import { proxyToRailwayIfConfigured } from "@/lib/railway-proxy";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const railwayRes = await proxyToRailwayIfConfigured(
      "/api/grokbot/webhook",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );
    if (railwayRes) {
      return NextResponse.json(railwayRes);
    }

    if (body?.action === "daily_check") {
      const report = await executeDailyPriceCheck("grokbot_cron");
      return NextResponse.json({ ok: true, report });
    }
    if (body?.url) {
      const piece = await ingestPieceFromLink({
        url: body.url,
        collection: body.collection || "wishlist",
        targetPrice: body.targetPrice,
        notes: body.notes,
        addedVia: "grokbot",
      });
      return NextResponse.json({ ok: true, piece });
    }
    const message =
      body?.message || body?.text || body?.prompt || "Run daily price check";
    const result = await handleGrokBotMessage(message);
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Webhook failed" },
      { status: 500 }
    );
  }
}
