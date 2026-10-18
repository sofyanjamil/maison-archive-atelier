import {
  ColorSwatch,
  DailyOutfit,
  OutfitGenerationMode,
  PriceItemUpdate,
  SARTORIAL_CATEGORIES,
  SartorialCategory,
  SartorialPiece,
} from "./types";
import { ScrapedPageData } from "./scraper";

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

const CATEGORY_FALLBACK_IMAGES: Record<SartorialCategory, string> = {
  Fragrances:
    "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1000&q=85",
  Watches:
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1000&q=85",
  Sunglasses:
    "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1000&q=85",
  Wallets:
    "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=1000&q=85",
  Shirts:
    "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=1000&q=85",
  "T-Shirts":
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1000&q=85",
  "Men's Apparel":
    "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1000&q=85",
  Pants:
    "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=1000&q=85",
  Jackets:
    "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1000&q=85",
};

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
    lower.includes("scent")
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
      temperature: 0.4,
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
  originalPrice?: number;
  currency: string;
  imageUrl: string;
  labels: string[];
  vibe: string;
  vibeDescription: string;
  colorPalette: ColorSwatch[];
  season: string;
  formality: string;
  pairingNotes: string;
  priority: "grail" | "high" | "standard";
}

/**
 * Uses DeepSeek V4.1 Flash (deepseek/deepseek-v4.1-flash-1017) to analyze a scraped product URL
 * or uploaded piece (supports multimodal image inspection!) and return rich sartorial labels & vibes.
 */
export async function analyzeProductWithDeepSeek(input: {
  scraped?: ScrapedPageData;
  manualTitle?: string;
  manualBrand?: string;
  manualPrice?: number;
  manualCategory?: string;
  manualImageUrl?: string;
  manualNotes?: string;
}): Promise<DeepSeekExtractedProduct> {
  const s = input.scraped;
  const candidateImage =
    input.manualImageUrl || s?.imageUrl || s?.galleryImages?.[0];

  const systemPrompt = `You are the Chief Archivist & Sartorial Curator at Maison Archive (1974 Heritage Menswear & Horology Ledger), powered by DeepSeek V4.1 Flash (1017).
Analyze the provided product listing / link extraction / image and return a strict JSON object with these exact keys:
- "title": Refined, accurate product name (string)
- "brand": Brand or Maison name (string)
- "category": Must be EXACTLY one of: "Fragrances", "Watches", "Sunglasses", "Wallets", "Shirts", "T-Shirts", "Men's Apparel", "Pants", "Jackets"
- "price": Numeric price in USD (or detected currency). If unknown, estimate the realistic retail market price as a number > 0.
- "originalPrice": Optional numeric original retail price if on sale, else null.
- "currency": 3-letter currency code (default "USD")
- "imageUrl": Best high-resolution product image URL from the candidates provided (or empty string if none)
- "labels": Array of 5 to 6 evocative, specific sartorial & material labels (e.g., ["Full-Grain Calfskin", "1970s Milanese Cut", "Chronograph Dial", "Unstructured Shoulder", "Woody Amber Accord"])
- "vibe": A concise 3-5 word vintage/editorial aesthetic vibe title (e.g., "1971 Riviera Grand Tourer", "Brera Espresso & Flannel")
- "vibeDescription": 2 rich editorial sentences analyzing the craftsmanship, silhouette/notes, and aesthetic character of this piece.
- "colorPalette": Array of 3 objects with {"name": string, "hex": "#RRGGBB"}
- "season": One of "Autumn / Winter", "Spring / Summer", or "All-Season"
- "formality": One of "Casual", "Smart Casual", "Sartorial / Tailored", or "Evening / Nocturnal"
- "pairingNotes": 1-2 sentences explaining how to style this piece with other categories (watches, fragrances, trousers, outerwear).
- "priority": One of "grail", "high", or "standard"`;

  const userText = `Analyze this product for the sartorial archive:
URL: ${s?.url || "Direct Upload"}
Domain: ${s?.domain || "N/A"}
Scraped Title: ${input.manualTitle || s?.title || "Unknown"}
Scraped Brand: ${input.manualBrand || s?.brand || "Unknown"}
Scraped Price: ${input.manualPrice ?? s?.price ?? "Estimate realistic retail price"} ${s?.currency || "USD"}
Requested Category Hint: ${input.manualCategory || "Auto-detect"}
Description: ${s?.description || input.manualNotes || "N/A"}
Image Candidates: ${JSON.stringify(
    [candidateImage, ...(s?.galleryImages || [])].filter(Boolean)
  )}
Page Text Excerpt: ${(s?.rawTextSnippet || "").slice(0, 3200)}

Return valid JSON only.`;

  const userContent: any =
    candidateImage && candidateImage.startsWith("http")
      ? [
          { type: "text", text: userText },
          { type: "image_url", image_url: { url: candidateImage } },
        ]
      : userText;

  try {
    const parsed = await callDeepSeekJson<any>(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      "low"
    );

    const category = normalizeCategory(
      input.manualCategory || parsed.category || parsed.title || s?.title
    );
    const chosenImg =
      input.manualImageUrl ||
      (typeof parsed.imageUrl === "string" && parsed.imageUrl.startsWith("http")
        ? parsed.imageUrl
        : undefined) ||
      s?.imageUrl ||
      CATEGORY_FALLBACK_IMAGES[category];

    return {
      title:
        input.manualTitle ||
        parsed.title ||
        s?.title ||
        "Curated Sartorial Piece",
      brand: input.manualBrand || parsed.brand || s?.brand || "Maison Archive",
      category,
      price:
        Number(input.manualPrice ?? parsed.price ?? s?.price) > 0
          ? Number(input.manualPrice ?? parsed.price ?? s?.price)
          : 250,
      originalPrice:
        parsed.originalPrice && Number(parsed.originalPrice) > 0
          ? Number(parsed.originalPrice)
          : s?.originalPrice,
      currency: parsed.currency || s?.currency || "USD",
      imageUrl: chosenImg,
      labels:
        Array.isArray(parsed.labels) && parsed.labels.length > 0
          ? parsed.labels.slice(0, 6).map(String)
          : [
              category,
              "Archive Selection",
              "Heritage Craft",
              "Timeless Silhouette",
              "Curated Piece",
            ],
      vibe: parsed.vibe || "1970s Continental Sartorial",
      vibeDescription:
        parsed.vibeDescription ||
        s?.description ||
        "Selected and catalogued by DeepSeek V4.1 Flash for its enduring material quality and versatile proportions.",
      colorPalette:
        Array.isArray(parsed.colorPalette) && parsed.colorPalette.length > 0
          ? parsed.colorPalette.slice(0, 4)
          : [
              { name: "Archive Espresso", hex: "#2A1F18" },
              { name: "Warm Parchment", hex: "#E8DEC8" },
              { name: "Antique Brass", hex: "#B08A3A" },
            ],
      season: parsed.season || "All-Season",
      formality: parsed.formality || "Smart Casual",
      pairingNotes:
        parsed.pairingNotes ||
        "Pairs naturally with tailored wool trousers, fine-gauge knitwear, and woody-amber fragrances.",
      priority:
        parsed.priority === "grail" ||
        parsed.priority === "high" ||
        parsed.priority === "standard"
          ? parsed.priority
          : "high",
    };
  } catch {
    // Graceful fallback if vision URL rejected by upstream provider: retry text-only
    const parsed = await callDeepSeekJson<any>(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userText },
      ],
      "low"
    );
    const category = normalizeCategory(
      input.manualCategory || parsed.category || parsed.title || s?.title
    );
    return {
      title:
        input.manualTitle ||
        parsed.title ||
        s?.title ||
        "Curated Sartorial Piece",
      brand: input.manualBrand || parsed.brand || s?.brand || "Maison Archive",
      category,
      price:
        Number(input.manualPrice ?? parsed.price ?? s?.price) > 0
          ? Number(input.manualPrice ?? parsed.price ?? s?.price)
          : 250,
      originalPrice:
        parsed.originalPrice && Number(parsed.originalPrice) > 0
          ? Number(parsed.originalPrice)
          : undefined,
      currency: parsed.currency || s?.currency || "USD",
      imageUrl:
        input.manualImageUrl ||
        s?.imageUrl ||
        CATEGORY_FALLBACK_IMAGES[category],
      labels:
        Array.isArray(parsed.labels) && parsed.labels.length > 0
          ? parsed.labels.slice(0, 6).map(String)
          : [category, "Archive Grade", "Quiet Luxury", "Timeless"],
      vibe: parsed.vibe || "1974 Continental Archive",
      vibeDescription:
        parsed.vibeDescription ||
        "Catalogued by DeepSeek V4.1 Flash with vintage sartorial provenance.",
      colorPalette:
        Array.isArray(parsed.colorPalette) && parsed.colorPalette.length > 0
          ? parsed.colorPalette.slice(0, 4)
          : [
              { name: "Espresso", hex: "#2A1F18" },
              { name: "Antique Gold", hex: "#B08A3A" },
            ],
      season: parsed.season || "All-Season",
      formality: parsed.formality || "Smart Casual",
      pairingNotes:
        parsed.pairingNotes ||
        "Harmonizes with tailored outerwear, dress watches, and leather accessories.",
      priority: parsed.priority || "high",
    };
  }
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
 * Uses DeepSeek V4.1 Flash to combine pieces from Wishlist and/or Current Wardrobe into a
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

  const systemPrompt = `You are the Master Stylist & Creative Director at Maison Archive (1974 Sartorial Atelier), powered by DeepSeek V4.1 Flash (1017).
Your task is to compose a complete, unforgettable daily menswear outfit from the user's catalog (combining garments, outerwear, pants, watch, sunglasses, wallet, and fragrance) AND write a hyper-detailed image generation prompt for KIE.AI GPT Image 2.5 Sunburst.

CRITICAL IMAGE REQUIREMENT:
The "sunburstPrompt" MUST describe an overhead editorial luxury menswear flat-lay (knolling still-life) composition of ONLY the garments and accessories arranged neatly on a warm vintage surface (cream linen, travertine stone, or dark walnut wood).
It MUST explicitly state: "Overhead editorial luxury menswear flat-lay photography, knolling composition. NO HUMAN, NO PERSON, NO MODEL, NO MANNEQUIN, NO BODY PARTS — garments and accessories only."
Describe each chosen piece's exact visual appearance (fabric texture, color, collar, watch dial/strap, sunglasses frame, wallet leather, perfume bottle shape/glass color) so all selected pieces appear together in ONE cohesive overhead photograph.

Return a strict JSON object with these exact keys:
- "title": Evocative editorial title (e.g., "The Milanese Espresso & Suede Rotation")
- "subtitle": Concise subtitle describing the mix (e.g., "Wishlist Grails + Owned Wardrobe • Autumn Tailoring")
- "occasion": Specific occasion (use user's if provided, or craft a fitting one)
- "weather": Ideal weather / temperature note
- "selectedPieceIds": Array of 3 to 7 piece "id" strings from the provided catalog (MUST include the anchor piece ID if one was specified!)
- "editorialNote": 2-3 sentences explaining why DeepSeek V4.1 Flash paired these specific pieces, silhouettes, and textures together.
- "scentPairingNote": 1-2 sentences on how the fragrance (or olfactory mood) complements the fabrics and leather.
- "stylistVerdict": Score and one-line verdict (e.g., "9.7 / 10 Sartorial Cohesion — Effortless balance of structured wool and supple suede.")
- "vibeTags": Array of 4 short aesthetic tags
- "colorStory": Array of 4 objects with {"name": string, "hex": "#RRGGBB"}
- "sunburstPrompt": Detailed 90-140 word prompt for KIE GPT Image 2.5 Sunburst flat-lay generation (strictly NO HUMAN, overhead knolling flat-lay of all selected pieces in one image).`;

  const userPrompt = `Curate a Daily Outfit:
Mode: ${input.mode}
${
  anchorPiece
    ? `MANDATORY ANCHOR PIECE (user clicked this piece to build an outfit around it): ID="${anchorPiece.id}", Title="${anchorPiece.brand} ${anchorPiece.title}" (${anchorPiece.category}, Vibe: ${anchorPiece.vibe})`
    : "No single anchor piece forced — curate the most harmonious complete daily look."
}
${
  input.selectedPieceIds?.length
    ? `User pre-selected piece IDs: ${JSON.stringify(input.selectedPieceIds)}`
    : ""
}
Requested Occasion: ${input.occasion || "Curator's Choice — Continental Day-to-Evening"}
Requested Weather: ${input.weather || "16°C Crisp Autumn"}

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
      : `Overhead editorial luxury menswear flat-lay photography, knolling style on warm aged cream linen and dark walnut wood surface. NO HUMAN, NO PERSON, NO MANNEQUIN, garment and accessory pieces only. Featuring together in one image: ${pieceDescriptions}. Warm natural studio lighting, 1970s Milanese archive catalog aesthetic, ultra-detailed textures, 8k still life.`;

  return {
    title: result.title || "The Continental Archive Rotation",
    subtitle:
      result.subtitle ||
      "DeepSeek V4.1 Flash Curated Ensemble • Sunburst 2.5 Plate",
    occasion: result.occasion || input.occasion || "Continental Day-to-Evening",
    weather: result.weather || input.weather || "16°C Crisp Autumn",
    selectedPieceIds: chosenIds,
    editorialNote:
      result.editorialNote ||
      `Curated by DeepSeek V4.1 Flash combining ${chosenPieces.map((p) => p.brand).join(", ")} into a cohesive tonal study.`,
    scentPairingNote:
      result.scentPairingNote ||
      "Warm woody, leather, and amber accords bind the tactile wool and calfskin textures together.",
    stylistVerdict:
      result.stylistVerdict ||
      "9.7 / 10 Sartorial Harmony — Timeless proportion and material interplay.",
    vibeTags:
      Array.isArray(result.vibeTags) && result.vibeTags.length > 0
        ? result.vibeTags.slice(0, 5)
        : ["1974 Archive", "Quiet Luxury", "Flat-Lay Study", "Sunburst 2.5"],
    colorStory:
      Array.isArray(result.colorStory) && result.colorStory.length > 0
        ? result.colorStory.slice(0, 5)
        : [
            { name: "Espresso Suede", hex: "#3A281E" },
            { name: "Warm Ecru", hex: "#F2EAD9" },
            { name: "Charcoal Wool", hex: "#2B2C2E" },
            { name: "Burnished Brass", hex: "#B08A3A" },
          ],
    sunburstPrompt: guaranteedPrompt,
  };
}

/**
 * Generates an executive daily report via DeepSeek V4.1 Flash after checking wishlist prices.
 */
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
            "You are GrokBot's Daily Sartorial Market Analyst powered by DeepSeek V4.1 Flash (1017). Summarize today's wishlist price check into JSON with keys 'summaryHeadline' (1 punchy headline) and 'executiveBrief' (2-3 crisp sentences highlighting specific price drops, stock status, and buying recommendations).",
        },
        {
          role: "user",
          content: `Total Wishlist Value: $${totalWishlistValue}\nTotal Savings vs Original Retail: $${totalSavingsAvailable}\nItem Updates:\n${JSON.stringify(updates, null, 2)}\nReturn JSON only.`,
        },
      ],
      "low"
    );
    return {
      summaryHeadline:
        res.summaryHeadline ||
        `${updates.filter((u) => u.status === "drop").length} Buylist Price Drops Active — $${totalSavingsAvailable} Total Archive Savings`,
      executiveBrief:
        res.executiveBrief ||
        `GrokBot audited ${updates.length} buylist pieces via DeepSeek V4.1 Flash. Total portfolio stands at $${totalWishlistValue.toLocaleString()}.`,
    };
  } catch {
    const drops = updates.filter((u) => u.status === "drop").length;
    return {
      summaryHeadline: `${drops} Buylist Price Reductions Verified — $${totalSavingsAvailable} Available Savings`,
      executiveBrief: `Daily Railway sweep audited ${updates.length} pieces across your buylist. ${drops} pieces are trading below initial retail baseline.`,
    };
  }
}
