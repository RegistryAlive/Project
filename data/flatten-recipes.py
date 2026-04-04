import json
import os

data_dir = os.path.dirname(os.path.abspath(__file__))
input_path = os.path.join(data_dir, 'wlo_yield_fixed_v10.json')
yields_path = os.path.join(data_dir, 'yields.json')

with open(input_path, 'r') as f:
    data = json.load(f)

with open(yields_path, 'r') as f:
    yields = json.load(f)

# Manual recipe overrides for items that don't exist as top-level in source JSON
MANUAL_RECIPES = {
    'Iron Material': {
        'item_id': 3255,
        'icon_id': 1587,
        'tool': 'Melting Furnace',
        'time': '2 minute',
        'image_path': 'data/images/material-7566.png',
        'ingredients': [
            {'qty': 2, 'name': 'Iron Ore'},
            {'qty': 2, 'name': 'Firewood'}
        ]
    },
    'Steel': {
        'item_id': 661,
        'icon_id': 1585,
        'tool': 'Hot Kiln',
        'time': '2 minute',
        'image_path': 'data/images/material-7567.png',
        'ingredients': [
            {'qty': 3, 'name': 'Iron Material'},
            {'qty': 2, 'name': 'Charcoal'},
            {'qty': 4, 'name': 'Firewood'}
        ]
    }
}

unique_items = {}
top_level_items = set()

def flatten_item(name, item, is_top_level=False):
    if is_top_level:
        top_level_items.add(name)
    
    if name in unique_items:
        return
    
    entry = {
        'name': name,
        'item_id': item.get('item_id'),
        'icon_id': item.get('icon_id'),
        'tool': item.get('tool', ''),
        'time': item.get('time', '0'),
        'image_path': item.get('image_path', ''),
        'image_id': item.get('image_id'),
        'yield': yields.get(name, 1),
        'ingredients': []
    }
    
    if 'ingredients' in item and item['ingredients']:
        for ing in item['ingredients']:
            if 'data' in ing:
                ing_data = ing['data']
                ing_name = ing_data['name']
                entry['ingredients'].append({
                    'qty': ing.get('qty', 1),
                    'name': ing_name
                })
                flatten_item(ing_name, ing_data)
    
    unique_items[name] = entry

# Pass 0: Inject manual recipes FIRST (before any source data processing)
for name, recipe in MANUAL_RECIPES.items():
    top_level_items.add(name)
    unique_items[name] = {
        'name': name,
        'item_id': recipe.get('item_id'),
        'icon_id': recipe.get('icon_id'),
        'tool': recipe.get('tool', ''),
        'time': recipe.get('time', '0'),
        'image_path': recipe.get('image_path', ''),
        'image_id': None,
        'yield': yields.get(name, 1),
        'ingredients': [{'qty': ing['qty'], 'name': ing['name']} for ing in recipe.get('ingredients', [])]
    }
    # Also process nested ingredients from manual recipes
    for ing in recipe.get('ingredients', []):
        # Find the ingredient's data from source JSON
        for src_item in data.values():
            if 'ingredients' in src_item:
                for src_ing in src_item['ingredients']:
                    if 'data' in src_ing and src_ing['data']['name'] == ing['name']:
                        flatten_item(ing['name'], src_ing['data'])
                        break

# Pass 1: Mark all top-level items with their correct data FIRST
for name, item in data.items():
    top_level_items.add(name)
    time_value = item.get('time', '0')
    img_path = item.get('image_path', '')
    unique_items[name] = {
        'name': name,
        'item_id': item.get('item_id'),
        'icon_id': item.get('icon_id'),
        'tool': item.get('tool', ''),
        'time': time_value,
        'image_path': img_path,
        'image_id': item.get('image_id'),
        'yield': yields.get(name, 1),
        'ingredients': []
    }

# Pass 2: Populate ingredients for all top-level items
for name, item in data.items():
    if 'ingredients' in item and item['ingredients']:
        for ing in item['ingredients']:
            if 'data' in ing:
                ing_data = ing['data']
                ing_name = ing_data['name']
                unique_items[name]['ingredients'].append({
                    'qty': ing.get('qty', 1),
                    'name': ing_name
                })
                if ing_name not in unique_items:
                    flatten_item(ing_name, ing_data)

# Pass 3: Collect any remaining nested items
def collect_missing_nested(item):
    if 'ingredients' in item and item['ingredients']:
        for ing in item['ingredients']:
            if 'data' in ing:
                ing_name = ing['data']['name']
                if ing_name not in unique_items:
                    flatten_item(ing_name, ing['data'])
                collect_missing_nested(ing['data'])

for item in data.values():
    collect_missing_nested(item)

# Build output
output = {
    'topLevelItems': sorted(list(top_level_items)),
    'items': unique_items
}

output_path = os.path.join(data_dir, 'wlo_recipes_flat.json')
with open(output_path, 'w') as f:
    json.dump(output, f, separators=(',', ':'))

original_size = os.path.getsize(input_path) / 1024 / 1024
new_size = os.path.getsize(output_path) / 1024 / 1024

print(f'Original: {original_size:.2f} MB')
print(f'Flattened: {new_size:.2f} MB')
print(f'Reduction: {((1 - new_size/original_size) * 100):.1f}%')
print(f'Unique items: {len(unique_items)}')
print(f'Top-level items: {len(top_level_items)}')

# Verify
for name in ['Iron Material', 'Steel', 'Nail', 'Special Nail', 'Medium Wooden Gear']:
    if name in unique_items:
        item = unique_items[name]
        print(f'\n{name} (yield={item["yield"]}):')
        print(f'  time: {item["time"]}')
        print(f'  ingredients:')
        for ing in item['ingredients']:
            print(f'    qty: {ing["qty"]}, name: {ing["name"]}')
