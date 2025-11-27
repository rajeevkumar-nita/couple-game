import React, { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';

// Needed for some Vite environments to handle WebRTC
import * as process from "process";
window.global = window;
window.process = process;
window.Buffer = [];

const VoiceChat = ({ socket, roomCode, myRole }) => {
    const [stream, setStream] = useState(null);
    const userAudio = useRef(); // To play the other person's audio
    const connectionRef = useRef();

    useEffect(() => {
        // 1. Get Microphone Permission
        navigator.mediaDevices.getUserMedia({ video: false, audio: true })
            .then((currentStream) => {
                setStream(currentStream);

                // If we are the FIRST player (Walker usually, or whoever joined first),
                // we wait for the server to tell us "all_users_connected"
                socket.on("all_users_connected", (userToSignalID) => {
                    createPeer(userToSignalID, socket.id, currentStream);
                });

                // If we are the SECOND player, we wait for the first player to call us
                socket.on("user_joined_call", (payload) => {
                    addPeer(payload.signal, payload.callerID, currentStream);
                });

                // Finalize the handshake
                socket.on("receiving_returned_signal", (payload) => {
                    const item = connectionRef.current;
                    if(item) {
                        item.signal(payload.signal);
                    }
                });
            });

        return () => {
            // Cleanup when component unmounts (game over/leave)
            if(stream) stream.getTracks().forEach(track => track.stop());
            if(connectionRef.current) connectionRef.current.destroy();
        };
    // eslint-disable-next-line
    }, []);

    function createPeer(userToSignal, callerID, stream) {
        const peer = new Peer({
            initiator: true, // This person STARTS the call
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

    function addPeer(incomingSignal, callerID, stream) {
        const peer = new Peer({
            initiator: false, // This person ANSWERS the call
            trickle: false,
            stream: stream,
        });

        peer.on("signal", (signal) => {
            socket.emit("returning_signal", { signal, callerID });
        });

        peer.on("signal", (data) => {
            // Handled automatically by simple-peer logic mostly
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
        <div className="fixed bottom-4 right-4 bg-gray-800 p-3 rounded-full border border-pink-500 shadow-lg flex items-center gap-2 z-50">
            {/* Hidden Audio Element to play sound */}
            <audio playsInline autoPlay ref={userAudio} />
            
            <span className="text-xl animate-pulse">
                {stream ? "🎙️ Voice Active" : "🔇 Loading Audio..."}
            </span>
        </div>
    );
};

export default VoiceChat;