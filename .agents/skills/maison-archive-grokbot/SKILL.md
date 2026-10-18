---
name: maison-archive-grokbot
description: Connect GrokBot to the Maison Archive Sartorial Wishlist, Personal Wardrobe, DeepSeek V4.1 Flash (1017) Curator, Daily Price Check Service on Railway, and KIE.AI GPT Image 2.5 Sunburst Flat-Lay Outfit Generator.
---

# Maison Archive — GrokBot Integration Skill

Use this skill whenever the user asks GrokBot to:
- Add a product link or piece (Fragrances, Watches, Sunglasses, Wallets, Shirts, T-Shirts, Men's Apparel, Pants, Jackets) to their **Wishlist** or **Current Wardrobe**
- Check daily price updates, price drops, or stock status across their wishlist
- Generate a **Daily Outfit** (Wishlist Daily Outfit, Wardrobe + Wishlist Hybrid, or Anchored around a specific piece) rendered as a no-human overhead flat-lay via **KIE.AI GPT Image 2.5 Sunburst (`gpt-image-2-5-sunburst-text-to-image`)**
- Query their wardrobe or wishlist labels, vibes, and pairings analyzed by **DeepSeek V4.1 Flash (`deepseek/deepseek-v4.1-flash-1017`)**

## MCP Server Endpoint (Streamable HTTP)

Connect GrokBot to the Railway MCP endpoint:
- **MCP URL:** `<RAILWAY_SERVICE_URL>/mcp`
- **Tools Available:**
  - `archive_upload_link` — Scrape a product URL, extract image & price, auto-label via DeepSeek V4.1 Flash, and save to `wishlist` or `wardrobe`
  - `archive_upload_piece` — Upload a piece by title/brand/category/price/imageUrl into `wishlist` or `wardrobe`
  - `archive_list_pieces` — List wishlist or wardrobe pieces filtered by category
  - `archive_run_daily_price_check` — Trigger a live daily price & availability sweep and generate a DeepSeek V4.1 Flash Daily Report
  - `archive_get_daily_reports` — Retrieve recent daily price reports and price drop alerts
  - `archive_generate_daily_outfit` — Curate a daily outfit via DeepSeek V4.1 Flash and start a KIE Sunburst 2.5 no-human flat-lay image generation
  - `archive_check_outfit_image` — Poll the KIE Sunburst 2.5 task and get the finished flat-lay image URL
  - `archive_move_or_update_piece` — Move a piece from wishlist to wardrobe or update its price/targetPrice
  - `archive_grokbot_ask` — Natural language command bridge
