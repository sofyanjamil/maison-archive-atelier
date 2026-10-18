import { rehostUrlOnKie } from "./kie";

export interface WebImageCandidate {
  murl: string;
  turl: string;
  title: string;
  purl?: string;
  rehostedUrl?: string;
}

export interface WebProductDiscoveryResult {
  primaryImageUrl?: string;
  galleryImages: string[];
  imageCandidates: WebImageCandidate[];
  israelSnippets: string[];
  detectedIlsPrices: number[];
}

/**
 * Searches Bing Images for real product photos and DuckDuckGo for Israeli market prices (₪ ILS / Zap / KSP / Super-Pharm).
 * The top candidates are rehosted onto KIE's CDN so image URLs never rot or break.
 */
export async function discoverProductImageAndIsraelPrice(
  query: string,
  categoryHint?: string
): Promise<WebProductDiscoveryResult> {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return {
      galleryImages: [],
      imageCandidates: [],
      israelSnippets: [],
      detectedIlsPrices: [],
    };
  }

  const imageSearchQuery =
    `${cleanQuery} ${categoryHint || ""} official product photo white background`.trim();
  const ilPriceQuery = `${cleanQuery} מחיר ש"ח OR ₪ זאפ KSP סופר פארם`;

  const [bingHtmlRes, ddgIlRes] = await Promise.allSettled([
    fetch(
      `https://www.bing.com/images/search?q=${encodeURIComponent(imageSearchQuery)}&form=HDRSC2`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
      }
    ).then((r) => r.text()),
    fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(ilPriceQuery)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8",
        },
      }
    ).then((r) => r.text()),
  ]);

  const imageCandidates: WebImageCandidate[] = [];
  if (bingHtmlRes.status === "fulfilled" && bingHtmlRes.value) {
    const html = bingHtmlRes.value;
    const itemMatches = [...html.matchAll(/m="([^"]+murl[^"]+)"/g)];
    for (const m of itemMatches.slice(0, 10)) {
      const decoded = m[1]
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&#39;/g, "'");
      try {
        const obj = JSON.parse(decoded);
        if (obj.turl || obj.murl) {
          // Upgrade Bing thumbnail to hi-res 800px so it never fails hotlinking
          const hiResThumb = obj.turl
            ? `${obj.turl}&w=800&h=800&c=7&rs=1&qlt=90`
            : obj.murl;
          imageCandidates.push({
            murl: obj.murl || hiResThumb,
            turl: hiResThumb || obj.murl,
            title: obj.t || cleanQuery,
            purl: obj.purl,
          });
        }
      } catch {
        // skip malformed match
      }
    }
  }

  const israelSnippets: string[] = [];
  const detectedIlsPrices: number[] = [];

  if (ddgIlRes.status === "fulfilled" && ddgIlRes.value) {
    const ddgHtml = ddgIlRes.value;
    const snippetMatches = [
      ...ddgHtml.matchAll(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g),
    ];
    for (const m of snippetMatches.slice(0, 8)) {
      const text = m[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&#x27;/g, "'")
        .replace(/\s+/g, " ")
        .trim();
      if (text) {
        israelSnippets.push(text);
        const priceMatches = [
          ...text.matchAll(
            /(?:₪|ש"ח|שח|ILS|NIS)\s*([0-9]{2,5}(?:,[0-9]{3})?)|([0-9]{2,5}(?:,[0-9]{3})?)\s*(?:₪|ש"ח|שח|ILS|NIS)/gi
          ),
        ];
        for (const pm of priceMatches) {
          const rawNum = (pm[1] || pm[2] || "").replace(/,/g, "");
          const val = Number(rawNum);
          if (val >= 30 && val <= 150000) {
            detectedIlsPrices.push(val);
          }
        }
      }
    }
  }

  // Rehost the top candidates onto KIE's CDN in parallel for permanence.
  const topCandidates = imageCandidates.slice(0, 5);
  await Promise.allSettled(
    topCandidates.map(async (cand) => {
      try {
        cand.rehostedUrl = await rehostUrlOnKie(cand.turl || cand.murl);
      } catch {
        cand.rehostedUrl = undefined;
      }
    })
  );

  const galleryImages: string[] = [];
  for (const cand of topCandidates) {
    const url = cand.rehostedUrl || cand.turl;
    if (url && !galleryImages.includes(url)) {
      galleryImages.push(url);
    }
  }

  let primaryImageUrl: string | undefined;
  if (topCandidates.length > 0) {
    primaryImageUrl = topCandidates[0].rehostedUrl || topCandidates[0].turl;
  }

  return {
    primaryImageUrl,
    galleryImages: galleryImages.slice(0, 8),
    imageCandidates: imageCandidates.slice(0, 8),
    israelSnippets,
    detectedIlsPrices,
  };
}
