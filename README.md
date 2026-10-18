# MAISON ARCHIVE (Edition 1974 / Digital)

**Vintage-Modern Sartorial Wishlist, Personal Wardrobe Ledger, DeepSeek V4.1 Flash (1017) Curator, KIE.AI GPT Image 2.5 Sunburst Flat-Lay Studio & GrokBot Railway Service.**

## Architecture

1. **Web App (Deployed on Vercel)**:
   - Built with Next.js 15 (App Router), React 19, Tailwind CSS, and **GSAP** smooth animations.
   - Supports all 9 sartorial departments: **Fragrances, Watches, Sunglasses, Wallets, Shirts, T-Shirts, Men's Apparel, Pants, Jackets**.
   - **Link Upload & DeepSeek V4.1 Flash (`deepseek/deepseek-v4.1-flash-1017`) Analysis**: Paste any product URL to extract its product image, price, brand, category, 6 sartorial labels, vintage vibe, chromatic palette, and pairing notes.
   - **Current Wardrobe Upload**: Upload photos or details of owned pieces; DeepSeek V4.1 Flash labels them and combines them with wishlist pieces.
   - **One-Click & Daily Outfit Generation (`gpt-image-2-5-sunburst-text-to-image` & `gpt-image-2-5-sunburst-image-to-image`)**: Click "Style Daily Outfit" on any piece or use the Daily Outfits Studio to generate a single cohesive **no-human overhead flat-lay photograph** of the combined pieces via KIE.AI GPT Image 2.5 Sunburst.

2. **Always-On Backend, Cron & GrokBot MCP Hub (Deployed on Railway)**:
   - Runs `server/railway-server.ts` (Hono + `node-cron` + Streamable HTTP MCP `/mcp` + REST API `/api/*`).
   - **Daily Price & Stock Audit Cron (`0 9 * * *`)**: Audits wishlist links daily, tracks price history, flags price drops, and generates DeepSeek V4.1 Flash executive market reports.
   - **GrokBot MCP Server (`/mcp`) & Webhook (`/api/grokbot/webhook`, `/api/grokbot/chat`)**: Full two-way integration with GrokBot.
