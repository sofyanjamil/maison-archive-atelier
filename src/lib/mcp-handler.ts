import {
  appendEvent,
  checkAndSyncOutfitStatus,
  deleteArchivePiece,
  executeDailyPriceCheck,
  generateDailyOutfit,
  handleGrokBotMessage,
  ingestPieceFromLink,
  ingestPieceFromUpload,
  loadLocalLedger,
  resetArchiveLedger,
  saveLocalLedger,
  updateArchivePiece,
} from "./store";

export const MCP_APP_RESOURCE_URI = "ui://maison-archive/app.html";

export const MCP_TOOLS = [
  {
    name: "archive_open_app",
    description:
      "Open the interactive Maison Archive web app inside GrokBot (Wishlist, Wardrobe, Daily Outfits & Price Reports).",
    inputSchema: {
      type: "object",
      properties: {
        tab: {
          type: "string",
          enum: ["wishlist", "wardrobe", "outfits", "grokbot"],
          description: "Initial tab to display",
        },
      },
    },
    _meta: {
      ui: {
        resourceUri: MCP_APP_RESOURCE_URI,
      },
    },
  },
  {
    name: "archive_list_pieces",
    description:
      "List pieces in Maison Archive (Wishlist or Current Wardrobe). Filter by collection ('wishlist' | 'wardrobe' | 'all') or category ('Fragrances', 'Watches', 'Sunglasses', 'Wallets', 'Shirts', 'T-Shirts', \"Men's Apparel\", 'Pants', 'Jackets').",
    inputSchema: {
      type: "object",
      properties: {
        collection: {
          type: "string",
          enum: ["wishlist", "wardrobe", "all"],
          description: "Filter by wishlist, wardrobe, or all",
        },
        category: {
          type: "string",
          description: "Optional category filter",
        },
      },
    },
  },
  {
    name: "archive_upload_link",
    description:
      "Upload a product link from GrokBot into the Wishlist or Current Wardrobe. Scrapes the product image and price, and runs DeepSeek V4.1 Flash (1017) to assign labels, vibe, and pairing notes.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Full HTTPS product URL to extract and analyze",
        },
        collection: {
          type: "string",
          enum: ["wishlist", "wardrobe"],
          description: "Target collection (default: wishlist)",
        },
        targetPrice: {
          type: "number",
          description: "Optional target alert price in USD",
        },
        notes: {
          type: "string",
          description: "Optional personal notes",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "archive_upload_piece",
    description:
      "Upload a piece (fragrance, watch, sunglasses, wallet, shirt, t-shirt, men's apparel, pants, jacket) by name/brand/image URL directly from GrokBot into Wishlist or Current Wardrobe, labeled by DeepSeek V4.1 Flash.",
    inputSchema: {
      type: "object",
      properties: {
        collection: {
          type: "string",
          enum: ["wishlist", "wardrobe"],
          description: "Target collection ('wishlist' or 'wardrobe')",
        },
        title: { type: "string", description: "Product title or description" },
        brand: { type: "string", description: "Brand or Maison name" },
        category: {
          type: "string",
          enum: [
            "Fragrances",
            "Watches",
            "Sunglasses",
            "Wallets",
            "Shirts",
            "T-Shirts",
            "Men's Apparel",
            "Pants",
            "Jackets",
          ],
        },
        price: { type: "number", description: "Price in USD" },
        imageUrl: { type: "string", description: "Optional product image URL" },
        notes: { type: "string", description: "Optional styling notes" },
      },
      required: ["collection", "title"],
    },
  },
  {
    name: "archive_run_daily_price_check",
    description:
      "Run a live daily price & availability check across all wishlist items and generate a DeepSeek V4.1 Flash Daily Price Report.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "archive_get_daily_reports",
    description:
      "Get the latest Daily Price Check Reports, price drops, and wishlist valuation summary.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Number of reports to return" },
      },
    },
  },
  {
    name: "archive_generate_daily_outfit",
    description:
      "Curate a Daily Outfit combining pieces from Wishlist and/or Current Wardrobe via DeepSeek V4.1 Flash and render a no-human overhead flat-lay photograph using KIE.AI GPT Image 2.5 Sunburst.",
    inputSchema: {
      type: "object",
      properties: {
        mode: {
          type: "string",
          enum: [
            "hybrid_daily",
            "wishlist_daily",
            "wardrobe_daily",
            "anchor_piece",
          ],
          description: "Outfit curation mode",
        },
        anchorPieceId: {
          type: "string",
          description: "Optional piece ID to build the outfit around",
        },
        occasion: {
          type: "string",
          description: "Occasion or setting for the outfit",
        },
        weather: {
          type: "string",
          description: "Weather condition",
        },
      },
    },
  },
  {
    name: "archive_check_outfit_image",
    description:
      "Check the KIE.AI GPT Image 2.5 Sunburst rendering status and retrieve the final flat-lay image URL for a generated outfit.",
    inputSchema: {
      type: "object",
      properties: {
        outfitId: { type: "string", description: "Outfit ID to check" },
      },
      required: ["outfitId"],
    },
  },
  {
    name: "archive_move_or_update_piece",
    description:
      "Move a piece between Wishlist and Current Wardrobe or update its price / targetPrice.",
    inputSchema: {
      type: "object",
      properties: {
        pieceId: { type: "string", description: "ID of the piece" },
        collection: {
          type: "string",
          enum: ["wishlist", "wardrobe"],
        },
        price: { type: "number" },
        targetPrice: { type: "number" },
      },
      required: ["pieceId"],
    },
  },
  {
    name: "archive_delete_piece",
    description: "Delete a piece from the Wishlist or Wardrobe by its ID.",
    inputSchema: {
      type: "object",
      properties: {
        pieceId: { type: "string", description: "ID of the piece to delete" },
      },
      required: ["pieceId"],
    },
  },
  {
    name: "archive_grokbot_ask",
    description:
      "Send any natural language command or question from GrokBot to the Maison Archive agent.",
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string", description: "Natural language command" },
      },
      required: ["message"],
    },
  },
];

export async function handleMcpJsonRpc(body: any): Promise<any> {
  const { id, method, params } = body || {};

  if (method === "initialize") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: { listChanged: false },
          resources: { listChanged: false },
          prompts: { listChanged: false },
        },
        serverInfo: {
          name: "maison-archive-grokbot-mcp",
          version: "1.1.0",
        },
      },
    };
  }

  if (method === "notifications/initialized") {
    return { jsonrpc: "2.0", id, result: {} };
  }

  if (method === "tools/list") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        tools: MCP_TOOLS,
      },
    };
  }

  if (method === "resources/list") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        resources: [
          {
            uri: MCP_APP_RESOURCE_URI,
            name: "Maison Archive Interactive App",
            mimeType: "text/html;profile=mcp-app",
            description:
              "Interactive Maison Archive web application embedded inside GrokBot.",
          },
          {
            uri: "archive://ledger/summary",
            name: "Maison Archive Ledger JSON",
            mimeType: "application/json",
            description:
              "Live snapshot of wishlist pieces, current wardrobe, daily price reports, and Sunburst 2.5 outfits.",
          },
        ],
      },
    };
  }

  if (method === "resources/read") {
    const uri = params?.uri || "archive://ledger/summary";
    if (uri === MCP_APP_RESOURCE_URI) {
      const appUrl =
        process.env.WEB_APP_URL || "https://maison-archive-atelier.vercel.app";
      const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #FAF7F0; overflow: hidden; }
  iframe { width: 100%; height: 100vh; border: 0; display: block; }
</style>
</head>
<body>
  <iframe src="${appUrl}?embed=grokbot" allow="clipboard-read; clipboard-write" title="Maison Archive"></iframe>
</body>
</html>`;
      return {
        jsonrpc: "2.0",
        id,
        result: {
          contents: [
            {
              uri: MCP_APP_RESOURCE_URI,
              mimeType: "text/html;profile=mcp-app",
              text: html,
            },
          ],
        },
      };
    }

    const state = loadLocalLedger();
    return {
      jsonrpc: "2.0",
      id,
      result: {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(state, null, 2),
          },
        ],
      },
    };
  }

  if (method === "tools/call") {
    const toolName = params?.name;
    const args = params?.arguments || {};
    const state = loadLocalLedger();

    try {
      let output: any;

      switch (toolName) {
        case "archive_open_app": {
          output = {
            appUrl: "https://maison-archive-atelier.vercel.app",
            tab: args.tab || "wishlist",
            buylistCount: state.pieces.filter((p) => p.collection === "wishlist").length,
            wardrobeCount: state.pieces.filter((p) => p.collection === "wardrobe").length,
            outfitsCount: state.outfits.length,
          };
          break;
        }
        case "archive_list_pieces": {
          let list = state.pieces;
          const col = args.collection === "buylist" ? "wishlist" : args.collection;
          if (col && col !== "all") {
            list = list.filter((p) => p.collection === col);
          }
          if (args.category) {
            list = list.filter(
              (p) => p.category.toLowerCase() === String(args.category).toLowerCase()
            );
          }
          output = {
            count: list.length,
            pieces: list,
          };
          break;
        }
        case "archive_upload_link": {
          const col = args.collection === "wardrobe" ? "wardrobe" : "wishlist";
          const piece = await ingestPieceFromLink({
            url: args.url,
            collection: col,
            targetPrice: args.targetPrice,
            notes: args.notes,
            addedVia: "grokbot",
          });
          output = { success: true, piece };
          break;
        }
        case "archive_upload_piece": {
          const col = args.collection === "wardrobe" ? "wardrobe" : "wishlist";
          const piece = await ingestPieceFromUpload({
            collection: col,
            title: args.title,
            brand: args.brand,
            category: args.category,
            price: args.price,
            imageUrl: args.imageUrl,
            notes: args.notes,
            addedVia: "grokbot",
          });
          output = { success: true, piece };
          break;
        }
        case "archive_run_daily_price_check": {
          const report = await executeDailyPriceCheck("grokbot_command");
          output = { success: true, report };
          break;
        }
        case "archive_get_daily_reports": {
          const limit = Number(args.limit) || 5;
          output = {
            lastDailyCheckAt: state.lastDailyCheckAt,
            reports: state.reports.slice(0, limit),
          };
          break;
        }
        case "archive_generate_daily_outfit": {
          const outfit = await generateDailyOutfit({
            mode: args.mode || "hybrid_daily",
            anchorPieceId: args.anchorPieceId,
            occasion: args.occasion,
            weather: args.weather,
            createdVia: "grokbot",
          });
          output = { success: true, outfit };
          break;
        }
        case "archive_check_outfit_image": {
          const outfit = await checkAndSyncOutfitStatus(args.outfitId);
          output = { success: Boolean(outfit), outfit };
          break;
        }
        case "archive_move_or_update_piece": {
          const updated = updateArchivePiece(args.pieceId, {
            ...(args.collection ? { collection: args.collection } : {}),
            ...(args.price !== undefined ? { price: args.price } : {}),
            ...(args.targetPrice !== undefined
              ? { targetPrice: args.targetPrice }
              : {}),
          });
          output = { success: Boolean(updated), piece: updated };
          break;
        }
        case "archive_delete_piece": {
          const deleted = deleteArchivePiece(args.pieceId);
          output = { success: deleted };
          break;
        }
        case "archive_clear_all": {
          resetArchiveLedger();
          output = { success: true };
          break;
        }
        case "archive_grokbot_ask": {
          output = await handleGrokBotMessage(args.message || "");
          break;
        }
        default:
          throw new Error(`Unknown MCP tool: ${toolName}`);
      }

      appendEvent(loadLocalLedger(), {
        type: "mcp_call",
        actor: "GrokBot",
        title: `GrokBot: ${toolName}`,
        detail: `Executed ${toolName}`,
      });
      saveLocalLedger(loadLocalLedger());

      return {
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(output, null, 2),
            },
          ],
          ...(toolName === "archive_open_app"
            ? {
                _meta: {
                  ui: {
                    resourceUri: MCP_APP_RESOURCE_URI,
                  },
                },
              }
            : {}),
        },
      };
    } catch (err: any) {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error executing ${toolName}: ${err?.message || String(err)}`,
            },
          ],
        },
      };
    }
  }

  return {
    jsonrpc: "2.0",
    id,
    error: {
      code: -32601,
      message: `Method not found: ${method}`,
    },
  };
}
