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





import React, { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';

const VoiceChat = ({ socket, roomCode }) => {
    const [stream, setStream] = useState(null);
    const [callStatus, setCallStatus] = useState("Connecting...");
    const userAudio = useRef(); 
    const connectionRef = useRef();

    useEffect(() => {
        // 1. Get Microphone Permission
        navigator.mediaDevices.getUserMedia({ video: false, audio: true })
            .then((currentStream) => {
                setStream(currentStream);
                setCallStatus("Mic Active 🎤");

                // LISTENERS
                socket.on("all_users_connected", (userToSignalID) => {
                    console.log("Partner found, calling...");
                    createPeer(userToSignalID, socket.id, currentStream);
                });

                socket.on("user_joined_call", (payload) => {
                    console.log("Incoming call...");
                    addPeer(payload.signal, payload.callerID, currentStream);
                });

                socket.on("receiving_returned_signal", (payload) => {
                    const item = connectionRef.current;
                    if(item) {
                        item.signal(payload.signal);
                        setCallStatus("Connected 🟢");
                    }
                });
            })
            .catch(err => {
                console.error("Mic Error:", err);
                setCallStatus("Mic Error 🔴");
            });

        return () => {
            if(stream) stream.getTracks().forEach(track => track.stop());
            if(connectionRef.current) connectionRef.current.destroy();
            socket.off("all_users_connected");
            socket.off("user_joined_call");
            socket.off("receiving_returned_signal");
        };
    }, []);

    // --- CREATE PEER (Initiator) ---
    function createPeer(userToSignal, callerID, stream) {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream: stream,
            config: { // IMPORTANT: STUN SERVERS
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            }
        });

        peer.on("signal", (signal) => {
            socket.emit("sending_signal", { userToSignal, callerID, signal });
        });

        peer.on("stream", (remoteStream) => {
            if (userAudio.current) userAudio.current.srcObject = remoteStream;
            setCallStatus("Connected 🟢");
        });

        connectionRef.current = peer;
    }

    // --- ADD PEER (Receiver) ---
    function addPeer(incomingSignal, callerID, stream) {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream: stream,
            config: { // IMPORTANT: STUN SERVERS
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            }
        });

        peer.on("signal", (signal) => {
            socket.emit("returning_signal", { signal, callerID });
        });

        peer.on("stream", (remoteStream) => {
            if (userAudio.current) userAudio.current.srcObject = remoteStream;
            setCallStatus("Connected 🟢");
        });

        peer.signal(incomingSignal);
        connectionRef.current = peer;
    }

    return (
        <div className="fixed bottom-4 right-4 bg-gray-900 p-3 rounded-full border border-green-500 shadow-2xl flex items-center gap-3 z-50">
            {/* Remote Audio Player */}
            <audio playsInline autoPlay ref={userAudio} />
            
            <div className={`h-3 w-3 rounded-full ${callStatus.includes("Connected") ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`}></div>
            <span className="text-sm font-bold text-white">{callStatus}</span>
        </div>
    );
};

export default VoiceChat;