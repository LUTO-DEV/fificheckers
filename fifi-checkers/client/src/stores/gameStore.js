import { create } from 'zustand';

const useGameStore = create((set, get) => ({
    // Match state
    matchId: null,
    boardState: null,
    turn: 'white',
    currentPlayer: 1,
    myPlayerNum: null,
    myColor: null,

    // Players
    player1: null,
    player2: null,

    // Game settings
    betAmount: 0,
    timerMode: 'BLITZ',
    isBot: false,

    // Timer
    timer: {
        player1: 180,
        player2: 180,
        activePlayer: 1
    },

    // UI State
    selectedPiece: null,
    validMoves: [],
    validCaptures: [],
    mustCapture: false,
    multiCaptureState: null,

    // Game status
    status: 'idle',
    result: null,

    // Chat
    chatMessages: [],

    // Queue
    queuePosition: null,

    // Friend room
    roomCode: null,

    // Actions
    setMatch: (match) => {
        console.log('📦 Store: Setting match', match.matchId);
        set({
            matchId: match.matchId,
            boardState: match.boardState,
            turn: match.turn || 'white',
            currentPlayer: match.currentPlayer || 1,
            player1: match.player1,
            player2: match.player2,
            betAmount: match.betAmount || 0,
            timerMode: match.timerMode || 'BLITZ',
            isBot: match.isBot || match.player2?.isBot || false,
            status: 'playing',
            result: null,
            selectedPiece: null,
            validMoves: [],
            validCaptures: [],
            multiCaptureState: null,
            chatMessages: [],
            timer: match.timerState || {
                player1: 180,
                player2: 180,
                activePlayer: 1
            }
        });
    },

    setMyPlayer: (telegramId) => {
        const state = get();
        const playerNum = state.player1?.telegramId === telegramId ? 1 : 2;
        const color = playerNum === 1 ? 'white' : 'black';
        console.log(`📦 Store: My player = ${playerNum} (${color})`);
        set({ myPlayerNum: playerNum, myColor: color });
    },

    updateBoard: (boardState, turn, currentPlayer) => {
        console.log(`📦 Store: Board update - turn=${turn}, player=${currentPlayer}`);
        set({
            boardState,
            turn,
            currentPlayer,
            selectedPiece: null,
            validMoves: [],
            validCaptures: []
        });
    },

    setTimer: (timer) => {
        set({ timer });
    },

    selectPiece: (row, col, moves, captures, mustCapture) => {
        console.log(`📦 Store: Selected piece at (${row}, ${col})`);
        set({
            selectedPiece: { row, col },
            validMoves: moves || [],
            validCaptures: captures || [],
            mustCapture: mustCapture || false
        });
    },

    clearSelection: () => {
        set({
            selectedPiece: null,
            validMoves: [],
            validCaptures: [],
            mustCapture: false
        });
    },

    setMultiCapture: (state) => {
        console.log('📦 Store: Multi-capture state:', state);
        set({ multiCaptureState: state });
    },

    setResult: (result) => {
        console.log('📦 Store: Game result', result);
        set({
            status: 'finished',
            result
        });
    },

    addChatMessage: (message) => set((state) => ({
        chatMessages: [...state.chatMessages, message].slice(-50)
    })),

    setQueuePosition: (position) => set({ queuePosition: position }),

    setRoomCode: (code) => {
        console.log('📦 Store: Room code:', code);
        set({ roomCode: code });
    },

    setStatus: (status) => set({ status }),

    setBetAmount: (amount) => set({ betAmount: amount }),

    setTimerMode: (mode) => set({ timerMode: mode }),

    reset: () => {
        console.log('📦 Store: Resetting');
        set({
            matchId: null,
            boardState: null,
            turn: 'white',
            currentPlayer: 1,
            myPlayerNum: null,
            myColor: null,
            player1: null,
            player2: null,
            betAmount: 0,
            timerMode: 'BLITZ',
            isBot: false,
            timer: { player1: 180, player2: 180, activePlayer: 1 },
            selectedPiece: null,
            validMoves: [],
            validCaptures: [],
            mustCapture: false,
            multiCaptureState: null,
            status: 'idle',
            result: null,
            chatMessages: [],
            queuePosition: null,
            roomCode: null
        });
    }
}));

export default useGameStore;