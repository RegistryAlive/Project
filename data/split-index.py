import json
import os

data_dir = os.path.dirname(os.path.abspath(__file__))
index_path = os.path.join(data_dir, 'items-index.json')

with open(index_path, 'r') as f:
    data = json.load(f)

# Group items by category, infer missing from filename
categories = {}
for item in data['items']:
    cat = item.get('category')
    if not cat:
        # Infer from filename pattern (e.g., "tool-9000.json" → "tool")
        fname = item.get('file', '')
        prefix = fname.split('-')[0] if '-' in fname else 'other'
        cat = prefix
        item['category'] = cat
    
    if cat not in categories:
        categories[cat] = []
    categories[cat].append(item)

# Write category index files
manifest = {'totalItems': data['totalItems'], 'categories': {}}

for cat, items in sorted(categories.items()):
    cat_file = f'items-index-{cat}.json'
    cat_data = {
        'category': cat,
        'count': len(items),
        'items': items
    }
    cat_path = os.path.join(data_dir, cat_file)
    with open(cat_path, 'w') as f:
        json.dump(cat_data, f, separators=(',', ':'))
    
    size_kb = os.path.getsize(cat_path) / 1024
    manifest['categories'][cat] = {
        'count': len(items),
        'file': cat_file,
        'sizeKB': round(size_kb, 1)
    }
    print(f'  {cat}: {len(items)} items ({size_kb:.1f} KB)')

# Write manifest (small file that replaces the full index)
manifest_path = os.path.join(data_dir, 'items-manifest.json')
with open(manifest_path, 'w') as f:
    json.dump(manifest, f, separators=(',', ':'))

manifest_size = os.path.getsize(manifest_path) / 1024
print(f'\nManifest: {manifest_size:.1f} KB')
print(f'Original: {os.path.getsize(index_path) / 1024:.1f} KB')
print(f'Total split: {sum(c["sizeKB"] for c in manifest["categories"].values()):.1f} KB')
print('Done.')
