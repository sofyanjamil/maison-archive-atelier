import {
  ColorSwatch,
  OutfitGenerationMode,
  PriceItemUpdate,
  SARTORIAL_CATEGORIES,
  SartorialCategory,
  SartorialPiece,
} from "./types";
import { ScrapedPageData } from "./scraper";
import { discoverProductImageAndIsraelPrice } from "./product-search";
import { rehostUrlOnKie } from "./kie";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export function getDeepSeekModel(): string {
  return process.env.DEEPSEEK_MODEL || "deepseek/deepseek-v4.1-flash-1017";
}

function getOpenRouterKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error("OPENROUTER_API_KEY environment variable is not configured");
  }
  return key;
}

export function normalizeCategory(raw?: string): SartorialCategory {
  if (!raw) return "Men's Apparel";
  const lower = raw.toLowerCase().trim();
  for (const cat of SARTORIAL_CATEGORIES) {
    if (cat.toLowerCase() === lower) return cat;
  }
  if (
    lower.includes("fragrance") ||
    lower.includes("perfume") ||
    lower.includes("parfum") ||
    lower.includes("cologne") ||
    lower.includes("scent") ||
    lower.includes("edp") ||
    lower.includes("edt")
  )
    return "Fragrances";
  if (
    lower.includes("watch") ||
    lower.includes("horolog") ||
    lower.includes("chrono") ||
    lower.includes("timepiece")
  )
    return "Watches";
  if (
    lower.includes("sunglass") ||
    lower.includes("eyewear") ||
    lower.includes("shades") ||
    lower.includes("glasses")
  )
    return "Sunglasses";
  if (
    lower.includes("wallet") ||
    lower.includes("cardholder") ||
    lower.includes("card case") ||
    lower.includes("billfold")
  )
    return "Wallets";
  if (
    lower.includes("t-shirt") ||
    lower.includes("tee") ||
    lower.includes("graphic shirt")
  )
    return "T-Shirts";
  if (
    lower.includes("shirt") ||
    lower.includes("polo") ||
    lower.includes("oxford") ||
    lower.includes("button")
  )
    return "Shirts";
  if (
    lower.includes("pant") ||
    lower.includes("trouser") ||
    lower.includes("jean") ||
    lower.includes("denim") ||
    lower.includes("chino") ||
    lower.includes("slacks")
  )
    return "Pants";
  if (
    lower.includes("jacket") ||
    lower.includes("coat") ||
    lower.includes("blouson") ||
    lower.includes("bomber") ||
    lower.includes("harrington") ||
    lower.includes("overcoat")
  )
    return "Jackets";
  return "Men's Apparel";
}

function extractJsonObject(rawText: string): any {
  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }
    throw new Error("Could not parse JSON from DeepSeek V4.1 Flash response");
  }
}

export async function callDeepSeekJson<T = any>(
  messages: Array<{ role: "system" | "user" | "assistant"; content: any }>,
  effort: "low" | "high" | "none" = "low"
): Promise<T> {
  const apiKey = getOpenRouterKey();
  const model = getDeepSeekModel();

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://maison-archive.vercel.app",
      "X-Title": "Maison Archive Sartorial Atelier",
    },
    body: JSON.stringify({
      model,
      messages,
      response_format: { type: "json_object" },
      reasoning: { effort },
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`DeepSeek OpenRouter error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || "{}";
  return extractJsonObject(content) as T;
}

export interface DeepSeekExtractedProduct {
  title: string;
  brand: string;
  category: SartorialCategory;
  price: number;
  avgPriceIls: number;
  israelPriceNote: string;
  originalPrice?: number;
  currency: string;
  imageUrl: string;
  galleryImages: string[];
  labels: string[];
  vibe: string;
  vibeDescription: string;
  colorPalette: ColorSwatch[];
  season: string;
  formality: string;
  pairingNotes: string;
  priority: "grail" | "high" | "standard";
}

function slugToReadableQuery(url?: string): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    const parts = u.pathname
      .split("/")
      .filter((p) => p.length > 2 && !/^\d+$/.test(p));
    return parts
      .join(" ")
      .replace(/[-_]+/g, " ")
      .replace(/\.(html|htm|php|aspx)$/i, "")
      .trim();
  } catch {
    return "";
  }
}

/**
 * Uses DeepSeek V4.1 Flash (deepseek/deepseek-v4.1-flash-1017) + Live Web Image & Israel Market Search
 * to find a real product image, calculate the average price in Israel (₪ ILS), and assign sartorial labels.
 */
export async function analyzeProductWithDeepSeek(input: {
  scraped?: ScrapedPageData;
  manualTitle?: string;
  manualBrand?: string;
  manualPrice?: number;
  manualPriceIls?: number;
  manualCategory?: string;
  manualImageUrl?: string;
  manualNotes?: string;
}): Promise<DeepSeekExtractedProduct> {
  const s = input.scraped;

  // Build search query to find real product images & Israel market prices (₪ ILS)
  const initialQuery = [
    input.manualBrand || s?.brand || "",
    input.manualTitle || s?.title || slugToReadableQuery(s?.url),
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const webDiscovery = await discoverProductImageAndIsraelPrice(
    initialQuery || "luxury menswear product",
    input.manualCategory
  );

  const allImageCandidates = [
    ...(input.manualImageUrl ? [input.manualImageUrl] : []),
    ...(s?.imageUrl ? [s.imageUrl] : []),
    ...(s?.galleryImages || []),
    ...(webDiscovery.primaryImageUrl ? [webDiscovery.primaryImageUrl] : []),
    ...webDiscovery.galleryImages,
  ].filter(Boolean);

  const systemPrompt = `You are the Chief Archivist & Israeli Market Analyst at Maison Archive, powered by DeepSeek V4.1 Flash (1017).
Analyze the product information, web image candidates, and Israeli market search snippets (Zap.co.il, KSP, Super-Pharm, Factory 54, Terminal X, etc.) and return a strict JSON object with these exact keys:
- "title": Accurate, clean product name (string)
- "brand": Brand or Maison name (string)
- "category": Must be EXACTLY one of: "Fragrances", "Watches", "Sunglasses", "Wallets", "Shirts", "T-Shirts", "Men's Apparel", "Pants", "Jackets"
- "price": Numeric price in USD (estimate realistic USD retail price if not explicitly given)
- "avgPriceIls": Numeric average retail price in Israel in ₪ (ILS / NIS). Use the Israeli search snippets / detected ₪ prices if available, or accurately estimate the Israeli market price in ILS (typically ~3.65–4.1x USD including VAT in Israel). Must be a positive integer.
- "israelPriceNote": Concise Israeli market price summary (e.g., "Avg ₪590 in Israel (Zap / KSP: ₪550–₪650)")
- "originalPrice": Optional numeric original USD price if on sale, else null
- "currency": "USD"
- "bestImageIndex": Integer index (0-based) into the provided Web Image Candidates array that best matches the official product photo
- "labels": Array of 5 to 6 specific material, scent, or sartorial labels
- "vibe": Concise 3-5 word aesthetic vibe
- "vibeDescription": 2 sentences analyzing the piece
- "colorPalette": Array of 3 objects with {"name": string, "hex": "#RRGGBB"}
- "season": One of "Autumn / Winter", "Spring / Summer", or "All-Season"
- "formality": One of "Casual", "Smart Casual", "Sartorial / Tailored", or "Evening / Nocturnal"
- "pairingNotes": 1-2 sentences on how to style this piece
- "priority": One of "grail", "high", or "standard"`;

  const userText = `Analyze this product and determine its best image and average price in Israel (₪ ILS):
URL: ${s?.url || "Direct Upload"}
Title Hint: ${input.manualTitle || s?.title || initialQuery || "Unknown"}
Brand Hint: ${input.manualBrand || s?.brand || "Auto-detect"}
User Price Hint (USD): ${input.manualPrice ?? s?.price ?? "Auto-estimate"}
User Price Hint (ILS ₪): ${input.manualPriceIls ?? "Auto-detect from Israel snippets"}
Category Hint: ${input.manualCategory || "Auto-detect"}
Notes / Description: ${s?.description || input.manualNotes || "N/A"}

Web Image Candidates (0-indexed):
${JSON.stringify(
  webDiscovery.imageCandidates.map((c, idx) => ({
    index: idx,
    title: c.title,
    url: c.turl,
  })),
  null,
  2
)}

Israeli Market Search Snippets (Zap / KSP / Super-Pharm / ₪ ILS):
${JSON.stringify(webDiscovery.israelSnippets, null, 2)}
Detected ₪ ILS Numbers in Snippets: ${JSON.stringify(webDiscovery.detectedIlsPrices)}

Page Text Excerpt:
${(s?.rawTextSnippet || "").slice(0, 2200)}

Return valid JSON only.`;

  const parsed = await callDeepSeekJson<any>(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userText },
    ],
    "low"
  ).catch(() => ({}));

  // If initial query was weak (e.g. URL had no title) and DeepSeek identified a better brand+title, do a quick image lookup for that exact brand+title!
  let finalDiscovery = webDiscovery;
  if (
    allImageCandidates.length === 0 &&
    (parsed.brand || parsed.title)
  ) {
    finalDiscovery = await discoverProductImageAndIsraelPrice(
      `${parsed.brand || ""} ${parsed.title || ""}`.trim(),
      parsed.category
    );
  }

  const category = normalizeCategory(
    input.manualCategory || parsed.category || parsed.title || s?.title
  );

  // Pick the best image URL:
  // 1. User's manual uploaded image
  // 2. Scraped product image from page
  // 3. DeepSeek's selected candidate from Bing Image search (rehosted onto KIE CDN!)
  let chosenImageUrl = input.manualImageUrl || s?.imageUrl;

  if (!chosenImageUrl && finalDiscovery.imageCandidates.length > 0) {
    const idx =
      typeof parsed.bestImageIndex === "number" &&
      parsed.bestImageIndex >= 0 &&
      parsed.bestImageIndex < finalDiscovery.imageCandidates.length
        ? parsed.bestImageIndex
        : 0;
    const picked = finalDiscovery.imageCandidates[idx];
    chosenImageUrl =
      picked.rehostedUrl ||
      (await rehostUrlOnKie(picked.turl || picked.murl).catch(
        () => picked.turl || picked.murl
      ));
  }

  if (!chosenImageUrl) {
    chosenImageUrl =
      finalDiscovery.primaryImageUrl ||
      allImageCandidates[0] ||
      `https://placehold.co/800x600/F5EFE2/171411?text=${encodeURIComponent(
        `${input.manualBrand || parsed.brand || ""} ${input.manualTitle || parsed.title || category}`.trim()
      )}`;
  }

  const gallery = Array.from(
    new Set(
      [
        chosenImageUrl,
        ...(s?.galleryImages || []),
        ...finalDiscovery.galleryImages,
      ].filter(Boolean)
    )
  ).slice(0, 8);

  const detectedMedianIls =
    finalDiscovery.detectedIlsPrices.length > 0
      ? Math.round(
          finalDiscovery.detectedIlsPrices.reduce((a, b) => a + b, 0) /
            finalDiscovery.detectedIlsPrices.length
        )
      : undefined;

  const usdPrice =
    Number(input.manualPrice ?? parsed.price ?? s?.price) > 0
      ? Math.round(Number(input.manualPrice ?? parsed.price ?? s?.price))
      : detectedMedianIls
        ? Math.round(detectedMedianIls / 3.75)
        : 180;

  const avgPriceIls =
    Number(input.manualPriceIls ?? parsed.avgPriceIls ?? detectedMedianIls) > 0
      ? Math.round(
          Number(input.manualPriceIls ?? parsed.avgPriceIls ?? detectedMedianIls)
        )
      : Math.round(usdPrice * 3.8);

  const israelPriceNote =
    parsed.israelPriceNote ||
    (finalDiscovery.detectedIlsPrices.length > 0
      ? `Avg ₪${avgPriceIls.toLocaleString()} in Israel (Range: ₪${Math.min(
          ...finalDiscovery.detectedIlsPrices
        )}–₪${Math.max(...finalDiscovery.detectedIlsPrices)})`
      : `Est. ₪${avgPriceIls.toLocaleString()} in Israel`);

  return {
    title:
      input.manualTitle ||
      parsed.title ||
      s?.title ||
      "Curated Sartorial Piece",
    brand: input.manualBrand || parsed.brand || s?.brand || "Maison Archive",
    category,
    price: usdPrice,
    avgPriceIls,
    israelPriceNote,
    originalPrice:
      parsed.originalPrice && Number(parsed.originalPrice) > 0
        ? Number(parsed.originalPrice)
        : s?.originalPrice,
    currency: parsed.currency || s?.currency || "USD",
    imageUrl: chosenImageUrl,
    galleryImages: gallery,
    labels:
      Array.isArray(parsed.labels) && parsed.labels.length > 0
        ? parsed.labels.slice(0, 6).map(String)
        : [category, "Archive Selection", "Curated Piece"],
    vibe: parsed.vibe || "Contemporary Classic",
    vibeDescription:
      parsed.vibeDescription ||
      s?.description ||
      "Catalogued and analyzed by DeepSeek V4.1 Flash.",
    colorPalette:
      Array.isArray(parsed.colorPalette) && parsed.colorPalette.length > 0
        ? parsed.colorPalette.slice(0, 4)
        : [
            { name: "Espresso", hex: "#2A1F18" },
            { name: "Warm Parchment", hex: "#E8DEC8" },
            { name: "Antique Brass", hex: "#B08A3A" },
          ],
    season: parsed.season || "All-Season",
    formality: parsed.formality || "Smart Casual",
    pairingNotes:
      parsed.pairingNotes ||
      "Pairs cleanly with tailored trousers, knitwear, and signature fragrances.",
    priority:
      parsed.priority === "grail" ||
      parsed.priority === "high" ||
      parsed.priority === "standard"
        ? parsed.priority
        : "high",
  };
}

export interface RefinedSearchData {
  bestImageIndex?: number;
  avgPriceIls?: number;
  israelPriceNote?: string;
}

/**
 * Re-analyzes an existing piece against fresh web image candidates and Israeli market snippets,
 * picks the best matching image and refines the ₪ ILS average price.
 */
export async function updatePieceSearchDataWithDeepSeek(input: {
  piece: { title: string; brand: string; category: string };
  imageCandidates: Array<{ turl: string; murl: string; title: string; rehostedUrl?: string }>;
  israelSnippets: string[];
  detectedIlsPrices: number[];
  currentPriceUsd?: number;
}): Promise<RefinedSearchData> {
  const systemPrompt = `You are the Chief Archivist & Israeli Market Analyst at Maison Archive (DeepSeek V4.1 Flash 1017).
Given a catalogued piece, fresh web image candidates, and Israeli market search snippets (Zap.co.il, KSP, Super-Pharm, etc.), return strict JSON with:
- "bestImageIndex": 0-based index of the candidate that best matches the official product photo (or -1 if none match)
- "avgPriceIls": best estimate of the average retail price in Israel in ₪ ILS (positive integer). Prefer detected ₪ numbers; otherwise estimate from USD incl. Israeli VAT.
- "israelPriceNote": one concise sentence, e.g. "Avg ₪590 in Israel (Zap / KSP: ₪550–₪650)"`;

  const userText = `Piece: ${input.piece.brand} ${input.piece.title} (${input.piece.category})
Current USD Price: ${input.currentPriceUsd ?? "unknown"}

Web Image Candidates (0-indexed):
${JSON.stringify(
  input.imageCandidates.map((c, idx) => ({
    index: idx,
    title: c.title,
    url: c.rehostedUrl || c.turl,
  })),
  null,
  2
)}

Israeli Market Snippets:
${JSON.stringify(input.israelSnippets.slice(0, 8), null, 2)}
Detected ₪ ILS Numbers: ${JSON.stringify(input.detectedIlsPrices)}

Return valid JSON only.`;

  return callDeepSeekJson<RefinedSearchData>(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userText },
    ],
    "low"
  );
}

export interface CuratedOutfitPlan {
  title: string;
  subtitle: string;
  occasion: string;
  weather: string;
  selectedPieceIds: string[];
  editorialNote: string;
  scentPairingNote: string;
  stylistVerdict: string;
  vibeTags: string[];
  colorStory: ColorSwatch[];
  sunburstPrompt: string;
}

/**
 * Uses DeepSeek V4.1 Flash to combine pieces from Buylist and/or Current Wardrobe into a
 * cohesive Daily Outfit and writes the exact no-human flat-lay prompt for KIE Sunburst 2.5.
 */
export async function curateDailyOutfitWithDeepSeek(input: {
  allPieces: SartorialPiece[];
  mode: OutfitGenerationMode;
  anchorPieceId?: string;
  selectedPieceIds?: string[];
  occasion?: string;
  weather?: string;
}): Promise<CuratedOutfitPlan> {
  const anchorPiece = input.anchorPieceId
    ? input.allPieces.find((p) => p.id === input.anchorPieceId)
    : undefined;

  let candidatePool = input.allPieces;
  if (input.mode === "wishlist_daily") {
    candidatePool = input.allPieces.filter((p) => p.collection === "wishlist");
    if (candidatePool.length < 3) candidatePool = input.allPieces;
  } else if (input.mode === "wardrobe_daily") {
    candidatePool = input.allPieces.filter((p) => p.collection === "wardrobe");
    if (candidatePool.length < 3) candidatePool = input.allPieces;
  } else if (
    input.mode === "custom_selection" &&
    input.selectedPieceIds &&
    input.selectedPieceIds.length > 0
  ) {
    candidatePool = input.allPieces.filter((p) =>
      input.selectedPieceIds!.includes(p.id)
    );
  }

  const catalogSummary = candidatePool.map((p) => ({
    id: p.id,
    collection: p.collection,
    title: p.title,
    brand: p.brand,
    category: p.category,
    vibe: p.vibe,
    labels: p.labels,
    colors: p.colorPalette.map((c) => c.name),
    price: p.price,
  }));

  const systemPrompt = `You are the Master Stylist & Creative Director at Maison Archive, powered by DeepSeek V4.1 Flash (1017).
Compose a complete daily menswear outfit from the user's catalog and write a hyper-detailed image generation prompt for KIE.AI GPT Image 2.5 Sunburst.

CRITICAL IMAGE REQUIREMENT:
The "sunburstPrompt" MUST describe an overhead editorial luxury menswear flat-lay (knolling still-life) composition of ONLY the garments and accessories arranged neatly on a warm vintage surface.
It MUST explicitly state: "Overhead editorial luxury menswear flat-lay photography, knolling composition. NO HUMAN, NO PERSON, NO MODEL, NO MANNEQUIN, NO BODY PARTS — garments and accessories only."

Return a strict JSON object with these exact keys:
- "title": Editorial title
- "subtitle": Concise subtitle
- "occasion": Specific occasion
- "weather": Weather note
- "selectedPieceIds": Array of 3 to 7 piece "id" strings from the catalog (MUST include the anchor piece ID if specified)
- "editorialNote": 2-3 sentences explaining why these pieces harmonize
- "scentPairingNote": 1-2 sentences on how the fragrance complements the outfit
- "stylistVerdict": Score and one-line verdict
- "vibeTags": Array of 4 short tags
- "colorStory": Array of 4 objects with {"name": string, "hex": "#RRGGBB"}
- "sunburstPrompt": Detailed 90-140 word prompt for KIE GPT Image 2.5 Sunburst flat-lay generation (strictly NO HUMAN, overhead knolling flat-lay of all selected pieces in one image).`;

  const userPrompt = `Curate a Daily Outfit:
Mode: ${input.mode}
${
  anchorPiece
    ? `MANDATORY ANCHOR PIECE: ID="${anchorPiece.id}", Title="${anchorPiece.brand} ${anchorPiece.title}" (${anchorPiece.category})`
    : "Curate the most harmonious complete daily look."
}
Requested Occasion: ${input.occasion || "Daily Rotation"}
Requested Weather: ${input.weather || "Mild / All-Season"}

Available Catalog Pieces:
${JSON.stringify(catalogSummary, null, 2)}

Return valid JSON only.`;

  const result = await callDeepSeekJson<CuratedOutfitPlan>(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    "low"
  );

  const validIds = new Set(input.allPieces.map((p) => p.id));
  let chosenIds = Array.isArray(result.selectedPieceIds)
    ? result.selectedPieceIds.filter((id) => validIds.has(id))
    : [];

  if (anchorPiece && !chosenIds.includes(anchorPiece.id)) {
    chosenIds.unshift(anchorPiece.id);
  }
  if (chosenIds.length === 0) {
    chosenIds = candidatePool.slice(0, 5).map((p) => p.id);
  }

  const chosenPieces = chosenIds
    .map((id) => input.allPieces.find((p) => p.id === id))
    .filter(Boolean) as SartorialPiece[];

  const pieceDescriptions = chosenPieces
    .map((p) => `${p.brand} ${p.title} (${p.category}, ${p.vibe})`)
    .join(", ");

  const guaranteedPrompt =
    result.sunburstPrompt && result.sunburstPrompt.length > 40
      ? `${result.sunburstPrompt} Overhead flat-lay knolling still life, NO HUMAN, NO MANNEQUIN, NO PERSON, all pieces arranged together in one single frame.`
      : `Overhead editorial luxury menswear flat-lay photography, knolling style on warm aged cream linen and dark walnut wood surface. NO HUMAN, NO PERSON, NO MANNEQUIN, garment and accessory pieces only. Featuring together in one image: ${pieceDescriptions}. Warm natural studio lighting, ultra-detailed textures, 8k still life.`;

  return {
    title: result.title || "Daily Archive Rotation",
    subtitle: result.subtitle || "DeepSeek V4.1 Flash • Sunburst 2.5 Plate",
    occasion: result.occasion || input.occasion || "Daily Rotation",
    weather: result.weather || input.weather || "All-Season",
    selectedPieceIds: chosenIds,
    editorialNote:
      result.editorialNote ||
      `Curated by DeepSeek V4.1 Flash combining ${chosenPieces.map((p) => p.brand).join(", ")}.`,
    scentPairingNote:
      result.scentPairingNote ||
      "Balanced textures and olfactory notes across the selected pieces.",
    stylistVerdict:
      result.stylistVerdict || "9.7 / 10 Sartorial Harmony",
    vibeTags:
      Array.isArray(result.vibeTags) && result.vibeTags.length > 0
        ? result.vibeTags.slice(0, 5)
        : ["Flat-Lay Study", "Sunburst 2.5"],
    colorStory:
      Array.isArray(result.colorStory) && result.colorStory.length > 0
        ? result.colorStory.slice(0, 5)
        : [
            { name: "Espresso", hex: "#3A281E" },
            { name: "Warm Ecru", hex: "#F2EAD9" },
            { name: "Charcoal", hex: "#2B2C2E" },
          ],
    sunburstPrompt: guaranteedPrompt,
  };
}

export async function generateDailyBriefWithDeepSeek(
  updates: PriceItemUpdate[],
  totalWishlistValue: number,
  totalSavingsAvailable: number
): Promise<{ summaryHeadline: string; executiveBrief: string }> {
  try {
    const res = await callDeepSeekJson<{
      summaryHeadline: string;
      executiveBrief: string;
    }>(
      [
        {
          role: "system",
          content:
            "You are GrokBot's Daily Market Analyst powered by DeepSeek V4.1 Flash (1017). Summarize today's buylist price check (including Israel ₪ ILS prices and USD prices) into JSON with keys 'summaryHeadline' and 'executiveBrief'.",
        },
        {
          role: "user",
          content: `Total Buylist Value: $${totalWishlistValue}\nTotal Savings: $${totalSavingsAvailable}\nItem Updates:\n${JSON.stringify(updates, null, 2)}\nReturn JSON only.`,
        },
      ],
      "low"
    );
    return {
      summaryHeadline:
        res.summaryHeadline ||
        `${updates.filter((u) => u.status === "drop").length} Buylist Price Drops Active`,
      executiveBrief:
        res.executiveBrief ||
        `Audited ${updates.length} buylist pieces via DeepSeek V4.1 Flash.`,
    };
  } catch {
    const drops = updates.filter((u) => u.status === "drop").length;
    return {
      summaryHeadline: `${drops} Buylist Price Reductions Verified`,
      executiveBrief: `Audited ${updates.length} pieces across your buylist.`,
    };
  }
}
