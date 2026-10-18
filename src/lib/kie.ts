const KIE_BASE_URL = "https://api.kie.ai";
const KIE_UPLOAD_HOST = "https://kieai.redpandaai.co";

function getKieApiKey(): string {
  const key = process.env.KIE_API_KEY;
  if (!key) {
    throw new Error("KIE_API_KEY environment variable is not configured");
  }
  return key;
}

export interface KieCreateTaskResult {
  taskId: string;
  model: string;
}

export interface KieTaskStatusResult {
  taskId: string;
  state: "waiting" | "queuing" | "generating" | "success" | "fail";
  imageUrl?: string;
  resultUrls?: string[];
  failMsg?: string;
  costTime?: number;
  creditsConsumed?: number;
}

/**
 * Upload a base64 or data URL image to KIE's temporary CDN (https://kieai.redpandaai.co)
 * so it can be used as a public HTTPS URL or reference input for Sunburst Image-to-Image.
 */
export async function uploadBase64ToKie(
  base64Data: string,
  fileName = "wardrobe-piece.png"
): Promise<string> {
  const apiKey = getKieApiKey();
  const res = await fetch(`${KIE_UPLOAD_HOST}/api/file-base64-upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      base64Data,
      uploadPath: "images/maison-archive",
      fileName,
    }),
  });
  const json = await res.json();
  if (json.code !== 200 || !json.data?.downloadUrl) {
    throw new Error(json.msg || "Failed to upload image to KIE storage");
  }
  return json.data.downloadUrl as string;
}

/**
 * Rehost an external public URL onto KIE's CDN for reliable image-to-image reference input.
 */
export async function rehostUrlOnKie(fileUrl: string): Promise<string> {
  const apiKey = getKieApiKey();
  const res = await fetch(`${KIE_UPLOAD_HOST}/api/file-url-upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileUrl,
      uploadPath: "images/maison-archive-refs",
    }),
  });
  const json = await res.json();
  if (json.code !== 200 || !json.data?.downloadUrl) {
    return fileUrl;
  }
  return json.data.downloadUrl as string;
}

/**
 * Start a KIE GPT Image 2.5 Sunburst (or Flare) generation task.
 * Supports:
 * - gpt-image-2-5-sunburst-text-to-image (default high-quality 2.5 Sunburst)
 * - gpt-image-2-5-sunburst-image-to-image (reference image combination)
 * - gpt-image-2-5-flare-text-to-image (fast 2.5 Flare)
 */
export async function createSunburstOutfitTask(options: {
  prompt: string;
  model?: string;
  referenceImageUrls?: string[];
  aspectRatio?: "4:3" | "1:1" | "3:4" | "16:9" | "auto";
  resolution?: "1K" | "2K" | "4K";
}): Promise<KieCreateTaskResult> {
  const apiKey = getKieApiKey();
  const hasRefs =
    Array.isArray(options.referenceImageUrls) &&
    options.referenceImageUrls.length > 0;

  let chosenModel =
    options.model ||
    process.env.KIE_IMAGE_MODEL ||
    "gpt-image-2-5-sunburst-text-to-image";

  if (hasRefs && chosenModel === "gpt-image-2-5-sunburst-text-to-image") {
    // Only switch to image-to-image if caller explicitly chose image-to-image
  }

  const isImageToImage = chosenModel.includes("image-to-image");
  const resolution = options.resolution || "1K";
  const aspectRatio = options.aspectRatio || "4:3";

  const inputPayload: Record<string, any> = {
    prompt: options.prompt,
    aspect_ratio: aspectRatio,
    resolution,
  };

  if (resolution === "1K") {
    inputPayload.background = "opaque";
  }

  if (isImageToImage && hasRefs) {
    inputPayload.input_urls = options.referenceImageUrls!.slice(0, 8);
  }

  const res = await fetch(`${KIE_BASE_URL}/api/v1/jobs/createTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: chosenModel,
      input: inputPayload,
    }),
  });

  const json = await res.json();
  if (json.code !== 200 || !json.data?.taskId) {
    throw new Error(
      `KIE Sunburst createTask error (${json.code}): ${json.msg || "Unknown error"}`
    );
  }

  return {
    taskId: json.data.taskId as string,
    model: chosenModel,
  };
}

/**
 * Poll a KIE task status via GET /api/v1/jobs/recordInfo?taskId=...
 */
export async function getKieTaskStatus(
  taskId: string
): Promise<KieTaskStatusResult> {
  const apiKey = getKieApiKey();
  const res = await fetch(
    `${KIE_BASE_URL}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    }
  );

  const json = await res.json();
  if (json.code !== 200 || !json.data) {
    throw new Error(
      `KIE recordInfo error (${json.code}): ${json.msg || "Unable to fetch task"}`
    );
  }

  const data = json.data;
  const state = (data.state || "generating") as KieTaskStatusResult["state"];
  let resultUrls: string[] = [];

  if (Array.isArray(data.response?.resultUrls)) {
    resultUrls = data.response.resultUrls;
  } else if (typeof data.resultJson === "string" && data.resultJson.trim()) {
    try {
      const parsed = JSON.parse(data.resultJson);
      if (Array.isArray(parsed?.resultUrls)) {
        resultUrls = parsed.resultUrls;
      }
    } catch {
      // ignore parse error
    }
  }

  return {
    taskId,
    state,
    imageUrl: resultUrls[0],
    resultUrls,
    failMsg: data.failMsg || undefined,
    costTime: data.costTime ?? undefined,
    creditsConsumed: data.creditsConsumed ?? undefined,
  };
}

/**
 * Check KIE account credit balance
 */
export async function getKieCreditBalance(): Promise<number | null> {
  try {
    const apiKey = getKieApiKey();
    const res = await fetch(`${KIE_BASE_URL}/api/v1/chat/credit`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    });
    const json = await res.json();
    if (json.code === 200 && typeof json.data === "number") {
      return json.data;
    }
    return null;
  } catch {
    return null;
  }
}
