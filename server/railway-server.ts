import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import cron from "node-cron";
import {
  checkAndSyncOutfitStatus,
  deleteArchivePiece,
  executeDailyPriceCheck,
  generateDailyOutfit,
  handleGrokBotMessage,
  ingestPieceFromLink,
  ingestPieceFromUpload,
  loadLocalLedger,
  resetArchiveLedger,
  updateArchivePiece,
} from "../src/lib/store";
import { handleMcpJsonRpc, MCP_TOOLS } from "../src/lib/mcp-handler";
import {
  getKieCreditBalance,
  rehostUrlOnKie,
  uploadBase64ToKie,
} from "../src/lib/kie";
import {
  getDeepSeekModel,
  updatePieceSearchDataWithDeepSeek,
} from "../src/lib/deepseek";
import { discoverProductImageAndIsraelPrice } from "../src/lib/product-search";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Mcp-Session-Id"],
    exposeHeaders: ["Mcp-Session-Id"],
  })
);

// Root & Health Check
app.get("/", (c) => {
  const state = loadLocalLedger();
  return c.json({
    service: "Maison Archive — Railway Sartorial & GrokBot Service",
    status: "online",
    version: "1.0.0",
    ai: {
      curatorModel: getDeepSeekModel(),
      imageModel: "gpt-image-2-5-sunburst-text-to-image",
      imageEditModel: "gpt-image-2-5-sunburst-image-to-image",
      flareModel: "gpt-image-2-5-flare-text-to-image",
    },
    endpoints: {
      mcp: "/mcp",
      ledger: "/api/ledger",
      extractLink: "/api/pieces/extract-link",
      uploadPiece: "/api/pieces/upload",
      outfits: "/api/outfits",
      dailyCheck: "/api/daily-check",
      grokbotChat: "/api/grokbot/chat",
      grokbotWebhook: "/api/grokbot/webhook",
    },
    stats: {
      wishlistCount: state.pieces.filter((p) => p.collection === "wishlist")
        .length,
      wardrobeCount: state.pieces.filter((p) => p.collection === "wardrobe")
        .length,
      outfitsCount: state.outfits.length,
      reportsCount: state.reports.length,
      lastDailyCheckAt: state.lastDailyCheckAt,
    },
  });
});

app.get("/health", (c) => c.json({ ok: true, timestamp: new Date().toISOString() }));

// Full Ledger Snapshot
app.get("/api/ledger", async (c) => {
  const state = loadLocalLedger();
  // Check any generating outfits automatically
  for (const outfit of state.outfits) {
    if (outfit.status === "generating" && outfit.kieTaskId) {
      await checkAndSyncOutfitStatus(outfit.id);
    }
  }
  const freshState = loadLocalLedger();
  const kieCredits = await getKieCreditBalance();
  return c.json({
    ...freshState,
    meta: {
      deepseekModel: getDeepSeekModel(),
      sunburstModel: "gpt-image-2-5-sunburst-text-to-image",
      kieCredits,
      cronSchedule: "0 9 * * * (Daily 09:00 UTC)",
      serviceHost: "railway",
    },
  });
});

app.delete("/api/ledger", (c) => {
  const empty = resetArchiveLedger();
  return c.json({ ok: true, ...empty });
});

// Pieces CRUD & AI Link Extraction
app.get("/api/pieces", (c) => {
  const state = loadLocalLedger();
  const collection = c.req.query("collection");
  const category = c.req.query("category");
  let pieces = state.pieces;
  if (collection && collection !== "all") {
    pieces = pieces.filter((p) => p.collection === collection);
  }
  if (category && category !== "All") {
    pieces = pieces.filter((p) => p.category === category);
  }
  return c.json({ pieces });
});

app.post("/api/pieces/extract-link", async (c) => {
  try {
    const body = await c.req.json();
    if (!body?.url) {
      return c.json({ error: "Product URL is required" }, 400);
    }
    const piece = await ingestPieceFromLink({
      url: body.url,
      collection: body.collection || "wishlist",
      categoryHint: body.category,
      targetPrice: body.targetPrice ? Number(body.targetPrice) : undefined,
      notes: body.notes,
      addedVia: body.addedVia || "web_link",
    });
    return c.json({ piece }, 201);
  } catch (err: any) {
    return c.json(
      { error: err?.message || "Failed to extract product link" },
      500
    );
  }
});

app.post("/api/pieces/upload", async (c) => {
  try {
    const body = await c.req.json();
    const piece = await ingestPieceFromUpload({
      collection: body.collection || "wardrobe",
      title: body.title,
      brand: body.brand,
      category: body.category,
      price: body.price ? Number(body.price) : undefined,
      priceIls: body.avgPriceIls ? Number(body.avgPriceIls) : undefined,
      targetPrice: body.targetPrice ? Number(body.targetPrice) : undefined,
      currency: body.currency || "USD",
      imageBase64: body.imageBase64,
      imageUrl: body.imageUrl,
      sourceUrl: body.sourceUrl,
      notes: body.notes,
      addedVia: body.addedVia || "web_upload",
    });
    return c.json({ piece }, 201);
  } catch (err: any) {
    return c.json({ error: err?.message || "Failed to upload piece" }, 500);
  }
});

app.patch("/api/pieces/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const updated = updateArchivePiece(id, body);
    if (!updated) return c.json({ error: "Piece not found" }, 404);
    return c.json({ piece: updated });
  } catch (err: any) {
    return c.json({ error: err?.message || "Failed to update piece" }, 400);
  }
});

app.delete("/api/pieces/:id", (c) => {
  const id = c.req.param("id");
  const ok = deleteArchivePiece(id);
  if (!ok) return c.json({ error: "Piece not found" }, 404);
  return c.json({ success: true });
});

// Live Web Image & Israel Market Price Re-Discovery
app.post("/api/pieces/:id/rediscover", async (c) => {
  try {
    const id = c.req.param("id");
    const state = loadLocalLedger();
    const piece = state.pieces.find((p) => p.id === id);
    if (!piece) return c.json({ error: "Piece not found" }, 404);

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

    const updated = updateArchivePiece(id, patch);
    return c.json({
      success: true,
      piece: updated,
      foundImages: discovery.galleryImages,
      israelSnippets: discovery.israelSnippets,
      detectedIlsPrices: discovery.detectedIlsPrices,
    });
  } catch (err: any) {
    return c.json({ error: err?.message || "Re-discovery failed" }, 500);
  }
});

// Direct image upload to KIE CDN
app.post("/api/upload-image", async (c) => {
  try {
    const body = await c.req.json();
    if (!body?.imageBase64?.startsWith?.("data:")) {
      return c.json({ error: "imageBase64 data URL is required" }, 400);
    }
    const url = await uploadBase64ToKie(
      body.imageBase64,
      `archive-piece-${Date.now()}.png`
    );
    return c.json({ url });
  } catch (err: any) {
    return c.json({ error: err?.message || "Image upload failed" }, 500);
  }
});

// Outfits & Sunburst 2.5 Generation
app.get("/api/outfits", (c) => {
  const state = loadLocalLedger();
  return c.json({ outfits: state.outfits });
});

app.post("/api/outfits/generate", async (c) => {
  try {
    const body = await c.req.json();
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
    return c.json({ outfit }, 201);
  } catch (err: any) {
    return c.json({ error: err?.message || "Failed to generate outfit" }, 500);
  }
});

app.get("/api/outfits/:id/status", async (c) => {
  try {
    const id = c.req.param("id");
    const outfit = await checkAndSyncOutfitStatus(id);
    if (!outfit) return c.json({ error: "Outfit not found" }, 404);
    return c.json({ outfit });
  } catch (err: any) {
    return c.json({ error: err?.message || "Status check failed" }, 500);
  }
});

// Daily Price Check & Reports
app.get("/api/daily-check", (c) => {
  const state = loadLocalLedger();
  return c.json({
    lastDailyCheckAt: state.lastDailyCheckAt,
    reports: state.reports,
  });
});

app.post("/api/daily-check", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const report = await executeDailyPriceCheck(
      body?.triggeredBy || "manual_web"
    );
    return c.json({ report });
  } catch (err: any) {
    return c.json({ error: err?.message || "Daily check failed" }, 500);
  }
});

// GrokBot Chat, Command & Webhook Endpoints
app.post("/api/grokbot/chat", async (c) => {
  try {
    const body = await c.req.json();
    const message = body?.message || body?.text || body?.prompt || "";
    if (!message) {
      return c.json({ error: "message is required" }, 400);
    }
    const result = await handleGrokBotMessage(message);
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err?.message || "GrokBot command failed" }, 500);
  }
});

app.post("/api/grokbot/webhook", async (c) => {
  try {
    const body = await c.req.json();
    // Support structured webhook payloads or natural language prompts from GrokBot routines
    if (body?.action === "daily_check") {
      const report = await executeDailyPriceCheck("grokbot_cron");
      return c.json({ ok: true, report });
    }
    if (body?.url) {
      const piece = await ingestPieceFromLink({
        url: body.url,
        collection: body.collection || "wishlist",
        targetPrice: body.targetPrice,
        notes: body.notes,
        addedVia: "grokbot",
      });
      return c.json({ ok: true, piece });
    }
    const message =
      body?.message || body?.text || body?.prompt || "Run daily price check";
    const result = await handleGrokBotMessage(message);
    return c.json({ ok: true, ...result });
  } catch (err: any) {
    return c.json({ ok: false, error: err?.message || "Webhook error" }, 500);
  }
});

// Streamable HTTP Model Context Protocol (MCP) Endpoint for GrokBot
app.get("/mcp", (c) => {
  return c.json({
    name: "maison-archive-grokbot-mcp",
    version: "1.0.0",
    protocol: "mcp-streamable-http",
    description:
      "GrokBot MCP Server for Maison Archive (Wishlist, Wardrobe, DeepSeek V4.1 Flash Curator, Daily Price Reports, and KIE Sunburst 2.5 Outfit Studio)",
    tools: MCP_TOOLS.map((t) => ({ name: t.name, description: t.description })),
  });
});

app.post("/mcp", async (c) => {
  try {
    const body = await c.req.json();
    if (Array.isArray(body)) {
      const responses = await Promise.all(body.map((item) => handleMcpJsonRpc(item)));
      return c.json(responses);
    }
    const response = await handleMcpJsonRpc(body);
    return c.json(response);
  } catch (err: any) {
    return c.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: err?.message || "Parse error" },
      },
      400
    );
  }
});

app.post("/api/mcp", async (c) => {
  const body = await c.req.json();
  const response = await handleMcpJsonRpc(body);
  return c.json(response);
});

// Schedule Daily GrokBot Wishlist Price & Stock Audit at 09:00 every day
cron.schedule("0 9 * * *", async () => {
  try {
    console.log("[Railway Cron] Running daily GrokBot wishlist price check...");
    const report = await executeDailyPriceCheck("grokbot_cron");
    console.log(
      `[Railway Cron] Completed daily report: ${report.summaryHeadline}`
    );
  } catch (err) {
    console.error("[Railway Cron] Daily check failed:", err);
  }
});

const port = Number(process.env.PORT) || 3001;
console.log(
  `[Maison Archive Railway Service] Starting on port ${port} (MCP: /mcp, API: /api/*)...`
);

serve({
  fetch: app.fetch,
  port,
});
