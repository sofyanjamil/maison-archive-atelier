import { NextRequest, NextResponse } from "next/server";
import { ingestPieceFromLink } from "@/lib/store";
import { proxyToRailwayIfConfigured } from "@/lib/railway-proxy";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.url) {
      return NextResponse.json(
        { error: "Product URL is required" },
        { status: 400 }
      );
    }

    const railwayRes = await proxyToRailwayIfConfigured(
      "/api/pieces/extract-link",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );
    if (railwayRes?.piece) {
      return NextResponse.json(railwayRes, { status: 201 });
    }

    const piece = await ingestPieceFromLink({
      url: body.url,
      collection: body.collection || "wishlist",
      categoryHint: body.category,
      targetPrice: body.targetPrice ? Number(body.targetPrice) : undefined,
      notes: body.notes,
      addedVia: body.addedVia || "web_link",
    });

    return NextResponse.json({ piece }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to extract product link" },
      { status: 500 }
    );
  }
}
