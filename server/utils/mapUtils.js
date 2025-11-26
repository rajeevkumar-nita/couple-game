const ROWS = 10;
const COLS = 10;

// --- LEVEL CONFIGURATION ---
function getLevelConfig(level) {
  if (level === 1) return { time: 60, trapChance: 0.1, decoyChance: 0.3 };
  if (level === 2) return { time: 50, trapChance: 0.2, decoyChance: 0.4 };
  if (level === 3) return { time: 40, trapChance: 0.3, decoyChance: 0.5 };
  if (level === 4) return { time: 30, trapChance: 0.4, decoyChance: 0.6 };
  return { time: 25, trapChance: 0.5, decoyChance: 0.7 };
}

// --- MAP GENERATOR ---
function generateSolvableMap(difficulty) {
  let map = Array(ROWS).fill().map(() => Array(COLS).fill(1));
  let x = 1, y = 1;
  const goalX = 8, goalY = 8;
  
  map[y][x] = 2; 
  const safePath = new Set(); 
  safePath.add(`${y},${x}`);

  // Golden Path
  while (x !== goalX || y !== goalY) {
    let moveRight = Math.random() > 0.5;
    if (x === goalX) moveRight = false; 
    if (y === goalY) moveRight = true; 
    if (moveRight) x++; else y++;
    map[y][x] = 0; 
    safePath.add(`${y},${x}`); 
  }
  map[goalY][goalX] = 9; 

  // Decoys
  for (let r = 1; r < ROWS - 1; r++) {
    for (let c = 1; c < COLS - 1; c++) {
      if (map[r][c] === 1 && Math.random() < difficulty.decoyChance) map[r][c] = 0;
    }
  }

  // Traps
  for (let r = 1; r < ROWS - 1; r++) {
    for (let c = 1; c < COLS - 1; c++) {
      if (map[r][c] === 0 && !safePath.has(`${r},${c}`)) {
        if (Math.random() < difficulty.trapChance) map[r][c] = 3;
      }
    }
  }

  map[1][1] = 2;
  map[8][8] = 9;
  return map;
}

module.exports = { getLevelConfig, generateSolvableMap, ROWS, COLS };