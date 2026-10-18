import * as cheerio from "cheerio";

export interface ScrapedPageData {
  url: string;
  domain: string;
  title?: string;
  description?: string;
  brand?: string;
  price?: number;
  currency?: string;
  originalPrice?: number;
  imageUrl?: string;
  galleryImages: string[];
  inStock: boolean;
  rawTextSnippet: string;
}

function resolveUrl(base: string, candidate?: string | null): string | undefined {
  if (!candidate) return undefined;
  const trimmed = candidate.trim();
  if (!trimmed || trimmed.startsWith("data:")) return undefined;
  try {
    return new URL(trimmed, base).toString();
  } catch {
    return undefined;
  }
}

function parsePriceNumber(raw?: string | number | null): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
  if (typeof raw !== "string") return undefined;
  const cleaned = raw.replace(/[^0-9.,]/g, "").trim();
  if (!cleaned) return undefined;
  // Handle 1,250.00 vs 1.250,00
  let normalized = cleaned;
  if (cleaned.includes(",") && cleaned.includes(".")) {
    if (cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = cleaned.replace(/,/g, "");
    }
  } else if (cleaned.includes(",")) {
    const parts = cleaned.split(",");
    if (parts[parts.length - 1].length === 2) {
      normalized = cleaned.replace(",", ".");
    } else {
      normalized = cleaned.replace(/,/g, "");
    }
  }
  const num = parseFloat(normalized);
  return Number.isFinite(num) && num > 0 ? num : undefined;
}

export async function scrapeProductUrl(targetUrl: string): Promise<ScrapedPageData> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    parsedUrl = new URL(`https://${targetUrl}`);
  }
  const url = parsedUrl.toString();
  const domain = parsedUrl.hostname.replace(/^www\./, "");

  let html = "";
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    clearTimeout(timer);
    if (res.ok) {
      html = await res.text();
    }
  } catch {
    // Fallback to Jina reader if direct fetch is blocked by anti-bot
  }

  let title: string | undefined;
  let description: string | undefined;
  let brand: string | undefined;
  let price: number | undefined;
  let originalPrice: number | undefined;
  let currency: string | undefined;
  let imageUrl: string | undefined;
  const galleryImages: string[] = [];
  let inStock = true;
  let rawTextSnippet = "";

  if (html) {
    const $ = cheerio.load(html);

    // 1. Parse JSON-LD Product schemas
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const rawJson = $(el).contents().text();
        if (!rawJson) return;
        const parsed = JSON.parse(rawJson);
        const nodes: any[] = Array.isArray(parsed)
          ? parsed
          : parsed["@graph"] && Array.isArray(parsed["@graph"])
            ? parsed["@graph"]
            : [parsed];

        for (const node of nodes) {
          const nodeType = String(node?.["@type"] || "").toLowerCase();
          if (nodeType.includes("product")) {
            if (!title && node.name) title = String(node.name).trim();
            if (!description && node.description) {
              description = String(node.description).trim();
            }
            if (!brand && node.brand) {
              brand =
                typeof node.brand === "string"
                  ? node.brand
                  : node.brand?.name || undefined;
            }
            const imgs = Array.isArray(node.image)
              ? node.image
              : node.image
                ? [node.image]
                : [];
            for (const img of imgs) {
              const imgStr = typeof img === "string" ? img : img?.url || img?.contentUrl;
              const resolved = resolveUrl(url, imgStr);
              if (resolved && !galleryImages.includes(resolved)) {
                galleryImages.push(resolved);
              }
            }
            const offers = Array.isArray(node.offers)
              ? node.offers[0]
              : node.offers;
            if (offers) {
              const p = parsePriceNumber(
                offers.price ?? offers.lowPrice ?? offers.highPrice
              );
              if (p && !price) price = p;
              if (offers.priceCurrency && !currency) {
                currency = String(offers.priceCurrency).toUpperCase();
              }
              if (
                typeof offers.availability === "string" &&
                offers.availability.toLowerCase().includes("outofstock")
              ) {
                inStock = false;
              }
            }
          }
        }
      } catch {
        // ignore malformed json-ld
      }
    });

    // 2. OpenGraph & Meta tags
    title =
      title ||
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="twitter:title"]').attr("content") ||
      $("title").first().text().trim() ||
      undefined;

    description =
      description ||
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      undefined;

    brand =
      brand ||
      $('meta[property="product:brand"]').attr("content") ||
      $('meta[property="og:brand"]').attr("content") ||
      $('meta[name="brand"]').attr("content") ||
      $('meta[property="og:site_name"]').attr("content") ||
      undefined;

    const metaPrice =
      $('meta[property="product:price:amount"]').attr("content") ||
      $('meta[property="og:price:amount"]').attr("content") ||
      $('[itemprop="price"]').attr("content") ||
      $('[itemprop="price"]').first().text();

    if (!price && metaPrice) {
      price = parsePriceNumber(metaPrice);
    }

    currency =
      currency ||
      $('meta[property="product:price:currency"]').attr("content") ||
      $('meta[property="og:price:currency"]').attr("content") ||
      $('[itemprop="priceCurrency"]').attr("content") ||
      undefined;

    const ogImages = [
      $('meta[property="og:image:secure_url"]').attr("content"),
      $('meta[property="og:image"]').attr("content"),
      $('meta[name="twitter:image"]').attr("content"),
      $('link[rel="image_src"]').attr("href"),
    ];
    for (const candidate of ogImages) {
      const resolved = resolveUrl(url, candidate);
      if (resolved && !galleryImages.includes(resolved)) {
        galleryImages.unshift(resolved);
      }
    }

    // 3. Scan prominent product images on page
    $("img").each((_, img) => {
      if (galleryImages.length >= 8) return;
      const src =
        $(img).attr("data-src") ||
        $(img).attr("data-zoom-image") ||
        $(img).attr("src");
      const alt = ($(img).attr("alt") || "").toLowerCase();
      if (!src) return;
      if (
        src.includes("logo") ||
        src.includes("icon") ||
        src.includes("sprite") ||
        src.endsWith(".svg") ||
        src.includes("1x1")
      ) {
        return;
      }
      const resolved = resolveUrl(url, src);
      if (resolved && !galleryImages.includes(resolved)) {
        if (title && alt && alt.length > 4) {
          galleryImages.push(resolved);
        } else if (galleryImages.length < 4) {
          galleryImages.push(resolved);
        }
      }
    });

    imageUrl = galleryImages[0];

    // 4. Clean visible text for DeepSeek V4.1 Flash
    $("script, style, noscript, svg, nav, footer").remove();
    rawTextSnippet = $("body")
      .text()
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 5000);

    // Try regex price extraction from visible text if still missing
    if (!price && rawTextSnippet) {
      const priceMatch = rawTextSnippet.match(
        /(?:\$|€|£|₪|USD|EUR|GBP|ILS)\s?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/i
      );
      if (priceMatch) {
        price = parsePriceNumber(priceMatch[1]);
        if (priceMatch[0].includes("€") || priceMatch[0].includes("EUR")) currency = "EUR";
        else if (priceMatch[0].includes("£") || priceMatch[0].includes("GBP")) currency = "GBP";
        else if (priceMatch[0].includes("₪") || priceMatch[0].includes("ILS")) currency = "NIS";
        else currency = currency || "USD";
      }
    }
  }

  // Fallback to Jina Reader if direct fetch returned very little or was blocked by Cloudflare
  if (!title || (!imageUrl && rawTextSnippet.length < 150)) {
    try {
      const jinaRes = await fetch(`https://r.jina.ai/${url}`, {
        headers: {
          Accept: "text/plain",
          "X-With-Images-Summary": "true",
        },
      });
      if (jinaRes.ok) {
        const jinaText = await jinaRes.text();
        rawTextSnippet = (rawTextSnippet + "\n" + jinaText).slice(0, 6500);
        if (!imageUrl) {
          const mdImgMatch = jinaText.match(/!\[.*?\]\((https?:\/\/[^\s)]+\.(?:jpg|jpeg|png|webp)[^\s)]*)\)/i);
          if (mdImgMatch?.[1]) {
            imageUrl = mdImgMatch[1];
            galleryImages.unshift(mdImgMatch[1]);
          }
        }
      }
    } catch {
      // ignore fallback error
    }
  }

  return {
    url,
    domain,
    title,
    description,
    brand,
    price,
    currency: currency || "USD",
    originalPrice,
    imageUrl,
    galleryImages: galleryImages.slice(0, 6),
    inStock,
    rawTextSnippet: rawTextSnippet || `URL: ${url} (Domain: ${domain})`,
  };
}
