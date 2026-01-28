import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';
import useUserStore from '../stores/userStore';
import useGameStore from '../stores/gameStore';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

let globalSocket = null;
let initialized = false;
let connectionState = { connected: false };

export default function useSocket() {
    const [isConnected, setIsConnected] = useState(connectionState.connected);
    const { token } = useUserStore();

    useEffect(() => {
        if (!token || initialized) {
            if (globalSocket?.connected) {
                setIsConnected(true);
            }
            return;
        }

        initialized = true;
        console.log('🔌 Connecting to socket...');

        globalSocket = io(WS_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 100,
            reconnectionDelay: 1000,
            timeout: 20000
        });

        globalSocket.on('connect', () => {
            console.log('✅ Socket connected:', globalSocket.id);
            connectionState.connected = true;
            setIsConnected(true);
        });

        globalSocket.on('disconnect', (reason) => {
            console.log('❌ Socket disconnected:', reason);
            connectionState.connected = false;
            setIsConnected(false);
        });

        globalSocket.on('reconnect', () => {
            console.log('🔄 Socket reconnected');
            connectionState.connected = true;
            setIsConnected(true);
        });

        globalSocket.on('queue:joined', (data) => {
            console.log('📋 Queue joined');
            useGameStore.getState().setQueuePosition(data.position);
            useGameStore.getState().setStatus('queue');
        });

        globalSocket.on('queue:left', () => {
            useGameStore.getState().setQueuePosition(null);
            useGameStore.getState().setStatus('idle');
        });

        globalSocket.on('queue:error', (data) => {
            console.error('Queue error:', data.error);
            useGameStore.getState().setStatus('idle');
        });

        globalSocket.on('match:start', (data) => {
            console.log('🎮 Match started:', data.matchId);
            console.log('📦 Match data:', JSON.stringify(data, null, 2));

            const store = useGameStore.getState();
            store.setMatch(data);

            if (data.timerState) {
                store.setTimer(data.timerState);
            }

            const user = useUserStore.getState().user;
            if (user) {
                store.setMyPlayer(user.telegramId);
            }
        });

        globalSocket.on('move:result', (data) => {
            console.log('♟️ Move result received:', JSON.stringify(data));

            const store = useGameStore.getState();

            // Update board
            if (data.board) {
                // Determine next player - handle both turnEnded true and false cases
                let nextPlayer = data.nextPlayer;
                if (nextPlayer === undefined) {
                    // If turnEnded is false, keep current player
                    nextPlayer = data.turnEnded === false ? store.currentPlayer : (store.currentPlayer === 1 ? 2 : 1);
                }

                const turn = nextPlayer === 1 ? 'white' : 'black';
                console.log('📦 Updating board: nextPlayer=', nextPlayer, 'turn=', turn);
                store.updateBoard(data.board, turn, nextPlayer);
            }

            // Update timer
            if (data.timerState) {
                store.setTimer({
                    ...data.timerState,
                    activePlayer: data.nextPlayer || store.currentPlayer
                });
            }

            // Handle multi-capture
            if (data.multiCapture && data.availableCaptures?.length > 0) {
                console.log('🔄 Multi-capture mode! Available:', data.availableCaptures.length);
                const cap = data.availableCaptures[0];
                store.setMultiCapture({
                    row: cap.from.row,
                    col: cap.from.col,
                    availableCaptures: data.availableCaptures
                });
                // Auto-select the piece that must continue capturing
                store.selectPiece(
                    cap.from.row,
                    cap.from.col,
                    [],
                    data.availableCaptures.map(c => ({ row: c.to.row, col: c.to.col, captured: c.captured })),
                    true
                );
            } else {
                store.setMultiCapture(null);
                store.clearSelection();
            }
        });

        globalSocket.on('move:error', (data) => {
            console.error('❌ Move error:', data.error);
            // Show error to user
            alert(data.error);
        });

        globalSocket.on('timer:update', (data) => {
            useGameStore.getState().setTimer(data);
        });

        globalSocket.on('match:end', (data) => {
            console.log('🏁 Match ended:', data);
            useGameStore.getState().setResult(data);
        });

        globalSocket.on('chat:message', (data) => {
            console.log('💬 Chat received:', data);
            useGameStore.getState().addChatMessage(data);
        });

        globalSocket.on('room:created', (data) => {
            console.log('🏠 Room:', data.roomCode);
            useGameStore.getState().setRoomCode(data.roomCode);
        });

        globalSocket.on('room:error', (data) => {
            console.error('Room error:', data.error);
        });

        globalSocket.on('room:closed', () => {
            useGameStore.getState().setRoomCode(null);
        });

        // Ping to keep alive
        const pingInt = setInterval(() => {
            if (globalSocket?.connected) {
                globalSocket.emit('ping');
            }
        }, 25000);

        return () => {
            clearInterval(pingInt);
        };
    }, [token]);

    // Sync connection state
    useEffect(() => {
        const checkConnection = setInterval(() => {
            if (globalSocket) {
                const connected = globalSocket.connected;
                if (connected !== isConnected) {
                    setIsConnected(connected);
                    connectionState.connected = connected;
                }
            }
        }, 1000);

        return () => clearInterval(checkConnection);
    }, [isConnected]);

    const joinQueue = useCallback((betAmount, timerMode) => {
        globalSocket?.emit('queue:join', { betAmount, timerMode });
    }, []);

    const leaveQueue = useCallback(() => {
        globalSocket?.emit('queue:leave');
    }, []);

    const makeMove = useCallback((matchId, move) => {
        console.log('📤 Sending move:', JSON.stringify(move));
        globalSocket?.emit('move:make', { matchId, move });
    }, []);

    const resign = useCallback((matchId) => {
        globalSocket?.emit('match:resign', { matchId });
    }, []);

    const sendChat = useCallback((matchId, message, isQuickChat = false) => {
        console.log('📤 Sending chat:', message);
        globalSocket?.emit('chat:send', { matchId, message, isQuickChat });
    }, []);

    const createRoom = useCallback((betAmount, timerMode) => {
        globalSocket?.emit('room:create', { betAmount, timerMode });
    }, []);

    const joinRoom = useCallback((roomCode) => {
        globalSocket?.emit('room:join', { roomCode });
    }, []);

    const closeRoom = useCallback((roomCode) => {
        globalSocket?.emit('room:close', { roomCode });
    }, []);

    const startBotMatch = useCallback((betAmount, timerMode) => {
        console.log('🤖 Starting bot match');
        globalSocket?.emit('bot:start', { betAmount, timerMode });
    }, []);

    const syncTimer = useCallback((matchId) => {
        globalSocket?.emit('timer:sync', { matchId });
    }, []);

    const triggerPunishment = useCallback((matchId, punishmentId) => {
        globalSocket?.emit('punishment:trigger', { matchId, punishmentId });
    }, []);

    return {
        socket: globalSocket,
        isConnected,
        joinQueue,
        leaveQueue,
        makeMove,
        resign,
        sendChat,
        createRoom,
        joinRoom,
        closeRoom,
        startBotMatch,
        syncTimer,
        triggerPunishment
    };
}