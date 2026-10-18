import { NextRequest, NextResponse } from "next/server";
import { checkAndSyncOutfitStatus } from "@/lib/store";
import { proxyToRailwayIfConfigured } from "@/lib/railway-proxy";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const railwayRes = await proxyToRailwayIfConfigured(
      `/api/outfits/${id}/status`
    );
    if (railwayRes?.outfit) {
      return NextResponse.json(railwayRes);
    }

    const outfit = await checkAndSyncOutfitStatus(id);
    if (!outfit) {
      return NextResponse.json({ error: "Outfit not found" }, { status: 404 });
    }
    return NextResponse.json({ outfit });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to check outfit status" },
      { status: 500 }
    );
  }
}
