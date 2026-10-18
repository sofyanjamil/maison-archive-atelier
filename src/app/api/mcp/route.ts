import { NextRequest, NextResponse } from "next/server";
import { handleMcpJsonRpc, MCP_TOOLS } from "@/lib/mcp-handler";
import { proxyToRailwayIfConfigured } from "@/lib/railway-proxy";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  return NextResponse.json({
    name: "maison-archive-grokbot-mcp",
    version: "1.0.0",
    protocol: "mcp-streamable-http",
    description:
      "GrokBot MCP Server for Maison Archive (Wishlist, Wardrobe, DeepSeek V4.1 Flash Curator, Daily Price Reports, and KIE Sunburst 2.5 Outfit Studio)",
    tools: MCP_TOOLS.map((t) => ({ name: t.name, description: t.description })),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const railwayRes = await proxyToRailwayIfConfigured("/mcp", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (railwayRes) {
      return NextResponse.json(railwayRes);
    }

    if (Array.isArray(body)) {
      const responses = await Promise.all(
        body.map((item) => handleMcpJsonRpc(item))
      );
      return NextResponse.json(responses);
    }
    const response = await handleMcpJsonRpc(body);
    return NextResponse.json(response);
  } catch (err: any) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: err?.message || "Parse error" },
      },
      { status: 400 }
    );
  }
}
