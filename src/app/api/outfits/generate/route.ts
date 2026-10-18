import { NextRequest, NextResponse } from "next/server";
import { generateDailyOutfit } from "@/lib/store";
import { proxyToRailwayIfConfigured } from "@/lib/railway-proxy";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const railwayRes = await proxyToRailwayIfConfigured(
      "/api/outfits/generate",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );
    if (railwayRes?.outfit) {
      return NextResponse.json(railwayRes, { status: 201 });
    }

    const outfit = await generateDailyOutfit({
      mode: body.mode,
      anchorPieceId: body.anchorPieceId,
      selectedPieceIds: body.selectedPieceIds,
      occasion: body.occasion,
      weather: body.weather,
      imageModel: body.imageModel,
      useReferenceImages: Boolean(body.useReferenceImages),
      createdVia: body.createdVia || "web",
    });

    return NextResponse.json({ outfit }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to generate outfit" },
      { status: 500 }
    );
  }
}
