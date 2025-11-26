// const express = require('express');
// const http = require('http');
// const { Server } = require('socket.io');
// const cors = require('cors');

// const app = express();
// app.use(cors());

// const server = http.createServer(app);

// const io = new Server(server, {
//   cors: { origin: "*", methods: ["GET", "POST"] }
// });

// const rooms = {};
// const ROWS = 10;
// const COLS = 10;

// // --- LEVEL CONFIGURATION (Difficulty Settings) ---
// function getLevelConfig(level) {
//   // As level increases -> Time decreases, Traps & Decoys increase
//   if (level === 1) return { time: 60, trapChance: 0.1, decoyChance: 0.3 };
//   if (level === 2) return { time: 50, trapChance: 0.2, decoyChance: 0.4 };
//   if (level === 3) return { time: 40, trapChance: 0.3, decoyChance: 0.5 };
//   if (level === 4) return { time: 30, trapChance: 0.4, decoyChance: 0.6 };
  
//   // Level 5+ (Extreme Mode)
//   return { time: 25, trapChance: 0.5, decoyChance: 0.7 };
// }

// // --- MAP GENERATOR ---
// function generateSolvableMap(difficulty) {
//   let map = Array(ROWS).fill().map(() => Array(COLS).fill(1));
//   let x = 1, y = 1;
//   const goalX = 8, goalY = 8;
  
//   map[y][x] = 2; // Start
//   const safePath = new Set(); 
//   safePath.add(`${y},${x}`);

//   // 1. Create Golden Path (Guaranteed Solution)
//   while (x !== goalX || y !== goalY) {
//     let moveRight = Math.random() > 0.5;
//     if (x === goalX) moveRight = false; 
//     if (y === goalY) moveRight = true; 

//     if (moveRight) x++; else y++;
//     map[y][x] = 0; 
//     safePath.add(`${y},${x}`); 
//   }
//   map[goalY][goalX] = 9; // Goal

//   // 2. Add Decoys (Confusion) based on Level
//   for (let r = 1; r < ROWS - 1; r++) {
//     for (let c = 1; c < COLS - 1; c++) {
//       if (map[r][c] === 1 && Math.random() < difficulty.decoyChance) {
//         map[r][c] = 0;
//       }
//     }
//   }

//   // 3. Add Traps (Danger) based on Level
//   for (let r = 1; r < ROWS - 1; r++) {
//     for (let c = 1; c < COLS - 1; c++) {
//       if (map[r][c] === 0 && !safePath.has(`${r},${c}`)) {
//         if (Math.random() < difficulty.trapChance) {
//           map[r][c] = 3;
//         }
//       }
//     }
//   }

//   // Safety checks
//   map[1][1] = 2;
//   map[8][8] = 9;
//   return map;
// }

// // --- TIMER LOGIC ---
// function startRoomTimer(roomCode) {
//   const room = rooms[roomCode];
//   if (!room) return;
//   if (room.timerInterval) clearInterval(room.timerInterval);

//   // Set time based on CURRENT LEVEL
//   const config = getLevelConfig(room.level);
//   room.timeLeft = config.time;
  
//   room.timerInterval = setInterval(() => {
//     if (!rooms[roomCode]) return clearInterval(room.timerInterval);

//     room.timeLeft -= 1;
//     io.to(roomCode).emit('timer_update', room.timeLeft);

//     if (room.timeLeft <= 0) {
//       clearInterval(room.timerInterval);
//       io.to(roomCode).emit('game_over', "⏳ TIME'S UP! Too slow for this level!");
//     }
//   }, 1000);
// }

// // --- SOCKET LOGIC ---
// io.on('connection', (socket) => {
//   console.log(`User Connected: ${socket.id}`);

//   // 1. JOIN ROOM
//   socket.on('join_room', (roomCode) => {
//     if (!rooms[roomCode]) {
//       const startLevel = 1;
//       const config = getLevelConfig(startLevel);
      
//       rooms[roomCode] = {
//         players: [],
//         level: startLevel, 
//         map: generateSolvableMap(config), 
//         position: { x: 1, y: 1 },
//         timeLeft: config.time,
//         timerInterval: null
//       };
//     }
//     const room = rooms[roomCode];

//     if (room.players.length >= 2) {
//       socket.emit('error_message', "Room Full!");
//       return;
//     }
//     socket.join(roomCode);
//     room.players.push(socket.id);

//     let role = room.players.length === 1 ? 'walker' : 'watcher';
//     socket.emit('room_joined', { roomCode, role });

//     if (room.players.length === 2) {
//       startRoomTimer(roomCode);
//       io.to(roomCode).emit('start_game', { 
//         map: room.map, 
//         startPos: { x: 1, y: 1 },
//         level: room.level 
//       });
//     }
//   });

//   // 2. MOVE PLAYER
//   socket.on('move_player', ({ roomCode, direction }) => {
//     const room = rooms[roomCode];
//     if (!room || room.timeLeft <= 0) return;

//     let { x, y } = room.position;
//     if (direction === 'UP') y -= 1;
//     if (direction === 'DOWN') y += 1;
//     if (direction === 'LEFT') x -= 1;
//     if (direction === 'RIGHT') x += 1;

//     if (y < 0 || y >= ROWS || x < 0 || x >= COLS) return;
//     const currentMap = room.map;

//     if (currentMap[y][x] !== 1) { 
//       if (currentMap[y][x] === 3) {
//         // DIED
//         clearInterval(room.timerInterval);
//         room.position = { x: 1, y: 1 }; 
//         io.to(roomCode).emit('game_over', "💣 BOOM! Trap hit!");
//         io.to(roomCode).emit('update_position', room.position);
//       } else {
//         // SAFE
//         room.position = { x, y };
//         io.to(roomCode).emit('update_position', room.position);
        
//         if (currentMap[y][x] === 9) {
//           // WON
//           clearInterval(room.timerInterval);
//           io.to(roomCode).emit('game_won', true); 
//         }
//       }
//     }
//   });

//   // 3. RETRY CURRENT LEVEL (Does NOT reset to 1)
//   socket.on('restart_game', (roomCode) => {
//     const room = rooms[roomCode];
//     if (room) {
//       // Keep room.level same!
//       const config = getLevelConfig(room.level);
      
//       room.map = generateSolvableMap(config);
//       room.position = { x: 1, y: 1 };
      
//       startRoomTimer(roomCode);
//       io.to(roomCode).emit('start_game', { map: room.map, startPos: room.position, level: room.level });
//       io.to(roomCode).emit('reset_game_state');
//     }
//   });

//   // 4. NEXT LEVEL (Increases Difficulty)
//   socket.on('next_level', (roomCode) => {
//     const room = rooms[roomCode];
//     if (room) {
//       room.level += 1; // Increase Level
//       const config = getLevelConfig(room.level);
      
//       room.map = generateSolvableMap(config);
//       room.position = { x: 1, y: 1 };
      
//       startRoomTimer(roomCode);
//       io.to(roomCode).emit('start_game', { map: room.map, startPos: room.position, level: room.level });
//       io.to(roomCode).emit('reset_game_state');
//     }
//   });

//   socket.on('disconnect', () => {});
// });

// server.listen(3001, () => {
//   console.log("SERVER RUNNING ON PORT 3001");
// });









// const express = require('express');
// const http = require('http');
// const { Server } = require('socket.io');
// const cors = require('cors');

// // IMPORT THE NEW UTILS
// const { getLevelConfig, generateSolvableMap, ROWS, COLS } = require('./utils/mapUtils');

// const app = express();
// app.use(cors());

// const server = http.createServer(app);

// const io = new Server(server, {
//   cors: { origin: "*", methods: ["GET", "POST"] }
// });

// const rooms = {};

// // --- CURSE LOGIC (NEW) ---
// function triggerRandomCurse(roomCode) {
//   const room = rooms[roomCode];
//   if (!room) return;

//   // Clear existing curse timeout
//   if (room.curseTimeout) clearTimeout(room.curseTimeout);

//   // 1. Pick a Curse
//   const curseType = "MIRROR"; // For now, only Mirror. Later add "BLIND"
  
//   // 2. Notify Frontend
//   io.to(roomCode).emit('curse_triggered', { type: curseType, duration: 5 });

//   // 3. Remove Curse after 5 seconds
//   room.curseTimeout = setTimeout(() => {
//     io.to(roomCode).emit('curse_ended');
//   }, 5000);
// }

// // --- TIMER LOGIC (Updated to trigger curses) ---
// function startRoomTimer(roomCode) {
//   const room = rooms[roomCode];
//   if (!room) return;
//   if (room.timerInterval) clearInterval(room.timerInterval);

//   const config = getLevelConfig(room.level);
//   room.timeLeft = config.time;
  
//   room.timerInterval = setInterval(() => {
//     if (!rooms[roomCode]) return clearInterval(room.timerInterval);

//     room.timeLeft -= 1;
//     io.to(roomCode).emit('timer_update', room.timeLeft);

//     // --- CURSE CHANCE (NEW) ---
//     // Every 10 seconds (when time ends in 0), 40% chance of curse
//     if (room.timeLeft % 10 === 0 && room.timeLeft > 5 && Math.random() < 0.4) {
//       triggerRandomCurse(roomCode);
//     }

//     if (room.timeLeft <= 0) {
//       clearInterval(room.timerInterval);
//       io.to(roomCode).emit('game_over', "⏳ TIME'S UP! Too slow!");
//     }
//   }, 1000);
// }

// // --- SOCKET LOGIC ---
// io.on('connection', (socket) => {
//   console.log(`User Connected: ${socket.id}`);

//   socket.on('join_room', (roomCode) => {
//     if (!rooms[roomCode]) {
//       const startLevel = 1;
//       const config = getLevelConfig(startLevel);
//       rooms[roomCode] = {
//         players: [],
//         level: startLevel,
//         map: generateSolvableMap(config),
//         position: { x: 1, y: 1 },
//         timeLeft: config.time,
//         timerInterval: null,
//         curseTimeout: null // Track curse
//       };
//     }
//     const room = rooms[roomCode];

//     if (room.players.length >= 2) {
//       socket.emit('error_message', "Room Full!");
//       return;
//     }
//     socket.join(roomCode);
//     room.players.push(socket.id);

//     let role = room.players.length === 1 ? 'walker' : 'watcher';
//     socket.emit('room_joined', { roomCode, role });

//     if (room.players.length === 2) {
//       startRoomTimer(roomCode);
//       io.to(roomCode).emit('start_game', { 
//         map: room.map, startPos: { x: 1, y: 1 }, level: room.level 
//       });
//     }
//   });

//   socket.on('move_player', ({ roomCode, direction }) => {
//     const room = rooms[roomCode];
//     if (!room || room.timeLeft <= 0) return;

//     let { x, y } = room.position;
//     if (direction === 'UP') y -= 1;
//     if (direction === 'DOWN') y += 1;
//     if (direction === 'LEFT') x -= 1;
//     if (direction === 'RIGHT') x += 1;

//     // Boundary & Wall Check
//     if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
//       const currentMap = room.map;
//       if (currentMap[y][x] !== 1) { 
//         if (currentMap[y][x] === 3) {
//           clearInterval(room.timerInterval);
//           room.position = { x: 1, y: 1 }; 
//           io.to(roomCode).emit('game_over', "💣 BOOM! Trap hit!");
//           io.to(roomCode).emit('update_position', room.position);
//         } else {
//           room.position = { x, y };
//           io.to(roomCode).emit('update_position', room.position);
//           if (currentMap[y][x] === 9) {
//             clearInterval(room.timerInterval);
//             io.to(roomCode).emit('game_won', true); 
//           }
//         }
//       }
//     }
//   });

//   socket.on('restart_game', (roomCode) => {
//     const room = rooms[roomCode];
//     if (room) {
//       const config = getLevelConfig(room.level);
//       room.map = generateSolvableMap(config);
//       room.position = { x: 1, y: 1 };
//       startRoomTimer(roomCode);
//       io.to(roomCode).emit('start_game', { map: room.map, startPos: room.position, level: room.level });
//       io.to(roomCode).emit('reset_game_state');
//     }
//   });

//   socket.on('next_level', (roomCode) => {
//     const room = rooms[roomCode];
//     if (room) {
//       room.level += 1;
//       const config = getLevelConfig(room.level);
//       room.map = generateSolvableMap(config);
//       room.position = { x: 1, y: 1 };
//       startRoomTimer(roomCode);
//       io.to(roomCode).emit('start_game', { map: room.map, startPos: room.position, level: room.level });
//       io.to(roomCode).emit('reset_game_state');
//     }
//   });

//   socket.on('disconnect', () => {});
// });

// server.listen(3001, () => {
//   console.log("SERVER RUNNING ON PORT 3001");
// });







const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// IMPORT THE MAP UTILS (Make sure you created this file in step 1)
const { getLevelConfig, generateSolvableMap, ROWS, COLS } = require('./utils/mapUtils');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const rooms = {};

// --- CHAOS LOGIC: TRIGGER CURSE ---
function triggerRandomCurse(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;

  // If a curse is already active, don't overlap
  if (room.isCursed) return;

  const curseType = "MIRROR"; // Currently only one type, easy to add more later
  
  room.isCursed = true;
  
  // 1. Notify Frontend
  io.to(roomCode).emit('curse_triggered', { type: curseType, duration: 5 });

  // 2. Remove Curse after 5 seconds
  setTimeout(() => {
    if (rooms[roomCode]) {
      rooms[roomCode].isCursed = false;
      io.to(roomCode).emit('curse_ended');
    }
  }, 5000);
}

// --- TIMER LOGIC (With Curse Chance) ---
function startRoomTimer(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;
  if (room.timerInterval) clearInterval(room.timerInterval);

  const config = getLevelConfig(room.level);
  room.timeLeft = config.time;
  
  room.timerInterval = setInterval(() => {
    if (!rooms[roomCode]) return clearInterval(room.timerInterval);

    room.timeLeft -= 1;
    io.to(roomCode).emit('timer_update', room.timeLeft);

    // --- CURSE CHANCE ---
    // Logic: If time ends in '0' or '5' (e.g. 45s, 40s, 35s), roll a dice.
    // 30% chance to trigger a curse.
    if (room.timeLeft % 5 === 0 && room.timeLeft > 5 && room.timeLeft < config.time) {
      if (Math.random() < 0.3) {
        triggerRandomCurse(roomCode);
      }
    }

    if (room.timeLeft <= 0) {
      clearInterval(room.timerInterval);
      io.to(roomCode).emit('game_over', "⏳ TIME'S UP! The darkness consumed you.");
    }
  }, 1000);
}

// --- SOCKET LOGIC ---
io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on('join_room', (roomCode) => {
    if (!rooms[roomCode]) {
      const startLevel = 1;
      const config = getLevelConfig(startLevel);
      rooms[roomCode] = {
        players: [],
        level: startLevel,
        map: generateSolvableMap(config),
        position: { x: 1, y: 1 },
        timeLeft: config.time,
        timerInterval: null,
        isCursed: false
      };
    }
    const room = rooms[roomCode];

    if (room.players.length >= 2) {
      socket.emit('error_message', "Room Full!");
      return;
    }
    socket.join(roomCode);
    room.players.push(socket.id);

    let role = room.players.length === 1 ? 'walker' : 'watcher';
    socket.emit('room_joined', { roomCode, role });

    if (room.players.length === 2) {
      startRoomTimer(roomCode);
      io.to(roomCode).emit('start_game', { 
        map: room.map, startPos: { x: 1, y: 1 }, level: room.level 
      });
    }
  });

  socket.on('move_player', ({ roomCode, direction }) => {
    const room = rooms[roomCode];
    if (!room || room.timeLeft <= 0) return;

    let { x, y } = room.position;
    if (direction === 'UP') y -= 1;
    if (direction === 'DOWN') y += 1;
    if (direction === 'LEFT') x -= 1;
    if (direction === 'RIGHT') x += 1;

    // Boundary & Wall Check
    if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
      const currentMap = room.map;
      if (currentMap[y][x] !== 1) { 
        if (currentMap[y][x] === 3) {
          clearInterval(room.timerInterval);
          room.position = { x: 1, y: 1 }; 
          io.to(roomCode).emit('game_over', "💣 BOOM! Watch your step!");
          io.to(roomCode).emit('update_position', room.position);
        } else {
          room.position = { x, y };
          io.to(roomCode).emit('update_position', room.position);
          if (currentMap[y][x] === 9) {
            clearInterval(room.timerInterval);
            io.to(roomCode).emit('game_won', true); 
          }
        }
      }
    }
  });

  socket.on('restart_game', (roomCode) => {
    const room = rooms[roomCode];
    if (room) {
      const config = getLevelConfig(room.level);
      room.map = generateSolvableMap(config);
      room.position = { x: 1, y: 1 };
      room.isCursed = false; // Reset curse
      startRoomTimer(roomCode);
      io.to(roomCode).emit('start_game', { map: room.map, startPos: room.position, level: room.level });
      io.to(roomCode).emit('reset_game_state');
    }
  });

  socket.on('next_level', (roomCode) => {
    const room = rooms[roomCode];
    if (room) {
      room.level += 1;
      const config = getLevelConfig(room.level);
      room.map = generateSolvableMap(config);
      room.position = { x: 1, y: 1 };
      room.isCursed = false; // Reset curse
      startRoomTimer(roomCode);
      io.to(roomCode).emit('start_game', { map: room.map, startPos: room.position, level: room.level });
      io.to(roomCode).emit('reset_game_state');
    }
  });

  socket.on('disconnect', () => {});
});

server.listen(3001, () => {
  console.log("SERVER RUNNING ON PORT 3001");
});