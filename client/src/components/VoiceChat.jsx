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






// client/src/components/VoiceChat.jsx
import { useState, useEffect, useRef } from "react";

// --- Polyfills for simple-peer / WebRTC in Vite ---
if (typeof window !== "undefined") {
  // simple-peer internally expects these
  window.global = window;
  window.process = { env: {} };
  window.Buffer = window.Buffer || [];
}

const VoiceChat = ({ socket, roomCode, myRole }) => {
  const [stream, setStream] = useState(null);
  const userAudio = useRef(null);       // remote audio will play here
  const connectionRef = useRef(null);   // holds current Peer instance
  const localStreamRef = useRef(null);  // to stop tracks on cleanup

  useEffect(() => {
    let isMounted = true;

    const initVoice = async () => {
      try {
        // 1) Dynamically load simple-peer (avoids "global is not defined")
        const module = await import("simple-peer");
        const Peer = module.default;

        // 2) Ask for mic permission
        const currentStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });

        if (!isMounted) {
          // component unmount ho chuka ho to tracks ko turant stop kar do
          currentStream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = currentStream;
        setStream(currentStream);
        console.log("🎙️ Microphone access granted.");

        // 👉 SERVER KO BOL DO: "Main voice ke liye ready hoon"
        socket.emit("voice_ready", roomCode);

        // 3) Signaling listeners
        socket.on("all_users_connected", (userToSignalID) => {
          console.log("Both users voice-ready. Initiating call to:", userToSignalID);
          createPeer(Peer, userToSignalID, socket.id, currentStream);
        });

        socket.on("user_joined_call", (payload) => {
          console.log("Incoming call signal received.");
          addPeer(Peer, payload.signal, payload.callerID, currentStream);
        });

        socket.on("receiving_returned_signal", (payload) => {
          console.log("Call accepted by partner.");
          const peer = connectionRef.current;
          if (peer) {
            peer.signal(payload.signal);
          }
        });
      } catch (err) {
        console.error("VoiceChat init error:", err);
      }
    };

    initVoice();

    // Cleanup
    return () => {
      isMounted = false;

      socket.off("all_users_connected");
      socket.off("user_joined_call");
      socket.off("receiving_returned_signal");

      if (connectionRef.current) {
        connectionRef.current.destroy();
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
    // roomCode/socket change se re-init hoga (normally stable hi rehte hain)
  }, [roomCode, socket]);

  const createPeer = (Peer, userToSignal, callerID, stream) => {
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
  };

  const addPeer = (Peer, incomingSignal, callerID, stream) => {
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
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
      {/* Remote audio plays here */}
      <audio playsInline autoPlay ref={userAudio} />

      <div
        className={`px-4 py-2 rounded-full border-2 font-bold shadow-lg flex items-center gap-2 transition-all ${
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
            <span>Voice Active</span>
          </>
        ) : (
          <span>🔇 Mic Off / Loading</span>
        )}
      </div>
    </div>
  );
};

export default VoiceChat;
