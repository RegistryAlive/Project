/**
 * Item Loader - Lazy Loading System for Wonderland Online Items Database
 * Handles loading items from JSON files with caching and optimization
 * Uses split category indexes for faster initial load
 */

class ItemLoader {
    constructor() {
        this.index = null;
        this.cache = new Map();
        this.manifest = null;
        this.loadedCategories = new Set();
        this.manifestUrl = 'data/items-manifest.json';
        this.indexBaseUrl = 'data/items-index-';
        this.itemsBaseUrl = 'data/items/';
        this.isLoading = false;
        this.loadPromise = null;
        this.manifestPromise = null;
    }

    /**
     * Load the manifest (lightweight category index map)
     * @returns {Promise<Object>} The manifest object
     */
    async loadManifest() {
        if (this.manifest) {
            return this.manifest;
        }

        if (this.manifestPromise) {
            return this.manifestPromise;
        }

        this.manifestPromise = fetch(this.manifestUrl, { cache: 'force-cache' })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load manifest: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                this.manifest = data;
                console.log(`Loaded manifest: ${data.totalItems} items across ${Object.keys(data.categories).length} categories`);
                return data;
            })
            .catch(error => {
                this.manifestPromise = null;
                console.error('Error loading manifest:', error);
                throw error;
            });

        return this.manifestPromise;
    }

    /**
     * Load a specific category index file
     * @param {string} category - Category name (weapon, armor, etc.)
     * @returns {Promise<Object>} The category index data
     */
    async loadCategory(category) {
        if (this.loadedCategories.has(category)) {
            return this.index?.items || [];
        }

        if (!this.manifest) {
            await this.loadManifest();
        }

        const catInfo = this.manifest.categories[category];
        if (!catInfo) {
            console.warn(`Category "${category}" not found in manifest`);
            return [];
        }

        const catUrl = this.indexBaseUrl + category + '.json';
        try {
            const response = await fetch(catUrl, { cache: 'force-cache' });
            if (!response.ok) {
                throw new Error(`Failed to load category ${category}: ${response.status}`);
            }
            const catData = await response.json();

            // Initialize unified index if needed
            if (!this.index) {
                this.index = { totalItems: this.manifest.totalItems, items: [] };
            }

            // Merge category items into unified index
            this.index.items.push(...catData.items);
            this.loadedCategories.add(category);

            console.log(`Loaded category "${category}": ${catData.count} items (${catData.items.length} merged)`);
            return catData.items;
        } catch (error) {
            console.error(`Error loading category ${category}:`, error);
            throw error;
        }
    }

    /**
     * Load all category indexes (fallback for full search/filter)
     * @returns {Promise<Object>} The full unified index
     */
    async loadIndex() {
        if (this.index) {
            return this.index;
        }

        if (this.loadPromise) {
            return this.loadPromise;
        }

        this.isLoading = true;
        this.loadPromise = this.loadManifest()
            .then(manifest => {
                const categoryNames = Object.keys(manifest.categories);
                return Promise.all(categoryNames.map(cat => this.loadCategory(cat)));
            })
            .then(() => {
                this.isLoading = false;
                console.log(`Loaded full index with ${this.index.totalItems} items`);
                return this.index;
            })
            .catch(error => {
                this.isLoading = false;
                this.loadPromise = null;
                console.error('Error loading full index:', error);
                throw error;
            });

        return this.loadPromise;
    }

    /**
     * Ensure specific categories are loaded for filtering
     * @param {Array<string>} categories - Categories to ensure are loaded
     * @returns {Promise<void>}
     */
    async ensureCategories(categories) {
        const unloaded = categories.filter(cat => !this.loadedCategories.has(cat));
        if (unloaded.length > 0) {
            await Promise.all(unloaded.map(cat => this.loadCategory(cat)));
        }
    }

    /**
     * Load a single item's full details
     * @param {number} itemId - The item ID
     * @returns {Promise<Object>} The item object with full details
     */
    async loadItem(itemId) {
        if (this.cache.has(itemId)) {
            return this.cache.get(itemId);
        }

        // Try to find item in already-loaded categories first
        let indexItem = this.index?.items.find(item => item.id === itemId);

        // If not found, load the category from filename pattern
        if (!indexItem && this.manifest) {
            // Search manifest categories for the item
            for (const [catName, catInfo] of Object.entries(this.manifest.categories)) {
                if (!this.loadedCategories.has(catName)) {
                    await this.loadCategory(catName);
                    indexItem = this.index?.items.find(item => item.id === itemId);
                    if (indexItem) break;
                }
            }
        }

        // Last resort: load full index
        if (!indexItem) {
            await this.loadIndex();
            indexItem = this.index?.items.find(item => item.id === itemId);
        }

        if (!indexItem) {
            throw new Error(`Item with ID ${itemId} not found in index`);
        }

        const itemUrl = this.itemsBaseUrl + indexItem.file;
        try {
            const response = await fetch(itemUrl, { cache: 'force-cache' });
            if (!response.ok) {
                throw new Error(`Failed to load item ${itemId}: ${response.status}`);
            }
            const item = await response.json();
            this.cache.set(itemId, item);
            return item;
        } catch (error) {
            console.error(`Error loading item ${itemId}:`, error);
            throw error;
        }
    }

    /**
     * Load multiple items in batch
     * @param {Array<number>} itemIds - Array of item IDs to load
     * @returns {Promise<Array<Object>>} Array of loaded items
     */
    async loadItems(itemIds) {
        const promises = itemIds.map(id => this.loadItem(id));
        return Promise.all(promises);
    }

    /**
     * Get items from index (metadata only, no full details)
     * @returns {Array<Object>} Array of item metadata from index
     */
    getIndexItems() {
        if (!this.index) {
            throw new Error('Index not loaded. Call loadIndex() first.');
        }
        return this.index.items;
    }

    /**
     * Filter items from the index based on criteria
     * @param {Object} filters - Filter criteria
     * @param {string} filters.search - Search term for name
     * @param {string} filters.type - Item type filter (uses category field)
     * @param {string} filters.rarity - Rarity filter
     * @param {number} filters.minLevel - Minimum level
     * @param {number} filters.maxLevel - Maximum level
     * @returns {Array<Object>} Filtered items from index
     */
    async filterItems(filters = {}) {
        const { search = '', type = '', rarity = '', minLevel = 0, maxLevel = 100 } = filters;

        // Ensure relevant categories are loaded
        if (type) {
            await this.ensureCategories([type]);
        } else {
            // No type filter: need all categories for full search
            await this.loadIndex();
        }

        if (!this.index) {
            throw new Error('Index not loaded.');
        }

        return this.index.items.filter(item => {
            const matchesSearch = search === '' ||
                item.name.toLowerCase().includes(search.toLowerCase());

            const matchesType = type === '' || item.category === type;

            const matchesRarity = rarity === '' || item.rarity === rarity;

            const matchesLevel = item.level >= minLevel && item.level <= maxLevel;

            return matchesSearch && matchesType && matchesRarity && matchesLevel;
        });
    }

    /**
     * Sort items from the index
     * @param {Array<Object>} items - Items to sort
     * @param {string} column - Column to sort by
     * @param {string} direction - 'asc' or 'desc'
     * @returns {Array<Object>} Sorted items
     */
    sortItems(items, column, direction = 'asc') {
        return [...items].sort((a, b) => {
            if (['level', 'value', 'rank'].includes(column)) {
                return direction === 'asc' ? a[column] - b[column] : b[column] - a[column];
            }

            const valA = String(a[column] || '').toLowerCase();
            const valB = String(b[column] || '').toLowerCase();

            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    /**
     * Get paginated items with full details loaded
     * @param {Array<Object>} filteredItems - Filtered items from index
     * @param {number} page - Page number (1-based)
     * @param {number} itemsPerPage - Items per page
     * @returns {Promise<Object>} Object with items and pagination info
     */
    async getPaginatedItems(filteredItems, page = 1, itemsPerPage = 20) {
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedIndexItems = filteredItems.slice(startIndex, endIndex);

        const itemIds = paginatedIndexItems.map(item => item.id);
        const fullItems = await this.loadItems(itemIds);

        return {
            items: fullItems,
            pagination: {
                page,
                itemsPerPage,
                totalItems: filteredItems.length,
                totalPages: Math.ceil(filteredItems.length / itemsPerPage),
                startIndex: startIndex + 1,
                endIndex: Math.min(endIndex, filteredItems.length)
            }
        };
    }

    /**
     * Clear the item cache
     */
    clearCache() {
        this.cache.clear();
        console.log('Item cache cleared');
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache stats
     */
    getCacheStats() {
        return {
            cachedItems: this.cache.size,
            indexLoaded: !!this.index,
            loadedCategories: [...this.loadedCategories],
            totalItemsInIndex: this.index ? this.index.items.length : 0
        };
    }

    /**
     * Preload items for the next page (for smooth pagination)
     * @param {Array<Object>} filteredItems - Filtered items from index
     * @param {number} currentPage - Current page number
     * @param {number} itemsPerPage - Items per page
     */
    async preloadNextPage(filteredItems, currentPage, itemsPerPage) {
        const nextPage = currentPage + 1;
        const startIndex = nextPage * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const nextPageItems = filteredItems.slice(startIndex, endIndex);

        if (nextPageItems.length > 0) {
            const itemIds = nextPageItems.map(item => item.id);
            this.loadItems(itemIds).catch(error => {
                console.warn('Failed to preload next page:', error);
            });
        }
    }

    /**
     * Get item by ID (from cache or load it)
     * @param {number} itemId - The item ID
     * @returns {Promise<Object>} The item object
     */
    async getItem(itemId) {
        return this.loadItem(itemId);
    }

    /**
     * Get all items of a specific type (category)
     * @param {string} type - Item category (weapon, armor, etc.)
     * @returns {Promise<Array<Object>>} Array of items
     */
    async getItemsByType(type) {
        await this.ensureCategories([type]);
        const filtered = this.filterItems({ type });
        const itemIds = filtered.map(item => item.id);
        return this.loadItems(itemIds);
    }

    /**
     * Search items by name
     * @param {string} searchTerm - Search term
     * @returns {Promise<Array<Object>>} Filtered items from index
     */
    async searchItems(searchTerm) {
        return this.filterItems({ search: searchTerm });
    }
}

// Create a singleton instance
const itemLoader = new ItemLoader();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ItemLoader;
}
