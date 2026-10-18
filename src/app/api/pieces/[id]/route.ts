import { NextRequest, NextResponse } from "next/server";
import { deleteArchivePiece, updateArchivePiece } from "@/lib/store";
import { proxyToRailwayIfConfigured } from "@/lib/railway-proxy";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const railwayRes = await proxyToRailwayIfConfigured(`/api/pieces/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    if (railwayRes?.piece) {
      return NextResponse.json(railwayRes);
    }

    const updated = updateArchivePiece(id, body);
    if (!updated) {
      return NextResponse.json({ error: "Piece not found" }, { status: 404 });
    }
    return NextResponse.json({ piece: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update piece" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const railwayRes = await proxyToRailwayIfConfigured(`/api/pieces/${id}`, {
    method: "DELETE",
  });
  if (railwayRes?.success) {
    return NextResponse.json(railwayRes);
  }
  const ok = deleteArchivePiece(id);
  if (!ok) {
    return NextResponse.json({ error: "Piece not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
