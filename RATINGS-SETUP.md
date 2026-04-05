# Recipe Ratings - Setup Guide

## What's Implemented
- **Grid Sort Toggle** - Cycles through Name, Level, Rank sorting (ascending/descending)
- **Share Recipe** - Copies recipe in Discord-formatted text with emojis
- **Toast Notifications** - Animated toast for user feedback
- **Recipe Rating System** - Star ratings with Cloudflare Worker backend + localStorage fallback

## How to Deploy the Ratings Backend

### Step 1: Install Wrangler (Cloudflare Worker CLI)
```bash
npm install -g wrangler
```

### Step 2: Login to Cloudflare
```bash
wrangler login
```

### Step 3: Create KV Namespace
```bash
wrangler kv namespace create "RECIPE_RATINGS"
```
Note: Use spaces not colons. The output will give you an `id` - copy that value.
This will give you a namespace ID. Note it down.

### Step 4: Create wrangler.toml
Create a file `Project/wrangler.toml`:
```toml
name = "recipe-ratings"
main = "recipe-ratings-worker.js"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "RECIPE_RATINGS"
id = "YOUR_NAMESPACE_ID_HERE"
```

### Step 5: Deploy
```bash
cd Project
wrangler deploy
```

### Step 6: Update Item.html
After deployment, note your Worker URL (e.g., `https://recipe-ratings.your-account.workers.dev`) and update the `RATINGS_API_URL` constant in `Item.html`:

```javascript
const RATINGS_API_URL = 'https://recipe-ratings.your-account.workers.dev';
```

### Step 7: Verify
Open your Items page, navigate to a recipe in the modal, and try rating a recipe. The rating should save and display.

## How It Works

### Without Worker (Fallback)
All ratings are stored in `localStorage` per-browser:
- Key format: `rating_base64encoded_recipe_ids`
- Format: `{"avg": 4.2, "count": 12}`

### With Worker (Recommended)
Ratings are stored in Cloudflare KV and shared across all users:
- `GET /?action=get&recipe=xxx` - Get rating for a recipe
- `POST /?action=submit&recipe=xxx` - Submit a rating (body: `{"score": 1-5}`)
- `POST /?action=batch` - Get ratings for multiple recipes at once

## Features Summary

### Grid Sort Toggle
- Located next to the item count display
- Cycles through: Name A→Z, Name Z→A, Level Low→High, Level High→Low, Rank Low→High, Rank High→Low
- Only appears in Grid View (table has clickable headers)

### Share Recipe (Discord Format)
Output format:
```
🔮 **Red Dragon Gown** (Rank 33)
🧪 Base: Flower / Grass / Gold

📋 **Recipe:**
1️⃣ Red Dragon Helm (Rank 30)
2️⃣ Flower Staff (Rank 28)
3️⃣ Gold Ring (Rank 27)

⚡ Gap: 3 ranks | 📖 Book 1

_Shared from Wonderland Online DB_
```

### Toast Notifications
- Appears at bottom center of screen
- Auto-dismisses after 3 seconds
- Smooth slide-in/slide-out animations