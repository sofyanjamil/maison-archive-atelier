export const SARTORIAL_CATEGORIES = [
  "Fragrances",
  "Watches",
  "Sunglasses",
  "Wallets",
  "Shirts",
  "T-Shirts",
  "Men's Apparel",
  "Pants",
  "Jackets",
] as const;

export type SartorialCategory = (typeof SARTORIAL_CATEGORIES)[number];

export type CollectionType = "wishlist" | "wardrobe";

export interface ColorSwatch {
  name: string;
  hex: string;
}

export interface PriceSnapshot {
  date: string;
  price: number;
  priceIls?: number;
  currency: string;
  note?: string;
}

export interface SartorialPiece {
  id: string;
  archiveCode: string;
  collection: CollectionType;
  title: string;
  brand: string;
  category: SartorialCategory;
  price: number;
  avgPriceIls?: number;
  israelPriceNote?: string;
  originalPrice?: number;
  targetPrice?: number;
  currency: string;
  sourceUrl?: string;
  storeName?: string;
  imageUrl: string;
  galleryImages?: string[];
  labels: string[];
  vibe: string;
  vibeDescription: string;
  colorPalette: ColorSwatch[];
  season: string;
  formality: string;
  pairingNotes: string;
  inStock: boolean;
  priority: "grail" | "high" | "standard";
  priceHistory: PriceSnapshot[];
  lastCheckedAt?: string;
  priceChangePct?: number;
  addedVia: "web_link" | "web_upload" | "grokbot" | "archive_seed";
  notes?: string;
  createdAt: string;
}

export type OutfitGenerationMode =
  | "anchor_piece"
  | "wishlist_daily"
  | "wardrobe_daily"
  | "hybrid_daily"
  | "custom_selection";

export interface DailyOutfit {
  id: string;
  lookNumber: string;
  title: string;
  subtitle: string;
  mode: OutfitGenerationMode;
  occasion: string;
  weather: string;
  pieceIds: string[];
  anchorPieceId?: string;
  editorialNote: string;
  scentPairingNote: string;
  stylistVerdict: string;
  vibeTags: string[];
  colorStory: ColorSwatch[];
  sunburstPrompt: string;
  imageModel: string;
  kieTaskId?: string;
  status: "generating" | "completed" | "failed";
  imageUrl?: string;
  errorMessage?: string;
  totalEstimateUsd: number;
  createdAt: string;
  createdVia: "web" | "grokbot" | "daily_cron";
}

export interface PriceItemUpdate {
  pieceId: string;
  title: string;
  brand: string;
  category: SartorialCategory;
  previousPrice: number;
  currentPrice: number;
  avgPriceIls?: number;
  changePct: number;
  status: "drop" | "increase" | "stable";
  inStock: boolean;
  verdict: string;
}

export interface DailyPriceReport {
  id: string;
  date: string;
  summaryHeadline: string;
  executiveBrief: string;
  checkedCount: number;
  priceDropsCount: number;
  priceIncreasesCount: number;
  totalWishlistValue: number;
  totalSavingsAvailable: number;
  itemUpdates: PriceItemUpdate[];
  recommendedLookId?: string;
  triggeredBy: "grokbot_cron" | "grokbot_command" | "manual_web";
  createdAt: string;
}

export interface GrokBotEvent {
  id: string;
  timestamp: string;
  type:
    | "link_ingest"
    | "wardrobe_upload"
    | "price_check"
    | "outfit_sunburst"
    | "grokbot_chat"
    | "mcp_call";
  actor:
    | "GrokBot"
    | "DeepSeek V4.1 Flash"
    | "KIE Sunburst 2.5"
    | "Railway Cron";
  title: string;
  detail: string;
  relatedId?: string;
}

export interface ArchiveLedgerState {
  pieces: SartorialPiece[];
  outfits: DailyOutfit[];
  reports: DailyPriceReport[];
  events: GrokBotEvent[];
  lastDailyCheckAt?: string;
}
