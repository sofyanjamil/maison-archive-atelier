import { NextRequest, NextResponse } from "next/server";
import { handleGrokBotMessage } from "@/lib/store";
import { proxyToRailwayIfConfigured } from "@/lib/railway-proxy";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body?.message || body?.text || body?.prompt || "";
    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const railwayRes = await proxyToRailwayIfConfigured("/api/grokbot/chat", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (railwayRes?.reply) {
      return NextResponse.json(railwayRes);
    }

    const result = await handleGrokBotMessage(message);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "GrokBot command failed" },
      { status: 500 }
    );
  }
}
