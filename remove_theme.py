import re
import os

files = [
    'Resources.html', 'shops.html', 'tier-list.html', 'Locations.html',
    'quests.html', 'manufacture.html', 'roadmap.html', 'index.html',
    'monsters.html', 'Item.html'
]

for filename in files:
    filepath = os.path.join(r'C:\Users\cloud\Downloads\Steam\WLO\Ress\Project', filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # 1. Remove CSS: /* Theme Toggle */ + .theme-toggle, .theme-toggle-ball, .theme-toggle.light CSS
    content = re.sub(
        r'\s*/\*\s*Theme\s+Toggle\s*\*/\s*'
        r'\.theme-toggle\s*\{[^}]*\}\s*'
        r'\.theme-toggle-ball\s*\{[^}]*\}\s*'
        r'\.theme-toggle\.light\s+\.theme-toggle-ball\s*\{[^}]*\}',
        '', content, flags=re.DOTALL
    )
    
    # 2. Remove /* Light mode styles - pastel theme */ comment
    content = re.sub(
        r'\n\s*/\*\s*Light mode styles\s*[-–—]?\s*pastel theme\s*\*/',
        '', content
    )
    
    # 3. Remove all body.light-mode CSS rules (multi-property)
    content = re.sub(
        r'\n\s*body\.light-mode\s+[^{]*?\{[^}]*\}',
        '', content, flags=re.DOTALL
    )
    
    # 4. Remove any remaining .light-mode CSS rules
    content = re.sub(
        r'\n\s*\.[a-zA-Z0-9_-]*light-mode[a-zA-Z0-9_-]*\s*\{[^}]*\}',
        '', content, flags=re.DOTALL
    )
    
    # 5. Remove HTML: theme toggle element
    content = re.sub(
        r'\s*<!--\s*Theme\s+Toggle\s*-->\s*'
        r'<div\s+class="theme-toggle"[^>]*>\s*'
        r'<div\s+class="theme-toggle-ball">\s*'
        r'<i\s+class="fas\s+fa-moon[^"]*"[^>]*>\s*</i>\s*'
        r'</div>\s*'
        r'</div>',
        '', content, flags=re.DOTALL
    )
    
    # 6. Remove JavaScript: theme toggle script blocks
    content = re.sub(
        r'<script>\s*'
        r'//\s*Theme\s+Toggle\s*'
        r'\s*const\s+themeToggle\s*=\s*document\.getElementById\([\'"]themeToggle[\'"]\)\s*;'
        r'\s*const\s+body\s*=\s*document\.body\s*;'
        r'.*?'
        r'\}\s*\)\s*;'
        r'\s*</script>',
        '', content, flags=re.DOTALL
    )
    
    # 7. Clean up multiple blank lines
    content = re.sub(r'\n{4,}', '\n\n', content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Modified: {filename}")
    else:
        print(f"No changes: {filename}")
