import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';
import useUserStore from '../stores/userStore';
import useGameStore from '../stores/gameStore';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

let globalSocket = null;

export default function useSocket() {
    const [isConnected, setIsConnected] = useState(false);
    const { token } = useUserStore();
    const initialized = useRef(false);

    useEffect(() => {
        if (!token || initialized.current) return;

        // Get fresh store reference
        const gameStore = useGameStore.getState();
        const userStore = useUserStore.getState();

        console.log('🔌 Initializing socket...');
        initialized.current = true;

        globalSocket = io(WS_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 50,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            forceNew: false
        });

        globalSocket.on('connect', () => {
            console.log('✅ Socket connected:', globalSocket.id);
            setIsConnected(true);
        });

        globalSocket.on('disconnect', (reason) => {
            console.log('❌ Socket disconnected:', reason);
            setIsConnected(false);
        });

        globalSocket.on('connect_error', (error) => {
            console.error('🔴 Connection error:', error.message);
        });

        // Queue events
        globalSocket.on('queue:joined', (data) => {
            console.log('📋 Joined queue:', data);
            useGameStore.getState().setQueuePosition(data.position);
            useGameStore.getState().setStatus('queue');
        });

        globalSocket.on('queue:left', () => {
            console.log('📋 Left queue');
            useGameStore.getState().setQueuePosition(null);
            useGameStore.getState().setStatus('idle');
        });

        globalSocket.on('queue:error', (data) => {
            console.error('📋 Queue error:', data.error);
            useGameStore.getState().setStatus('idle');
        });

        // Match start
        globalSocket.on('match:start', (data) => {
            console.log('🎮 Match started:', data.matchId);

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

        // Move result - THIS IS THE KEY FIX
        globalSocket.on('move:result', (data) => {
            console.log('♟️ Move result received:', {
                nextPlayer: data.nextPlayer,
                turnEnded: data.turnEnded,
                isBot: data.isBot,
                multiCapture: data.multiCapture
            });

            const store = useGameStore.getState();

            // Update the board
            if (data.board) {
                const nextTurn = data.nextPlayer === 1 ? 'white' : 'black';
                store.updateBoard(data.board, nextTurn, data.nextPlayer);
            }

            // Update timer
            if (data.timerState) {
                store.setTimer({
                    ...data.timerState,
                    activePlayer: data.nextPlayer
                });
            }

            // Handle multi-capture
            if (data.multiCapture && data.availableCaptures) {
                store.setMultiCapture({
                    row: data.availableCaptures[0]?.from?.row,
                    col: data.availableCaptures[0]?.from?.col
                });
            } else {
                store.setMultiCapture(null);
            }

            // Clear selection after move
            store.clearSelection();
        });

        globalSocket.on('move:error', (data) => {
            console.error('♟️ Move error:', data.error);
        });

        // Timer update
        globalSocket.on('timer:update', (data) => {
            useGameStore.getState().setTimer(data);
        });

        // Match end
        globalSocket.on('match:end', (data) => {
            console.log('🏁 Match ended:', data);
            useGameStore.getState().setResult(data);
        });

        // Chat
        globalSocket.on('chat:message', (data) => {
            useGameStore.getState().addChatMessage(data);
        });

        // Room events
        globalSocket.on('room:created', (data) => {
            console.log('🏠 Room created:', data.roomCode);
            useGameStore.getState().setRoomCode(data.roomCode);
        });

        globalSocket.on('room:error', (data) => {
            console.error('🏠 Room error:', data.error);
        });

        globalSocket.on('room:closed', () => {
            useGameStore.getState().setRoomCode(null);
        });

        // Keep alive ping
        const pingInterval = setInterval(() => {
            if (globalSocket?.connected) {
                globalSocket.emit('ping');
            }
        }, 25000);

        return () => {
            clearInterval(pingInterval);
        };
    }, [token]);

    // Actions
    const joinQueue = useCallback((betAmount, timerMode) => {
        if (globalSocket?.connected) {
            globalSocket.emit('queue:join', { betAmount, timerMode });
        }
    }, []);

    const leaveQueue = useCallback(() => {
        if (globalSocket?.connected) {
            globalSocket.emit('queue:leave');
        }
    }, []);

    const makeMove = useCallback((matchId, move) => {
        if (globalSocket?.connected) {
            console.log('📤 Sending move:', move);
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
            console.log('🤖 Starting bot match');
            globalSocket.emit('bot:start', { betAmount, timerMode });
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