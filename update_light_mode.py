import re, os

page_css = {
    'quests.html': '''
        /* Light mode: Quests page specific */
        body.light-mode #newQuestModal {
            background-color: rgba(240, 230, 246, 0.9) !important;
        }
        body.light-mode #newQuestModal > div {
            background-color: #f5f0fa !important;
            color: #2d1b4e !important;
        }
        body.light-mode #newQuestModal input,
        body.light-mode #newQuestModal textarea,
        body.light-mode #newQuestModal select {
            background-color: #e8ddf0 !important;
            color: #2d1b4e !important;
            border-color: #d4c4e2 !important;
        }
        body.light-mode #newQuestModal label {
            color: #2d1b4e !important;
        }
        body.light-mode .quest-card {
            background-color: #e8ddf0 !important;
            border-color: #d4c4e2 !important;
        }
        body.light-mode .quest-card h4,
        body.light-mode .quest-card .font-semibold {
            color: #2d1b4e !important;
        }
        body.light-mode .quest-card p,
        body.light-mode .quest-card .text-wlLight {
            color: #6b5b7b !important;
        }
        body.light-mode .quest-card .bg-wlDark {
            background-color: #e8ddf0 !important;
        }
    ''',
    'monsters.html': '''
        /* Light mode: Monsters page specific */
        body.light-mode .filter-select {
            background-color: #e8ddf0 !important;
            color: #2d1b4e !important;
            border-color: #d4c4e2 !important;
        }
        body.light-mode .filter-select option {
            background-color: #f5f0fa !important;
            color: #2d1b4e !important;
        }
        body.light-mode .level-filter-container {
            background: linear-gradient(135deg, rgba(232,221,240,0.9), rgba(245,240,250,0.9)) !important;
            border-color: #d4c4e2 !important;
        }
        body.light-mode .level-filter-label {
            color: #2d1b4e !important;
        }
        body.light-mode .level-range-display {
            background: rgba(139, 92, 246, 0.15) !important;
            color: #8b5cf6 !important;
        }
        body.light-mode .level-quick-btn {
            background: rgba(139, 92, 246, 0.1) !important;
            color: #2d1b4e !important;
            border-color: rgba(139, 92, 246, 0.3) !important;
        }
        body.light-mode .level-quick-btn:hover,
        body.light-mode .level-quick-btn.active {
            background: linear-gradient(135deg, #8b5cf6, #3b82f6) !important;
            color: white !important;
        }
        body.light-mode #monsterModal,
        body.light-mode .modal-overlay {
            background-color: rgba(240, 230, 246, 0.9) !important;
        }
        body.light-mode .modal-content {
            background-color: #f5f0fa !important;
            color: #2d1b4e !important;
        }
        body.light-mode .monster-card,
        body.light-mode .card-hover {
            background-color: #e8ddf0 !important;
            border-color: #d4c4e2 !important;
        }
        body.light-mode .monster-card h4,
        body.light-mode .monster-card .font-medium {
            color: #2d1b4e !important;
        }
        body.light-mode .monster-card .text-wlLight {
            color: #6b5b7b !important;
        }
        body.light-mode #sortMonstersDropdown {
            background-color: #f5f0fa !important;
            border-color: #d4c4e2 !important;
        }
        body.light-mode #sortMonstersDropdown a {
            color: #2d1b4e !important;
        }
        body.light-mode #sortMonstersDropdown a:hover {
            background-color: rgba(139, 92, 246, 0.1) !important;
        }
        body.light-mode #sortMonstersButton {
            background-color: #e8ddf0 !important;
            color: #2d1b4e !important;
            border-color: #d4c4e2 !important;
        }
        body.light-mode .search-input {
            background-color: #e8ddf0 !important;
            color: #2d1b4e !important;
            border-color: #d4c4e2 !important;
        }
        body.light-mode .slider-track {
            background: rgba(100, 116, 139, 0.2) !important;
        }
        body.light-mode .slider-labels {
            color: rgba(45, 27, 78, 0.5) !important;
        }
    ''',
    'Locations.html': '''
        /* Light mode: Locations page specific */
        body.light-mode .location-card {
            background-color: #e8ddf0 !important;
            border-color: #d4c4e2 !important;
        }
        body.light-mode .location-card h4 {
            color: #2d1b4e !important;
        }
        body.light-mode .location-card p {
            color: #5a4a6a !important;
        }
        body.light-mode .location-card .text-wlLight {
            color: #6b5b7b !important;
        }
        body.light-mode #locationModal,
        body.light-mode .modal-overlay {
            background-color: rgba(240, 230, 246, 0.9) !important;
        }
        body.light-mode .modal-content {
            background-color: #f5f0fa !important;
            color: #2d1b4e !important;
        }
        body.light-mode .location-filter-btn {
            background-color: #e8ddf0 !important;
            color: #2d1b4e !important;
            border-color: #d4c4e2 !important;
        }
        body.light-mode .location-filter-btn:hover,
        body.light-mode .location-filter-btn.active {
            background: linear-gradient(135deg, #8b5cf6, #3b82f6) !important;
            color: white !important;
        }
        body.light-mode .search-input {
            background-color: #e8ddf0 !important;
            color: #2d1b4e !important;
            border-color: #d4c4e2 !important;
        }
        body.light-mode .bg-wlDark.bg-opacity-70 {
            background-color: #e8ddf0 !important;
        }
    ''',
    'tier-list.html': '''
        /* Light mode: Tier List page specific */
        body.light-mode .tier-row {
            background-color: #e8ddf0 !important;
        }
        body.light-mode .tier-label {
            color: #2d1b4e !important;
        }
        body.light-mode .character-card {
            background-color: #f5f0fa !important;
            border-color: #d4c4e2 !important;
        }
        body.light-mode .character-card h4 {
            color: #2d1b4e !important;
        }
        body.light-mode .character-card .text-wlLight {
            color: #6b5b7b !important;
        }
        body.light-mode #filterPanel {
            background-color: #e8ddf0 !important;
            border-color: #d4c4e2 !important;
        }
        body.light-mode .filter-btn {
            background-color: #e8ddf0 !important;
            color: #2d1b4e !important;
            border-color: #d4c4e2 !important;
        }
        body.light-mode .filter-btn:hover,
        body.light-mode .filter-btn.active {
            background: linear-gradient(135deg, #8b5cf6, #3b82f6) !important;
            color: white !important;
        }
        body.light-mode #filterToggleBtn {
            background-color: #e8ddf0 !important;
            color: #2d1b4e !important;
            border-color: #d4c4e2 !important;
        }
        body.light-mode .modal-content {
            background-color: #f5f0fa !important;
            color: #2d1b4e !important;
        }
        body.light-mode .view-toggle-btn {
            background-color: #e8ddf0 !important;
            color: #2d1b4e !important;
            border-color: #d4c4e2 !important;
        }
        body.light-mode .view-toggle-btn.active {
            background: linear-gradient(135deg, #8b5cf6, #3b82f6) !important;
            color: white !important;
        }
        body.light-mode .mini-detail {
            background-color: #f5f0fa !important;
            color: #2d1b4e !important;
            border-color: #d4c4e2 !important;
        }
        body.light-mode .quest-card {
            background-color: #e8ddf0 !important;
            border-color: #d4c4e2 !important;
        }
        body.light-mode .quest-section {
            background-color: #e8ddf0 !important;
            border-color: #d4c4e2 !important;
        }
        body.light-mode .quest-section-header {
            background-color: rgba(139, 92, 246, 0.1) !important;
        }
        body.light-mode .quest-section-header:hover {
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15)) !important;
        }
        body.light-mode .prequest-character-header {
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1)) !important;
            border-color: rgba(59, 130, 246, 0.3) !important;
        }
        body.light-mode .prequest-quest-card {
            background-color: #e8ddf0 !important;
            border-color: #d4c4e2 !important;
        }
        body.light-mode .quest-checklist-header {
            background-color: rgba(16, 185, 129, 0.1) !important;
            border-color: rgba(16, 185, 129, 0.3) !important;
        }
        body.light-mode .quest-check-item {
            background-color: rgba(245, 240, 250, 0.5) !important;
        }
        body.light-mode .quest-check-item.completed {
            background-color: rgba(16, 185, 129, 0.1) !important;
        }
        body.light-mode .prequest-checklist-group {
            background-color: rgba(139, 92, 246, 0.05) !important;
            border-color: rgba(139, 92, 246, 0.15) !important;
        }
        body.light-mode .prequest-checklist-group-header {
            background-color: rgba(139, 92, 246, 0.1) !important;
        }
        body.light-mode .quest-fight-section {
            border-top-color: rgba(239, 68, 68, 0.2) !important;
        }
        body.light-mode .recommended-stats-section {
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(59, 130, 246, 0.05)) !important;
            border-color: rgba(16, 185, 129, 0.2) !important;
        }
        body.light-mode .recommended-stats-value {
            background-color: rgba(0, 0, 0, 0.05) !important;
            color: #2d1b4e !important;
        }
        body.light-mode .rebirth-section {
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(239, 68, 68, 0.05)) !important;
            border-color: rgba(245, 158, 11, 0.2) !important;
        }
        body.light-mode .rebirth-stat {
            background-color: rgba(0, 0, 0, 0.05) !important;
            color: #2d1b4e !important;
        }
        body.light-mode .info-box {
            background-color: rgba(0, 0, 0, 0.03) !important;
            border-color: rgba(0, 0, 0, 0.08) !important;
        }
        body.light-mode .skill-card {
            background-color: rgba(0, 0, 0, 0.03) !important;
        }
        body.light-mode .modal-character-image {
            background: linear-gradient(135deg, #e8ddf0, #f5f0fa) !important;
        }
        body.light-mode .rebirth-toggle-btn {
            background-color: #e8ddf0 !important;
            color: #2d1b4e !important;
            border-color: #d4c4e2 !important;
        }
        body.light-mode .rebirth-single-toggle {
            background-color: #e8ddf0 !important;
            color: #2d1b4e !important;
            border-color: #d4c4e2 !important;
        }
        body.light-mode .quest-lightbox {
            background-color: rgba(240, 230, 246, 0.95) !important;
        }
        body.light-mode .tier-badge {
            box-shadow: 0 0 20px rgba(139, 92, 246, 0.3) !important;
        }
        body.light-mode .click-hint {
            color: rgba(45, 27, 78, 0.4) !important;
        }
        body.light-mode .full-card-view .card-footer {
            background-color: rgba(0, 0, 0, 0.05) !important;
        }
    ''',
    'index.html': '''
        /* Light mode: Index/Home page specific */
        body.light-mode .hero-section {
            background-color: #e8ddf0 !important;
        }
        body.light-mode .feature-card {
            background-color: #e8ddf0 !important;
            border-color: #d4c4e2 !important;
        }
        body.light-mode .feature-card h4 {
            color: #2d1b4e !important;
        }
        body.light-mode .feature-card p {
            color: #5a4a6a !important;
        }
    ''',
    'roadmap.html': '''
        /* Light mode: Roadmap page specific */
        body.light-mode .roadmap-card {
            background-color: #e8ddf0 !important;
            border-color: #d4c4e2 !important;
        }
        body.light-mode .roadmap-card h4 {
            color: #2d1b4e !important;
        }
        body.light-mode .roadmap-card p {
            color: #5a4a6a !important;
        }
    ''',
    'shops.html': '''
        /* Light mode: Shops page specific */
        body.light-mode .shop-card {
            background-color: #e8ddf0 !important;
            border-color: #d4c4e2 !important;
        }
        body.light-mode .shop-card h4 {
            color: #2d1b4e !important;
        }
        body.light-mode .shop-card p {
            color: #5a4a6a !important;
        }
        body.light-mode .shop-card .text-wlLight {
            color: #6b5b7b !important;
        }
        body.light-mode #shopModal,
        body.light-mode .modal-overlay {
            background-color: rgba(240, 230, 246, 0.9) !important;
        }
        body.light-mode .modal-content {
            background-color: #f5f0fa !important;
            color: #2d1b4e !important;
        }
    ''',
    'Resources.html': '''
        /* Light mode: Resources page specific */
        body.light-mode .resource-card {
            background-color: #e8ddf0 !important;
            border-color: #d4c4e2 !important;
        }
        body.light-mode .resource-card h4 {
            color: #2d1b4e !important;
        }
        body.light-mode .resource-card p {
            color: #5a4a6a !important;
        }
        body.light-mode .resource-card .text-wlLight {
            color: #6b5b7b !important;
        }
    ''',
    'manufacture.html': '''
        /* Light mode: Manufacture page specific */
        body.light-mode .filter-bar {
            background: linear-gradient(135deg, rgba(232,221,240,0.9), rgba(245,240,250,0.9)) !important;
            border-color: rgba(139, 92, 246, 0.15) !important;
        }
        body.light-mode .filter-bar .search-bar {
            background-color: #e8ddf0 !important;
            color: #2d1b4e !important;
            border-color: #d4c4e2 !important;
        }
        body.light-mode .filter-bar .filter-option {
            color: #5a4a6a !important;
        }
        body.light-mode .filter-bar .filter-option:hover {
            background: rgba(139, 92, 246, 0.1) !important;
            color: #2d1b4e !important;
        }
        body.light-mode .filter-bar .filter-option.selected {
            background: linear-gradient(135deg, #8b5cf6, #3b82f6) !important;
            color: white !important;
        }
        body.light-mode .process-step {
            background-color: #e8ddf0 !important;
            color: #2d1b4e !important;
            border-color: #d4c4e2 !important;
        }
        body.light-mode .process-step:hover {
            background-color: #d4c4e2 !important;
        }
        body.light-mode .summary-box {
            background: linear-gradient(120deg, #e8ddf0 80%, #d4c4e2 10%) !important;
            color: #2d1b4e !important;
        }
        body.light-mode .dashboard-card {
            background-color: #e8ddf0 !important;
            color: #2d1b4e !important;
        }
        body.light-mode .autocomplete-list {
            background-color: #f5f0fa !important;
            color: #2d1b4e !important;
            border-color: #d4c4e2 !important;
        }
        body.light-mode .autocomplete-item {
            color: #2d1b4e !important;
        }
        body.light-mode .autocomplete-item:hover {
            background-color: rgba(139, 92, 246, 0.1) !important;
        }
        body.light-mode .settings-dropdown {
            background-color: #f5f0fa !important;
            color: #2d1b4e !important;
            border-color: #d4c4e2 !important;
        }
        body.light-mode .settings-option span {
            color: #2d1b4e !important;
        }
        body.light-mode .selected-item-header {
            background: linear-gradient(135deg, rgba(232,221,240,0.8), rgba(245,240,250,0.8)) !important;
            border-color: rgba(139, 92, 246, 0.2) !important;
        }
        body.light-mode .selected-item-header .item-name {
            color: #2d1b4e !important;
        }
        body.light-mode .selected-item-header .quantity-label {
            color: #6b5b7b !important;
        }
        body.light-mode .quantity-input {
            background-color: #e8ddf0 !important;
            color: #2d1b4e !important;
            border-color: #d4c4e2 !important;
        }
        body.light-mode .dropdown-list {
            background-color: #f5f0fa !important;
            color: #2d1b4e !important;
            border-color: #d4c4e2 !important;
        }
        body.light-mode .history-bar {
            background: linear-gradient(135deg, rgba(232,221,240,0.95), rgba(245,240,250,0.95)) !important;
            border-color: rgba(139, 92, 246, 0.2) !important;
        }
        body.light-mode .history-item {
            color: #2d1b4e !important;
            background: rgba(139, 92, 246, 0.1) !important;
            border-color: rgba(139, 92, 246, 0.3) !important;
        }
        body.light-mode .history-item:hover {
            background: rgba(139, 92, 246, 0.2) !important;
        }
    '''
}

for fname, css in page_css.items():
    if not os.path.exists(fname):
        print(f'Skipping {fname} - not found')
        continue
    
    with open(fname, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove any existing page-specific light mode CSS to avoid duplicates
    content = re.sub(r'/\* Light mode: [^*]+\*/.*?(?=/\* Light mode:|\s*</style>)', '', content, flags=re.DOTALL)
    
    # Find the last </style> tag
    last_style = content.rfind('</style>')
    if last_style == -1:
        print(f'{fname}: No </style> found')
        continue
    
    content = content[:last_style] + '\n        ' + css.strip() + '\n    ' + content[last_style:]
    
    with open(fname, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f'Updated: {fname}')
