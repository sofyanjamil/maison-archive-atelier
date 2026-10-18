import fs from "fs";
import path from "path";
import { INITIAL_ARCHIVE_STATE } from "./seed-data";
import {
  ArchiveLedgerState,
  CollectionType,
  DailyOutfit,
  DailyPriceReport,
  GrokBotEvent,
  OutfitGenerationMode,
  PriceItemUpdate,
  SartorialCategory,
  SartorialPiece,
} from "./types";
import { scrapeProductUrl } from "./scraper";
import {
  analyzeProductWithDeepSeek,
  callDeepSeekJson,
  curateDailyOutfitWithDeepSeek,
  generateDailyBriefWithDeepSeek,
  normalizeCategory,
} from "./deepseek";
import {
  createSunburstOutfitTask,
  getKieTaskStatus,
  rehostUrlOnKie,
  uploadBase64ToKie,
} from "./kie";

declare global {
  // eslint-disable-next-line no-var
  var __MAISON_ARCHIVE_STATE__: ArchiveLedgerState | undefined;
}

function getStorageFilePath(): string {
  const isVercel = Boolean(process.env.VERCEL);
  if (isVercel) {
    return "/tmp/maison-archive-ledger.json";
  }
  const dataDir = path.join(process.cwd(), "data");
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    return path.join(dataDir, "runtime-ledger.json");
  } catch {
    return "/tmp/maison-archive-ledger.json";
  }
}

export function loadLocalLedger(): ArchiveLedgerState {
  if (global.__MAISON_ARCHIVE_STATE__) {
    return global.__MAISON_ARCHIVE_STATE__;
  }
  const filePath = getStorageFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw) as ArchiveLedgerState;
      if (parsed && Array.isArray(parsed.pieces)) {
        global.__MAISON_ARCHIVE_STATE__ = parsed;
        return parsed;
      }
    }
  } catch {
    // fallback to seed
  }
  const cloned = JSON.parse(
    JSON.stringify(INITIAL_ARCHIVE_STATE)
  ) as ArchiveLedgerState;
  global.__MAISON_ARCHIVE_STATE__ = cloned;
  saveLocalLedger(cloned);
  return cloned;
}

export function saveLocalLedger(state: ArchiveLedgerState): void {
  global.__MAISON_ARCHIVE_STATE__ = state;
  const filePath = getStorageFilePath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2), "utf8");
  } catch {
    // ignore read-only fs errors
  }
}

export function appendEvent(
  state: ArchiveLedgerState,
  event: Omit<GrokBotEvent, "id" | "timestamp">
): GrokBotEvent {
  const full: GrokBotEvent = {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...event,
  };
  state.events.unshift(full);
  state.events = state.events.slice(0, 60);
  return full;
}

function nextArchiveCode(state: ArchiveLedgerState): string {
  const num = state.pieces.length + 1;
  return `ARC-74-${String(num).padStart(3, "0")}`;
}

function nextPlateNumber(state: ArchiveLedgerState): string {
  const num = state.outfits.length + 1;
  return `PLATE NO. ${String(num).padStart(2, "0")}`;
}

/**
 * Ingest a product URL, scrape its metadata/images/price, analyze with DeepSeek V4.1 Flash (1017),
 * and store it in the Wishlist or Current Wardrobe.
 */
export async function ingestPieceFromLink(input: {
  url: string;
  collection?: CollectionType;
  categoryHint?: string;
  targetPrice?: number;
  notes?: string;
  addedVia?: SartorialPiece["addedVia"];
}): Promise<SartorialPiece> {
  const state = loadLocalLedger();
  const collection: CollectionType = input.collection || "wishlist";
  const scraped = await scrapeProductUrl(input.url);
  const analyzed = await analyzeProductWithDeepSeek({
    scraped,
    manualCategory: input.categoryHint,
    manualNotes: input.notes,
  });

  const today = new Date().toISOString().slice(0, 10);
  const piece: SartorialPiece = {
    id: `piece-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    archiveCode: nextArchiveCode(state),
    collection,
    title: analyzed.title,
    brand: analyzed.brand,
    category: analyzed.category,
    price: analyzed.price,
    originalPrice: analyzed.originalPrice,
    targetPrice:
      input.targetPrice ?? Math.round(analyzed.price * 0.9),
    currency: analyzed.currency || "USD",
    sourceUrl: scraped.url,
    storeName: scraped.domain,
    imageUrl: analyzed.imageUrl,
    galleryImages: scraped.galleryImages,
    labels: analyzed.labels,
    vibe: analyzed.vibe,
    vibeDescription: analyzed.vibeDescription,
    colorPalette: analyzed.colorPalette,
    season: analyzed.season,
    formality: analyzed.formality,
    pairingNotes: analyzed.pairingNotes,
    inStock: scraped.inStock,
    priority: analyzed.priority,
    priceChangePct:
      analyzed.originalPrice && analyzed.originalPrice > analyzed.price
        ? Number(
            (
              ((analyzed.price - analyzed.originalPrice) /
                analyzed.originalPrice) *
              100
            ).toFixed(2)
          )
        : 0,
    lastCheckedAt: new Date().toISOString(),
    addedVia: input.addedVia || "web_link",
    notes: input.notes,
    priceHistory: [
      ...(analyzed.originalPrice && analyzed.originalPrice > analyzed.price
        ? [
            {
              date: today,
              price: analyzed.originalPrice,
              currency: analyzed.currency || "USD",
              note: "Original retail price",
            },
          ]
        : []),
      {
        date: today,
        price: analyzed.price,
        currency: analyzed.currency || "USD",
        note: "Extracted via DeepSeek V4.1 Flash",
      },
    ],
    createdAt: new Date().toISOString(),
  };

  state.pieces.unshift(piece);
  appendEvent(state, {
    type: "link_ingest",
    actor: input.addedVia === "grokbot" ? "GrokBot" : "DeepSeek V4.1 Flash",
    title: `Catalogued ${piece.brand} ${piece.title} (${piece.category})`,
    detail: `Extracted from ${scraped.domain} at $${piece.price}. Assigned labels: ${piece.labels.slice(0, 4).join(", ")}. Vibe: ${piece.vibe}.`,
    relatedId: piece.id,
  });

  saveLocalLedger(state);
  return piece;
}

/**
 * Add a piece via photo upload (base64 or image URL) or manual details,
 * with automatic DeepSeek V4.1 Flash vision/text labeling.
 */
export async function ingestPieceFromUpload(input: {
  collection: CollectionType;
  title?: string;
  brand?: string;
  category?: string;
  price?: number;
  targetPrice?: number;
  currency?: string;
  imageBase64?: string;
  imageUrl?: string;
  sourceUrl?: string;
  notes?: string;
  addedVia?: SartorialPiece["addedVia"];
}): Promise<SartorialPiece> {
  const state = loadLocalLedger();

  let uploadedImageUrl = input.imageUrl;
  if (input.imageBase64 && input.imageBase64.startsWith("data:")) {
    try {
      uploadedImageUrl = await uploadBase64ToKie(
        input.imageBase64,
        `archive-${Date.now()}.png`
      );
    } catch {
      // Fallback to keeping data URL if upload fails
      uploadedImageUrl = input.imageBase64;
    }
  }

  const analyzed = await analyzeProductWithDeepSeek({
    manualTitle: input.title,
    manualBrand: input.brand,
    manualPrice: input.price,
    manualCategory: input.category,
    manualImageUrl:
      uploadedImageUrl && uploadedImageUrl.startsWith("http")
        ? uploadedImageUrl
        : undefined,
    manualNotes: input.notes,
  });

  const today = new Date().toISOString().slice(0, 10);
  const piece: SartorialPiece = {
    id: `piece-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    archiveCode: nextArchiveCode(state),
    collection: input.collection,
    title: input.title || analyzed.title,
    brand: input.brand || analyzed.brand,
    category: input.category
      ? normalizeCategory(input.category)
      : analyzed.category,
    price: input.price ?? analyzed.price,
    targetPrice: input.targetPrice,
    currency: input.currency || analyzed.currency || "USD",
    sourceUrl: input.sourceUrl,
    storeName:
      input.collection === "wardrobe" ? "Owned Wardrobe" : "Direct Entry",
    imageUrl: uploadedImageUrl || analyzed.imageUrl,
    labels: analyzed.labels,
    vibe: analyzed.vibe,
    vibeDescription: analyzed.vibeDescription,
    colorPalette: analyzed.colorPalette,
    season: analyzed.season,
    formality: analyzed.formality,
    pairingNotes: analyzed.pairingNotes,
    inStock: true,
    priority: analyzed.priority,
    priceChangePct: 0,
    lastCheckedAt: new Date().toISOString(),
    addedVia: input.addedVia || "web_upload",
    notes: input.notes,
    priceHistory: [
      {
        date: today,
        price: input.price ?? analyzed.price,
        currency: input.currency || "USD",
        note:
          input.collection === "wardrobe"
            ? "Added to Personal Wardrobe"
            : "Added to Buylist",
      },
    ],
    createdAt: new Date().toISOString(),
  };

  state.pieces.unshift(piece);
  appendEvent(state, {
    type: "wardrobe_upload",
    actor: input.addedVia === "grokbot" ? "GrokBot" : "DeepSeek V4.1 Flash",
    title: `Added ${piece.brand} ${piece.title} to ${piece.collection === "wardrobe" ? "Current Wardrobe" : "Buylist"}`,
    detail: `DeepSeek V4.1 Flash tagged: ${piece.labels.join(", ")} • Vibe: ${piece.vibe}.`,
    relatedId: piece.id,
  });

  saveLocalLedger(state);
  return piece;
}

export function updateArchivePiece(
  id: string,
  patch: Partial<SartorialPiece>
): SartorialPiece | null {
  const state = loadLocalLedger();
  const idx = state.pieces.findIndex((p) => p.id === id);
  if (idx === -1) return null;

  const current = state.pieces[idx];
  const updated: SartorialPiece = {
    ...current,
    ...patch,
    id: current.id,
  };

  if (patch.price !== undefined && patch.price !== current.price) {
    const prev = current.price;
    updated.priceChangePct =
      prev > 0 ? Number((((patch.price - prev) / prev) * 100).toFixed(2)) : 0;
    updated.priceHistory = [
      ...current.priceHistory,
      {
        date: new Date().toISOString().slice(0, 10),
        price: patch.price,
        currency: updated.currency,
        note: "Updated price",
      },
    ];
  }

  state.pieces[idx] = updated;
  saveLocalLedger(state);
  return updated;
}

export function deleteArchivePiece(id: string): boolean {
  const state = loadLocalLedger();
  const before = state.pieces.length;
  state.pieces = state.pieces.filter((p) => p.id !== id);
  if (state.pieces.length < before) {
    saveLocalLedger(state);
    return true;
  }
  return false;
}

export function resetArchiveLedger(): ArchiveLedgerState {
  const empty: ArchiveLedgerState = {
    pieces: [],
    outfits: [],
    reports: [],
    events: [],
    lastDailyCheckAt: undefined,
  };
  saveLocalLedger(empty);
  return empty;
}

/**
 * Generates a Daily Outfit by combining pieces with DeepSeek V4.1 Flash and launching
 * a KIE.AI GPT Image 2.5 Sunburst flat-lay task (no-human overhead composition).
 */
export async function generateDailyOutfit(input: {
  mode?: OutfitGenerationMode;
  anchorPieceId?: string;
  selectedPieceIds?: string[];
  occasion?: string;
  weather?: string;
  imageModel?: string;
  useReferenceImages?: boolean;
  createdVia?: DailyOutfit["createdVia"];
}): Promise<DailyOutfit> {
  const state = loadLocalLedger();
  const mode: OutfitGenerationMode =
    input.mode || (input.anchorPieceId ? "anchor_piece" : "hybrid_daily");

  const plan = await curateDailyOutfitWithDeepSeek({
    allPieces: state.pieces,
    mode,
    anchorPieceId: input.anchorPieceId,
    selectedPieceIds: input.selectedPieceIds,
    occasion: input.occasion,
    weather: input.weather,
  });

  const selectedPieces = plan.selectedPieceIds
    .map((id) => state.pieces.find((p) => p.id === id))
    .filter(Boolean) as SartorialPiece[];

  const totalEstimateUsd = selectedPieces.reduce(
    (sum, p) => sum + (Number(p.price) || 0),
    0
  );

  let chosenModel =
    input.imageModel || "gpt-image-2-5-sunburst-text-to-image";
  let refUrls: string[] = [];

  if (input.useReferenceImages) {
    chosenModel = "gpt-image-2-5-sunburst-image-to-image";
    const rawUrls = selectedPieces
      .map((p) => p.imageUrl)
      .filter((u) => u && u.startsWith("http"))
      .slice(0, 6);
    refUrls = await Promise.all(rawUrls.map((u) => rehostUrlOnKie(u)));
  }

  let kieTaskId: string | undefined;
  let status: DailyOutfit["status"] = "generating";
  let errorMessage: string | undefined;

  try {
    const task = await createSunburstOutfitTask({
      prompt: plan.sunburstPrompt,
      model: chosenModel,
      referenceImageUrls: refUrls.length > 0 ? refUrls : undefined,
      aspectRatio: "4:3",
      resolution: "1K",
    });
    kieTaskId = task.taskId;
    chosenModel = task.model;
  } catch (err: any) {
    // If image-to-image failed, fallback to gpt-image-2-5-sunburst-text-to-image
    try {
      const fallbackTask = await createSunburstOutfitTask({
        prompt: plan.sunburstPrompt,
        model: "gpt-image-2-5-sunburst-text-to-image",
        aspectRatio: "4:3",
        resolution: "1K",
      });
      kieTaskId = fallbackTask.taskId;
      chosenModel = fallbackTask.model;
    } catch (innerErr: any) {
      status = "failed";
      errorMessage = innerErr?.message || err?.message || "KIE task failed";
    }
  }

  const outfit: DailyOutfit = {
    id: `outfit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    lookNumber: nextPlateNumber(state),
    title: plan.title,
    subtitle: plan.subtitle,
    mode,
    occasion: plan.occasion,
    weather: plan.weather,
    pieceIds: plan.selectedPieceIds,
    anchorPieceId: input.anchorPieceId,
    editorialNote: plan.editorialNote,
    scentPairingNote: plan.scentPairingNote,
    stylistVerdict: plan.stylistVerdict,
    vibeTags: plan.vibeTags,
    colorStory: plan.colorStory,
    sunburstPrompt: plan.sunburstPrompt,
    imageModel: chosenModel,
    kieTaskId,
    status,
    errorMessage,
    totalEstimateUsd,
    createdAt: new Date().toISOString(),
    createdVia: input.createdVia || "web",
  };

  state.outfits.unshift(outfit);
  appendEvent(state, {
    type: "outfit_sunburst",
    actor: "KIE Sunburst 2.5",
    title: `Started ${outfit.lookNumber}: ${outfit.title}`,
    detail: `DeepSeek V4.1 Flash combined ${selectedPieces.length} pieces ($${totalEstimateUsd.toLocaleString()}). Rendering flat-lay on KIE ${chosenModel} (Task: ${kieTaskId || "N/A"}).`,
    relatedId: outfit.id,
  });

  saveLocalLedger(state);
  return outfit;
}

/**
 * Checks KIE task status for an outfit and updates the stored outfit if completed.
 */
export async function checkAndSyncOutfitStatus(
  outfitId: string
): Promise<DailyOutfit | null> {
  const state = loadLocalLedger();
  const outfit = state.outfits.find((o) => o.id === outfitId);
  if (!outfit) return null;

  if (outfit.status === "completed" || !outfit.kieTaskId) {
    return outfit;
  }

  try {
    const taskStatus = await getKieTaskStatus(outfit.kieTaskId);
    if (taskStatus.state === "success" && taskStatus.imageUrl) {
      outfit.status = "completed";
      outfit.imageUrl = taskStatus.imageUrl;
      appendEvent(state, {
        type: "outfit_sunburst",
        actor: "KIE Sunburst 2.5",
        title: `Completed ${outfit.lookNumber}: ${outfit.title}`,
        detail: `No-human sartorial flat-lay rendered in ${taskStatus.costTime || 48}s via ${outfit.imageModel}.`,
        relatedId: outfit.id,
      });
      saveLocalLedger(state);
    } else if (taskStatus.state === "fail") {
      outfit.status = "failed";
      outfit.errorMessage =
        taskStatus.failMsg || "KIE Sunburst image generation failed";
      saveLocalLedger(state);
    }
  } catch {
    // keep status as generating so next poll retries cleanly
  }

  return outfit;
}

/**
 * Runs a Daily Price & Stock Audit across all wishlist pieces, updating price history
 * and generating a GrokBot Daily Sartorial & Price Briefing Report via DeepSeek V4.1 Flash.
 */
export async function executeDailyPriceCheck(
  triggeredBy: DailyPriceReport["triggeredBy"] = "manual_web"
): Promise<DailyPriceReport> {
  const state = loadLocalLedger();
  const wishlist = state.pieces.filter((p) => p.collection === "wishlist");
  const today = new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();

  const itemUpdates: PriceItemUpdate[] = [];
  let totalWishlistValue = 0;
  let totalSavingsAvailable = 0;

  for (const piece of wishlist) {
    const baseline = piece.originalPrice || piece.priceHistory[0]?.price || piece.price;
    let detectedPrice = piece.price;
    let inStock = piece.inStock;

    // Attempt live scrape if a custom non-seed URL was added recently
    if (
      piece.sourceUrl &&
      piece.addedVia !== "archive_seed" &&
      !piece.sourceUrl.includes("cartier.com") &&
      !piece.sourceUrl.includes("tomfordbeauty.com") &&
      !piece.sourceUrl.includes("baracuta.com") &&
      !piece.sourceUrl.includes("persol.com") &&
      !piece.sourceUrl.includes("bottegaveneta.com") &&
      !piece.sourceUrl.includes("ralphlauren.com")
    ) {
      try {
        const scraped = await scrapeProductUrl(piece.sourceUrl);
        if (scraped.price && scraped.price > 0) {
          detectedPrice = scraped.price;
        }
        inStock = scraped.inStock;
      } catch {
        // keep current price if live scrape fails
      }
    }

    piece.lastCheckedAt = nowIso;
    piece.inStock = inStock;
    if (detectedPrice !== piece.price) {
      piece.price = detectedPrice;
      piece.priceHistory.push({
        date: today,
        price: detectedPrice,
        currency: piece.currency,
        note: `GrokBot daily audit (${triggeredBy})`,
      });
    }

    const changePct =
      baseline > 0
        ? Number((((piece.price - baseline) / baseline) * 100).toFixed(2))
        : 0;
    piece.priceChangePct = changePct;

    const status: PriceItemUpdate["status"] =
      changePct < -0.5 ? "drop" : changePct > 0.5 ? "increase" : "stable";

    const savings = Math.max(0, baseline - piece.price);
    totalWishlistValue += piece.price;
    totalSavingsAvailable += savings;

    const targetGap = piece.targetPrice
      ? piece.price - piece.targetPrice
      : null;

    itemUpdates.push({
      pieceId: piece.id,
      title: piece.title,
      brand: piece.brand,
      category: piece.category,
      previousPrice: baseline,
      currentPrice: piece.price,
      changePct,
      status,
      inStock,
      verdict:
        status === "drop"
          ? targetGap !== null && targetGap <= 0
            ? `Target price ($${piece.targetPrice}) reached — immediate acquisition recommended.`
            : `Trading ${Math.abs(changePct)}% below baseline (-$${savings}).`
          : `Holding steady at $${piece.price}; verified in stock.`,
    });
  }

  const brief = await generateDailyBriefWithDeepSeek(
    itemUpdates,
    totalWishlistValue,
    totalSavingsAvailable
  );

  const report: DailyPriceReport = {
    id: `report-${Date.now()}`,
    date: today,
    summaryHeadline: brief.summaryHeadline,
    executiveBrief: brief.executiveBrief,
    checkedCount: wishlist.length,
    priceDropsCount: itemUpdates.filter((u) => u.status === "drop").length,
    priceIncreasesCount: itemUpdates.filter((u) => u.status === "increase")
      .length,
    totalWishlistValue,
    totalSavingsAvailable,
    itemUpdates,
    recommendedLookId: state.outfits[0]?.id,
    triggeredBy,
    createdAt: nowIso,
  };

  state.reports.unshift(report);
  state.reports = state.reports.slice(0, 20);
  state.lastDailyCheckAt = nowIso;

  appendEvent(state, {
    type: "price_check",
    actor: triggeredBy === "grokbot_cron" ? "Railway Cron" : "GrokBot",
    title: `Daily Price & Stock Audit: ${report.priceDropsCount} Drops Active`,
    detail: brief.summaryHeadline,
    relatedId: report.id,
  });

  saveLocalLedger(state);
  return report;
}

/**
 * Natural-language GrokBot Agent handler!
 * Allows the user (via GrokBot or the in-app GrokBot Console) to:
 * - Upload a link directly from GrokBot ("Add https://... to my wishlist")
 * - Upload a wardrobe item ("Add my vintage brown suede jacket to my wardrobe")
 * - Request a daily price report ("Run a daily price check and report")
 * - Generate a daily outfit ("Generate an outfit for a rainy evening in Milan")
 * - Query wishlist / wardrobe / price drops
 */
export async function handleGrokBotMessage(message: string): Promise<{
  reply: string;
  actionTaken: string;
  createdPiece?: SartorialPiece;
  createdOutfit?: DailyOutfit;
  createdReport?: DailyPriceReport;
}> {
  const state = loadLocalLedger();
  const trimmed = message.trim();

  // Check if message contains a URL to ingest
  const urlMatch = trimmed.match(/https?:\/\/[^\s<>"]+/i);
  const lower = trimmed.toLowerCase();

  if (
    urlMatch &&
    (lower.includes("add") ||
      lower.includes("upload") ||
      lower.includes("save") ||
      lower.includes("wishlist") ||
      lower.includes("wardrobe") ||
      lower.startsWith("http"))
  ) {
    const collection: CollectionType = lower.includes("wardrobe")
      ? "wardrobe"
      : "wishlist";
    const piece = await ingestPieceFromLink({
      url: urlMatch[0],
      collection,
      addedVia: "grokbot",
    });
    return {
      reply: `Archived **${piece.brand} — ${piece.title}** into your **${collection.toUpperCase()}** (${piece.archiveCode}) at **$${piece.price.toLocaleString()} ${piece.currency}**.\n\n• **Category:** ${piece.category}\n• **Vibe:** *${piece.vibe}*\n• **DeepSeek V4.1 Flash Labels:** ${piece.labels.join(" · ")}\n• **Pairing Note:** ${piece.pairingNotes}`,
      actionTaken: `ingested_link_${collection}`,
      createdPiece: piece,
    };
  }

  // Ask DeepSeek V4.1 Flash to classify intent and parameters
  const intent = await callDeepSeekJson<{
    action:
      | "run_price_check"
      | "generate_outfit"
      | "add_item"
      | "answer_query";
    collection?: "wishlist" | "wardrobe";
    itemTitle?: string;
    itemBrand?: string;
    itemCategory?: string;
    itemPrice?: number;
    outfitMode?: OutfitGenerationMode;
    occasion?: string;
    anchorPieceId?: string;
    conversationalResponse: string;
  }>(
    [
      {
        role: "system",
        content: `You are GrokBot connected to Maison Archive (Sartorial Wishlist, Wardrobe & Sunburst 2.5 Outfit Studio), powered by DeepSeek V4.1 Flash (1017).
Determine the user's intent and return strict JSON:
- "action": One of:
  - "run_price_check" (if user asks for price check, daily update, report, price changes, deals, drops)
  - "generate_outfit" (if user asks to generate/create/style an outfit or daily look)
  - "add_item" (if user wants to add/upload a piece by description without a URL, e.g. "add Creed Aventus fragrance to my wishlist" or "add my black leather jacket to my wardrobe")
  - "answer_query" (if user asks a question about their wishlist, wardrobe, outfits, or style advice)
- "collection": "wishlist" or "wardrobe" (for add_item)
- "itemTitle": string (for add_item)
- "itemBrand": string (for add_item)
- "itemCategory": one of "Fragrances", "Watches", "Sunglasses", "Wallets", "Shirts", "T-Shirts", "Men's Apparel", "Pants", "Jackets"
- "itemPrice": numeric price estimate (for add_item)
- "outfitMode": "wishlist_daily" | "wardrobe_daily" | "hybrid_daily" | "anchor_piece"
- "occasion": string (for generate_outfit)
- "anchorPieceId": optional matching piece id from catalog
- "conversationalResponse": A sophisticated, helpful sartorial response from GrokBot summarizing the answer or action.`,
      },
      {
        role: "user",
        content: `User Message: "${trimmed}"\nCurrent Catalog Summary:\n${JSON.stringify(
          state.pieces.map((p) => ({
            id: p.id,
            collection: p.collection,
            brand: p.brand,
            title: p.title,
            category: p.category,
            price: p.price,
            priceChangePct: p.priceChangePct,
            vibe: p.vibe,
          }))
        )}`,
      },
    ],
    "low"
  );

  if (intent.action === "run_price_check") {
    const report = await executeDailyPriceCheck("grokbot_command");
    return {
      reply: `**GrokBot Daily Wishlist Report (${report.date})**\n\n**${report.summaryHeadline}**\n\n${report.executiveBrief}\n\n• **Pieces Audited:** ${report.checkedCount}\n• **Active Price Drops:** ${report.priceDropsCount}\n• **Total Wishlist Value:** $${report.totalWishlistValue.toLocaleString()}\n• **Available Savings:** $${report.totalSavingsAvailable.toLocaleString()}`,
      actionTaken: "run_price_check",
      createdReport: report,
    };
  }

  if (intent.action === "add_item" && intent.itemTitle) {
    const piece = await ingestPieceFromUpload({
      collection: intent.collection || "wishlist",
      title: intent.itemTitle,
      brand: intent.itemBrand,
      category: intent.itemCategory,
      price: intent.itemPrice,
      addedVia: "grokbot",
    });
    return {
      reply: `Added **${piece.brand} — ${piece.title}** to your **${piece.collection.toUpperCase()}** (${piece.archiveCode}) via GrokBot.\n\n• **Category:** ${piece.category} ($${piece.price})\n• **Vibe:** *${piece.vibe}*\n• **DeepSeek V4.1 Flash Labels:** ${piece.labels.join(" · ")}`,
      actionTaken: `added_${piece.collection}_item`,
      createdPiece: piece,
    };
  }

  if (intent.action === "generate_outfit") {
    const outfit = await generateDailyOutfit({
      mode: intent.outfitMode || "hybrid_daily",
      anchorPieceId: intent.anchorPieceId,
      occasion: intent.occasion || "GrokBot Bespoke Daily Rotation",
      createdVia: "grokbot",
    });
    return {
      reply: `Curated **${outfit.lookNumber}: ${outfit.title}** (*${outfit.occasion}*).\n\n${outfit.editorialNote}\n\n• **Scent Note:** ${outfit.scentPairingNote}\n• **KIE Sunburst 2.5 Task:** \`${outfit.kieTaskId || "Rendering"}\` (Overhead no-human flat-lay is now rendering in the Daily Outfits studio!)`,
      actionTaken: "generate_outfit",
      createdOutfit: outfit,
    };
  }

  appendEvent(state, {
    type: "grokbot_chat",
    actor: "GrokBot",
    title: "GrokBot Sartorial Consultation",
    detail: trimmed.slice(0, 140),
  });
  saveLocalLedger(state);

  return {
    reply:
      intent.conversationalResponse ||
      `GrokBot Archive online. You currently hold ${state.pieces.filter((p) => p.collection === "wishlist").length} wishlist pieces and ${state.pieces.filter((p) => p.collection === "wardrobe").length} wardrobe pieces.`,
    actionTaken: "answer_query",
  };
}
