import { NextRequest, NextResponse } from "next/server";
import { executeDailyPriceCheck, loadLocalLedger } from "@/lib/store";
import { proxyToRailwayIfConfigured } from "@/lib/railway-proxy";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const railwayRes = await proxyToRailwayIfConfigured("/api/daily-check");
  if (railwayRes) {
    return NextResponse.json(railwayRes);
  }
  const state = loadLocalLedger();
  return NextResponse.json({
    lastDailyCheckAt: state.lastDailyCheckAt,
    reports: state.reports,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const railwayRes = await proxyToRailwayIfConfigured("/api/daily-check", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (railwayRes?.report) {
      return NextResponse.json(railwayRes);
    }

    const report = await executeDailyPriceCheck(
      body?.triggeredBy || "manual_web"
    );
    return NextResponse.json({ report });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Daily price check failed" },
      { status: 500 }
    );
  }
}
