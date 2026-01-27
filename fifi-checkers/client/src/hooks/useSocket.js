import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';
import useUserStore from '../stores/userStore';
import useGameStore from '../stores/gameStore';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

// SINGLETON socket - persists across component remounts
let globalSocket = null;
let isInitialized = false;

export default function useSocket() {
    const [isConnected, setIsConnected] = useState(false);
    const { token, user } = useUserStore();
    const gameStore = useGameStore();

    useEffect(() => {
        if (!token) return;

        // Only create socket once
        if (globalSocket && globalSocket.connected) {
            setIsConnected(true);
            return;
        }

        // If socket exists but disconnected, reconnect
        if (globalSocket && !globalSocket.connected) {
            globalSocket.connect();
            return;
        }

        // Create new socket only if none exists
        if (!globalSocket) {
            console.log('🔌 Creating new socket connection...');

            globalSocket = io(WS_URL, {
                auth: { token },
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 20,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 20000,
                autoConnect: true
            });

            // Connection events
            globalSocket.on('connect', () => {
                console.log('✅ Socket connected:', globalSocket.id);
                setIsConnected(true);
            });

            globalSocket.on('disconnect', (reason) => {
                console.log('❌ Socket disconnected:', reason);
                setIsConnected(false);

                // Auto reconnect unless server closed it
                if (reason === 'io server disconnect') {
                    globalSocket.connect();
                }
            });

            globalSocket.on('connect_error', (error) => {
                console.error('🔴 Socket connection error:', error.message);
            });

            // Queue events
            globalSocket.on('queue:joined', (data) => {
                console.log('📋 Joined queue:', data);
                gameStore.setQueuePosition(data.position);
                gameStore.setStatus('queue');
            });

            globalSocket.on('queue:left', () => {
                console.log('📋 Left queue');
                gameStore.setQueuePosition(null);
                gameStore.setStatus('idle');
            });

            globalSocket.on('queue:error', (data) => {
                console.error('📋 Queue error:', data.error);
                gameStore.setStatus('idle');
            });

            // Match events
            globalSocket.on('match:start', (data) => {
                console.log('🎮 Match started:', data);
                gameStore.setMatch(data);

                // Set timer from server
                if (data.timerState) {
                    gameStore.setTimer(data.timerState);
                }

                // Set my player
                const currentUser = useUserStore.getState().user;
                if (currentUser) {
                    gameStore.setMyPlayer(currentUser.telegramId);
                }
            });

            globalSocket.on('move:result', (data) => {
                console.log('♟️ Move result:', data);
                const nextTurn = data.nextPlayer === 1 ? 'white' : 'black';
                gameStore.updateBoard(data.board, nextTurn, data.nextPlayer);
                if (data.timerState) {
                    gameStore.setTimer(data.timerState);
                }
            });

            globalSocket.on('move:error', (data) => {
                console.error('♟️ Move error:', data.error);
            });

            globalSocket.on('timer:update', (data) => {
                gameStore.setTimer(data);
            });

            globalSocket.on('match:end', (data) => {
                console.log('🏁 Match ended:', data);
                gameStore.setResult(data);
            });

            // Chat events
            globalSocket.on('chat:message', (data) => {
                gameStore.addChatMessage(data);
            });

            // Room events
            globalSocket.on('room:created', (data) => {
                console.log('🏠 Room created:', data);
                gameStore.setRoomCode(data.roomCode);
            });

            globalSocket.on('room:error', (data) => {
                console.error('🏠 Room error:', data.error);
            });

            globalSocket.on('room:closed', () => {
                gameStore.setRoomCode(null);
            });

            // Punishment events
            globalSocket.on('punishment:show', (data) => {
                console.log('💀 Punishment:', data);
            });

            isInitialized = true;
        }

        // DO NOT disconnect on cleanup - we want persistent connection!
        return () => {
            // Don't disconnect!
        };
    }, [token]);

    // Socket actions
    const joinQueue = useCallback((betAmount, timerMode) => {
        if (globalSocket?.connected) {
            console.log('📤 Joining queue:', { betAmount, timerMode });
            globalSocket.emit('queue:join', { betAmount, timerMode });
        } else {
            console.error('Socket not connected');
        }
    }, []);

    const leaveQueue = useCallback(() => {
        if (globalSocket?.connected) {
            globalSocket.emit('queue:leave');
        }
    }, []);

    const makeMove = useCallback((matchId, move) => {
        if (globalSocket?.connected) {
            console.log('📤 Making move:', { matchId, move });
            globalSocket.emit('move:make', { matchId, move });
        }
    }, []);

    const resign = useCallback((matchId) => {
        if (globalSocket?.connected) {
            globalSocket.emit('match:resign', { matchId });
        }
    }, []);

    const sendChat = useCallback((matchId, message, isQuickChat = false) => {
        if (globalSocket?.connected) {
            globalSocket.emit('chat:send', { matchId, message, isQuickChat });
        }
    }, []);

    const createRoom = useCallback((betAmount, timerMode) => {
        if (globalSocket?.connected) {
            globalSocket.emit('room:create', { betAmount, timerMode });
        }
    }, []);

    const joinRoom = useCallback((roomCode) => {
        if (globalSocket?.connected) {
            globalSocket.emit('room:join', { roomCode });
        }
    }, []);

    const closeRoom = useCallback((roomCode) => {
        if (globalSocket?.connected) {
            globalSocket.emit('room:close', { roomCode });
        }
    }, []);

    const startBotMatch = useCallback((betAmount, timerMode) => {
        if (globalSocket?.connected) {
            console.log('🤖 Starting bot match:', { betAmount, timerMode });
            globalSocket.emit('bot:start', { betAmount, timerMode });
        } else {
            console.error('Socket not connected for bot match');
        }
    }, []);

    const syncTimer = useCallback((matchId) => {
        if (globalSocket?.connected) {
            globalSocket.emit('timer:sync', { matchId });
        }
    }, []);

    const triggerPunishment = useCallback((matchId, punishmentId) => {
        if (globalSocket?.connected) {
            globalSocket.emit('punishment:trigger', { matchId, punishmentId });
        }
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