import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import useUserStore from '../stores/userStore';
import useGameStore from '../stores/gameStore';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

export default function useSocket() {
    const socketRef = useRef(null);
    const { token, user } = useUserStore();
    const {
        setMatch, setMyPlayer, updateBoard, setTimer,
        setResult, addChatMessage, setQueuePosition,
        setRoomCode, setStatus, reset
    } = useGameStore();

    useEffect(() => {
        if (!token) return;

        const socket = io(WS_URL, {
            auth: { token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        socketRef.current = socket;

        // Connection events
        socket.on('connect', () => {
            console.log('Socket connected');
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });

        // Queue events
        socket.on('queue:joined', (data) => {
            setQueuePosition(data.position);
            setStatus('queue');
        });

        socket.on('queue:left', () => {
            setQueuePosition(null);
            setStatus('idle');
        });

        socket.on('queue:error', (data) => {
            console.error('Queue error:', data.error);
            setStatus('idle');
        });

        // Match events
        socket.on('match:start', (data) => {
            setMatch(data);
            if (user) {
                setMyPlayer(user.telegramId);
            }
        });

        socket.on('move:result', (data) => {
            updateBoard(data.board, data.nextPlayer === 1 ? 'white' : 'black', data.nextPlayer);
            if (data.timerState) {
                setTimer(data.timerState);
            }
        });

        socket.on('move:error', (data) => {
            console.error('Move error:', data.error);
        });

        socket.on('timer:update', (data) => {
            setTimer(data);
        });

        socket.on('match:end', (data) => {
            setResult(data);
        });

        // Chat events
        socket.on('chat:message', (data) => {
            addChatMessage(data);
        });

        // Room events
        socket.on('room:created', (data) => {
            setRoomCode(data.roomCode);
        });

        socket.on('room:error', (data) => {
            console.error('Room error:', data.error);
        });

        socket.on('room:closed', () => {
            setRoomCode(null);
        });

        // Punishment events
        socket.on('punishment:show', (data) => {
            // Handle punishment animation
            console.log('Punishment:', data);
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [token, user]);

    // Socket actions
    const joinQueue = useCallback((betAmount, timerMode) => {
        socketRef.current?.emit('queue:join', { betAmount, timerMode });
    }, []);

    const leaveQueue = useCallback(() => {
        socketRef.current?.emit('queue:leave');
    }, []);

    const makeMove = useCallback((matchId, move) => {
        socketRef.current?.emit('move:make', { matchId, move });
    }, []);

    const resign = useCallback((matchId) => {
        socketRef.current?.emit('match:resign', { matchId });
    }, []);

    const sendChat = useCallback((matchId, message, isQuickChat = false) => {
        socketRef.current?.emit('chat:send', { matchId, message, isQuickChat });
    }, []);

    const createRoom = useCallback((betAmount, timerMode) => {
        socketRef.current?.emit('room:create', { betAmount, timerMode });
    }, []);

    const joinRoom = useCallback((roomCode) => {
        socketRef.current?.emit('room:join', { roomCode });
    }, []);

    const closeRoom = useCallback((roomCode) => {
        socketRef.current?.emit('room:close', { roomCode });
    }, []);

    const startBotMatch = useCallback((betAmount, timerMode) => {
        socketRef.current?.emit('bot:start', { betAmount, timerMode });
    }, []);

    const syncTimer = useCallback((matchId) => {
        socketRef.current?.emit('timer:sync', { matchId });
    }, []);

    const triggerPunishment = useCallback((matchId, punishmentId) => {
        socketRef.current?.emit('punishment:trigger', { matchId, punishmentId });
    }, []);

    return {
        socket: socketRef.current,
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