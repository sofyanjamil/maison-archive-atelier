import { NextRequest, NextResponse } from "next/server";
import { uploadBase64ToKie } from "@/lib/kie";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const imageBase64 = body.imageBase64 as string;
    if (!imageBase64 || !imageBase64.startsWith("data:")) {
      return NextResponse.json(
        { error: "imageBase64 data URL is required" },
        { status: 400 }
      );
    }
    const url = await uploadBase64ToKie(
      imageBase64,
      `archive-piece-${Date.now()}.png`
    );
    return NextResponse.json({ url });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Image upload failed" },
      { status: 500 }
    );
  }
}
