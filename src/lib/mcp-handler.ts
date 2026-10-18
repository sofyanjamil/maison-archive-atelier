import {
  appendEvent,
  checkAndSyncOutfitStatus,
  executeDailyPriceCheck,
  generateDailyOutfit,
  handleGrokBotMessage,
  ingestPieceFromLink,
  ingestPieceFromUpload,
  loadLocalLedger,
  saveLocalLedger,
  updateArchivePiece,
} from "./store";

export const MCP_TOOLS = [
  {
    name: "archive_list_pieces",
    description:
      "List pieces in Maison Archive (Wishlist or Current Wardrobe). Filter by collection ('wishlist' | 'wardrobe') or category ('Fragrances', 'Watches', 'Sunglasses', 'Wallets', 'Shirts', 'T-Shirts', \"Men's Apparel\", 'Pants', 'Jackets').",
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
      "Upload a product link from GrokBot into the Wishlist or Current Wardrobe. Automatically scrapes the product image and price, and runs DeepSeek V4.1 Flash (1017) to assign sartorial labels, vibe, and pairing notes.",
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
      "Run a live daily price & availability check across all wishlist items and generate a DeepSeek V4.1 Flash Daily Sartorial Market Report with price drops and buy alerts.",
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
      "Move a piece from Wishlist to Current Wardrobe (e.g., when purchased) or update its price / targetPrice.",
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
          version: "1.0.0",
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
            uri: "archive://ledger/summary",
            name: "Maison Archive Wishlist & Wardrobe Summary",
            mimeType: "application/json",
            description:
              "Live snapshot of wishlist pieces, current wardrobe, daily price reports, and Sunburst 2.5 outfits.",
          },
        ],
      },
    };
  }

  if (method === "resources/read") {
    const state = loadLocalLedger();
    return {
      jsonrpc: "2.0",
      id,
      result: {
        contents: [
          {
            uri: params?.uri || "archive://ledger/summary",
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
        case "archive_list_pieces": {
          let list = state.pieces;
          if (args.collection && args.collection !== "all") {
            list = list.filter((p) => p.collection === args.collection);
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
          const piece = await ingestPieceFromLink({
            url: args.url,
            collection: args.collection || "wishlist",
            targetPrice: args.targetPrice,
            notes: args.notes,
            addedVia: "grokbot",
          });
          output = { success: true, piece };
          break;
        }
        case "archive_upload_piece": {
          const piece = await ingestPieceFromUpload({
            collection: args.collection || "wishlist",
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
        title: `GrokBot MCP Tool: ${toolName}`,
        detail: `Executed ${toolName} via Model Context Protocol.`,
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
