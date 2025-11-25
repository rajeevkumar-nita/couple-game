
// import { useState, useEffect } from 'react';
// import io from 'socket.io-client';

// const socket = io.connect("http://localhost:3001");

// // Sounds
// const AUDIO_WIN = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
// const AUDIO_LOSE = new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3');
// const AUDIO_MOVE = new Audio('https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3'); 
// AUDIO_MOVE.volume = 0.2;

// function App() {
//   const [room, setRoom] = useState("");
//   const [isJoined, setIsJoined] = useState(false);
//   const [role, setRole] = useState(""); 
//   const [gameStarted, setGameStarted] = useState(false);
//   const [map, setMap] = useState([]);
//   const [playerPos, setPlayerPos] = useState({ x: 1, y: 1 });
//   const [winner, setWinner] = useState(false);
//   const [gameOverMsg, setGameOverMsg] = useState("");
//   const [timeLeft, setTimeLeft] = useState(0);
  
//   // NEW: Level State
//   const [currentLevel, setCurrentLevel] = useState(1);

//   const joinRoom = () => {
//     if (room !== "") socket.emit("join_room", room);
//   };

//   // Triggered on "Try Again"
//   const handleRestart = () => {
//     socket.emit("restart_game", room);
//   };

//   // Triggered on "Next Level"
//   const handleNextLevel = () => {
//     socket.emit("next_level", room);
//   };

//   const movePlayer = (dir) => {
//     if (role !== 'walker' || !gameStarted || winner || gameOverMsg) return;
//     AUDIO_MOVE.currentTime = 0;
//     AUDIO_MOVE.play().catch(e => {}); 
//     socket.emit('move_player', { roomCode: room, direction: dir });
//   };

//   useEffect(() => {
//     const handleKeyDown = (e) => {
//       if (e.key === 'ArrowUp') movePlayer('UP');
//       if (e.key === 'ArrowDown') movePlayer('DOWN');
//       if (e.key === 'ArrowLeft') movePlayer('LEFT');
//       if (e.key === 'ArrowRight') movePlayer('RIGHT');
//     };
//     window.addEventListener('keydown', handleKeyDown);
//     return () => window.removeEventListener('keydown', handleKeyDown);
//   }, [role, gameStarted, room, winner, gameOverMsg]);

//   useEffect(() => {
//     socket.on("room_joined", (data) => {
//       setIsJoined(true);
//       setRole(data.role);
//     });

//     socket.on("start_game", (data) => {
//       setGameStarted(true);
//       setMap(data.map);
//       setPlayerPos(data.startPos);
//       setCurrentLevel(data.level); // Update Level from server
//     });

//     socket.on("update_position", (pos) => {
//       setPlayerPos(pos);
//     });

//     socket.on("timer_update", (time) => {
//       setTimeLeft(time);
//     });

//     socket.on("game_won", () => {
//       setWinner(true);
//       AUDIO_WIN.play();
//     });

//     socket.on("game_over", (msg) => {
//       setGameOverMsg(msg);
//       AUDIO_LOSE.play();
//     });

//     socket.on("reset_game_state", () => {
//       setWinner(false);
//       setGameOverMsg("");
//     });
    
//   }, [socket]);

//   const isCellVisible = (rowIndex, colIndex) => {
//     if (role === 'watcher' || winner || gameOverMsg) return true; 
//     const distanceX = Math.abs(colIndex - playerPos.x);
//     const distanceY = Math.abs(rowIndex - playerPos.y);
//     return distanceX <= 1 && distanceY <= 1;
//   };

//   if (!isJoined) {
//     return (
//       <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white font-sans px-4">
//         <h1 className="text-4xl md:text-5xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 text-center">
//           Sync Hearts 💖
//         </h1>
//         <div className="bg-gray-800 p-8 rounded-xl w-full max-w-sm text-center shadow-2xl border border-gray-700">
//           <input 
//             className="w-full p-3 rounded bg-gray-700 mb-4 text-center uppercase text-white font-bold tracking-widest outline-none focus:ring-2 focus:ring-pink-500"
//             placeholder="ENTER CODE"
//             onChange={(e) => setRoom(e.target.value.toUpperCase())}
//           />
//           <button onClick={joinRoom} className="w-full bg-pink-600 hover:bg-pink-700 p-3 rounded font-bold transition-all transform active:scale-95">
//             JOIN GAME
//           </button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white select-none relative overflow-hidden pb-10">
      
//       {/* HEADER: ROLE, LEVEL, TIMER */}
//       <div className="mt-4 mb-2 text-center px-4 w-full max-w-lg">
//         <div className="flex justify-between items-center mb-2">
//            <div className="text-left">
//              <h2 className={`text-lg font-bold ${role === 'walker' ? 'text-blue-400' : 'text-green-400'}`}>
//                {role === 'walker' ? '🚶 WALKER' : '👀 WATCHER'}
//              </h2>
//              {/* LEVEL INDICATOR */}
//              <p className="text-yellow-400 font-bold text-sm">⭐ LEVEL {currentLevel}</p>
//            </div>

//            {/* TIMER */}
//            <div className={`text-2xl font-mono font-bold border-2 px-3 rounded ${timeLeft < 10 ? 'text-red-500 border-red-500 animate-pulse' : 'text-white border-gray-500'}`}>
//              ⏳ {timeLeft}s
//            </div>
//         </div>
//       </div>

//       {!gameStarted ? (
//         <div className="animate-pulse text-yellow-400 font-mono text-xl mt-10">Waiting for partner...</div>
//       ) : (
//         <>
//           {/* GRID */}
//           <div 
//             className="grid gap-1 bg-gray-800 p-2 rounded-lg border-4 border-gray-700 shadow-2xl touch-none"
//             style={{ gridTemplateColumns: `repeat(${map[0]?.length || 10}, minmax(30px, 40px))` }} 
//           >
//             {map.map((row, rowIndex) => (
//               row.map((cell, colIndex) => {
//                 const isPlayerHere = playerPos.x === colIndex && playerPos.y === rowIndex;
//                 const visible = isCellVisible(rowIndex, colIndex);
//                 let cellClass = "aspect-square rounded-sm flex items-center justify-center text-lg md:text-xl transition-all duration-200 ";
//                 let content = ""; 

//                 if (!visible) {
//                   cellClass += "bg-black border border-gray-900";
//                 } else {
//                   if (cell === 1) { cellClass += "bg-slate-600 shadow-inner"; content = "🧱"; } 
//                   else if (cell === 9) { cellClass += "bg-yellow-500 animate-pulse"; content = "🏆"; } 
//                   else if (cell === 3) {
//                     if (role === 'watcher' || winner || gameOverMsg) { cellClass += "bg-red-900/50 border border-red-500"; content = "💣"; } 
//                     else { cellClass += "bg-slate-200"; content = ""; }
//                   } else { cellClass += "bg-slate-200"; content = ""; }
//                 }
//                 return (
//                   <div key={`${rowIndex}-${colIndex}`} className={cellClass}>
//                     {isPlayerHere ? <span className="text-xl md:text-2xl animate-bounce drop-shadow-md">{role === 'walker' ? '🤖' : '🔵'}</span> : content}
//                   </div>
//                 );
//               })
//             ))}
//           </div>

//           {/* MOBILE CONTROLS */}
//           {role === 'walker' && !winner && !gameOverMsg && (
//             <div className="mt-6 grid grid-cols-3 gap-2 w-48">
//               <div></div>
//               <button className="bg-gray-700 p-4 rounded-lg active:bg-blue-600 shadow-lg text-2xl" onClick={() => movePlayer('UP')}>⬆️</button>
//               <div></div>
//               <button className="bg-gray-700 p-4 rounded-lg active:bg-blue-600 shadow-lg text-2xl" onClick={() => movePlayer('LEFT')}>⬅️</button>
//               <button className="bg-gray-700 p-4 rounded-lg active:bg-blue-600 shadow-lg text-2xl" onClick={() => movePlayer('DOWN')}>⬇️</button>
//               <button className="bg-gray-700 p-4 rounded-lg active:bg-blue-600 shadow-lg text-2xl" onClick={() => movePlayer('RIGHT')}>➡️</button>
//             </div>
//           )}
//         </>
//       )}

//       {/* POPUP MODAL */}
//       {(winner || gameOverMsg) && (
//         <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 backdrop-blur-sm px-4">
//           <div className="bg-gray-800 p-6 rounded-2xl border-2 border-pink-500 text-center shadow-2xl animate-bounce-in w-full max-w-sm">
            
//             {winner ? (
//               <>
//                 <div className="text-6xl mb-4">🏆</div>
//                 <h2 className="text-3xl font-bold text-yellow-400 mb-2">LEVEL {currentLevel} COMPLETE!</h2>
//                 <p className="text-gray-300 mb-6">Great Teamwork! Next level is harder.</p>
//                 <button 
//                   onClick={handleNextLevel}
//                   className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full transition-transform hover:scale-105 shadow-lg w-full"
//                 >
//                   🚀 Start Level {currentLevel + 1}
//                 </button>
//               </>
//             ) : (
//               <>
//                 <div className="text-6xl mb-4">💥</div>
//                 <h2 className="text-3xl font-bold text-red-500 mb-2">GAME OVER</h2>
//                 <p className="text-gray-300 mb-6">{gameOverMsg}</p>
//                 <button 
//                   onClick={handleRestart}
//                   className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-8 rounded-full transition-transform hover:scale-105 shadow-lg w-full"
//                 >
//                   🔄 Restart (Level 1)
//                 </button>
//               </>
//             )}
            
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// export default App;






import { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io.connect("http://localhost:3001");

// --- AUDIO ASSETS ---
const AUDIO_WIN = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
const AUDIO_LOSE = new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3');
const AUDIO_MOVE = new Audio('https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3'); 
AUDIO_MOVE.volume = 0.2;

function App() {
  const [room, setRoom] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [role, setRole] = useState(""); 
  const [gameStarted, setGameStarted] = useState(false);
  const [map, setMap] = useState([]);
  const [playerPos, setPlayerPos] = useState({ x: 1, y: 1 });
  const [winner, setWinner] = useState(false);
  const [gameOverMsg, setGameOverMsg] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1); // Track Level

  // --- ACTIONS ---
  const joinRoom = () => {
    if (room !== "") socket.emit("join_room", room);
  };

  const handleRestart = () => {
    socket.emit("restart_game", room); // Will retry current level
  };

  const handleNextLevel = () => {
    socket.emit("next_level", room); // Will go to next level
  };

  const movePlayer = (dir) => {
    if (role !== 'walker' || !gameStarted || winner || gameOverMsg) return;
    AUDIO_MOVE.currentTime = 0;
    AUDIO_MOVE.play().catch(e => {}); 
    socket.emit('move_player', { roomCode: room, direction: dir });
  };

  // --- KEYBOARD LISTENER ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowUp') movePlayer('UP');
      if (e.key === 'ArrowDown') movePlayer('DOWN');
      if (e.key === 'ArrowLeft') movePlayer('LEFT');
      if (e.key === 'ArrowRight') movePlayer('RIGHT');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [role, gameStarted, room, winner, gameOverMsg]);

  // --- SOCKET LISTENER ---
  useEffect(() => {
    socket.on("room_joined", (data) => {
      setIsJoined(true);
      setRole(data.role);
    });

    socket.on("start_game", (data) => {
      setGameStarted(true);
      setMap(data.map);
      setPlayerPos(data.startPos);
      setCurrentLevel(data.level); // Sync Level
    });

    socket.on("update_position", (pos) => {
      setPlayerPos(pos);
    });

    socket.on("timer_update", (time) => {
      setTimeLeft(time);
    });

    socket.on("game_won", () => {
      setWinner(true);
      AUDIO_WIN.play();
    });

    socket.on("game_over", (msg) => {
      setGameOverMsg(msg);
      AUDIO_LOSE.play();
    });

    socket.on("reset_game_state", () => {
      setWinner(false);
      setGameOverMsg("");
    });
    
  }, [socket]);

  // --- FOG OF WAR ---
  const isCellVisible = (rowIndex, colIndex) => {
    if (role === 'watcher' || winner || gameOverMsg) return true; 
    const distanceX = Math.abs(colIndex - playerPos.x);
    const distanceY = Math.abs(rowIndex - playerPos.y);
    return distanceX <= 1 && distanceY <= 1;
  };

  // --- RENDER: LOGIN ---
  if (!isJoined) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white font-sans px-4">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 text-center">
          Sync Hearts 💖
        </h1>
        <div className="bg-gray-800 p-8 rounded-xl w-full max-w-sm text-center shadow-2xl border border-gray-700">
          <input 
            className="w-full p-3 rounded bg-gray-700 mb-4 text-center uppercase text-white font-bold tracking-widest outline-none focus:ring-2 focus:ring-pink-500"
            placeholder="ENTER CODE"
            onChange={(e) => setRoom(e.target.value.toUpperCase())}
          />
          <button onClick={joinRoom} className="w-full bg-pink-600 hover:bg-pink-700 p-3 rounded font-bold transition-all transform active:scale-95">
            JOIN GAME
          </button>
        </div>
      </div>
    );
  }

  // --- RENDER: GAME ---
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white select-none relative overflow-hidden pb-10">
      
      {/* HEADER */}
      <div className="mt-4 mb-2 text-center px-4 w-full max-w-lg">
        <div className="flex justify-between items-center mb-2">
           <div className="text-left">
             <h2 className={`text-lg font-bold ${role === 'walker' ? 'text-blue-400' : 'text-green-400'}`}>
               {role === 'walker' ? '🚶 WALKER' : '👀 WATCHER'}
             </h2>
             <p className="text-yellow-400 font-bold text-sm">⭐ LEVEL {currentLevel}</p>
           </div>

           <div className={`text-2xl font-mono font-bold border-2 px-3 rounded ${timeLeft < 10 ? 'text-red-500 border-red-500 animate-pulse' : 'text-white border-gray-500'}`}>
             ⏳ {timeLeft}s
           </div>
        </div>
      </div>

      {!gameStarted ? (
        <div className="animate-pulse text-yellow-400 font-mono text-xl mt-10">Waiting for partner...</div>
      ) : (
        <>
          {/* GRID */}
          <div 
            className="grid gap-1 bg-gray-800 p-2 rounded-lg border-4 border-gray-700 shadow-2xl touch-none"
            style={{ gridTemplateColumns: `repeat(${map[0]?.length || 10}, minmax(30px, 40px))` }} 
          >
            {map.map((row, rowIndex) => (
              row.map((cell, colIndex) => {
                const isPlayerHere = playerPos.x === colIndex && playerPos.y === rowIndex;
                const visible = isCellVisible(rowIndex, colIndex);
                let cellClass = "aspect-square rounded-sm flex items-center justify-center text-lg md:text-xl transition-all duration-200 ";
                let content = ""; 

                if (!visible) {
                  cellClass += "bg-black border border-gray-900";
                } else {
                  if (cell === 1) { cellClass += "bg-slate-600 shadow-inner"; content = "🧱"; } 
                  else if (cell === 9) { cellClass += "bg-yellow-500 animate-pulse"; content = "🏆"; } 
                  else if (cell === 3) {
                    if (role === 'watcher' || winner || gameOverMsg) { cellClass += "bg-red-900/50 border border-red-500"; content = "💣"; } 
                    else { cellClass += "bg-slate-200"; content = ""; }
                  } else { cellClass += "bg-slate-200"; content = ""; }
                }
                return (
                  <div key={`${rowIndex}-${colIndex}`} className={cellClass}>
                    {isPlayerHere ? <span className="text-xl md:text-2xl animate-bounce drop-shadow-md">{role === 'walker' ? '🤖' : '🔵'}</span> : content}
                  </div>
                );
              })
            ))}
          </div>

          {/* MOBILE CONTROLS (Only for Walker) */}
          {role === 'walker' && !winner && !gameOverMsg && (
            <div className="mt-6 grid grid-cols-3 gap-2 w-48">
              <div></div>
              <button className="bg-gray-700 p-4 rounded-lg active:bg-blue-600 shadow-lg text-2xl" onClick={() => movePlayer('UP')}>⬆️</button>
              <div></div>
              <button className="bg-gray-700 p-4 rounded-lg active:bg-blue-600 shadow-lg text-2xl" onClick={() => movePlayer('LEFT')}>⬅️</button>
              <button className="bg-gray-700 p-4 rounded-lg active:bg-blue-600 shadow-lg text-2xl" onClick={() => movePlayer('DOWN')}>⬇️</button>
              <button className="bg-gray-700 p-4 rounded-lg active:bg-blue-600 shadow-lg text-2xl" onClick={() => movePlayer('RIGHT')}>➡️</button>
            </div>
          )}
        </>
      )}

      {/* POPUP MODAL */}
      {(winner || gameOverMsg) && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 backdrop-blur-sm px-4">
          <div className="bg-gray-800 p-6 rounded-2xl border-2 border-pink-500 text-center shadow-2xl animate-bounce-in w-full max-w-sm">
            
            {winner ? (
              <>
                <div className="text-6xl mb-4">🏆</div>
                <h2 className="text-3xl font-bold text-yellow-400 mb-2">LEVEL {currentLevel} CLEARED!</h2>
                <p className="text-gray-300 mb-6">Great Teamwork! Ready for harder challenge?</p>
                <button 
                  onClick={handleNextLevel}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full transition-transform hover:scale-105 shadow-lg w-full"
                >
                  🚀 Start Level {currentLevel + 1}
                </button>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">💥</div>
                <h2 className="text-3xl font-bold text-red-500 mb-2">GAME OVER</h2>
                <p className="text-gray-300 mb-6">{gameOverMsg}</p>
                <button 
                  onClick={handleRestart}
                  className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-8 rounded-full transition-transform hover:scale-105 shadow-lg w-full"
                >
                  🔄 Retry Level {currentLevel}
                </button>
              </>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
}

export default App;