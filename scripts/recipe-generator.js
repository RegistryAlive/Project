/**
 * Recipe Generator - Creates crafting recipes for Wonderland Online items
 * 
 * Recipe Rules:
 * - Items have bases (e.g., "Iron / Flower / Grass") - up to 5 bases, minimum 1
 * - Target item has a rank (e.g., 40)
 * - Sub-items can have ranks within +4 gap (36-40 for rank 40)
 * - First item must have highest or equal rank to all other items
 * - Alchemy Books 1-4 extend the gap by reducing it (Book 1 = gap becomes 3, etc.)
 */

class RecipeGenerator {
    constructor(itemLoader) {
        this.itemLoader = itemLoader;
        this.maxGap = 4; // Base gap without alchemy books
        this.maxAlchemyBook = 4; // Maximum alchemy book level
        this.maxRecipesPerPage = 10; // Recipes to show per page
    }

    /**
     * Parse base string into array of base materials
     * @param {string} baseString - Base string like "Iron / Flower / Grass"
     * @returns {Array<string>} Array of base materials
     */
    parseBases(baseString) {
        if (!baseString || baseString === 'N/A' || baseString === 'null') {
            return [];
        }
        return baseString.split(' / ').map(b => b.trim()).filter(b => b && b !== 'N/A');
    }

    /**
     * Get all items that match a specific base material and rank range
     * @param {string} baseMaterial - The base material to match
     * @param {number} minRank - Minimum rank (inclusive)
     * @param {number} maxRank - Maximum rank (inclusive)
     * @returns {Array<Object>} Matching items from index
     */
    getItemsWithBaseAndRank(baseMaterial, minRank, maxRank) {
        const indexItems = this.itemLoader.getIndexItems();
        const baseLower = baseMaterial.toLowerCase();
        
        return indexItems.filter(item => {
            if (!item.base) return false;
            
            // Check if item's first base matches the required base
            const itemBases = this.parseBases(item.base);
            if (itemBases.length === 0) return false;
            
            // First base must match
            const firstBase = itemBases[0].toLowerCase();
            if (!firstBase.includes(baseLower) && !baseLower.includes(firstBase)) {
                return false;
            }
            
            // Check rank range
            const itemRank = item.rank || 0;
            return itemRank >= minRank && itemRank <= maxRank;
        });
    }

    /**
     * Get all items that have exact base pattern (for sub-items)
     * @param {string} baseMaterial - The base material to match
     * @param {number} minRank - Minimum rank (inclusive)
     * @param {number} maxRank - Maximum rank (inclusive)
     * @param {number} excludeItemId - Item ID to exclude (the target item being crafted)
     * @param {number} alchemyBook - Alchemy book level for gap calculation (optional)
     * @returns {Array<Object>} Matching items from index
     */
    getSubItemsWithBase(baseMaterial, minRank, maxRank, excludeItemId = null, alchemyBook = 0) {
        const indexItems = this.itemLoader.getIndexItems();
        const baseLower = baseMaterial.toLowerCase();
        
        // Calculate effective gap for filtering
        const effectiveMaxGap = this.maxGap + alchemyBook;
        
        return indexItems.filter(item => {
            // Exclude the target item from being used as an ingredient
            if (excludeItemId !== null && item.id === excludeItemId) return false;
            
            if (!item.base) return false;
            
            // Check if item has this base as its first base
            const itemBases = this.parseBases(item.base);
            if (itemBases.length === 0) return false;
            
            // First base must match
            const firstBase = itemBases[0].toLowerCase();
            if (!firstBase.includes(baseLower) && !baseLower.includes(firstBase)) {
                return false;
            }
            
            // Check rank range
            const itemRank = item.rank || 0;
            return itemRank >= minRank && itemRank <= maxRank;
        });
    }
    
    /**
     * Get candidates for a sub-item slot in drill-down (with proper gap calculation)
     * @param {string} baseMaterial - The base material to match
     * @param {number} parentRank - The parent item's rank
     * @param {number} alchemyBook - Alchemy book level
     * @param {number} excludeItemId - Item ID to exclude
     * @param {number} maxRankConstraint - Maximum rank allowed (from higher ranked siblings)
     * @returns {Array<Object>} Candidate items sorted by rank
     */
    getDrillDownCandidates(baseMaterial, parentRank, alchemyBook = 0, excludeItemId = null, maxRankConstraint = null) {
        const effectiveMaxGap = this.maxGap + alchemyBook;
        const minRank = Math.max(1, parentRank - effectiveMaxGap);
        const maxRank = maxRankConstraint !== null ? Math.min(parentRank - 1, maxRankConstraint) : parentRank - 1;
        
        if (maxRank < minRank) {
            return [];
        }
        
        const candidates = this.getSubItemsWithBase(baseMaterial, minRank, maxRank, excludeItemId, alchemyBook);
        return candidates.sort((a, b) => (b.rank || 0) - (a.rank || 0)); // Sort descending by rank
    }

    /**
     * Generate all possible recipes for a target item
     * @param {Object} targetItem - The item to craft
     * @param {number} alchemyBook - Alchemy book level (0-4), reduces gap
     * @returns {Array<Object>} Array of recipe objects
     */
    generateRecipes(targetItem, alchemyBook = 0) {
        const targetBases = this.parseBases(targetItem.base);
        
        // Can't craft items without bases
        if (targetBases.length === 0) {
            return [];
        }
        
        // Items with 5 bases cannot use Alchemy Books (book would need to replace a base)
        // Only allow alchemyBook > 0 if there are fewer than 5 bases
        const canUseAlchemyBook = targetBases.length < 5;
        const effectiveAlchemyBook = canUseAlchemyBook ? alchemyBook : 0;
        
        const targetRank = targetItem.rank || 0;
        const targetId = targetItem.id;
        
        // Calculate effective gap with alchemy book
        // Without book: gap of 4 means sub-items can be 4 ranks below (36 for target 40)
        // With Book 1: gap effectively becomes 5 (can use items 5 ranks below)
        // With Book 4: gap effectively becomes 8 (can use items 8 ranks below)
        const effectiveMaxGap = this.maxGap + effectiveAlchemyBook;
        const minSubRank = Math.max(1, targetRank - effectiveMaxGap);
        // IMPORTANT: Sub-items must have rank LOWER than target rank
        // You can't use the item you're trying to make as an ingredient!
        const maxSubRank = targetRank - 1;
        
        // If maxSubRank is less than minSubRank, no valid recipes possible
        if (maxSubRank < minSubRank) {
            return [];
        }
        
        const recipes = [];
        
        // For each base, get candidate items (excluding the target item itself)
        const baseCandidates = targetBases.map(base => 
            this.getSubItemsWithBase(base, minSubRank, maxSubRank, targetId)
        );
        
        // Check if we have candidates for all bases
        if (baseCandidates.some(candidates => candidates.length === 0)) {
            return [];
        }
        
        // Generate recipe combinations
        // Rules:
        // 1. Each item matches its corresponding base (first base matches)
        // 2. The first item (primary) must have the highest or equal rank among all items
        // 3. The gap is determined by the LOWEST rank item in the recipe
        
        // Strategy: Generate all valid combinations where primary >= all sub-items
        // Ensure variety in primary item ranks (not just highest ranks)
        
        // Limit combinations to prevent explosion - increase to cover more gaps
        const maxCombinations = 500;
        let combinationCount = 0;
        
        // Sort first base candidates by rank (ascending) to ensure variety
        // We want primaries with different ranks: 27, 28, 29, 30, etc.
        const firstBaseCandidates = [...baseCandidates[0]].sort((a, b) => (a.rank || 0) - (b.rank || 0));
        
        // Select primary items with variety - spread across rank range
        // More items to ensure we get recipes with different gaps
        let selectedPrimaries = [];
        if (firstBaseCandidates.length <= 50) {
            selectedPrimaries = firstBaseCandidates;
        } else {
            // Take items spread across the rank range - increased from 20 to 50
            const step = Math.floor(firstBaseCandidates.length / 50);
            for (let i = 0; i < 50; i++) {
                const index = Math.min(i * step, firstBaseCandidates.length - 1);
                selectedPrimaries.push(firstBaseCandidates[index]);
            }
        }
        
        // Also add some highest rank items to ensure we get max gap recipes
        const topItems = firstBaseCandidates.slice(-10);
        selectedPrimaries = [...new Set([...selectedPrimaries, ...topItems])];
        
        for (const primaryItem of selectedPrimaries) {
            if (combinationCount >= maxCombinations) break;
            
            const primaryRank = primaryItem.rank || 0;
            
            // Sub-items must have rank <= primary rank (primary is highest or equal)
            const subItemCombinations = this.generateSubItemCombinations(
                baseCandidates.slice(1),
                minSubRank,
                primaryRank,
                targetBases.slice(1)
            );
            
            for (const subItems of subItemCombinations) {
                if (combinationCount >= maxCombinations) break;
                
                // Calculate the lowest rank in the recipe (this determines the gap)
                const minRankInRecipe = Math.min(primaryRank, ...subItems.map(i => i.rank || 0));
                const gapUsed = targetRank - minRankInRecipe;
                
                // Verify the gap is within the effective range for this alchemy book
                if (gapUsed >= 1 && gapUsed <= effectiveMaxGap) {
                    recipes.push({
                        primary: primaryItem,
                        subItems: subItems,
                        alchemyBook: effectiveAlchemyBook,
                        targetRank: targetRank,
                        gapUsed: gapUsed,
                        canUseAlchemyBook: canUseAlchemyBook
                    });
                    
                    combinationCount++;
                }
            }
        }
        
        // Sort recipes by gap (lower gap = more efficient)
        recipes.sort((a, b) => a.gapUsed - b.gapUsed);
        
        return recipes;
    }

    /**
     * Generate combinations of sub-items
     * @param {Array<Array<Object>>} baseCandidates - Candidates for each base position
     * @param {number} minRank - Minimum allowed rank
     * @param {number} maxRank - Maximum allowed rank (primary's rank)
     * @param {Array<string>} targetBases - Target base materials for reference
     * @returns {Array<Array<Object>>} Array of sub-item combinations
     */
    generateSubItemCombinations(baseCandidates, minRank, maxRank, targetBases) {
        if (baseCandidates.length === 0) {
            return [[]];
        }
        
        const result = [];
        const firstCandidates = baseCandidates[0].filter(
            item => (item.rank || 0) >= minRank && (item.rank || 0) <= maxRank
        );
        
        // Sort by rank to ensure variety - take items from different rank levels
        // This ensures we get items with ranks spread across the range
        firstCandidates.sort((a, b) => (a.rank || 0) - (b.rank || 0));
        
        // Select items with variety - take from different rank ranges - increased
        const maxPerBase = 30;
        let selectedCandidates = [];
        
        if (firstCandidates.length <= maxPerBase) {
            selectedCandidates = firstCandidates;
        } else {
            // Take items spread across the rank range for variety
            const step = Math.floor(firstCandidates.length / maxPerBase);
            for (let i = 0; i < maxPerBase; i++) {
                const index = Math.min(i * step, firstCandidates.length - 1);
                selectedCandidates.push(firstCandidates[index]);
            }
            // Also include the highest rank item
            if (!selectedCandidates.includes(firstCandidates[firstCandidates.length - 1])) {
                selectedCandidates.push(firstCandidates[firstCandidates.length - 1]);
            }
        }
        
        if (selectedCandidates.length === 0) {
            return [[]];
        }
        
        const remainingCombinations = this.generateSubItemCombinations(
            baseCandidates.slice(1),
            minRank,
            maxRank,
            targetBases.slice(1)
        );
        
        for (const item of selectedCandidates) {
            for (const combo of remainingCombinations) {
                result.push([item, ...combo]);
            }
        }
        
        return result;
    }

    /**
     * Get the gap range for a specific alchemy book level
     * When filtering by a book, show recipes that can be made with that book
     * @param {number} bookLevel - Alchemy book level (0-4)
     * @returns {Object} Object with minGap and maxGap
     */
    getGapRangeForBook(bookLevel) {
        // Each book level enables a specific range of gaps:
        // No Book (0): gaps 1-4 (base gaps)
        // Book 1: gaps 3-5
        // Book 2: gaps 4-6
        // Book 3: gaps 5-7
        // Book 4: gaps 6-8
        const gapRanges = {
            0: { minGap: 1, maxGap: 4 },
            1: { minGap: 3, maxGap: 5 },
            2: { minGap: 4, maxGap: 6 },
            3: { minGap: 5, maxGap: 7 },
            4: { minGap: 6, maxGap: 8 }
        };
        return gapRanges[bookLevel] || { minGap: 1, maxGap: 4 };
    }

    /**
     * Generate all recipes for an item with pagination
     * @param {Object} targetItem - The item to craft
     * @param {number} page - Page number (1-based)
     * @param {number} alchemyBookFilter - Filter by alchemy book level (null for all)
     * @param {number} gapFilter - Filter by specific gap (null for all)
     * @returns {Object} Paginated recipes with metadata
     */
    getPaginatedRecipes(targetItem, page = 1, alchemyBookFilter = null, gapFilter = null) {
        let allRecipes = [];
        
        if (alchemyBookFilter === null && gapFilter === null) {
            // Show all recipes - generate for all book levels
            const baseRecipes = this.generateRecipes(targetItem, 0);
            allRecipes = allRecipes.concat(baseRecipes);
            
            // Get recipes for all alchemy book levels
            for (let book = 1; book <= this.maxAlchemyBook; book++) {
                const bookRecipes = this.generateRecipes(targetItem, book);
                // Only add recipes that aren't already covered by lower book levels
                for (const recipe of bookRecipes) {
                    const isDuplicate = allRecipes.some(r => 
                        this.recipesEqual(r, recipe)
                    );
                    if (!isDuplicate) {
                        allRecipes.push(recipe);
                    }
                }
            }
        } else if (gapFilter !== null && alchemyBookFilter === null) {
            // Filter by specific gap only - generate for all book levels and filter
            // Generate for all alchemy book levels to find recipes with this specific gap
            const baseRecipes = this.generateRecipes(targetItem, 0);
            allRecipes = allRecipes.concat(baseRecipes);
            
            for (let book = 1; book <= this.maxAlchemyBook; book++) {
                const bookRecipes = this.generateRecipes(targetItem, book);
                for (const recipe of bookRecipes) {
                    const isDuplicate = allRecipes.some(r => 
                        this.recipesEqual(r, recipe)
                    );
                    if (!isDuplicate) {
                        allRecipes.push(recipe);
                    }
                }
            }
            
            // Filter to only include recipes with the specific gap
            allRecipes = allRecipes.filter(r => r.gapUsed === gapFilter);
        } else {
            // Filter by specific alchemy book level
            // Show ONLY recipes whose gap falls within this book's range
            // Book 0: gaps 1-4 (no book needed)
            // Book 1: gaps 3-5
            // Book 2: gaps 4-6
            // Book 3: gaps 5-7
            // Book 4: gaps 6-8
            
            const gapRange = this.getGapRangeForBook(alchemyBookFilter);
            
            // Generate recipes with the appropriate book level
            // Book 0: generate with book 0 (max gap 4)
            // Book 1: generate with book 1 (max gap 5)
            // Book 2: generate with book 2 (max gap 6)
            // etc.
            const bookToUse = alchemyBookFilter;
            const bookRecipes = this.generateRecipes(targetItem, bookToUse);
            
            for (const recipe of bookRecipes) {
                // Only include recipes whose gap falls within this book's range
                let gapInRange = recipe.gapUsed >= gapRange.minGap && recipe.gapUsed <= gapRange.maxGap;
                
                // If specific gap is also selected, filter by that too
                if (gapFilter !== null) {
                    gapInRange = gapInRange && recipe.gapUsed === gapFilter;
                }
                
                if (gapInRange) {
                    const isDuplicate = allRecipes.some(r => 
                        this.recipesEqual(r, recipe)
                    );
                    if (!isDuplicate) {
                        allRecipes.push(recipe);
                    }
                }
            }
        }
        
        // Sort by gap (efficiency)
        allRecipes.sort((a, b) => {
            // First by alchemy book (lower is better)
            if (a.alchemyBook !== b.alchemyBook) {
                return a.alchemyBook - b.alchemyBook;
            }
            // Then by gap (lower is better)
            return a.gapUsed - b.gapUsed;
        });
        
        // Paginate
        const totalRecipes = allRecipes.length;
        const totalPages = Math.ceil(totalRecipes / this.maxRecipesPerPage);
        const startIndex = (page - 1) * this.maxRecipesPerPage;
        const endIndex = startIndex + this.maxRecipesPerPage;
        const paginatedRecipes = allRecipes.slice(startIndex, endIndex);
        
        return {
            recipes: paginatedRecipes,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalRecipes: totalRecipes,
                recipesPerPage: this.maxRecipesPerPage,
                startIndex: startIndex + 1,
                endIndex: Math.min(endIndex, totalRecipes)
            },
            alchemyBookFilter: alchemyBookFilter
        };
    }

    /**
     * Check if two recipes are equivalent
     * @param {Object} recipe1 - First recipe
     * @param {Object} recipe2 - Second recipe
     * @returns {boolean} True if recipes are equivalent
     */
    recipesEqual(recipe1, recipe2) {
        // Check if primary items match
        if (recipe1.primary.id !== recipe2.primary.id) return false;
        
        // Check if sub-items match
        if (recipe1.subItems.length !== recipe2.subItems.length) return false;
        
        for (let i = 0; i < recipe1.subItems.length; i++) {
            if (recipe1.subItems[i].id !== recipe2.subItems[i].id) return false;
        }
        
        return true;
    }

    /**
     * Get image path for an item from index (which doesn't have image property)
     * @param {Object} item - Item from index
     * @returns {string} Image path
     */
    getItemImage(item) {
        // If item has image property, use it
        if (item.image) {
            return item.image;
        }
        // Construct image path from file name
        if (item.file) {
            // file is like "weapon-1.json", image is like "data/images/weapon-1.png"
            const baseName = item.file.replace('.json', '');
            return `data/images/${baseName}.png`;
        }
        // Fallback to placeholder
        return `https://placehold.co/64x64?text=${encodeURIComponent(item.name || 'Item')}`;
    }

    /**
     * Format recipe for display
     * @param {Object} recipe - Recipe object
     * @returns {Object} Formatted recipe data
     */
    formatRecipeForDisplay(recipe) {
        return {
            primary: {
                id: recipe.primary.id,
                name: recipe.primary.name,
                rank: recipe.primary.rank || 0,
                image: this.getItemImage(recipe.primary),
                base: recipe.primary.base
            },
            subItems: recipe.subItems.map(item => ({
                id: item.id,
                name: item.name,
                rank: item.rank || 0,
                image: this.getItemImage(item),
                base: item.base
            })),
            alchemyBook: recipe.alchemyBook,
            gapUsed: recipe.gapUsed,
            targetRank: recipe.targetRank
        };
    }

    /**
     * Get candidate items for a specific base slot in custom recipe builder
     * Rules:
     * - Primary (slot 0) must have highest or equal rank among all items
     * - If a lower rank item is selected in another slot, primary must be <= that rank
     * - Sub-items must have rank <= primary rank
     * - All items must be within the gap range from target rank
     * 
     * @param {Object} targetItem - The item to craft
     * @param {number} baseIndex - Index of the base slot (0 for primary)
     * @param {number} alchemyBook - Alchemy book level (0-4)
     * @param {Object} selectedItems - Already selected items { baseIndex: item }
     * @returns {Array<Object>} Candidate items for this slot
     */
    getCandidatesForSlot(targetItem, baseIndex, alchemyBook = 0, selectedItems = {}) {
        const targetBases = this.parseBases(targetItem.base);
        
        if (baseIndex >= targetBases.length) {
            return [];
        }
        
        const canUseAlchemyBook = targetBases.length < 5;
        const effectiveAlchemyBook = canUseAlchemyBook ? alchemyBook : 0;
        const targetRank = targetItem.rank || 0;
        const effectiveMaxGap = this.maxGap + effectiveAlchemyBook;
        const minSubRank = Math.max(1, targetRank - effectiveMaxGap);
        const maxSubRank = targetRank - 1;
        
        // Get all candidates for this base
        const candidates = this.getSubItemsWithBase(targetBases[baseIndex], minSubRank, maxSubRank, targetItem.id);
        
        // Find the minimum rank among already selected items (that would constrain this slot)
        let maxAllowedRank = maxSubRank;
        let minAllowedRank = minSubRank;
        
        // Check all selected items to determine constraints
        for (const [slotIdx, selectedItem] of Object.entries(selectedItems)) {
            if (!selectedItem) continue;
            const selectedRank = selectedItem.rank || 0;
            
            if (baseIndex === 0) {
                // Primary slot: must be >= all other selected items (primary is highest)
                // But also, if a lower rank item is selected, primary can't be higher than it
                // Actually, primary must be >= all others, so if another item is selected,
                // primary must be at least that rank
                // Wait - the rule is primary must be HIGHEST or equal
                // So if slot 1 has rank 15, primary must be >= 15
                // But if slot 1 has rank 26, primary must be >= 26
                // The constraint is: primary >= all other selected items
                if (parseInt(slotIdx) !== 0) {
                    // Primary must be at least as high as this selected item
                    minAllowedRank = Math.max(minAllowedRank, selectedRank);
                }
            } else {
                // Sub-item slot: must be <= primary rank (if primary is selected)
                if (parseInt(slotIdx) === 0) {
                    maxAllowedRank = Math.min(maxAllowedRank, selectedRank);
                } else {
                    // Also must be <= any other selected sub-item that's lower rank
                    // Actually, sub-items can have any rank <= primary
                    // But if we want valid recipes, we should show items that work
                    maxAllowedRank = Math.min(maxAllowedRank, selectedRank);
                }
            }
        }
        
        // Filter candidates based on constraints
        const filteredCandidates = candidates.filter(item => {
            const itemRank = item.rank || 0;
            return itemRank >= minAllowedRank && itemRank <= maxAllowedRank;
        });
        
        // Sort by rank (descending for primary to show highest first, ascending for subs)
        if (baseIndex === 0) {
            return filteredCandidates.sort((a, b) => (b.rank || 0) - (a.rank || 0));
        }
        return filteredCandidates.sort((a, b) => (a.rank || 0) - (b.rank || 0));
    }
    
    /**
     * Get the effective rank constraints for a slot based on current selections
     * @param {Object} targetItem - The item to craft
     * @param {number} baseIndex - Index of the base slot
     * @param {number} alchemyBook - Alchemy book level
     * @param {Object} selectedItems - Already selected items
     * @returns {Object} { minRank, maxRank, effectiveGap }
     */
    getSlotRankConstraints(targetItem, baseIndex, alchemyBook = 0, selectedItems = {}) {
        const targetRank = targetItem.rank || 0;
        const effectiveMaxGap = this.maxGap + alchemyBook;
        const minSubRank = Math.max(1, targetRank - effectiveMaxGap);
        const maxSubRank = targetRank - 1;
        
        let minAllowedRank = minSubRank;
        let maxAllowedRank = maxSubRank;
        
        for (const [slotIdx, selectedItem] of Object.entries(selectedItems)) {
            if (!selectedItem) continue;
            const selectedRank = selectedItem.rank || 0;
            
            if (baseIndex === 0) {
                if (parseInt(slotIdx) !== 0) {
                    minAllowedRank = Math.max(minAllowedRank, selectedRank);
                }
            } else {
                maxAllowedRank = Math.min(maxAllowedRank, selectedRank);
            }
        }
        
        return {
            minRank: minAllowedRank,
            maxRank: maxAllowedRank,
            effectiveGap: targetRank - minAllowedRank
        };
    }

    /**
     * Validate a custom recipe
     * @param {Object} targetItem - The item to craft
     * @param {Array<Object>} selectedItems - Selected items for each base slot
     * @param {number} alchemyBook - Alchemy book level (0-4)
     * @returns {Object} Validation result { valid, message, gapUsed }
     */
    validateCustomRecipe(targetItem, selectedItems, alchemyBook = 0) {
        const targetBases = this.parseBases(targetItem.base);
        const targetRank = targetItem.rank || 0;
        
        // Check all slots are filled
        if (selectedItems.length !== targetBases.length) {
            return { valid: false, message: 'Please select items for all slots', gapUsed: 0 };
        }
        
        if (selectedItems.some(item => !item)) {
            return { valid: false, message: 'Please select items for all slots', gapUsed: 0 };
        }
        
        // Check primary has highest or equal rank
        const primaryRank = selectedItems[0].rank || 0;
        for (let i = 1; i < selectedItems.length; i++) {
            if ((selectedItems[i].rank || 0) > primaryRank) {
                return { 
                    valid: false, 
                    message: `Primary item must have highest or equal rank. ${selectedItems[i].name} has rank ${selectedItems[i].rank} which is higher than primary (${primaryRank})`, 
                    gapUsed: 0 
                };
            }
        }
        
        // Calculate gap
        const minRank = Math.min(...selectedItems.map(item => item.rank || 0));
        const gapUsed = targetRank - minRank;
        
        // Check if gap is achievable with this alchemy book
        const canUseAlchemyBook = targetBases.length < 5;
        const effectiveAlchemyBook = canUseAlchemyBook ? alchemyBook : 0;
        const effectiveMaxGap = this.maxGap + effectiveAlchemyBook;
        
        if (gapUsed > effectiveMaxGap) {
            return { 
                valid: false, 
                message: `Gap of ${gapUsed} is too large. Maximum gap with current book is ${effectiveMaxGap}`, 
                gapUsed: gapUsed 
            };
        }
        
        return { 
            valid: true, 
            message: `Valid recipe! Gap: ${gapUsed} ranks`, 
            gapUsed: gapUsed,
            alchemyBook: effectiveAlchemyBook
        };
    }

    /**
     * Build a recipe tree for recursive crafting
     * @param {Object} targetItem - The item to craft
     * @param {number} alchemyBook - Alchemy book level
     * @param {number} depth - Current recursion depth
     * @param {Set} visited - Set of visited item IDs to prevent infinite loops
     * @returns {Object} Recipe tree node
     */
    async buildRecipeTree(targetItem, alchemyBook = 0, depth = 0, visited = new Set()) {
        const maxDepth = 5; // Prevent infinite recursion
        
        if (depth >= maxDepth) {
            return {
                item: targetItem,
                canCraft: false,
                message: 'Max depth reached',
                ingredients: []
            };
        }
        
        // Prevent cycles
        if (visited.has(targetItem.id)) {
            return {
                item: targetItem,
                canCraft: false,
                message: 'Cycle detected',
                ingredients: []
            };
        }
        
        const newVisited = new Set(visited);
        newVisited.add(targetItem.id);
        
        const targetBases = this.parseBases(targetItem.base);
        
        // Can't craft items without bases
        if (targetBases.length === 0) {
            return {
                item: targetItem,
                canCraft: false,
                message: 'No base materials - cannot be crafted',
                ingredients: []
            };
        }
        
        // Generate recipes for this item
        const recipes = this.generateRecipes(targetItem, alchemyBook);
        
        if (recipes.length === 0) {
            return {
                item: targetItem,
                canCraft: false,
                message: 'No valid recipes found',
                ingredients: []
            };
        }
        
        // Use the first (best) recipe
        const bestRecipe = recipes[0];
        
        // Build tree for each ingredient
        const ingredientTrees = [];
        const itemLoader = this.itemLoader;
        
        for (const ingredient of [bestRecipe.primary, ...bestRecipe.subItems]) {
            // Get full item data
            const fullItem = await itemLoader.getItem(ingredient.id);
            if (fullItem) {
                const subTree = await this.buildRecipeTree(fullItem, alchemyBook, depth + 1, newVisited);
                ingredientTrees.push(subTree);
            } else {
                ingredientTrees.push({
                    item: ingredient,
                    canCraft: false,
                    message: 'Item not found',
                    ingredients: []
                });
            }
        }
        
        return {
            item: targetItem,
            canCraft: true,
            recipe: bestRecipe,
            gapUsed: bestRecipe.gapUsed,
            alchemyBook: bestRecipe.alchemyBook,
            ingredients: ingredientTrees
        };
    }
}

// Create singleton instance
let recipeGenerator = null;

function initRecipeGenerator(itemLoader) {
    if (!recipeGenerator) {
        recipeGenerator = new RecipeGenerator(itemLoader);
    }
    return recipeGenerator;
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RecipeGenerator, initRecipeGenerator };
}