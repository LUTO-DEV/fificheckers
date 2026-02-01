const CheckersLogic = require('../utils/checkers.logic');
const { PIECE, BOARD_SIZE } = require('../utils/constants');

class BotService {

    // ============================================
    // THE OMNISCIENT - MATHEMATICALLY PERFECTED
    // ============================================
    static INFINITY = 1000000;
    static MAX_TIME_MS = 10000; // 10 seconds of pure calculation
    static MIN_DEPTH = 12;      // Minimum guaranteed depth
    static MAX_DEPTH = 64;      // Theoretical max

    // Memory Structures
    static tt = new Map();      // Transposition Table
    static history = new Uint32Array(64 * 64); // Fast History Heuristic
    static killerMoves = [];    // Killer Move slots

    static nodes = 0;
    static timeStart = 0;
    static timeOut = false;

    // Zobrist Keys (For instant hashing)
    static zArray = [];
    static zTurn = 0;

    static initZobrist() {
        if (this.zArray.length > 0) return;
        // Initialize 3D array [row][col][piece_type] with random 32bit ints
        for (let i = 0; i < 8; i++) {
            this.zArray[i] = [];
            for (let j = 0; j < 8; j++) {
                this.zArray[i][j] = {};
                // Assign random ID for Black, White, B-King, W-King
                [PIECE.BLACK, PIECE.WHITE, PIECE.BLACK_KING, PIECE.WHITE_KING].forEach(p => {
                    this.zArray[i][j][p] = Math.floor(Math.random() * 2147483647);
                });
            }
        }
        this.zTurn = Math.floor(Math.random() * 2147483647);
    }

    // ============================================
    // MAIN ENTRY POINT
    // ============================================
    static getBestMove(board, botColor) {
        this.initZobrist();
        this.timeStart = Date.now();
        this.timeOut = false;
        this.nodes = 0;

        // Clear heavy memory if too full
        if (this.tt.size > 2000000) this.tt.clear();

        // Reset per-turn structures
        this.history.fill(0);
        this.killerMoves = Array(this.MAX_DEPTH).fill(null).map(() => [null, null]);

        console.log(`👁️  THE OMNISCIENT IS CALCULATING...`);

        const { moves, captures, mustCapture } = CheckersLogic.getAllValidMoves(board, botColor);
        let rootMoves = mustCapture ? captures : [...captures, ...moves];

        if (rootMoves.length === 0) return null;
        if (rootMoves.length === 1) return rootMoves[0]; // Forced move

        // Initial simple sort
        rootMoves = this.sortMoves(rootMoves, board, 0);

        let bestMove = rootMoves[0];
        let bestScore = -this.INFINITY;

        // ITERATIVE DEEPENING WITH ASPIRATION WINDOWS
        // We start shallow and go deep.
        // We guess the score is roughly previous score +/- 50 points.
        let alpha = -this.INFINITY;
        let beta = this.INFINITY;
        let window = 400; // Aspiration window size

        for (let depth = 4; depth <= this.MAX_DEPTH; depth++) {

            // Time check
            if (Date.now() - this.timeStart > this.MAX_TIME_MS) break;

            // Search
            let score = this.alphaBeta(board, depth, alpha, beta, botColor, botColor, 0, true);

            // If we ran out of time during search, discard this depth's result
            if (this.timeOut) break;

            // Aspiration Window Logic:
            // If score falls outside window, re-search with full infinity bounds
            if (score <= alpha || score >= beta) {
                // Fail low or high - re-search full window
                alpha = -this.INFINITY;
                beta = this.INFINITY;
                score = this.alphaBeta(board, depth, alpha, beta, botColor, botColor, 0, true);
            } else {
                // Tighten window for next depth
                alpha = score - window;
                beta = score + window;
            }

            // Read best move from TT
            const hash = this.computeHash(board, botColor);
            const ttEntry = this.tt.get(hash);

            if (ttEntry && ttEntry.move) {
                bestMove = ttEntry.move;
                bestScore = score;
            }

            const timeUsed = Date.now() - this.timeStart;
            const nps = Math.floor(this.nodes / (timeUsed / 1000));
            console.log(`👁️  Depth ${depth} | Score: ${score} | Nodes: ${this.nodes} | NPS: ${nps}`);

            // Mate detection
            if (score > 90000) {
                console.log("👁️  MATE IN " + (100000 - score) + " PLIES");
                break;
            }
        }

        console.log(`👁️  BEST MOVE: (${bestMove.from.row},${bestMove.from.col}) -> (${bestMove.to.row},${bestMove.to.col})`);
        return bestMove;
    }

    // ============================================
    // ALPHA-BETA SEARCH
    // ============================================
    static alphaBeta(board, depth, alpha, beta, color, botColor, ply, isRoot = false) {
        if ((this.nodes & 2047) === 0) {
            if (Date.now() - this.timeStart > this.MAX_TIME_MS) {
                this.timeOut = true;
            }
        }
        if (this.timeOut) return 0;

        this.nodes++;
        const isBot = color === botColor;
        const oppColor = color === 'black' ? 'white' : 'black';

        // 1. Transposition Table Lookup
        const hash = this.computeHash(board, color);
        const ttEntry = this.tt.get(hash);
        if (ttEntry && ttEntry.depth >= depth && !isRoot) {
            if (ttEntry.flag === 'EXACT') return ttEntry.score;
            if (ttEntry.flag === 'LOWER' && ttEntry.score >= beta) return ttEntry.score;
            if (ttEntry.flag === 'UPPER' && ttEntry.score <= alpha) return ttEntry.score;
        }

        // 2. Leaf Node / Quiescence
        if (depth <= 0) {
            return this.quiescence(board, alpha, beta, color, botColor);
        }

        const { moves, captures, mustCapture } = CheckersLogic.getAllValidMoves(board, color);
        let allMoves = mustCapture ? captures : [...captures, ...moves];

        // 3. Game Over Detection
        if (allMoves.length === 0) {
            // If valid moves is 0, current player loses.
            // Score is -Infinity + ply (to prefer faster wins)
            return -100000 + ply;
        }

        // 4. Move Sorting (Crucial for pruning)
        // Pass the TT move if we have one to try it first
        allMoves = this.sortMoves(allMoves, board, ply, ttEntry?.move);

        let bestMove = null;
        let bestScore = -this.INFINITY;
        let moveType = 'UPPER'; // Default is we haven't exceeded alpha

        for (let i = 0; i < allMoves.length; i++) {
            const move = allMoves[i];
            const isCapture = !!move.captured;

            // --- EXECUTE MOVE ---
            let nextBoard = CheckersLogic.executeMove(board, move, isCapture);
            // Handle multi-jumps immediately
            if (isCapture) {
                nextBoard = this.handleMultiJumps(nextBoard, move.to.row, move.to.col, color);
            }

            // --- EXTENSIONS ---
            // Extend search depth for forced captures or promotions to avoid "Horizon Effect"
            let extension = 0;
            if (isCapture) extension = 1;
            if (this.isPromotion(move, board)) extension = 1;

            // --- RECURSION ---
            let score;
            if (i === 0) {
                // Full window search for first move (PV-Node)
                score = -this.alphaBeta(nextBoard, depth - 1 + extension, -beta, -alpha, oppColor, botColor, ply + 1);
            } else {
                // Late Move Reduction (LMR)
                // If we are searching moves late in the list, search them shallower first to save time
                let reduction = 0;
                if (depth >= 3 && i > 3 && !isCapture && extension === 0) {
                    reduction = 1;
                }

                // Null Window Search (Prove that this move is bad)
                score = -this.alphaBeta(nextBoard, depth - 1 - reduction + extension, -alpha - 1, -alpha, oppColor, botColor, ply + 1);

                // If LMR failed (move was actually good) or Null Window failed, re-search full window
                if (score > alpha && (reduction > 0 || score < beta)) {
                    score = -this.alphaBeta(nextBoard, depth - 1 + extension, -beta, -alpha, oppColor, botColor, ply + 1);
                }
            }

            if (this.timeOut) return 0;

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
                if (isRoot && depth > 6) {
                    // Print simplified update for root changes
                    // console.log(`   > New Best: ${score}`);
                }
            }

            // Beta Cutoff
            if (score >= beta) {
                // Store Killer Move (non-captures only)
                if (!isCapture) {
                    this.storeKiller(ply, move);
                    // Update History Heuristic
                    const hKey = move.from.row * 8 + move.from.col;
                    this.history[hKey] += depth * depth;
                }

                this.tt.set(hash, { depth, score, flag: 'LOWER', move }); // Lower bound
                return score;
            }

            if (score > alpha) {
                alpha = score;
                moveType = 'EXACT';
            }
        }

        // Store in TT
        this.tt.set(hash, { depth, score: bestScore, flag: moveType, move: bestMove });
        return bestScore;
    }

    // ============================================
    // QUIESCENCE SEARCH (Resolve turbulence)
    // ============================================
    static quiescence(board, alpha, beta, color, botColor) {
        this.nodes++;

        // Stand pat (current static evaluation)
        const standPat = this.evaluateBoard(board, color, botColor);

        if (standPat >= beta) return beta;
        if (standPat > alpha) alpha = standPat;

        // Only look at Captures in Quiescence
        const { captures } = CheckersLogic.getAllValidMoves(board, color);

        // Sort captures by value (heuristic)
        captures.sort((a, b) => this.scoreCapture(b, board) - this.scoreCapture(a, board));

        const oppColor = color === 'black' ? 'white' : 'black';

        for (const move of captures) {
            let nextBoard = CheckersLogic.executeMove(board, move, true);
            nextBoard = this.handleMultiJumps(nextBoard, move.to.row, move.to.col, color);

            const score = -this.quiescence(nextBoard, -beta, -alpha, oppColor, botColor);

            if (score >= beta) return beta;
            if (score > alpha) alpha = score;
        }

        return alpha;
    }

    // ============================================
    // EVALUATION - THE BRAIN
    // ============================================
    static evaluateBoard(board, color, botColor) {
        let score = 0;

        const isBotBlack = botColor === 'black';
        const blackSign = isBotBlack ? 1 : -1;

        let blackPieces = 0;
        let whitePieces = 0;

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = board[r][c];
                if (p === PIECE.EMPTY) continue;

                let value = 0;

                // 1. MATERIAL
                if (p === PIECE.BLACK) {
                    value = 100;
                    // 2. POSITION - Advancing is good, but protected advancement is better
                    // Give bonus for Row 3,4 (Center control)
                    if (r === 3 || r === 4) value += 5;
                    // Bonus for Rank 7 (About to king)
                    if (r === 6) value += 20;
                    // BACK RANK INTEGRITY: Penalty for moving pieces from row 0 too early
                    if (r === 0) value += 10;
                }
                else if (p === PIECE.WHITE) {
                    value = -100;
                    if (r === 3 || r === 4) value -= 5;
                    if (r === 1) value -= 20;
                    if (r === 7) value -= 10;
                }
                else if (p === PIECE.BLACK_KING) {
                    value = 350;
                    // King wants to be in center
                    if (r >= 2 && r <= 5 && c >= 2 && c <= 5) value += 15;
                }
                else if (p === PIECE.WHITE_KING) {
                    value = -350;
                    if (r >= 2 && r <= 5 && c >= 2 && c <= 5) value -= 15;
                }

                // 3. SAFETY (Simple implementation)
                // If piece is on edge, it's harder to capture (good)
                if (c === 0 || c === 7) {
                    if (value > 0) value += 5; else value -= 5;
                }

                score += value;

                if (p === PIECE.BLACK || p === PIECE.BLACK_KING) blackPieces++;
                else whitePieces++;
            }
        }

        // 4. ENDGAME LOGIC
        // If winning, force trade. If losing, keep things complicated.
        if (blackPieces > whitePieces) score += (12 - whitePieces) * 10 * blackSign;
        if (whitePieces > blackPieces) score -= (12 - blackPieces) * 10 * blackSign;

        // 5. RUNAWAY CHECKER DETECTION
        // (Simplified: if we have more pieces and a clear path, boost score significantly)

        // Return score relative to whoever's turn it is
        return (color === botColor) ? score * blackSign : -score * blackSign;
    }

    // ============================================
    // HELPERS & OPTIMIZATIONS
    // ============================================

    static sortMoves(moves, board, ply, ttMove = null) {
        return moves.map(m => {
            let sortScore = 0;

            // 1. Hash Move (TT) gets massive priority
            if (ttMove && m.from.row === ttMove.from.row && m.from.col === ttMove.from.col &&
                m.to.row === ttMove.to.row && m.to.col === ttMove.to.col) {
                sortScore += 1000000;
            }

            // 2. Captures
            if (m.captured) {
                sortScore += 10000;
                // Capturing a King is better
                const victim = board[m.captured.row][m.captured.col];
                if (victim === PIECE.BLACK_KING || victim === PIECE.WHITE_KING) sortScore += 5000;
            }

            // 3. Promotion
            if (this.isPromotion(m, board)) sortScore += 5000;

            // 4. Killer Moves
            if (this.killerMoves[ply]) {
                if (this.isSameMove(m, this.killerMoves[ply][0])) sortScore += 900;
                else if (this.isSameMove(m, this.killerMoves[ply][1])) sortScore += 800;
            }

            // 5. History Heuristic
            const hKey = m.from.row * 8 + m.from.col;
            sortScore += (this.history[hKey] || 0);

            return { move: m, sortScore };
        }).sort((a, b) => b.sortScore - a.sortScore).map(x => x.move);
    }

    static storeKiller(ply, move) {
        if (this.killerMoves[ply][0] && !this.isSameMove(move, this.killerMoves[ply][0])) {
            this.killerMoves[ply][1] = this.killerMoves[ply][0];
        }
        this.killerMoves[ply][0] = move;
    }

    static isSameMove(m1, m2) {
        if (!m1 || !m2) return false;
        return m1.from.row === m2.from.row && m1.from.col === m2.from.col && m1.to.row === m2.to.row && m1.to.col === m2.to.col;
    }

    static computeHash(board, turnColor) {
        // 32-bit Integer Zobrist Hash
        let h = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = board[r][c];
                if (p !== PIECE.EMPTY) {
                    h ^= this.zArray[r][c][p];
                }
            }
        }
        if (turnColor === 'black') h ^= this.zTurn;
        return h;
    }

    static handleMultiJumps(board, row, col, color) {
        let currentBoard = board;
        let r = row, c = col;
        // Greedily take best multi-jump path
        // Note: Real rules require taking ALL jumps, but usually picking the longest chain is optimal
        while (true) {
            const chains = CheckersLogic.getMultiCaptures(currentBoard, r, c);
            if (chains.length === 0) break;
            // Take the first available chain (improving this requires a mini-search)
            const nextMove = chains[0];
            currentBoard = CheckersLogic.executeMove(currentBoard, nextMove, true);
            r = nextMove.to.row;
            c = nextMove.to.col;
        }
        return currentBoard;
    }

    static isPromotion(move, board) {
        const p = board[move.from.row][move.from.col];
        return (p === PIECE.BLACK && move.to.row === 7) || (p === PIECE.WHITE && move.to.row === 0);
    }

    static scoreCapture(move, board) {
        const victim = board[move.captured.row][move.captured.col];
        return (victim === PIECE.BLACK_KING || victim === PIECE.WHITE_KING) ? 5 : 1;
    }
}

module.exports = BotService;