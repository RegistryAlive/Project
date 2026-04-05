/**
 * Recipe Generator - Creates crafting recipes for Wonderland Online items
 * 
 * Recipe Rules:
 * - Items have bases (e.g., "Iron / Flower / Grass") - up to 5 bases, minimum 1
 * - Target item has a rank (e.g., 40)
 * - Sub-items can have ranks within gap (36-40 for rank 40 with gap 4)
 * - First item must have highest or equal rank to all other items
 * - Multiple same-base items can be used to make that base dominant (gap uses single item rank, not combined)
 * - Alchemy Books 1-4 are used for specific gap ranges and appear as the LAST ingredient (5th slot max)
 * - Items with 5 base materials cannot use Alchemy Books (no room)
 * - Single-base items require only 2 ingredients: [base item] + [any item within gap]
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
            
            // First base must exactly match (e.g., "Iron" should not match "Pure Iron")
            const firstBase = itemBases[0].toLowerCase();
            if (firstBase !== baseLower) {
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
            
            // First base must exactly match (e.g., "Iron" should not match "Pure Iron")
            const firstBase = itemBases[0].toLowerCase();
            if (firstBase !== baseLower) {
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
        
        // SINGLE BASE ITEMS: Generate 2-ingredient recipes
        // For single-base items, recipe is: [base item] + [any other item within gap]
        if (targetBases.length === 1) {
            return this.generateSingleBaseRecipes(targetItem, alchemyBook);
        }
        
        // Items with 5 bases cannot use Alchemy Books (book would need to replace a base)
        // Only allow alchemyBook > 0 if there are fewer than 5 bases
        const canUseAlchemyBook = targetBases.length < 5;
        const effectiveAlchemyBook = canUseAlchemyBook ? alchemyBook : 0;
        
        const targetRank = targetItem.rank || 0;
        const targetId = targetItem.id;
        
        // Calculate effective gap with alchemy book
        const effectiveMaxGap = this.maxGap + effectiveAlchemyBook;
        const minSubRank = Math.max(1, targetRank - effectiveMaxGap);
        const maxSubRank = targetRank - 1;
        
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
        
        // Generate recipe combinations with variety
        const maxCombinations = 500;
        let combinationCount = 0;
        
        const firstBaseCandidates = [...baseCandidates[0]].sort((a, b) => (a.rank || 0) - (b.rank || 0));
        
        let selectedPrimaries = [];
        if (firstBaseCandidates.length <= 50) {
            selectedPrimaries = firstBaseCandidates;
        } else {
            const step = Math.floor(firstBaseCandidates.length / 50);
            for (let i = 0; i < 50; i++) {
                const index = Math.min(i * step, firstBaseCandidates.length - 1);
                selectedPrimaries.push(firstBaseCandidates[index]);
            }
        }
        
        const topItems = firstBaseCandidates.slice(-10);
        selectedPrimaries = [...new Set([...selectedPrimaries, ...topItems])];
        
            for (const primaryItem of selectedPrimaries) {
                if (combinationCount >= maxCombinations) break;
                
                const primaryRank = primaryItem.rank || 0;
                
                const subItemCombinations = this.generateSubItemCombinations(
                    baseCandidates.slice(1),
                    minSubRank,
                    primaryRank,
                    targetBases.slice(1)
                );
                
                for (const subItems of subItemCombinations) {
                    if (combinationCount >= maxCombinations) break;
                    
                    // SAFETY CHECK: Ensure recipe has ALL required bases
                    const expectedIngredientCount = targetBases.length;
                    const actualIngredientCount = 1 + subItems.length; // primary + subItems
                    if (actualIngredientCount !== expectedIngredientCount) {
                        continue; // Skip partial recipes
                    }
                    
                    const allItems = [primaryItem, ...subItems];
                    const minRankInRecipe = Math.min(...allItems.map(i => i.rank || 0));
                    const gapUsed = targetRank - minRankInRecipe;
                
                if (gapUsed >= 1 && gapUsed <= effectiveMaxGap) {
                    recipes.push({
                        primary: primaryItem,
                        subItems: subItems,
                        alchemyBook: effectiveAlchemyBook,
                        targetRank: targetRank,
                        gapUsed: gapUsed,
                        canUseAlchemyBook: canUseAlchemyBook,
                        duplicateBases: [] // Track if any duplicate bases used
                    });
                    
                    combinationCount++;
                }
            }
        }
        
        // Also generate recipes with duplicate base items (multiplier support)
        // E.g., Flower 25, Grass 26, Gold 26, Flower 25 → Flower dominant
        if (canUseAlchemyBook && targetBases.length < 4) { // Only if room for extra ingredient
            const duplicateRecipes = this.generateDuplicateBaseRecipes(
                targetItem, targetBases, effectiveAlchemyBook, effectiveMaxGap, minSubRank, maxSubRank, targetId, targetRank
            );
            recipes.push(...duplicateRecipes);
        }
        
        recipes.sort((a, b) => a.gapUsed - b.gapUsed);
        
        return recipes;
    }
    
    /**
     * Generate recipes for single-base items (2 ingredients only)
     * Recipe: [base item] + [any other item within gap]
     * RULE: The base item MUST be the primary (highest or equal rank among all ingredients)
     * Otherwise the resulting item would have a different base (e.g., Iron/Copper instead of just Copper)
     */
    generateSingleBaseRecipes(targetItem, alchemyBook = 0) {
        const targetBases = this.parseBases(targetItem.base);
        const canUseAlchemyBook = true; // Single base items can always use books
        const effectiveAlchemyBook = canUseAlchemyBook ? alchemyBook : 0;
        
        const targetRank = targetItem.rank || 0;
        const targetId = targetItem.id;
        const effectiveMaxGap = this.maxGap + effectiveAlchemyBook;
        const minSubRank = Math.max(1, targetRank - effectiveMaxGap);
        const maxSubRank = targetRank - 1;
        
        if (maxSubRank < minSubRank) {
            return [];
        }
        
        const recipes = [];
        
        // Get base item candidates
        const baseCandidates = this.getSubItemsWithBase(targetBases[0], minSubRank, maxSubRank, targetId);
        
        if (baseCandidates.length === 0) {
            return [];
        }
        
        // Get any other item candidates (any base, within gap)
        const anyItemCandidates = this.itemLoader.getIndexItems().filter(item => {
            if (item.id === targetId) return false;
            const itemRank = item.rank || 0;
            return itemRank >= minSubRank && itemRank <= maxSubRank;
        });
        
        if (anyItemCandidates.length === 0) {
            return [];
        }
        
        // Generate 2-ingredient recipes
        const maxCombinations = 200;
        let combinationCount = 0;
        
        // Limit candidates for performance
        const limitedBaseCandidates = baseCandidates.slice(0, 50);
        const limitedAnyCandidates = anyItemCandidates.slice(0, 100);
        
        for (const baseItem of limitedBaseCandidates) {
            if (combinationCount >= maxCombinations) break;
            
            const baseItemRank = baseItem.rank || 0;
            
            for (const anyItem of limitedAnyCandidates) {
                if (combinationCount >= maxCombinations) break;
                
                const anyItemRank = anyItem.rank || 0;
                
                // CRITICAL: Base item MUST be primary (highest or equal rank)
                // If anyItem has higher rank, skip this combination entirely
                if (anyItemRank > baseItemRank) {
                    continue; // Skip - would result in wrong base
                }
                
                // Calculate gap using the lower-ranked sub-item
                const minRank = Math.min(baseItemRank, anyItemRank);
                const gapUsed = targetRank - minRank;
                
                if (gapUsed >= 1 && gapUsed <= effectiveMaxGap) {
                    // Base item is always primary since we filtered out anyItemRank > baseItemRank
                    recipes.push({
                        primary: baseItem,
                        subItems: [anyItem],
                        alchemyBook: effectiveAlchemyBook,
                        targetRank: targetRank,
                        gapUsed: gapUsed,
                        canUseAlchemyBook: true,
                        duplicateBases: [],
                        isSingleBaseRecipe: true
                    });
                    
                    combinationCount++;
                }
            }
        }
        
        recipes.sort((a, b) => a.gapUsed - b.gapUsed);
        
        return recipes;
    }
    
    /**
     * Generate recipes with duplicate base items (multiplier support)
     * 
     * HOW DUPLICATE RECIPES WORK:
     * - Base dominance: (1) Highest rank wins, (2) If ranks equal, first base in target's order wins
     * - Having MORE items of a base makes that base dominant by count
     * - Gap is calculated from the LOWEST individual rank
     * 
     * A duplicate recipe is ONLY needed when:
     * - The duplicate provides EXTRA items of the target base when another base has a HIGHER rank
     * - Example: Hard Tissue R20 + Steel R18 + Steel R18 → Steel dominant (2 Steel > 1 Hard Tissue)
     * 
     * A duplicate recipe is REDUNDANT when:
     * - A non-duplicate version already exists with the same base dominance
     * - Example: Steel R20 + Hard Tissue R20 already makes Steel dominant (equal rank, Steel first in order)
     *   → Adding another Steel R20 is useless
     * 
     * RULES:
     * 1. Only generate duplicates when the dup base needs extra count to beat a higher-ranked other base
     * 2. The dup item must have LOWER rank than at least one non-dup item
     * 3. Gap calculated from lowest individual rank
     */
    generateDuplicateBaseRecipes(targetItem, targetBases, alchemyBook, effectiveMaxGap, minSubRank, maxSubRank, targetId, targetRank) {
        const recipes = [];
        const maxCombinations = 100;
        let combinationCount = 0;
        
        // For each base, try making it the "dominant" base by adding a duplicate
        for (let dupBaseIdx = 0; dupBaseIdx < targetBases.length; dupBaseIdx++) {
            if (combinationCount >= maxCombinations) break;
            
            const dupBase = targetBases[dupBaseIdx];
            const dupBaseLower = dupBase.toLowerCase();
            
            // Get candidates for the duplicate base
            const dupCandidates = this.getSubItemsWithBase(dupBase, minSubRank, maxSubRank, targetId);
            if (dupCandidates.length === 0) continue;
            
            // Get candidates for ALL other bases (one each)
            const otherBaseIndices = targetBases.map((_, idx) => idx).filter(idx => idx !== dupBaseIdx);
            const otherBases = otherBaseIndices.map(idx => targetBases[idx]);
            const otherBaseCandidates = otherBases.map(base =>
                this.getSubItemsWithBase(base, minSubRank, maxSubRank, targetId)
            );
            
            // Skip if any other base has no candidates
            if (otherBaseCandidates.some(candidates => candidates.length === 0)) continue;
            
            // Generate combinations for the "other" bases
            const otherCombinations = otherBaseCandidates.length > 0
                ? this.generateSubItemCombinations(otherBaseCandidates, minSubRank, maxSubRank, otherBases)
                : [[]];
            
            // Limit combinations
            const limitedOtherCombos = otherCombinations.slice(0, 20);
            
            // Limit dup candidates
            const limitedDupCandidates = dupCandidates.slice(0, 15);
            
                for (const otherItems of limitedOtherCombos) {
                    if (combinationCount >= maxCombinations) break;
                    
                    // CRITICAL: Must have at least one item from each "other" base
                    // A recipe needs ALL required bases, not just duplicates
                    const actualOtherCount = otherItems.length;
                    const expectedOtherCount = otherBases.length;
                    if (actualOtherCount === 0 || actualOtherCount < expectedOtherCount) {
                        continue; // Missing required base items
                    }
                    
                    // Find the highest rank among other (non-dup) items
                    const maxOtherRank = Math.max(...otherItems.map(i => i.rank || 0));
                
                for (const dupItem of limitedDupCandidates) {
                    if (combinationCount >= maxCombinations) break;
                    
                    const dupRank = dupItem.rank || 0;
                    
                    // KEY CHECK: The dup item MUST have lower rank than the highest other item
                    // If dupRank >= maxOtherRank, the non-dup version would already work
                    // (equal rank = first base in order wins, higher rank = higher rank wins)
                    // We only need duplicates when dupRank < maxOtherRank
                    if (dupRank >= maxOtherRank && otherItems.length > 0) {
                        continue; // Non-duplicate version already works
                    }
                    
                    // Build the full recipe
                    const allItems = [dupItem, ...otherItems, dupItem];
                    
                    const minRankInRecipe = Math.min(...allItems.map(i => i.rank || 0));
                    const gapUsed = targetRank - minRankInRecipe;
                    
                    if (gapUsed < 1 || gapUsed > effectiveMaxGap) continue;
                    
                    // Verify the dup base is actually dominant (has more items than any other base)
                    const baseCounts = {};
                    for (const item of allItems) {
                        const itemBases = this.parseBases(item.base);
                        if (itemBases.length > 0) {
                            const firstBase = itemBases[0].toLowerCase();
                            baseCounts[firstBase] = (baseCounts[firstBase] || 0) + 1;
                        }
                    }
                    
                    const dupCount = baseCounts[dupBaseLower] || 0;
                    const maxOtherCount = Math.max(
                        ...Object.entries(baseCounts)
                            .filter(([base]) => base !== dupBaseLower)
                            .map(([, count]) => count),
                        0
                    );
                    
                    // Dup base must have MORE items than any other base
                    if (dupCount <= maxOtherCount) continue;
                    
                    // Determine primary: highest rank, or first in order if tied
                    let primaryItem;
                    let subItems;
                    
                    if (dupRank >= maxOtherRank) {
                        primaryItem = dupItem;
                        subItems = [...otherItems, dupItem];
                    } else {
                        const highestIdx = otherItems.findIndex(i => (i.rank || 0) === maxOtherRank);
                        primaryItem = otherItems[highestIdx];
                        subItems = [dupItem, ...otherItems.filter((_, idx) => idx !== highestIdx), dupItem];
                    }
                    
                    recipes.push({
                        primary: primaryItem,
                        subItems: subItems,
                        alchemyBook: alchemyBook,
                        targetRank: targetRank,
                        gapUsed: gapUsed,
                        canUseAlchemyBook: true,
                        duplicateBases: [{ base: dupBase, index: subItems.length }],
                        isDuplicateRecipe: true,
                        validBooks: this.findValidBooksForGap(gapUsed)
                    });
                    
                    combinationCount++;
                }
            }
        }
        
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
        
        // FIX: If filtering by rank leaves no candidates for this base,
        // return empty array - no valid combinations exist
        if (firstCandidates.length === 0) {
            return [];
        }
        
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
            return [];
        }
        
        const remainingCombinations = this.generateSubItemCombinations(
            baseCandidates.slice(1),
            minRank,
            maxRank,
            targetBases.slice(1)
        );
        
        // If remaining combinations returned empty array (no valid combos for remaining bases),
        // return empty - don't return partial recipes
        if (remainingCombinations.length === 0) {
            return [];
        }
        
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
     * Alchemy Book takes up the last ingredient slot (5th max)
     * Items with 5 base materials cannot use books
     * @param {number} bookLevel - Alchemy book level (0-4)
     * @returns {Object} Object with minGap and maxGap
     */
    getGapRangeForBook(bookLevel) {
        // Alchemy Book gap ranges (new rules):
        // No Book (0): gaps 1-3 (base gaps without book)
        // Book 1: gaps 2-4
        // Book 2: gaps 4-5
        // Book 3: gaps 5-6
        // Book 4: gaps 6-8
        // Note: Gaps can overlap between books (e.g., gap 4 appears in Book 1 and 2)
        const gapRanges = {
            0: { minGap: 1, maxGap: 3 },
            1: { minGap: 2, maxGap: 4 },
            2: { minGap: 4, maxGap: 5 },
            3: { minGap: 5, maxGap: 6 },
            4: { minGap: 6, maxGap: 8 }
        };
        return gapRanges[bookLevel] || { minGap: 1, maxGap: 3 };
    }
    
    /**
     * Find all valid books for a given gap value
     * @param {number} gapUsed - The gap used in the recipe
     * @returns {Array<number>} Array of valid book levels
     */
    findValidBooksForGap(gapUsed) {
        const validBooks = [];
        for (let book = 0; book <= this.maxAlchemyBook; book++) {
            const range = this.getGapRangeForBook(book);
            if (gapUsed >= range.minGap && gapUsed <= range.maxGap) {
                validBooks.push(book);
            }
        }
        return validBooks;
    }
    
    /**
     * Generate all recipes for an item across ALL possible book levels
     * @param {Object} targetItem - The item to craft
     * @returns {Array<Object>} Array of recipe objects across all book levels
     */
    generateAllRecipes(targetItem) {
        const targetBases = this.parseBases(targetItem.base);
        const canUseAlchemyBook = targetBases.length < 5;
        let allRecipes = [];
        
        // Generate recipes for each book level
        const maxBookLevel = canUseAlchemyBook ? this.maxAlchemyBook : 0;
        for (let book = 0; book <= maxBookLevel; book++) {
            const bookRecipes = this.generateRecipes(targetItem, book);
            for (const recipe of bookRecipes) {
                // For each recipe, find all valid books for its gap
                const validBooks = this.findValidBooksForGap(recipe.gapUsed);
                recipe.validBooks = validBooks;
                // Use the lowest valid book for display
                recipe.alchemyBook = validBooks[0];
                
                // Check if we already have this exact recipe
                const isDuplicate = allRecipes.some(r => this.recipesEqual(r, recipe));
                if (!isDuplicate) {
                    allRecipes.push(recipe);
                }
            }
        }
        
        // Sort by gap then book
        allRecipes.sort((a, b) => {
            if (a.gapUsed !== b.gapUsed) return a.gapUsed - b.gapUsed;
            if (a.validBooks[0] !== b.validBooks[0]) return a.validBooks[0] - b.validBooks[0];
            return 0;
        });
        
        return allRecipes;
    }

    /**
     * Generate all recipes for an item with pagination
     * Recipes are shown once with all valid books listed (no duplication)
     * @param {Object} targetItem - The item to craft
     * @param {number} page - Page number (1-based)
     * @param {number} alchemyBookFilter - Filter by alchemy book level (null for all)
     * @param {number} gapFilter - Filter by specific gap (null for all)
     * @returns {Object} Paginated recipes with metadata
     */
    getPaginatedRecipes(targetItem, page = 1, alchemyBookFilter = null, gapFilter = null) {
        // Use the new generateAllRecipes method to get ALL recipes across ALL book levels
        const allGeneratedRecipes = this.generateAllRecipes(targetItem);
        
        // Apply filters
        let filteredRecipes = [];
        for (const recipe of allGeneratedRecipes) {
            const validBooks = recipe.validBooks || this.findValidBooksForGap(recipe.gapUsed);
            
            // Apply book filter: recipe is valid if the selected book is in its valid books
            if (alchemyBookFilter !== null && !validBooks.includes(alchemyBookFilter)) {
                continue;
            }
            
            // Apply gap filter: recipe is valid if its gap matches the selected gap
            if (gapFilter !== null && recipe.gapUsed !== gapFilter) {
                continue;
            }
            
            // Check for duplicate
            const isDuplicate = filteredRecipes.some(r => this.recipesEqual(r, recipe));
            if (!isDuplicate) {
                filteredRecipes.push({
                    ...recipe,
                    validBooks: validBooks,
                    alchemyBook: validBooks[0] || recipe.alchemyBook || 0
                });
            }
        }
        
        // Sort by gap (efficiency), then by lowest valid book
        filteredRecipes.sort((a, b) => {
            if (a.gapUsed !== b.gapUsed) {
                return a.gapUsed - b.gapUsed;
            }
            return a.alchemyBook - b.alchemyBook;
        });
        
        // Paginate
        const totalRecipes = filteredRecipes.length;
        const totalPages = Math.ceil(totalRecipes / this.maxRecipesPerPage);
        const startIndex = (page - 1) * this.maxRecipesPerPage;
        const endIndex = startIndex + this.maxRecipesPerPage;
        const paginatedRecipes = filteredRecipes.slice(startIndex, endIndex);
        
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