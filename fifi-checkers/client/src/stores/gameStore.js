import { create } from 'zustand';

const useGameStore = create((set, get) => ({
    // Match state
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

    // Timer
    timer: { player1: 180, player2: 180, activePlayer: 1 },

    // Selection
    selectedPiece: null,
    validMoves: [],
    validCaptures: [],
    mustCapture: false,
    multiCaptureState: null,

    // Game state
    status: 'idle',
    result: null,

    // Chat with unread counter
    chatMessages: [],
    unreadChatCount: 0,

    // Queue/Room
    queuePosition: null,
    roomCode: null,

    setMatch: (match) => {
        console.log('📦 setMatch called');
        console.log('  matchId:', match.matchId);
        console.log('  currentPlayer:', match.currentPlayer);
        console.log('  turn:', match.turn);

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
            unreadChatCount: 0,
            timer: match.timerState || { player1: 180, player2: 180, activePlayer: 1 }
        });
    },

    setMyPlayer: (telegramId) => {
        const state = get();
        const num = state.player1?.telegramId === telegramId ? 1 : 2;
        const color = num === 1 ? 'white' : 'black';
        console.log('📦 setMyPlayer: num=', num, 'color=', color);
        set({ myPlayerNum: num, myColor: color });
    },

    updateBoard: (boardState, turn, currentPlayer) => {
        console.log('📦 updateBoard: currentPlayer=', currentPlayer, 'turn=', turn);
        set({
            boardState,
            turn: turn || (currentPlayer === 1 ? 'white' : 'black'),
            currentPlayer: currentPlayer,
            selectedPiece: null,
            validMoves: [],
            validCaptures: []
        });
    },

    setTimer: (timer) => {
        set({ timer });
    },

    selectPiece: (row, col, moves, captures, mustCapture) => {
        console.log('📦 selectPiece:', row, col, 'moves:', moves?.length, 'captures:', captures?.length);
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
        console.log('📦 setMultiCapture:', state);
        set({ multiCaptureState: state });
    },

    setResult: (result) => {
        console.log('📦 setResult:', result?.reason);
        set({ status: 'finished', result });
    },

    addChatMessage: (msg) => {
        const state = get();
        set({
            chatMessages: [...state.chatMessages, msg].slice(-50),
            unreadChatCount: state.unreadChatCount + 1
        });
    },

    clearUnreadChat: () => {
        set({ unreadChatCount: 0 });
    },

    setQueuePosition: (pos) => set({ queuePosition: pos }),
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
        timer: { player1: 180, player2: 180, activePlayer: 1 },
        selectedPiece: null,
        validMoves: [],
        validCaptures: [],
        mustCapture: false,
        multiCaptureState: null,
        status: 'idle',
        result: null,
        chatMessages: [],
        unreadChatCount: 0,
        queuePosition: null,
        roomCode: null
    })
}));

export default useGameStore;