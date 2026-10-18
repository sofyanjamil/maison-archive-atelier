import { NextRequest, NextResponse } from "next/server";
import { ingestPieceFromUpload } from "@/lib/store";
import { proxyToRailwayIfConfigured } from "@/lib/railway-proxy";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const railwayRes = await proxyToRailwayIfConfigured("/api/pieces/upload", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (railwayRes?.piece) {
      return NextResponse.json(railwayRes, { status: 201 });
    }

    const piece = await ingestPieceFromUpload({
      collection: body.collection || "wardrobe",
      title: body.title,
      brand: body.brand,
      category: body.category,
      price: body.price ? Number(body.price) : undefined,
      targetPrice: body.targetPrice ? Number(body.targetPrice) : undefined,
      currency: body.currency || "USD",
      imageBase64: body.imageBase64,
      imageUrl: body.imageUrl,
      sourceUrl: body.sourceUrl,
      notes: body.notes,
      addedVia: body.addedVia || "web_upload",
    });

    return NextResponse.json({ piece }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to upload and analyze piece" },
      { status: 500 }
    );
  }
}
