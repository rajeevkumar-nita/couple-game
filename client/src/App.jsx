
import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
// import Peer from 'simple-peer'; <--- REMOVED STATIC IMPORT

// --- CRITICAL POLYFILLS FOR SIMPLE-PEER ---
// These MUST run before simple-peer is loaded
if (typeof window !== 'undefined') {
    window.global = window;
    window.process = { env: {} };
    window.Buffer = window.Buffer || [];
}

// !!! CHANGE TO YOUR RENDER URL FOR DEPLOYMENT !!!
const socket = io.connect("https://couple-game-cj16.onrender.com");
// const socket = io.connect("http://localhost:3001"); 

// --- AUDIO ASSETS ---
const AUDIO_WIN = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
const AUDIO_LOSE = new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3');
const AUDIO_MOVE = new Audio('https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3'); 
const AUDIO_MIRROR = new Audio('https://assets.mixkit.co/active_storage/sfx/243/243-preview.mp3'); 
const AUDIO_SPEED = new Audio('https://assets.mixkit.co/active_storage/sfx/1659/1659-preview.mp3');

AUDIO_MOVE.volume = 0.2;

// --- VOICE CHAT COMPONENT ---
const VoiceChat = ({ socket, roomCode, myRole }) => {
    const [stream, setStream] = useState(null);
    const [callAccepted, setCallAccepted] = useState(false);
    const [peerLib, setPeerLib] = useState(null); // Store the dynamically loaded library
    const userAudio = useRef(); 
    const connectionRef = useRef();

    useEffect(() => {
        // 1. Dynamic Import of simple-peer to bypass "global is not defined" error
        const loadPeerLibrary = async () => {
            try {
                const module = await import('simple-peer');
                const Peer = module.default;
                setPeerLib(() => Peer); // Save the class to state
                startVoiceChat(Peer);
            } catch (error) {
                console.error("Failed to load Simple-Peer:", error);
            }
        };

        loadPeerLibrary();

        // Cleanup
        return () => {
            if(stream) stream.getTracks().forEach(track => track.stop());
            if(connectionRef.current) connectionRef.current.destroy();
            socket.off("all_users_connected");
            socket.off("user_joined_call");
            socket.off("receiving_returned_signal");
        };
        // eslint-disable-next-line
    }, []);

    const startVoiceChat = (Peer) => {
        // 2. Get Microphone Permission
        navigator.mediaDevices.getUserMedia({ video: false, audio: true })
            .then((currentStream) => {
                setStream(currentStream);
                console.log("Microphone access granted.");

                // LISTENERS FOR SIGNALING
                socket.on("all_users_connected", (userToSignalID) => {
                    console.log("Both users here. Initiating call to:", userToSignalID);
                    createPeer(Peer, userToSignalID, socket.id, currentStream);
                });

                socket.on("user_joined_call", (payload) => {
                    console.log("Incoming call signal received.");
                    addPeer(Peer, payload.signal, payload.callerID, currentStream);
                });

                socket.on("receiving_returned_signal", (payload) => {
                    console.log("Call accepted by partner.");
                    setCallAccepted(true);
                    const item = connectionRef.current;
                    if(item) {
                        item.signal(payload.signal);
                    }
                });
            })
            .catch(err => {
                console.error("Error accessing microphone:", err);
            });
    };

    function createPeer(Peer, userToSignal, callerID, stream) {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream: stream,
        });

        peer.on("signal", (signal) => {
            socket.emit("sending_signal", { userToSignal, callerID, signal });
        });

        peer.on("stream", (remoteStream) => {
            if (userAudio.current) {
                userAudio.current.srcObject = remoteStream;
            }
        });

        connectionRef.current = peer;
    }

    function addPeer(Peer, incomingSignal, callerID, stream) {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream: stream,
        });

        peer.on("signal", (signal) => {
            socket.emit("returning_signal", { signal, callerID });
        });

        peer.on("stream", (remoteStream) => {
            if (userAudio.current) {
                userAudio.current.srcObject = remoteStream;
            }
        });

        peer.signal(incomingSignal);
        connectionRef.current = peer;
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
            <audio playsInline autoPlay ref={userAudio} />
            <div className={`px-4 py-2 rounded-full border-2 font-bold shadow-lg flex items-center gap-2 transition-all ${stream ? 'bg-gray-800 border-green-500 text-green-400' : 'bg-gray-800 border-red-500 text-red-500'}`}>
                {stream ? (
                    <>
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        <span>Voice Active</span>
                    </>
                ) : (
                    <span>🔇 Mic Off / Loading</span>
                )}
            </div>
        </div>
    );
};

// --- MAIN APP COMPONENT ---
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
  const [currentLevel, setCurrentLevel] = useState(1);
  const [activeCurse, setActiveCurse] = useState(null); 
  const [hasKey, setHasKey] = useState(false);

  const joinRoom = () => { if (room !== "") socket.emit("join_room", room); };
  const handleRestart = () => socket.emit("restart_game", room);
  const handleNextLevel = () => socket.emit("next_level", room);

  // --- CONTROLS LOGIC ---
  const movePlayer = (dir) => {
    if (role !== 'walker' || !gameStarted || winner || gameOverMsg) return;
    
    let finalDir = dir;
    if (activeCurse === 'MIRROR') {
      if (dir === 'UP') finalDir = 'DOWN';
      if (dir === 'DOWN') finalDir = 'UP';
      if (dir === 'LEFT') finalDir = 'RIGHT';
      if (dir === 'RIGHT') finalDir = 'LEFT';
    }

    AUDIO_MOVE.currentTime = 0;
    AUDIO_MOVE.play().catch(e => {}); 
    socket.emit('move_player', { roomCode: room, direction: finalDir });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowUp') movePlayer('UP');
      if (e.key === 'ArrowDown') movePlayer('DOWN');
      if (e.key === 'ArrowLeft') movePlayer('LEFT');
      if (e.key === 'ArrowRight') movePlayer('RIGHT');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [role, gameStarted, room, winner, gameOverMsg, activeCurse]);

  // --- SOCKET EVENTS ---
  useEffect(() => {
    socket.on("room_joined", (data) => { setIsJoined(true); setRole(data.role); });
    
    socket.on("start_game", (data) => {
      setGameStarted(true); setMap(data.map); setPlayerPos(data.startPos);
      setCurrentLevel(data.level); setActiveCurse(null); setHasKey(false);
    });

    socket.on("update_position", (pos) => setPlayerPos(pos));
    socket.on("timer_update", (time) => setTimeLeft(time));
    socket.on("map_updated", (newMap) => setMap(newMap)); 
    socket.on("key_collected", () => setHasKey(true)); 

    socket.on("curse_triggered", (data) => { 
      setActiveCurse(data.type); 
      if (data.type === 'MIRROR') AUDIO_MIRROR.play();
      if (data.type === 'SPEED') AUDIO_SPEED.play();
    });
    socket.on("curse_ended", () => setActiveCurse(null));

    socket.on("game_won", () => { setWinner(true); AUDIO_WIN.play(); });
    socket.on("game_over", (msg) => { setGameOverMsg(msg); AUDIO_LOSE.play(); });
    socket.on("reset_game_state", () => { setWinner(false); setGameOverMsg(""); setActiveCurse(null); setHasKey(false); });

  }, [socket]);

  const isCellVisible = (rowIndex, colIndex) => {
    if (role === 'watcher' || winner || gameOverMsg) return true; 
    const distanceX = Math.abs(colIndex - playerPos.x);
    const distanceY = Math.abs(rowIndex - playerPos.y);
    return distanceX <= 1 && distanceY <= 1;
  };

  if (!isJoined) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white font-sans px-4">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 text-center">Sync Hearts 💖</h1>
        <div className="bg-gray-800 p-8 rounded-xl w-full max-w-sm text-center shadow-2xl border border-gray-700">
          <input className="w-full p-3 rounded bg-gray-700 mb-4 text-center uppercase text-white font-bold tracking-widest outline-none focus:ring-2 focus:ring-pink-500" placeholder="ENTER CODE" onChange={(e) => setRoom(e.target.value.toUpperCase())} />
          <button onClick={joinRoom} className="w-full bg-pink-600 hover:bg-pink-700 p-3 rounded font-bold transition-all transform active:scale-95">JOIN GAME</button>
        </div>
      </div>
    );
  }

  const bgClass = activeCurse === 'MIRROR' ? 'bg-red-900' : activeCurse === 'SPEED' ? 'bg-blue-900' : 'bg-gray-900';
  const bannerColor = activeCurse === 'MIRROR' ? 'bg-red-600' : 'bg-blue-600';
  const borderClass = activeCurse === 'MIRROR' ? 'border-red-500 shadow-red-500/50' : activeCurse === 'SPEED' ? 'border-blue-500 shadow-blue-500/50' : 'border-gray-700';

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen text-white select-none relative overflow-hidden pb-10 transition-colors duration-500 ${bgClass}`}>
      
      {activeCurse && (
        <div className="absolute top-20 z-50 animate-bounce">
           <div className={`text-white px-6 py-3 rounded-full font-bold shadow-lg border-4 border-white text-xl md:text-2xl ${bannerColor}`}>
             {activeCurse === 'MIRROR' ? '⚠️ CURSE: CONTROLS REVERSED! ⚠️' : '⚡ CURSE: SPEED DEMON (2x)! ⚡'}
           </div>
        </div>
      )}

      <div className="mt-4 mb-2 text-center px-4 w-full max-w-lg">
        <div className="flex justify-between items-center mb-2">
           <div className="text-left">
             <h2 className={`text-lg font-bold ${role === 'walker' ? 'text-blue-400' : 'text-green-400'}`}>
               {role === 'walker' ? '🚶 WALKER' : '👀 WATCHER'}
             </h2>
             <p className="text-yellow-400 font-bold text-sm">⭐ LEVEL {currentLevel}</p>
           </div>
           
           <div className="flex items-center gap-3">
             <div className={`text-3xl transition-all ${hasKey ? 'opacity-100 scale-125' : 'opacity-20 grayscale'}`}>🔑</div>
             <div className={`text-2xl font-mono font-bold border-2 px-3 rounded ${timeLeft < 10 ? 'text-red-500 border-red-500 animate-pulse' : 'text-white border-gray-500'}`}>⏳ {timeLeft}s</div>
           </div>
        </div>
      </div>

      {!gameStarted ? (
        <div className="animate-pulse text-yellow-400 font-mono text-xl mt-10">Waiting for partner...</div>
      ) : (
        <>
          <VoiceChat socket={socket} roomCode={room} myRole={role} />

          <div className={`grid gap-1 bg-gray-800 p-2 rounded-lg border-4 shadow-2xl touch-none ${borderClass}`} style={{ gridTemplateColumns: `repeat(${map[0]?.length || 10}, minmax(30px, 40px))` }}>
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
                  } 
                  else if (cell === 5) { cellClass += "bg-blue-900/50 border border-blue-400 animate-bounce"; content = "🔑"; }
                  else if (cell === 4) { cellClass += hasKey ? "bg-green-800/50 border-green-500" : "bg-slate-700 border-4 border-yellow-600"; content = hasKey ? "🔓" : "🔒"; }
                  else { cellClass += "bg-slate-200"; content = ""; }
                }
                return (
                  <div key={`${rowIndex}-${colIndex}`} className={cellClass}>
                    {isPlayerHere ? <span className="text-xl md:text-2xl animate-bounce drop-shadow-md">{role === 'walker' ? '🤖' : '🔵'}</span> : content}
                  </div>
                );
              })
            ))}
          </div>

          {role === 'walker' && !winner && !gameOverMsg && (
            <div className="mt-6 grid grid-cols-3 gap-2 w-48">
              <div></div>
              <button className={`p-4 rounded-lg active:bg-blue-600 shadow-lg text-2xl ${activeCurse === 'MIRROR' ? 'bg-red-600' : activeCurse === 'SPEED' ? 'bg-blue-600' : 'bg-gray-700'}`} onClick={() => movePlayer('UP')}>⬆️</button>
              <div></div>
              <button className={`p-4 rounded-lg active:bg-blue-600 shadow-lg text-2xl ${activeCurse === 'MIRROR' ? 'bg-red-600' : activeCurse === 'SPEED' ? 'bg-blue-600' : 'bg-gray-700'}`} onClick={() => movePlayer('LEFT')}>⬅️</button>
              <button className={`p-4 rounded-lg active:bg-blue-600 shadow-lg text-2xl ${activeCurse === 'MIRROR' ? 'bg-red-600' : activeCurse === 'SPEED' ? 'bg-blue-600' : 'bg-gray-700'}`} onClick={() => movePlayer('DOWN')}>⬇️</button>
              <button className={`p-4 rounded-lg active:bg-blue-600 shadow-lg text-2xl ${activeCurse === 'MIRROR' ? 'bg-red-600' : activeCurse === 'SPEED' ? 'bg-blue-600' : 'bg-gray-700'}`} onClick={() => movePlayer('RIGHT')}>➡️</button>
            </div>
          )}
        </>
      )}

      {(winner || gameOverMsg) && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 backdrop-blur-sm px-4">
          <div className="bg-gray-800 p-6 rounded-2xl border-2 border-pink-500 text-center shadow-2xl animate-bounce-in w-full max-w-sm">
            {winner ? (
              <>
                <div className="text-6xl mb-4">🏆</div>
                <h2 className="text-3xl font-bold text-yellow-400 mb-2">LEVEL {currentLevel} CLEARED!</h2>
                <button onClick={handleNextLevel} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full transition-transform hover:scale-105 shadow-lg w-full">🚀 Start Level {currentLevel + 1}</button>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">💥</div>
                <h2 className="text-3xl font-bold text-red-500 mb-2">GAME OVER</h2>
                <p className="text-gray-300 mb-6">{gameOverMsg}</p>
                <button onClick={handleRestart} className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-8 rounded-full transition-transform hover:scale-105 shadow-lg w-full">🔄 Retry Level {currentLevel}</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;