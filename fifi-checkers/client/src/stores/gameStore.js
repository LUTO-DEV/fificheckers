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
        player1: 0,
        player2: 0,
        activePlayer: null
    },

    // UI State
    selectedPiece: null,
    validMoves: [],
    validCaptures: [],
    mustCapture: false,
    multiCaptureState: null,

    // Game status
    status: 'idle', // idle, queue, playing, finished
    result: null,

    // Chat
    chatMessages: [],

    // Queue
    queuePosition: null,

    // Friend room
    roomCode: null,

    // Actions
    setMatch: (match) => set({
        matchId: match.matchId,
        boardState: match.boardState,
        turn: match.turn || 'white',
        currentPlayer: match.currentPlayer || 1,
        player1: match.player1,
        player2: match.player2,
        betAmount: match.betAmount,
        timerMode: match.timerMode,
        isBot: match.isBot || match.player2?.isBot || false,
        status: 'playing',
        result: null,
        selectedPiece: null,
        validMoves: [],
        validCaptures: [],
        chatMessages: []
    }),

    setMyPlayer: (telegramId) => {
        const state = get();
        const playerNum = state.player1?.telegramId === telegramId ? 1 : 2;
        const color = playerNum === 1 ? 'white' : 'black';
        set({ myPlayerNum: playerNum, myColor: color });
    },

    updateBoard: (boardState, turn, currentPlayer) => set({
        boardState,
        turn,
        currentPlayer,
        selectedPiece: null,
        validMoves: [],
        validCaptures: [],
        multiCaptureState: null
    }),

    setTimer: (timer) => set({ timer }),

    selectPiece: (row, col, moves, captures, mustCapture) => set({
        selectedPiece: { row, col },
        validMoves: moves,
        validCaptures: captures,
        mustCapture
    }),

    clearSelection: () => set({
        selectedPiece: null,
        validMoves: [],
        validCaptures: [],
        mustCapture: false
    }),

    setMultiCapture: (state) => set({ multiCaptureState: state }),

    setResult: (result) => set({
        status: 'finished',
        result
    }),

    addChatMessage: (message) => set((state) => ({
        chatMessages: [...state.chatMessages, message].slice(-50)
    })),

    setQueuePosition: (position) => set({ queuePosition: position }),

    setRoomCode: (code) => set({ roomCode: code }),

    setStatus: (status) => set({ status }),

    setBetAmount: (amount) => set({ betAmount: amount }),

    setTimerMode: (mode) => set({ timerMode: mode }),

    reset: () => set({
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
        timer: { player1: 0, player2: 0, activePlayer: null },
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
    })
}));

export default useGameStore;