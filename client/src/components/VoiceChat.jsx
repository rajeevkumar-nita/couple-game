// import React, { useEffect, useRef, useState } from 'react';
// import Peer from 'simple-peer';

// // Needed for some Vite environments to handle WebRTC
// import * as process from "process";
// window.global = window;
// window.process = process;
// window.Buffer = [];

// const VoiceChat = ({ socket, roomCode, myRole }) => {
//     const [stream, setStream] = useState(null);
//     const userAudio = useRef(); // To play the other person's audio
//     const connectionRef = useRef();

//     useEffect(() => {
//         // 1. Get Microphone Permission
//         navigator.mediaDevices.getUserMedia({ video: false, audio: true })
//             .then((currentStream) => {
//                 setStream(currentStream);

//                 // If we are the FIRST player (Walker usually, or whoever joined first),
//                 // we wait for the server to tell us "all_users_connected"
//                 socket.on("all_users_connected", (userToSignalID) => {
//                     createPeer(userToSignalID, socket.id, currentStream);
//                 });

//                 // If we are the SECOND player, we wait for the first player to call us
//                 socket.on("user_joined_call", (payload) => {
//                     addPeer(payload.signal, payload.callerID, currentStream);
//                 });

//                 // Finalize the handshake
//                 socket.on("receiving_returned_signal", (payload) => {
//                     const item = connectionRef.current;
//                     if(item) {
//                         item.signal(payload.signal);
//                     }
//                 });
//             });

//         return () => {
//             // Cleanup when component unmounts (game over/leave)
//             if(stream) stream.getTracks().forEach(track => track.stop());
//             if(connectionRef.current) connectionRef.current.destroy();
//         };
//     // eslint-disable-next-line
//     }, []);

//     function createPeer(userToSignal, callerID, stream) {
//         const peer = new Peer({
//             initiator: true, // This person STARTS the call
//             trickle: false,
//             stream: stream,
//         });

//         peer.on("signal", (signal) => {
//             socket.emit("sending_signal", { userToSignal, callerID, signal });
//         });

//         peer.on("stream", (remoteStream) => {
//             if (userAudio.current) {
//                 userAudio.current.srcObject = remoteStream;
//             }
//         });

//         connectionRef.current = peer;
//     }

//     function addPeer(incomingSignal, callerID, stream) {
//         const peer = new Peer({
//             initiator: false, // This person ANSWERS the call
//             trickle: false,
//             stream: stream,
//         });

//         peer.on("signal", (signal) => {
//             socket.emit("returning_signal", { signal, callerID });
//         });

//         peer.on("signal", (data) => {
//             // Handled automatically by simple-peer logic mostly
//         });
        
//         peer.on("stream", (remoteStream) => {
//             if (userAudio.current) {
//                 userAudio.current.srcObject = remoteStream;
//             }
//         });

//         peer.signal(incomingSignal);
//         connectionRef.current = peer;
//     }

//     return (
//         <div className="fixed bottom-4 right-4 bg-gray-800 p-3 rounded-full border border-pink-500 shadow-lg flex items-center gap-2 z-50">
//             {/* Hidden Audio Element to play sound */}
//             <audio playsInline autoPlay ref={userAudio} />
            
//             <span className="text-xl animate-pulse">
//                 {stream ? "🎙️ Voice Active" : "🔇 Loading Audio..."}
//             </span>
//         </div>
//     );
// };

// export default VoiceChat;






// // client/src/components/VoiceChat.jsx
// import { useState, useEffect, useRef } from "react";

// // --- Polyfills for simple-peer / WebRTC in Vite ---
// if (typeof window !== "undefined") {
//   // simple-peer internally expects these
//   window.global = window;
//   window.process = { env: {} };
//   window.Buffer = window.Buffer || [];
// }

// const VoiceChat = ({ socket, roomCode, myRole }) => {
//   const [stream, setStream] = useState(null);
//   const userAudio = useRef(null);       // remote audio will play here
//   const connectionRef = useRef(null);   // holds current Peer instance
//   const localStreamRef = useRef(null);  // to stop tracks on cleanup

//   useEffect(() => {
//     let isMounted = true;

//     const initVoice = async () => {
//       try {
//         // 1) Dynamically load simple-peer (avoids "global is not defined")
//         const module = await import("simple-peer");
//         const Peer = module.default;

//         // 2) Ask for mic permission
//         const currentStream = await navigator.mediaDevices.getUserMedia({
//           video: false,
//           audio: true,
//         });

//         if (!isMounted) {
//           // component unmount ho chuka ho to tracks ko turant stop kar do
//           currentStream.getTracks().forEach((t) => t.stop());
//           return;
//         }

//         localStreamRef.current = currentStream;
//         setStream(currentStream);
//         console.log("🎙️ Microphone access granted.");

//         // 👉 SERVER KO BOL DO: "Main voice ke liye ready hoon"
//         socket.emit("voice_ready", roomCode);

//         // 3) Signaling listeners
//         socket.on("all_users_connected", (userToSignalID) => {
//           console.log("Both users voice-ready. Initiating call to:", userToSignalID);
//           createPeer(Peer, userToSignalID, socket.id, currentStream);
//         });

//         socket.on("user_joined_call", (payload) => {
//           console.log("Incoming call signal received.");
//           addPeer(Peer, payload.signal, payload.callerID, currentStream);
//         });

//         socket.on("receiving_returned_signal", (payload) => {
//           console.log("Call accepted by partner.");
//           const peer = connectionRef.current;
//           if (peer) {
//             peer.signal(payload.signal);
//           }
//         });
//       } catch (err) {
//         console.error("VoiceChat init error:", err);
//       }
//     };

//     initVoice();

//     // Cleanup
//     return () => {
//       isMounted = false;

//       socket.off("all_users_connected");
//       socket.off("user_joined_call");
//       socket.off("receiving_returned_signal");

//       if (connectionRef.current) {
//         connectionRef.current.destroy();
//       }

//       if (localStreamRef.current) {
//         localStreamRef.current.getTracks().forEach((t) => t.stop());
//       }
//     };
//     // roomCode/socket change se re-init hoga (normally stable hi rehte hain)
//   }, [roomCode, socket]);

//   const createPeer = (Peer, userToSignal, callerID, stream) => {
//     const peer = new Peer({
//       initiator: true,
//       trickle: false,
//       stream: stream,
//     });

//     peer.on("signal", (signal) => {
//       socket.emit("sending_signal", { userToSignal, callerID, signal });
//     });

//     peer.on("stream", (remoteStream) => {
//       if (userAudio.current) {
//         userAudio.current.srcObject = remoteStream;
//       }
//     });

//     connectionRef.current = peer;
//   };

//   const addPeer = (Peer, incomingSignal, callerID, stream) => {
//     const peer = new Peer({
//       initiator: false,
//       trickle: false,
//       stream: stream,
//     });

//     peer.on("signal", (signal) => {
//       socket.emit("returning_signal", { signal, callerID });
//     });

//     peer.on("stream", (remoteStream) => {
//       if (userAudio.current) {
//         userAudio.current.srcObject = remoteStream;
//       }
//     });

//     peer.signal(incomingSignal);
//     connectionRef.current = peer;
//   };

//   return (
//     <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
//       {/* Remote audio plays here */}
//       <audio playsInline autoPlay ref={userAudio} />

//       <div
//         className={`px-4 py-2 rounded-full border-2 font-bold shadow-lg flex items-center gap-2 transition-all ${
//           stream
//             ? "bg-gray-800 border-green-500 text-green-400"
//             : "bg-gray-800 border-red-500 text-red-500"
//         }`}
//       >
//         {stream ? (
//           <>
//             <span className="relative flex h-3 w-3">
//               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
//               <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
//             </span>
//             <span>Voice Active</span>
//           </>
//         ) : (
//           <span>🔇 Mic Off / Loading</span>
//         )}
//       </div>
//     </div>
//   );
// };

// export default VoiceChat;











// import { useState, useEffect, useRef } from "react";

// if (typeof window !== "undefined") {
//   window.global = window;
//   window.process = { env: {} };
//   window.Buffer = window.Buffer || [];
// }

// const VoiceChat = ({ socket, roomCode, myRole }) => {
//   const [stream, setStream] = useState(null);
//   const [isMuted, setIsMuted] = useState(false);  // <-- NEW
//   const userAudio = useRef(null);
//   const connectionRef = useRef(null);
//   const localStreamRef = useRef(null);

//   useEffect(() => {
//     let isMounted = true;

//     const initVoice = async () => {
//       try {
//         const module = await import("simple-peer");
//         const Peer = module.default;

//         const currentStream = await navigator.mediaDevices.getUserMedia({
//           video: false,
//           audio: true,
//         });

//         if (!isMounted) return;

//         localStreamRef.current = currentStream;
//         setStream(currentStream);

//         socket.emit("voice_ready", roomCode);

//         // SIGNALING EVENTS
//         socket.on("all_users_connected", (targetID) => {
//           createPeer(Peer, targetID, socket.id, currentStream);
//         });

//         socket.on("user_joined_call", (payload) => {
//           addPeer(Peer, payload.signal, payload.callerID, currentStream);
//         });

//         socket.on("receiving_returned_signal", (payload) => {
//           connectionRef.current?.signal(payload.signal);
//         });
//       } catch (err) {
//         console.error("VoiceChat error:", err);
//       }
//     };

//     initVoice();

//     return () => {
//       isMounted = false;
//       socket.off("all_users_connected");
//       socket.off("user_joined_call");
//       socket.off("receiving_returned_signal");

//       connectionRef.current?.destroy();
//       localStreamRef.current?.getTracks().forEach((t) => t.stop());
//     };
//   }, [roomCode, socket]);

//   const createPeer = (Peer, userToSignal, callerID, stream) => {
//     const peer = new Peer({
//       initiator: true,
//       trickle: false,
//       stream,
//     });

//     peer.on("signal", (signal) => {
//       socket.emit("sending_signal", { userToSignal, callerID, signal });
//     });

//     peer.on("stream", (remoteStream) => {
//       if (userAudio.current) {
//         userAudio.current.srcObject = remoteStream;
//       }
//     });

//     connectionRef.current = peer;
//   };

//   const addPeer = (Peer, signal, callerID, stream) => {
//     const peer = new Peer({
//       initiator: false,
//       trickle: false,
//       stream,
//     });

//     peer.on("signal", (s) => {
//       socket.emit("returning_signal", { signal: s, callerID });
//     });

//     peer.on("stream", (remoteStream) => {
//       if (userAudio.current) {
//         userAudio.current.srcObject = remoteStream;
//       }
//     });

//     peer.signal(signal);
//     connectionRef.current = peer;
//   };

//   // NEW — Mute / Unmute toggle
//   const toggleMute = () => {
//     if (!localStreamRef.current) return;

//     const audioTrack = localStreamRef.current.getAudioTracks()[0];
//     audioTrack.enabled = !audioTrack.enabled;

//     setIsMuted(!audioTrack.enabled);
//   };

//   return (
//     <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3">

//       {/* REMOTE AUDIO */}
//       <audio playsInline autoPlay ref={userAudio} />

//       {/* STATUS BADGE */}
//       <div
//         className={`px-4 py-2 rounded-full border-2 font-bold shadow-lg flex items-center gap-2 transition-all ${
//           stream ? "bg-gray-800 border-green-500 text-green-400" : "bg-gray-800 border-red-500 text-red-500"
//         }`}
//       >
//         {stream ? (
//           <>
//             <span className="relative flex h-3 w-3">
//               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
//               <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
//             </span>
//             <span>{isMuted ? "Muted" : "Voice Active"}</span>
//           </>
//         ) : (
//           <span>🔇 Loading...</span>
//         )}
//       </div>

//       {/* 🔘 MUTE UNMUTE BUTTON */}
//       {stream && (
//         <button
//           onClick={toggleMute}
//           className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-full text-white font-bold shadow-md transition-all active:scale-95 border border-gray-500"
//         >
//           {isMuted ? "🔊 Unmute" : "🔇 Mute"}
//         </button>
//       )}
//     </div>
//   );
// };

// export default VoiceChat;









// import { useState, useEffect, useRef } from "react";

// if (typeof window !== "undefined") {
//   window.global = window;
//   window.process = { env: {} };
//   window.Buffer = window.Buffer || [];
// }

// const VoiceChat = ({ socket, roomCode, myRole }) => {
//   const [stream, setStream] = useState(null);
//   const [isMuted, setIsMuted] = useState(false);
//   const [volume, setVolume] = useState(1); // 0–1 range
//   const userAudio = useRef(null);
//   const connectionRef = useRef(null);
//   const localStreamRef = useRef(null);

//   useEffect(() => {
//     let isMounted = true;

//     const initVoice = async () => {
//       try {
//         const module = await import("simple-peer");
//         const Peer = module.default;

//         const currentStream = await navigator.mediaDevices.getUserMedia({
//           video: false,
//           audio: true,
//         });

//         if (!isMounted) {
//           currentStream.getTracks().forEach((t) => t.stop());
//           return;
//         }

//         localStreamRef.current = currentStream;
//         setStream(currentStream);

//         socket.emit("voice_ready", roomCode);

//         socket.on("all_users_connected", (targetID) => {
//           console.log("Both users voice-ready. Initiating call to:", targetID);
//           createPeer(Peer, targetID, socket.id, currentStream);
//         });

//         socket.on("user_joined_call", (payload) => {
//           console.log("Incoming call signal received.");
//           addPeer(Peer, payload.signal, payload.callerID, currentStream);
//         });

//         socket.on("receiving_returned_signal", (payload) => {
//           console.log("Call accepted by partner.");
//           connectionRef.current?.signal(payload.signal);
//         });
//       } catch (err) {
//         console.error("VoiceChat error:", err);
//       }
//     };

//     initVoice();

//     return () => {
//       isMounted = false;

//       socket.off("all_users_connected");
//       socket.off("user_joined_call");
//       socket.off("receiving_returned_signal");

//       connectionRef.current?.destroy();
//       localStreamRef.current?.getTracks().forEach((t) => t.stop());
//     };
//   }, [roomCode, socket]);

//   // 🔊 Apply volume whenever it changes
//   useEffect(() => {
//     if (userAudio.current) {
//       userAudio.current.volume = volume; // 0–1
//     }
//   }, [volume]);

//   const createPeer = (Peer, userToSignal, callerID, stream) => {
//     const peer = new Peer({
//       initiator: true,
//       trickle: false,
//       stream,
//     });

//     peer.on("signal", (signal) => {
//       socket.emit("sending_signal", { userToSignal, callerID, signal });
//     });

//     peer.on("stream", (remoteStream) => {
//       if (userAudio.current) {
//         userAudio.current.srcObject = remoteStream;
//       }
//     });

//     connectionRef.current = peer;
//   };

//   const addPeer = (Peer, incomingSignal, callerID, stream) => {
//     const peer = new Peer({
//       initiator: false,
//       trickle: false,
//       stream,
//     });

//     peer.on("signal", (signal) => {
//       socket.emit("returning_signal", { signal, callerID });
//     });

//     peer.on("stream", (remoteStream) => {
//       if (userAudio.current) {
//         userAudio.current.srcObject = remoteStream;
//       }
//     });

//     peer.signal(incomingSignal);
//     connectionRef.current = peer;
//   };

//   // 🎙️ Mute / Unmute local mic (what YOU send)
//   const toggleMute = () => {
//     if (!localStreamRef.current) return;

//     const audioTrack = localStreamRef.current.getAudioTracks()[0];
//     if (!audioTrack) return;

//     audioTrack.enabled = !audioTrack.enabled;
//     setIsMuted(!audioTrack.enabled);
//   };

//   // 🔊 Change how loud YOU hear the other person
//   const handleVolumeChange = (e) => {
//     const v = Number(e.target.value) / 100; // slider 0–100 → 0–1
//     setVolume(v);
//   };

//   const volumeIcon =
//     volume === 0 ? "🔇" : volume < 0.4 ? "🔈" : volume < 0.8 ? "🔉" : "🔊";

//   return (
//     <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 bg-gray-900/80 px-4 py-3 rounded-2xl shadow-lg border border-gray-700 backdrop-blur">

//       {/* REMOTE AUDIO (partner's voice) */}
//       <audio playsInline autoPlay ref={userAudio} />

//       {/* STATUS BADGE */}
//       <div
//         className={`px-3 py-2 rounded-full border-2 font-bold flex items-center gap-2 text-sm ${
//           stream
//             ? "bg-gray-800 border-green-500 text-green-400"
//             : "bg-gray-800 border-red-500 text-red-500"
//         }`}
//       >
//         {stream ? (
//           <>
//             <span className="relative flex h-3 w-3">
//               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
//               <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
//             </span>
//             <span>{isMuted ? "Muted" : "Voice Active"}</span>
//           </>
//         ) : (
//           <span>Loading...</span>
//         )}
//       </div>

//       {/* MUTE BUTTON */}
//       {stream && (
//         <button
//           onClick={toggleMute}
//           className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-full text-white text-sm font-semibold shadow-md transition-all active:scale-95 border border-gray-500"
//         >
//           {isMuted ? "🎙️ Unmute" : "🔇 Mute"}
//         </button>
//       )}

//       {/* VOLUME SLIDER (partner volume) */}
//       {stream && (
//         <div className="flex items-center gap-2 min-w-[130px]">
//           <span className="text-lg">{volumeIcon}</span>
//           <input
//             type="range"
//             min={0}
//             max={100}
//             value={Math.round(volume * 100)}
//             onChange={handleVolumeChange}
//             className="w-24 accent-pink-500"
//           />
//         </div>
//       )}
//     </div>
//   );
// };

// export default VoiceChat;










import { useState, useEffect, useRef } from "react";

if (typeof window !== "undefined") {
  window.global = window;
  window.process = { env: {} };
  window.Buffer = window.Buffer || [];
}

const VoiceChat = ({ socket, roomCode, myRole }) => {
  const [stream, setStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1); // 0–1
  const userAudio = useRef(null);
  const connectionRef = useRef(null);
  const localStreamRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const initVoice = async () => {
      try {
        const module = await import("simple-peer");
        const Peer = module.default;

        const currentStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });

        if (!isMounted) {
          currentStream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = currentStream;
        setStream(currentStream);

        socket.emit("voice_ready", roomCode);

        socket.on("all_users_connected", (targetID) => {
          console.log("Both users voice-ready. Initiating call to:", targetID);
          createPeer(Peer, targetID, socket.id, currentStream);
        });

        socket.on("user_joined_call", (payload) => {
          console.log("Incoming call signal received.");
          addPeer(Peer, payload.signal, payload.callerID, currentStream);
        });

        socket.on("receiving_returned_signal", (payload) => {
          console.log("Call accepted by partner.");
          connectionRef.current?.signal(payload.signal);
        });
      } catch (err) {
        console.error("VoiceChat error:", err);
      }
    };

    initVoice();

    return () => {
      isMounted = false;
      socket.off("all_users_connected");
      socket.off("user_joined_call");
      socket.off("receiving_returned_signal");

      connectionRef.current?.destroy();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [roomCode, socket]);

  // 🔊 apply volume on remote audio
  useEffect(() => {
    if (userAudio.current) {
      userAudio.current.volume = volume;
    }
  }, [volume]);

  const createPeer = (Peer, userToSignal, callerID, stream) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
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
  };

  const addPeer = (Peer, incomingSignal, callerID, stream) => {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
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
  };

  const toggleMute = () => {
    if (!localStreamRef.current) return;

    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (!audioTrack) return;

    audioTrack.enabled = !audioTrack.enabled;
    setIsMuted(!audioTrack.enabled);
  };

  const handleVolumeChange = (e) => {
    const v = Number(e.target.value) / 100;
    setVolume(v);
  };

  const volumeIcon =
    volume === 0 ? "🔇" : volume < 0.4 ? "🔈" : volume < 0.8 ? "🔉" : "🔊";

  return (
    <>
      {/* remote audio (partner) */}
      <audio playsInline autoPlay ref={userAudio} />

      <div
        className={`
          z-50 flex items-center gap-3 bg-gray-900/80 px-4 py-3 rounded-2xl shadow-lg 
          border border-gray-700 backdrop-blur text-xs sm:text-sm

          w-full justify-center mt-3
          md:w-auto md:mt-0 md:fixed md:bottom-4 md:right-4
        `}
      >
        {/* status badge */}
        <div
          className={`px-3 py-2 rounded-full border-2 font-bold flex items-center gap-2 ${
            stream
              ? "bg-gray-800 border-green-500 text-green-400"
              : "bg-gray-800 border-red-500 text-red-500"
          }`}
        >
          {stream ? (
            <>
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span>{isMuted ? "Muted" : "Voice Active"}</span>
            </>
          ) : (
            <span>Loading...</span>
          )}
        </div>

        {/* mute button */}
        {stream && (
          <button
            onClick={toggleMute}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-full text-white font-semibold shadow-md transition-all active:scale-95 border border-gray-500"
          >
            {isMuted ? "🎙️ Unmute" : "🔇 Mute"}
          </button>
        )}

        {/* volume slider */}
        {stream && (
          <div className="flex items-center gap-2 min-w-[110px] sm:min-w-[130px]">
            <span className="text-lg">{volumeIcon}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={handleVolumeChange}
              className="w-20 sm:w-24 accent-pink-500"
            />
          </div>
        )}
      </div>
    </>
  );
};

export default VoiceChat;
