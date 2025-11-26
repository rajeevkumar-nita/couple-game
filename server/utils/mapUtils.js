// const ROWS = 10;
// const COLS = 10;

// // --- LEVEL CONFIGURATION ---
// function getLevelConfig(level) {
//   if (level === 1) return { time: 60, trapChance: 0.1, decoyChance: 0.3 };
//   if (level === 2) return { time: 50, trapChance: 0.2, decoyChance: 0.4 };
//   if (level === 3) return { time: 40, trapChance: 0.3, decoyChance: 0.5 };
//   if (level === 4) return { time: 35, trapChance: 0.4, decoyChance: 0.6 };
//   // Level 5+ (Extreme)
//   return { time: 30, trapChance: 0.5, decoyChance: 0.7 };
// }

// // --- MAP GENERATOR (With Key & Door) ---
// function generateSolvableMap(difficulty) {
//   let map = Array(ROWS).fill().map(() => Array(COLS).fill(1));
//   let x = 1, y = 1;
//   const goalX = 8, goalY = 8;
  
//   map[y][x] = 2; // Start
  
//   // Track path for placing items
//   const pathCoords = []; 
//   pathCoords.push({x, y});
//   const safePath = new Set(); 
//   safePath.add(`${y},${x}`);

//   // 1. Golden Path
//   while (x !== goalX || y !== goalY) {
//     let moveRight = Math.random() > 0.5;
//     if (x === goalX) moveRight = false; 
//     if (y === goalY) moveRight = true; 

//     if (moveRight) x++; else y++;
//     map[y][x] = 0; 
    
//     // Save coordinate (excluding goal)
//     if (x !== goalX || y !== goalY) {
//        pathCoords.push({x, y});
//     }
//     safePath.add(`${y},${x}`); 
//   }
//   map[goalY][goalX] = 9; // Goal

//   // 2. Add Decoys
//   for (let r = 1; r < ROWS - 1; r++) {
//     for (let c = 1; c < COLS - 1; c++) {
//       if (map[r][c] === 1 && Math.random() < difficulty.decoyChance) {
//         map[r][c] = 0;
//       }
//     }
//   }

//   // 3. Add Traps
//   for (let r = 1; r < ROWS - 1; r++) {
//     for (let c = 1; c < COLS - 1; c++) {
//       if (map[r][c] === 0 && !safePath.has(`${r},${c}`)) {
//         if (Math.random() < difficulty.trapChance) {
//           map[r][c] = 3;
//         }
//       }
//     }
//   }

//   // 4. PLACE KEY (5) & DOOR (4)
//   // Key: Randomly in the first 60% of the path
//   const keyIndex = Math.floor(Math.random() * (pathCoords.length * 0.6)) + 1;
//   const keyPos = pathCoords[keyIndex];
//   if (keyPos) map[keyPos.y][keyPos.x] = 5; 

//   // Door: Near the end of the path (before goal)
//   const doorIndex = pathCoords.length - 2; 
//   const doorPos = pathCoords[doorIndex];
//   if (doorPos && doorPos !== keyPos) map[doorPos.y][doorPos.x] = 4;

//   // Safety
//   map[1][1] = 2;
//   map[8][8] = 9;
//   return map;
// }

// module.exports = { getLevelConfig, generateSolvableMap, ROWS, COLS };






const ROWS = 10;
const COLS = 10;

// --- DYNAMIC DIFFICULTY SCALING ---
function getLevelConfig(level) {
  // Base values
  let time = 60; 
  let trapChance = 0.15; 
  let decoyChance = 0.2;

  // Formula: As level goes up, time goes down, traps go up.
  // Level 1: 60s | Level 5: 40s | Level 10: 25s | Level 15: 20s (Min)
  time = Math.max(20, 60 - (level - 1) * 4);

  // Level 1: 15% | Level 5: 35% | Level 10: 60% (Max)
  trapChance = Math.min(0.6, 0.15 + (level * 0.05));

  // Decoys increase slightly
  decoyChance = Math.min(0.8, 0.2 + (level * 0.05));

  return { time, trapChance, decoyChance };
}

// --- MAP GENERATOR ---
function generateSolvableMap(difficulty) {
  let map = Array(ROWS).fill().map(() => Array(COLS).fill(1));
  let x = 1, y = 1;
  const goalX = 8, goalY = 8;
  
  map[y][x] = 2; // Start
  
  // Track path
  const pathCoords = []; 
  pathCoords.push({x, y});
  const safePath = new Set(); 
  safePath.add(`${y},${x}`);

  // 1. Golden Path
  while (x !== goalX || y !== goalY) {
    let moveRight = Math.random() > 0.5;
    if (x === goalX) moveRight = false; 
    if (y === goalY) moveRight = true; 

    if (moveRight) x++; else y++;
    map[y][x] = 0; 
    
    if (x !== goalX || y !== goalY) pathCoords.push({x, y});
    safePath.add(`${y},${x}`); 
  }
  map[goalY][goalX] = 9; // Goal

  // 2. Decoys
  for (let r = 1; r < ROWS - 1; r++) {
    for (let c = 1; c < COLS - 1; c++) {
      if (map[r][c] === 1 && Math.random() < difficulty.decoyChance) {
        map[r][c] = 0;
      }
    }
  }

  // 3. Traps
  for (let r = 1; r < ROWS - 1; r++) {
    for (let c = 1; c < COLS - 1; c++) {
      if (map[r][c] === 0 && !safePath.has(`${r},${c}`)) {
        if (Math.random() < difficulty.trapChance) {
          map[r][c] = 3;
        }
      }
    }
  }

  // 4. Key & Door (More random placement)
  const keyIndex = Math.floor(Math.random() * (pathCoords.length * 0.7)) + 1;
  const keyPos = pathCoords[keyIndex];
  if (keyPos) map[keyPos.y][keyPos.x] = 5; 

  const doorIndex = pathCoords.length - 2; 
  const doorPos = pathCoords[doorIndex];
  if (doorPos && doorPos !== keyPos) map[doorPos.y][doorPos.x] = 4;

  map[1][1] = 2;
  map[8][8] = 9;
  return map;
}

module.exports = { getLevelConfig, generateSolvableMap, ROWS, COLS };