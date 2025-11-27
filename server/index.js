




// const express = require('express');
// const http = require('http');
// const { Server } = require('socket.io');
// const cors = require('cors');

// const { getLevelConfig, generateSolvableMap, ROWS, COLS } = require('./utils/mapUtils');

// const app = express();
// app.use(cors());

// const server = http.createServer(app);

// const io = new Server(server, {
//   cors: { origin: "*", methods: ["GET", "POST"] }
// });

// const rooms = {};

// // --- CHAOS LOGIC ---
// function triggerRandomCurse(roomCode) {
//   const room = rooms[roomCode];
//   if (!room || room.isCursed) return;

//   room.isCursed = true;
  
//   // Pure 50/50 coin flip for Mirror vs Speed
//   const curseType = Math.random() < 0.5 ? "MIRROR" : "SPEED";
//   room.activeCurseType = curseType;

//   // Dynamic Duration: Level 1 = 5s, Level 10 = 8s
//   const duration = Math.min(8, 4 + Math.floor(room.level / 2));

//   io.to(roomCode).emit('curse_triggered', { type: curseType, duration: duration });

//   setTimeout(() => {
//     if (rooms[roomCode]) {
//       rooms[roomCode].isCursed = false;
//       rooms[roomCode].activeCurseType = null;
//       io.to(roomCode).emit('curse_ended');
//     }
//   }, duration * 1000);
// }

// // --- TIMER LOGIC (THE COMPLEX PART) ---
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

//     // --- DYNAMIC CURSE CALCULATOR ---
    
//     // 1. Calculate Check Interval (High levels check more often)
//     // Level 1-4: Check every 5s. Level 5+: Check every 3s.
//     const checkInterval = room.level >= 5 ? 3 : 5;

//     if (room.timeLeft % checkInterval === 0 && room.timeLeft > 3 && room.timeLeft < config.time) {
      
//       // 2. Calculate Probability (Higher levels = Higher chance)
//       // Level 1 = 30%, Level 5 = 50%, Level 10 = 75%
//       let curseProbability = 0.25 + (room.level * 0.05);
//       if (curseProbability > 0.9) curseProbability = 0.9; // Cap at 90%

//       console.log(`Room ${roomCode}: Level ${room.level}, Chance: ${curseProbability.toFixed(2)}`); // Debug Log

//       if (Math.random() < curseProbability) {
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
//         isCursed: false,
//         activeCurseType: null,
//         hasKey: false
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

//   // --- MOVEMENT (SAME AS BEFORE) ---
//   socket.on('move_player', ({ roomCode, direction }) => {
//     const room = rooms[roomCode];
//     if (!room || room.timeLeft <= 0) return;

//     const stepsToMove = (room.activeCurseType === 'SPEED') ? 2 : 1;

//     for (let i = 0; i < stepsToMove; i++) {
//         let { x, y } = room.position;
//         if (direction === 'UP') y -= 1;
//         if (direction === 'DOWN') y += 1;
//         if (direction === 'LEFT') x -= 1;
//         if (direction === 'RIGHT') x += 1;

//         if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
//             const currentMap = room.map;
//             const cell = currentMap[y][x];

//             if (cell === 1) break; 
//             if (cell === 4 && !room.hasKey) break;

//             room.position = { x, y };

//             if (cell === 5) {
//                 room.hasKey = true;
//                 currentMap[y][x] = 0;
//                 io.to(roomCode).emit('key_collected');
//                 io.to(roomCode).emit('map_updated', currentMap);
//             }

//             if (cell === 3) {
//                 clearInterval(room.timerInterval);
//                 room.position = { x: 1, y: 1 };
//                 room.hasKey = false;
//                 const msg = room.activeCurseType === 'SPEED' ? "⚡ TOO FAST! You ran into a trap!" : "💣 BOOM! Trap hit!";
//                 io.to(roomCode).emit('game_over', msg);
//                 io.to(roomCode).emit('update_position', room.position);
//                 return;
//             }

//             if (cell === 9) {
//                 clearInterval(room.timerInterval);
//                 io.to(roomCode).emit('game_won', true);
//                 return;
//             }
//         }
//     }
//     io.to(roomCode).emit('update_position', room.position);
//   });

//   socket.on('restart_game', (roomCode) => {
//     const room = rooms[roomCode];
//     if (room) {
//       const config = getLevelConfig(room.level);
//       room.map = generateSolvableMap(config);
//       room.position = { x: 1, y: 1 };
//       room.isCursed = false;
//       room.activeCurseType = null;
//       room.hasKey = false;
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
//       room.isCursed = false;
//       room.activeCurseType = null;
//       room.hasKey = false;
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

// const { getLevelConfig, generateSolvableMap, ROWS, COLS } = require('./utils/mapUtils');

// const app = express();
// app.use(cors());

// const server = http.createServer(app);

// const io = new Server(server, {
//   cors: { origin: "*", methods: ["GET", "POST"] }
// });

// const rooms = {};

// // --- CHAOS LOGIC ---
// function triggerRandomCurse(roomCode) {
//   const room = rooms[roomCode];
//   if (!room || room.isCursed) return;

//   room.isCursed = true;
  
//   // Pure 50/50 coin flip for Mirror vs Speed
//   const curseType = Math.random() < 0.5 ? "MIRROR" : "SPEED";
//   room.activeCurseType = curseType;

//   // Dynamic Duration: Level 1 = 5s, Level 10 = 8s
//   const duration = Math.min(8, 4 + Math.floor(room.level / 2));

//   io.to(roomCode).emit('curse_triggered', { type: curseType, duration: duration });

//   setTimeout(() => {
//     if (rooms[roomCode]) {
//       rooms[roomCode].isCursed = false;
//       rooms[roomCode].activeCurseType = null;
//       io.to(roomCode).emit('curse_ended');
//     }
//   }, duration * 1000);
// }

// // --- TIMER LOGIC ---
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

//     // --- DYNAMIC CURSE CALCULATOR ---
//     const checkInterval = room.level >= 5 ? 3 : 5;

//     if (room.timeLeft % checkInterval === 0 && room.timeLeft > 3 && room.timeLeft < config.time) {
//       let curseProbability = 0.25 + (room.level * 0.05);
//       if (curseProbability > 0.9) curseProbability = 0.9;

//       // console.log(`Room ${roomCode}: Level ${room.level}, Chance: ${curseProbability.toFixed(2)}`);

//       if (Math.random() < curseProbability) {
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
//         isCursed: false,
//         activeCurseType: null,
//         hasKey: false
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

//       // --- NEW: VOICE CHAT TRIGGER ---
//       // We tell the FIRST player (room.players[0]) that the SECOND player (room.players[1]) has arrived.
//       // The first player will be the "Initiator" of the WebRTC call.
//       const firstPlayerID = room.players[0];
//       const secondPlayerID = room.players[1];
//       io.to(firstPlayerID).emit("all_users_connected", secondPlayerID);
//     }
//   });

//   // --- NEW: WEBRTC SIGNALING HANDLERS ---
//   socket.on("sending_signal", (payload) => {
//     io.to(payload.userToSignal).emit('user_joined_call', { signal: payload.signal, callerID: payload.callerID });
//   });

//   socket.on("returning_signal", (payload) => {
//     io.to(payload.callerID).emit('receiving_returned_signal', { signal: payload.signal, id: socket.id });
//   });
//   // --------------------------------------

//   // --- MOVEMENT ---
//   socket.on('move_player', ({ roomCode, direction }) => {
//     const room = rooms[roomCode];
//     if (!room || room.timeLeft <= 0) return;

//     const stepsToMove = (room.activeCurseType === 'SPEED') ? 2 : 1;

//     for (let i = 0; i < stepsToMove; i++) {
//         let { x, y } = room.position;
//         if (direction === 'UP') y -= 1;
//         if (direction === 'DOWN') y += 1;
//         if (direction === 'LEFT') x -= 1;
//         if (direction === 'RIGHT') x += 1;

//         if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
//             const currentMap = room.map;
//             const cell = currentMap[y][x];

//             if (cell === 1) break; 
//             if (cell === 4 && !room.hasKey) break;

//             room.position = { x, y };

//             if (cell === 5) {
//                 room.hasKey = true;
//                 currentMap[y][x] = 0;
//                 io.to(roomCode).emit('key_collected');
//                 io.to(roomCode).emit('map_updated', currentMap);
//             }

//             if (cell === 3) {
//                 clearInterval(room.timerInterval);
//                 room.position = { x: 1, y: 1 };
//                 room.hasKey = false;
//                 const msg = room.activeCurseType === 'SPEED' ? "⚡ TOO FAST! You ran into a trap!" : "💣 BOOM! Trap hit!";
//                 io.to(roomCode).emit('game_over', msg);
//                 io.to(roomCode).emit('update_position', room.position);
//                 return;
//             }

//             if (cell === 9) {
//                 clearInterval(room.timerInterval);
//                 io.to(roomCode).emit('game_won', true);
//                 return;
//             }
//         }
//     }
//     io.to(roomCode).emit('update_position', room.position);
//   });

//   socket.on('restart_game', (roomCode) => {
//     const room = rooms[roomCode];
//     if (room) {
//       const config = getLevelConfig(room.level);
//       room.map = generateSolvableMap(config);
//       room.position = { x: 1, y: 1 };
//       room.isCursed = false;
//       room.activeCurseType = null;
//       room.hasKey = false;
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
//       room.isCursed = false;
//       room.activeCurseType = null;
//       room.hasKey = false;
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







// server/index.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const {
  getLevelConfig,
  generateSolvableMap,
  ROWS,
  COLS,
} = require("./utils/mapUtils");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const rooms = {};

// --- CHAOS LOGIC ---
function triggerRandomCurse(roomCode) {
  const room = rooms[roomCode];
  if (!room || room.isCursed) return;

  room.isCursed = true;

  const curseType = Math.random() < 0.5 ? "MIRROR" : "SPEED";
  room.activeCurseType = curseType;

  const duration = Math.min(8, 4 + Math.floor(room.level / 2));

  io.to(roomCode).emit("curse_triggered", { type: curseType, duration });

  setTimeout(() => {
    if (rooms[roomCode]) {
      rooms[roomCode].isCursed = false;
      rooms[roomCode].activeCurseType = null;
      io.to(roomCode).emit("curse_ended");
    }
  }, duration * 1000);
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
    io.to(roomCode).emit("timer_update", room.timeLeft);

    const checkInterval = room.level >= 5 ? 3 : 5;

    if (
      room.timeLeft % checkInterval === 0 &&
      room.timeLeft > 3 &&
      room.timeLeft < config.time
    ) {
      let curseProbability = 0.25 + room.level * 0.05;
      if (curseProbability > 0.9) curseProbability = 0.9;

      if (Math.random() < curseProbability) {
        triggerRandomCurse(roomCode);
      }
    }

    if (room.timeLeft <= 0) {
      clearInterval(room.timerInterval);
      io.to(roomCode).emit(
        "game_over",
        "⏳ TIME'S UP! The darkness consumed you."
      );
    }
  }, 1000);
}

// --- SOCKET LOGIC ---
io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("join_room", (roomCode) => {
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
        activeCurseType: null,
        hasKey: false,
        voiceReady: {}, // 👈 NEW: voice readiness per player
      };
    }

    const room = rooms[roomCode];

    if (room.players.length >= 2) {
      socket.emit("error_message", "Room Full!");
      return;
    }

    socket.join(roomCode);
    room.players.push(socket.id);

    const role = room.players.length === 1 ? "walker" : "watcher";
    socket.emit("room_joined", { roomCode, role });

    if (room.players.length === 2) {
      // Dono players game me aa gaye -> game start
      startRoomTimer(roomCode);
      io.to(roomCode).emit("start_game", {
        map: room.map,
        startPos: { x: 1, y: 1 },
        level: room.level,
      });
      // ⚠️ IMPORTANT: yahan 'all_users_connected' NA emit karein.
      // Voice handshake tab hoga jab dono "voice_ready" bolenge.
    }
  });

  // --- NEW: VOICE READY HANDSHAKE ---
  socket.on("voice_ready", (roomCode) => {
    const room = rooms[roomCode];
    if (!room) return;

    if (!room.voiceReady) room.voiceReady = {};
    room.voiceReady[socket.id] = true;

    console.log(`Voice ready: ${socket.id} in room ${roomCode}`);

    if (room.players.length === 2) {
      const [firstPlayerID, secondPlayerID] = room.players;

      if (room.voiceReady[firstPlayerID] && room.voiceReady[secondPlayerID]) {
        console.log(
          `Both players voice-ready in room ${roomCode}. Starting WebRTC handshake.`
        );
        io.to(firstPlayerID).emit("all_users_connected", secondPlayerID);
      }
    }
  });

  // --- WEBRTC SIGNALING HANDLERS ---
  socket.on("sending_signal", (payload) => {
    io.to(payload.userToSignal).emit("user_joined_call", {
      signal: payload.signal,
      callerID: payload.callerID,
    });
  });

  socket.on("returning_signal", (payload) => {
    io.to(payload.callerID).emit("receiving_returned_signal", {
      signal: payload.signal,
      id: socket.id,
    });
  });

  // --- MOVEMENT ---
  socket.on("move_player", ({ roomCode, direction }) => {
    const room = rooms[roomCode];
    if (!room || room.timeLeft <= 0) return;

    const stepsToMove = room.activeCurseType === "SPEED" ? 2 : 1;

    for (let i = 0; i < stepsToMove; i++) {
      let { x, y } = room.position;
      if (direction === "UP") y -= 1;
      if (direction === "DOWN") y += 1;
      if (direction === "LEFT") x -= 1;
      if (direction === "RIGHT") x += 1;

      if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
        const currentMap = room.map;
        const cell = currentMap[y][x];

        if (cell === 1) break;
        if (cell === 4 && !room.hasKey) break;

        room.position = { x, y };

        if (cell === 5) {
          room.hasKey = true;
          currentMap[y][x] = 0;
          io.to(roomCode).emit("key_collected");
          io.to(roomCode).emit("map_updated", currentMap);
        }

        if (cell === 3) {
          clearInterval(room.timerInterval);
          room.position = { x: 1, y: 1 };
          room.hasKey = false;
          const msg =
            room.activeCurseType === "SPEED"
              ? "⚡ TOO FAST! You ran into a trap!"
              : "💣 BOOM! Trap hit!";
          io.to(roomCode).emit("game_over", msg);
          io.to(roomCode).emit("update_position", room.position);
          return;
        }

        if (cell === 9) {
          clearInterval(room.timerInterval);
          io.to(roomCode).emit("game_won", true);
          return;
        }
      }
    }
    io.to(roomCode).emit("update_position", room.position);
  });

  socket.on("restart_game", (roomCode) => {
    const room = rooms[roomCode];
    if (room) {
      const config = getLevelConfig(room.level);
      room.map = generateSolvableMap(config);
      room.position = { x: 1, y: 1 };
      room.isCursed = false;
      room.activeCurseType = null;
      room.hasKey = false;
      startRoomTimer(roomCode);
      io.to(roomCode).emit("start_game", {
        map: room.map,
        startPos: room.position,
        level: room.level,
      });
      io.to(roomCode).emit("reset_game_state");
    }
  });

  socket.on("next_level", (roomCode) => {
    const room = rooms[roomCode];
    if (room) {
      room.level += 1;
      const config = getLevelConfig(room.level);
      room.map = generateSolvableMap(config);
      room.position = { x: 1, y: 1 };
      room.isCursed = false;
      room.activeCurseType = null;
      room.hasKey = false;
      startRoomTimer(roomCode);
      io.to(roomCode).emit("start_game", {
        map: room.map,
        startPos: room.position,
        level: room.level,
      });
      io.to(roomCode).emit("reset_game_state");
    }
  });

  socket.on("disconnect", () => {
    // Optional: clean up rooms, voiceReady, etc.
  });
});

server.listen(3001, () => {
  console.log("SERVER RUNNING ON PORT 3001");
});
