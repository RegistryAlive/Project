/**
 * Item Loader - Lazy Loading System for Wonderland Online Items Database
 * Handles loading items from JSON files with caching and optimization
 */

class ItemLoader {
    constructor() {
        this.index = null;
        this.cache = new Map(); // In-memory cache for loaded items
        this.indexUrl = 'data/items-index.json';
        this.itemsBaseUrl = 'data/items/';
        this.isLoading = false;
        this.loadPromise = null;
    }

    /**
     * Load the master index file containing all item metadata
     * @returns {Promise<Object>} The index object
     */
    async loadIndex() {
        if (this.index) {
            return this.index;
        }

        if (this.loadPromise) {
            return this.loadPromise;
        }

        this.isLoading = true;
        this.loadPromise = fetch(this.indexUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load index: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                this.index = data;
                this.isLoading = false;
                console.log(`Loaded index with ${data.totalItems} items`);
                return data;
            })
            .catch(error => {
                this.isLoading = false;
                this.loadPromise = null;
                console.error('Error loading index:', error);
                throw error;
            });

        return this.loadPromise;
    }

    /**
     * Load a single item's full details
     * @param {number} itemId - The item ID
     * @returns {Promise<Object>} The item object with full details
     */
    async loadItem(itemId) {
        // Check cache first
        if (this.cache.has(itemId)) {
            return this.cache.get(itemId);
        }

        // Find the item in the index to get its file path
        if (!this.index) {
            await this.loadIndex();
        }

        const indexItem = this.index.items.find(item => item.id === itemId);
        if (!indexItem) {
            throw new Error(`Item with ID ${itemId} not found in index`);
        }

        // Load the item file
        const itemUrl = this.itemsBaseUrl + indexItem.file;
        try {
            const response = await fetch(itemUrl);
            if (!response.ok) {
                throw new Error(`Failed to load item ${itemId}: ${response.status}`);
            }
            const item = await response.json();
            
            // Cache the item
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
    filterItems(filters = {}) {
        if (!this.index) {
            throw new Error('Index not loaded. Call loadIndex() first.');
        }

        const { search = '', type = '', rarity = '', minLevel = 0, maxLevel = 100 } = filters;

        return this.index.items.filter(item => {
            // Search filter
            const matchesSearch = search === '' || 
                item.name.toLowerCase().includes(search.toLowerCase());

            // Type filter - use category field (weapon, armor, etc.)
            const matchesType = type === '' || item.category === type;

            // Rarity filter
            const matchesRarity = rarity === '' || item.rarity === rarity;

            // Level filter
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
            // Special handling for numeric columns
            if (['level', 'value', 'rank'].includes(column)) {
                return direction === 'asc' ? a[column] - b[column] : b[column] - a[column];
            }

            // Default string comparison
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

        // Load full details for items on this page
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
            totalItemsInIndex: this.index ? this.index.totalItems : 0
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
            // Load in background without waiting
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
        const filtered = this.filterItems({ type });
        const itemIds = filtered.map(item => item.id);
        return this.loadItems(itemIds);
    }

    /**
     * Search items by name
     * @param {string} searchTerm - Search term
     * @returns {Array<Object>} Filtered items from index
     */
    searchItems(searchTerm) {
        return this.filterItems({ search: searchTerm });
    }
}

// Create a singleton instance
const itemLoader = new ItemLoader();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ItemLoader;
}
