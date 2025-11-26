// const express = require('express');
// const http = require('http');
// const { Server } = require('socket.io');
// const cors = require('cors');

// // IMPORT THE MAP UTILS (Make sure you created this file in step 1)
// const { getLevelConfig, generateSolvableMap, ROWS, COLS } = require('./utils/mapUtils');

// const app = express();
// app.use(cors());

// const server = http.createServer(app);

// const io = new Server(server, {
//   cors: { origin: "*", methods: ["GET", "POST"] }
// });

// const rooms = {};

// // --- CHAOS LOGIC: TRIGGER CURSE ---
// function triggerRandomCurse(roomCode) {
//   const room = rooms[roomCode];
//   if (!room) return;

//   // If a curse is already active, don't overlap
//   if (room.isCursed) return;

//   const curseType = "MIRROR"; // Currently only one type, easy to add more later
  
//   room.isCursed = true;
  
//   // 1. Notify Frontend
//   io.to(roomCode).emit('curse_triggered', { type: curseType, duration: 5 });

//   // 2. Remove Curse after 5 seconds
//   setTimeout(() => {
//     if (rooms[roomCode]) {
//       rooms[roomCode].isCursed = false;
//       io.to(roomCode).emit('curse_ended');
//     }
//   }, 5000);
// }

// // --- TIMER LOGIC (With Curse Chance) ---
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

//     // --- CURSE CHANCE ---
//     // Logic: If time ends in '0' or '5' (e.g. 45s, 40s, 35s), roll a dice.
//     // 30% chance to trigger a curse.
//     if (room.timeLeft % 5 === 0 && room.timeLeft > 5 && room.timeLeft < config.time) {
//       if (Math.random() < 0.3) {
//         triggerRandomCurse(roomCode);
//       }
//     }

//     if (room.timeLeft <= 0) {
//       clearInterval(room.timerInterval);
//       io.to(roomCode).emit('game_over', "⏳ TIME'S UP! The darkness consumed you.");
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
//         isCursed: false
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
//           io.to(roomCode).emit('game_over', "💣 BOOM! Watch your step!");
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
//       room.isCursed = false; // Reset curse
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
//       room.isCursed = false; // Reset curse
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

// Import Utils
const { getLevelConfig, generateSolvableMap, ROWS, COLS } = require('./utils/mapUtils');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const rooms = {};

// --- CURSE LOGIC ---
function triggerRandomCurse(roomCode) {
  const room = rooms[roomCode];
  if (!room || room.isCursed) return;

  room.isCursed = true;
  io.to(roomCode).emit('curse_triggered', { type: "MIRROR", duration: 5 });

  setTimeout(() => {
    if (rooms[roomCode]) {
      rooms[roomCode].isCursed = false;
      io.to(roomCode).emit('curse_ended');
    }
  }, 5000);
}

// --- TIMER LOGIC ---
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

    // Curse Chance (30% chance every 5s)
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
        isCursed: false,
        hasKey: false // New State
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

    // Check Bounds
    if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
      const currentMap = room.map;
      const cell = currentMap[y][x];

      if (cell === 1) return; // Wall

      // DOOR LOGIC (4)
      if (cell === 4) {
        if (!room.hasKey) return; // Locked
        // If hasKey, pass through
      }

      room.position = { x, y };

      // KEY LOGIC (5)
      if (cell === 5) {
        room.hasKey = true;
        currentMap[y][x] = 0; // Remove key
        io.to(roomCode).emit('key_collected');
        io.to(roomCode).emit('map_updated', currentMap);
      }

      // TRAP LOGIC (3)
      if (cell === 3) {
        clearInterval(room.timerInterval);
        room.position = { x: 1, y: 1 };
        room.hasKey = false; // Lost key
        io.to(roomCode).emit('game_over', "💣 BOOM! Trap hit!");
        io.to(roomCode).emit('update_position', room.position);
        return;
      }

      // WIN LOGIC (9)
      if (cell === 9) {
        clearInterval(room.timerInterval);
        io.to(roomCode).emit('game_won', true);
      }

      io.to(roomCode).emit('update_position', room.position);
    }
  });

  socket.on('restart_game', (roomCode) => {
    const room = rooms[roomCode];
    if (room) {
      const config = getLevelConfig(room.level);
      room.map = generateSolvableMap(config);
      room.position = { x: 1, y: 1 };
      room.isCursed = false;
      room.hasKey = false;
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
      room.isCursed = false;
      room.hasKey = false;
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