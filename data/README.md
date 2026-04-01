# Wonderland Online Items Database

This directory contains the JSON-based items database for the Wonderland Online website.

## Directory Structure

```
data/
├── items-index.json          # Master index with all item metadata
├── items/                    # Individual item files
│   ├── weapon-1.json
│   ├── armor-3.json
│   ├── consumable-4.json
│   ├── material-2.json
│   └── quest-8.json
└── images/                   # Item images (to be added)
    ├── weapons/
    ├── armor/
    ├── consumables/
    ├── materials/
    └── quest/
```

## How to Add a New Item

### Step 1: Create the Item JSON File

Create a new file in the `data/items/` directory with the naming convention: `{type}-{id}.json`

Example: `data/items/weapon-21.json`

### Step 2: Add Item Data

Copy this template and fill in the details:

```json
{
  "id": 21,
  "name": "Item Name",
  "type": "weapon",
  "subtype": "Sword",
  "rarity": "rare",
  "level": 25,
  "rank": 12,
  "bases": ["Iron", "Steel"],
  "value": 5000,
  "source": "Monster Drop",
  "description": "Item description here.",
  "stats": {
    "attack": 100,
    "strength": 10
  },
  "image": "data/images/weapons/item-name.png",
  "recipes": [],
  "drops": [],
  "shops": []
}
```

### Step 3: Update the Master Index

Open `data/items-index.json` and add the item metadata to the `items` array:

```json
{
  "id": 21,
  "name": "Item Name",
  "type": "weapon",
  "subtype": "Sword",
  "rarity": "rare",
  "level": 25,
  "rank": 12,
  "bases": ["Iron", "Steel"],
  "value": 5000,
  "source": "Monster Drop",
  "file": "weapon-21.json"
}
```

### Step 4: Update Category Counts

Update the `categories` object in `items-index.json`:

```json
"categories": {
  "weapon": 801,  // Increment this
  "armor": 600,
  "consumable": 500,
  "material": 400,
  "quest": 200
}
```

### Step 5: Update Total Items

Update the `totalItems` field in `items-index.json`:

```json
"totalItems": 2501  // Increment this
```

## Item Schema Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | number | Yes | Unique item ID |
| `name` | string | Yes | Item name |
| `type` | string | Yes | Item type: `weapon`, `armor`, `consumable`, `material`, `quest` |
| `subtype` | string | Yes | Item subtype (e.g., "Sword", "Potion") |
| `rarity` | string | Yes | Rarity: `common`, `uncommon`, `rare`, `epic`, `legendary` |
| `level` | number | Yes | Item level requirement |
| `rank` | number | Yes | Calculated as `level / 2` |
| `bases` | array | Yes | Array of base materials (up to 5) |
| `value` | number | Yes | Item value in gold |
| `source` | string | Yes | Where the item can be obtained |
| `description` | string | Yes | Item description |
| `stats` | object | Yes | Item stats (can be empty) |
| `image` | string | Yes | Path to item image |
| `recipes` | array | No | Crafting recipes that use this item |
| `drops` | array | No | Monsters that drop this item |
| `shops` | array | No | Shops that sell this item |

## Item Types

- **weapon**: Swords, bows, staffs, daggers, etc.
- **armor**: Chest pieces, helmets, boots, shields, etc.
- **consumable**: Potions, elixirs, food, etc.
- **material**: Crafting materials, ores, herbs, etc.
- **quest**: Quest items, keys, special items

## Rarity Levels

- **common**: White color, basic items
- **uncommon**: Green color, slightly better items
- **rare**: Blue color, good items
- **epic**: Purple color, excellent items
- **legendary**: Gold/orange color, best items

## Base Materials

Items can have up to 5 base materials. Examples:
- Metals: Iron, Steel, Titanium, Mithril, Adamantine
- Organic: Leather, Wood, Herbs, Dragon Scale, Phoenix Feather
- Magical: Crystal, Mana Essence, Arcane Crystal, Holy Water
- Special: Shadow Silk, Elven Silk, Obsidian, Jade

## Tips

1. **Always use unique IDs** - Never reuse an existing item ID
2. **Keep the index updated** - The index must always match the actual item files
3. **Use consistent naming** - Follow the `{type}-{id}.json` naming convention
4. **Test your changes** - Open Item.html in a browser to verify the item appears correctly
5. **Backup before editing** - Keep a backup of your JSON files before making changes

## Performance Notes

- The system uses lazy loading, so only items displayed on the current page are loaded
- The index file is loaded once at startup and contains all item metadata
- Individual item files are loaded on-demand and cached in the browser
- This system can handle 2000+ items efficiently

## Troubleshooting

**Item not appearing:**
- Check that the item is in the `items-index.json` file
- Verify the `file` field in the index matches the actual filename
- Check the browser console for errors

**Images not loading:**
- Verify the image path is correct
- Make sure the image file exists in the correct directory
- Check file permissions

**Filtering not working:**
- Ensure all required fields are filled in the index
- Check that the `type` and `rarity` values match the allowed values
