import { NextResponse } from "next/server";
import {
  checkAndSyncOutfitStatus,
  loadLocalLedger,
  resetArchiveLedger,
} from "@/lib/store";
import { getKieCreditBalance } from "@/lib/kie";
import { getDeepSeekModel } from "@/lib/deepseek";
import { getRailwayBaseUrl, proxyToRailwayIfConfigured } from "@/lib/railway-proxy";

export const dynamic = "force-dynamic";

export async function DELETE() {
  const railwayRes = await proxyToRailwayIfConfigured("/api/ledger", {
    method: "DELETE",
  });
  const empty = resetArchiveLedger();
  return NextResponse.json(railwayRes || { ok: true, ...empty });
}

export async function GET() {
  const railwayData = await proxyToRailwayIfConfigured("/api/ledger");
  if (railwayData) {
    return NextResponse.json({
      ...railwayData,
      meta: {
        ...(railwayData.meta || {}),
        railwayUrl: getRailwayBaseUrl(),
        railwayConnected: true,
      },
    });
  }

  const state = loadLocalLedger();
  for (const outfit of state.outfits) {
    if (outfit.status === "generating" && outfit.kieTaskId) {
      await checkAndSyncOutfitStatus(outfit.id);
    }
  }
  const freshState = loadLocalLedger();
  const kieCredits = await getKieCreditBalance();

  return NextResponse.json({
    ...freshState,
    meta: {
      deepseekModel: getDeepSeekModel(),
      sunburstModel: "gpt-image-2-5-sunburst-text-to-image",
      kieCredits,
      cronSchedule: "0 9 * * * (Daily 09:00 UTC)",
      railwayUrl: getRailwayBaseUrl(),
      railwayConnected: Boolean(getRailwayBaseUrl()),
    },
  });
}
