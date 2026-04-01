// Manufacture Data Loader
// Loads manufacture data from wlo_master_index.json and merges with manufacture-index.json

let manufactureDataLoaded = false;
let manufactureItems = {};

// Function to load manufacture data from JSON
async function loadManufactureData() {
  try {
    // Load both files
    const [masterResponse, manufactureResponse] = await Promise.all([
      fetch('data/wlo_master_complete.json'),
      fetch('data/manufacture-index.json')
    ]);
    
    const masterData = await masterResponse.json();
    const manufactureDataFull = await manufactureResponse.json();
    const manufactureItemsData = manufactureDataFull.items;
    
    // Collect ALL craftable items - both top-level keys AND nested ingredients
    const allItemNames = new Set(Object.keys(masterData));
    
    function collectAllItems(item) {
      if (!item.ingredients) return;
      for (const ing of item.ingredients) {
        if (ing.data && ing.data.name) {
          allItemNames.add(ing.data.name);
          collectAllItems(ing.data);
        }
      }
    }
    
    // Collect all items from master data (including nested)
    for (const item of Object.values(masterData)) {
      collectAllItems(item);
    }
    
    // Also add all items from manufacture-index
    for (const name of Object.keys(manufactureItemsData)) {
      allItemNames.add(name);
    }
    
    // Build type inference mapping based on common patterns
    const typePatterns = {
      'Furniture': ['Table', 'Chair', 'Bed', 'Desk', 'Lamp', 'Sofa', 'Cabinet', 'Drawer', 'Shelf', 'Bench', 'Floor', 'Wall', 'Window', 'Door', 'Mirror', 'Clock', 'Radio', 'TV', 'Computer', 'Phone', 'Fan', 'Heater', 'AC', 'Generator', 'Motor', 'Pump', 'Tank', 'Pipe', 'Filter', 'Equipment', 'Machine', 'Gear', 'Winch', 'Pulley', 'Saw', 'Kiln', 'Furnace', 'Lathe', 'Platform', 'Basin', 'Rope', 'Wire', 'Winding', 'Transformer', 'Device'],
      'Tools': ['Tool', 'Hammer', 'Wrench', 'Screwdriver', 'Pliers', 'Knife', 'Axe', 'Saw', 'Drill', 'Grinder', 'Blade', 'Needle', 'Machine'],
      'Vehicle': ['Car', 'Bike', 'Boat', 'Ship', 'Plane', 'Yacht', 'Cart', 'Wagon', 'UFO', 'Ufo', 'Vehicle', 'Jet', 'Helicopter', 'Submarine', 'Raft', 'Canoe', 'Skateboard', 'Rocket'],
      'Manufacture': ['Bread', 'Cake', 'Juice', 'Soup', 'Stew', 'Rice', 'Noodle', 'Potion', 'Medicine', 'Egg', 'Milk', 'Cheese', 'Wine', 'Tea', 'Coffee', 'Water', 'Salt', 'Sugar', 'Flour', 'Dough', 'Meat', 'Fish', 'Vegetable', 'Fruit']
    };
    
    function inferType(name) {
      for (const [type, patterns] of Object.entries(typePatterns)) {
        for (const pattern of patterns) {
          if (name.includes(pattern)) {
            return type;
          }
        }
      }
      return 'Manufacture';
    }
    
    // Helper to create entry from master item
    function createMasterEntry(name, item) {
      let timeValue = 0;
      if (item.time) {
        const timeMatch = item.time.toString().match(/(\d+)/);
        if (timeMatch) {
          timeValue = parseInt(timeMatch[1], 10);
        }
      }
      
      return {
        name: item.name,
        type: inferType(item.name),
        tool: item.tool || '',
        time: timeValue,
        image_path: item.image_path || '',
        image_id: item.image_id || null,
        ingredients: item.ingredients || [],
        materials: []
      };
    }
    
    // Helper to create entry from manufacture item
    function createManufactureEntry(name, item) {
      const steps = item.manufacturing_steps || [];
      const rootStep = steps.length > 0 ? steps[steps.length - 1] : null;
      
      return {
        name: item.name,
        type: item.type || inferType(item.name),
        tool: rootStep ? rootStep.tool : '',
        time: item.total_time_mins || (rootStep ? rootStep.time : 0),
        image_path: item.image_path || '',
        image_id: item.image_id,
        ingredients: [],
        materials: []
      };
    }
    
    // Add all items from manufacture-index first
    for (const [name, item] of Object.entries(manufactureItemsData)) {
      manufactureItems[name] = createManufactureEntry(name, item);
    }
    
    // Overlay with master data
    for (const [name, item] of Object.entries(masterData)) {
      manufactureItems[name] = createMasterEntry(name, item);
    }
    
    // Add ALL nested items from master data
    function addNestedItems(item) {
      if (!item.ingredients) return;
      for (const ing of item.ingredients) {
        if (ing.data && ing.data.name) {
          const ingName = ing.data.name;
          if (!manufactureItems[ingName]) {
            manufactureItems[ingName] = createMasterEntry(ingName, ing.data);
          }
          addNestedItems(ing.data);
        }
      }
    }
    
    for (const item of Object.values(masterData)) {
      addNestedItems(item);
    }
    
    manufactureDataLoaded = true;
    console.log(`Loaded ${Object.keys(manufactureItems).length} manufacture items`);
    return manufactureItems;
  } catch (error) {
    console.error('Error loading manufacture data:', error);
    return null;
  }
}

// Function to get all manufacture data
function getManufactureData() {
  return manufactureItems;
}

// Export for use
window.loadManufactureData = loadManufactureData;
window.getManufactureData = getManufactureData;
window.manufactureDataLoaded = manufactureDataLoaded;
