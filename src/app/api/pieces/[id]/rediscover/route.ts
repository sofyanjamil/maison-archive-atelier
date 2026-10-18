import { NextRequest, NextResponse } from "next/server";
import { loadLocalLedger, updateArchivePiece } from "@/lib/store";
import { discoverProductImageAndIsraelPrice } from "@/lib/product-search";
import { updatePieceSearchDataWithDeepSeek } from "@/lib/deepseek";
import { proxyToRailwayIfConfigured } from "@/lib/railway-proxy";
import { rehostUrlOnKie } from "@/lib/kie";

export const maxDuration = 60;

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const railwayRes = await proxyToRailwayIfConfigured(
      `/api/pieces/${id}/rediscover`,
      { method: "POST", body: JSON.stringify({}) },
      52000
    );
    if (railwayRes?.piece) {
      return NextResponse.json(railwayRes);
    }

    const state = loadLocalLedger();
    let piece: any = state.pieces.find((p) => p.id === id);
    let fromRailway = false;
    if (!piece) {
      // Pull the piece from Railway (the source of truth) and patch it back there
      const list = await proxyToRailwayIfConfigured(`/api/pieces`, undefined, 15000);
      piece = list?.pieces?.find?.((p: any) => p.id === id) || null;
      fromRailway = !!piece;
    }
    if (!piece) {
      return NextResponse.json({ error: "Piece not found" }, { status: 404 });
    }

    const query = `${piece.brand} ${piece.title}`.trim();
    const discovery = await discoverProductImageAndIsraelPrice(query, piece.category);
    const refined = await updatePieceSearchDataWithDeepSeek({
      piece: { title: piece.title, brand: piece.brand, category: piece.category },
      imageCandidates: discovery.imageCandidates,
      israelSnippets: discovery.israelSnippets,
      detectedIlsPrices: discovery.detectedIlsPrices,
      currentPriceUsd: piece.price,
    }).catch(() => null);

    const patch: Record<string, any> = {
      galleryImages:
        discovery.galleryImages.length > 0
          ? Array.from(
              new Set([...(discovery.galleryImages || []), ...(piece.galleryImages || [])])
            ).slice(0, 8)
          : piece.galleryImages,
    };

    if (discovery.imageCandidates.length > 0) {
      const idx =
        refined?.bestImageIndex != null &&
        refined.bestImageIndex >= 0 &&
        refined.bestImageIndex < discovery.imageCandidates.length
          ? refined.bestImageIndex
          : 0;
      const picked = discovery.imageCandidates[idx];
      patch.imageUrl = picked.rehostedUrl || picked.turl || picked.murl;
      if (!picked.rehostedUrl && patch.imageUrl) {
        patch.imageUrl = await rehostUrlOnKie(patch.imageUrl).catch(
          () => patch.imageUrl
        );
      }
    }

    if (refined?.avgPriceIls && refined.avgPriceIls > 0) {
      patch.avgPriceIls = Math.round(refined.avgPriceIls);
    } else if (discovery.detectedIlsPrices.length > 0) {
      patch.avgPriceIls = Math.round(
        discovery.detectedIlsPrices.reduce((a, b) => a + b, 0) /
          discovery.detectedIlsPrices.length
      );
    }

    if (refined?.israelPriceNote) {
      patch.israelPriceNote = refined.israelPriceNote;
    } else if (patch.avgPriceIls) {
      patch.israelPriceNote = `Avg ₪${patch.avgPriceIls.toLocaleString()} in Israel`;
    }

    let updated: any = null;
    if (fromRailway) {
      const patched = await proxyToRailwayIfConfigured(
        `/api/pieces/${id}`,
        { method: "PATCH", body: JSON.stringify(patch) },
        15000
      );
      updated = patched?.piece || { ...piece, ...patch };
    } else {
      updated = updateArchivePiece(id, patch);
    }

    return NextResponse.json({
      success: true,
      piece: updated,
      foundImages: discovery.galleryImages,
      israelSnippets: discovery.israelSnippets,
      detectedIlsPrices: discovery.detectedIlsPrices,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Re-discovery failed" },
      { status: 500 }
    );
  }
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const railwayRes = await proxyToRailwayIfConfigured(
    `/api/pieces/${id}/rediscover`
  );
  if (railwayRes?.galleryImages) {
    return NextResponse.json(railwayRes);
  }

  const state = loadLocalLedger();
  const piece = state.pieces.find((p) => p.id === id);
  if (!piece) {
    return NextResponse.json({ error: "Piece not found" }, { status: 404 });
  }
  const query = `${piece.brand} ${piece.title}`.trim();
  const discovery = await discoverProductImageAndIsraelPrice(query, piece.category);
  return NextResponse.json({
    query,
    galleryImages: discovery.galleryImages,
    imageCandidates: discovery.imageCandidates,
    israelSnippets: discovery.israelSnippets,
    detectedIlsPrices: discovery.detectedIlsPrices,
  });
}
