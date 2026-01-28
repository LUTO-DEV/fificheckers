import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';
import useUserStore from '../stores/userStore';
import useGameStore from '../stores/gameStore';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

let globalSocket = null;
let initialized = false;

export default function useSocket() {
    const [isConnected, setIsConnected] = useState(false);
    const { token } = useUserStore();

    useEffect(() => {
        if (!token || initialized) return;

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
            console.log('✅ Socket connected');
            setIsConnected(true);
        });

        globalSocket.on('disconnect', (reason) => {
            console.log('❌ Socket disconnected:', reason);
            setIsConnected(false);
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
            console.log('♟️ Move result:', {
                nextPlayer: data.nextPlayer,
                turnEnded: data.turnEnded,
                isBot: data.isBot
            });

            const store = useGameStore.getState();

            if (data.board) {
                const turn = data.nextPlayer === 1 ? 'white' : 'black';
                store.updateBoard(data.board, turn, data.nextPlayer);
            }

            if (data.timerState) {
                store.setTimer({
                    ...data.timerState,
                    activePlayer: data.nextPlayer
                });
            }

            if (data.multiCapture && data.availableCaptures?.length > 0) {
                const cap = data.availableCaptures[0];
                store.setMultiCapture({ row: cap.from?.row, col: cap.from?.col });
            } else {
                store.setMultiCapture(null);
            }

            store.clearSelection();
        });

        globalSocket.on('move:error', (data) => {
            console.error('Move error:', data.error);
        });

        globalSocket.on('timer:update', (data) => {
            useGameStore.getState().setTimer(data);
        });

        globalSocket.on('match:end', (data) => {
            console.log('🏁 Match ended');
            useGameStore.getState().setResult(data);
        });

        globalSocket.on('chat:message', (data) => {
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

        const pingInt = setInterval(() => {
            if (globalSocket?.connected) globalSocket.emit('ping');
        }, 25000);

        return () => clearInterval(pingInt);
    }, [token]);

    const joinQueue = useCallback((betAmount, timerMode) => {
        globalSocket?.emit('queue:join', { betAmount, timerMode });
    }, []);

    const leaveQueue = useCallback(() => {
        globalSocket?.emit('queue:leave');
    }, []);

    const makeMove = useCallback((matchId, move) => {
        console.log('📤 Sending move:', move);
        globalSocket?.emit('move:make', { matchId, move });
    }, []);

    const resign = useCallback((matchId) => {
        globalSocket?.emit('match:resign', { matchId });
    }, []);

    const sendChat = useCallback((matchId, message, isQuickChat) => {
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