const CheckersLogic = require('../utils/checkers.logic');
const { PIECE, BOARD_SIZE } = require('../utils/constants');

class BotService {

    // ============================================
    // MAXIMUM POWER CONFIGURATION
    // ============================================
    static SEARCH_DEPTH = 16;           // ALWAYS reach this depth
    static ENDGAME_DEPTH = 22;          // Even deeper in endgame
    static MAX_THINK_TIME = 8000;       // 8 seconds - more time to think
    static MIN_DEPTH = 12;              // NEVER stop before depth 12

    // Optimized caches
    static transpositionTable = new Map();
    static killerMoves = [];
    static historyTable = new Map();
    static counterMoves = new Map();
    static nodesEvaluated = 0;

    // Zobrist hashing for faster lookups
    static zobristTable = null;

    static initZobrist() {
        if (this.zobristTable) return;
        this.zobristTable = [];
        for (let i = 0; i < 64; i++) {
            this.zobristTable[i] = [];
            for (let p = 0; p < 5; p++) {
                this.zobristTable[i][p] = Math.floor(Math.random() * 2147483647);
            }
        }
    }

    // ============================================
    // MAIN ENTRY POINT
    // ============================================
    static getBestMove(board, botColor) {
        const startTime = Date.now();
        this.nodesEvaluated = 0;
        this.initZobrist();

        // Clear caches for fresh search
        if (this.transpositionTable.size > 2000000) {
            this.transpositionTable.clear();
        }
        this.historyTable.clear();

        console.log('');
        console.log('👑 ==========================================');
        console.log('👑 MAXIMUM POWER BOT - DEPTH 16+');
        console.log('👑 ==========================================');

        const { moves, captures, mustCapture } = CheckersLogic.getAllValidMoves(board, botColor);
        const allMoves = mustCapture ? captures : [...captures, ...moves];

        if (allMoves.length === 0) return null;
        if (allMoves.length === 1) {
            console.log('👑 Only one move - instant play');
            return allMoves[0];
        }

        // Piece count for endgame detection
        const pieceCount = this.countAllPieces(board);
        const isEndgame = pieceCount <= 8;
        const targetDepth = isEndgame ? this.ENDGAME_DEPTH : this.SEARCH_DEPTH;

        console.log('👑 Pieces:', pieceCount, '| Target depth:', targetDepth);
        console.log('👑 Available moves:', allMoves.length);

        this.killerMoves = Array(targetDepth + 10).fill(null).map(() => []);

        let bestMove = allMoves[0];
        let bestScore = -Infinity;
        let completedDepth = 0;

        // ITERATIVE DEEPENING - but MUST reach MIN_DEPTH
        for (let depth = 4; depth <= targetDepth; depth += 2) {
            const elapsed = Date.now() - startTime;

            // Only stop if we've reached minimum depth AND time is up
            if (depth > this.MIN_DEPTH && elapsed > this.MAX_THINK_TIME) {
                console.log('👑 Time limit at depth', completedDepth);
                break;
            }

            const result = this.searchRoot(board, allMoves, depth, botColor, startTime);

            if (result.completed) {
                bestMove = result.move;
                bestScore = result.score;
                completedDepth = depth;

                console.log(`👑 Depth ${depth} | Score: ${bestScore} | Move: (${bestMove.from.row},${bestMove.from.col})->(${bestMove.to.row},${bestMove.to.col})`);

                // Found guaranteed win - no need to search deeper
                if (bestScore > 90000) {
                    console.log('👑 GUARANTEED WIN FOUND!');
                    break;
                }
            }
        }

        const elapsed = Date.now() - startTime;
        console.log('👑 ==========================================');
        console.log('👑 FINAL: Depth', completedDepth, '| Score:', bestScore);
        console.log('👑 Nodes:', this.nodesEvaluated.toLocaleString(), '| Time:', elapsed, 'ms');
        console.log('👑 Speed:', Math.round(this.nodesEvaluated / (elapsed / 1000)).toLocaleString(), 'n/s');
        console.log('👑 ==========================================');

        return bestMove;
    }

    // ============================================
    // ROOT SEARCH - Optimized
    // ============================================
    static searchRoot(board, moves, depth, botColor, startTime) {
        const oppColor = botColor === 'black' ? 'white' : 'black';
        let bestMove = moves[0];
        let bestScore = -Infinity;
        let alpha = -Infinity;
        const beta = Infinity;

        // Sort moves for better pruning
        const sortedMoves = this.orderMoves(moves, board, botColor, 0, null);

        for (let i = 0; i < sortedMoves.length; i++) {
            const move = sortedMoves[i];
            const isCapture = !!move.captured;

            let newBoard = CheckersLogic.executeMove(board, move, isCapture);
            if (isCapture) {
                newBoard = this.executeChainCaptures(newBoard, move.to.row, move.to.col, botColor);
            }

            let score;
            if (i === 0) {
                score = -this.alphaBeta(newBoard, depth - 1, -beta, -alpha, oppColor, botColor, 1, startTime);
            } else {
                // Null window search
                score = -this.alphaBeta(newBoard, depth - 1, -alpha - 1, -alpha, oppColor, botColor, 1, startTime);
                if (score > alpha && score < beta) {
                    score = -this.alphaBeta(newBoard, depth - 1, -beta, -alpha, oppColor, botColor, 1, startTime);
                }
            }

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }

            alpha = Math.max(alpha, score);
        }

        return { move: bestMove, score: bestScore, completed: true };
    }

    // ============================================
    // ALPHA-BETA - Highly Optimized
    // ============================================
    static alphaBeta(board, depth, alpha, beta, currentColor, botColor, ply, startTime) {
        this.nodesEvaluated++;

        const alphaOrig = alpha;
        const oppColor = currentColor === 'black' ? 'white' : 'black';

        // Transposition table lookup
        const hash = this.hashBoard(board, currentColor);
        const cached = this.transpositionTable.get(hash);

        if (cached && cached.depth >= depth) {
            if (cached.flag === 'EXACT') return cached.score;
            if (cached.flag === 'LOWER') alpha = Math.max(alpha, cached.score);
            if (cached.flag === 'UPPER') beta = Math.min(beta, cached.score);
            if (alpha >= beta) return cached.score;
        }

        // Get moves
        const { moves, captures, mustCapture } = CheckersLogic.getAllValidMoves(board, currentColor);
        const allMoves = mustCapture ? captures : [...captures, ...moves];

        // No moves = loss
        if (allMoves.length === 0) {
            return -100000 + ply;
        }

        // Depth limit - quiescence
        if (depth <= 0) {
            return this.quiescence(board, alpha, beta, currentColor, botColor, 0);
        }

        // Null move pruning
        if (depth >= 4 && !mustCapture && ply > 0) {
            const nullScore = -this.alphaBeta(board, depth - 3, -beta, -beta + 1, oppColor, botColor, ply + 1, startTime);
            if (nullScore >= beta) return beta;
        }

        // Sort moves
        const sortedMoves = this.orderMoves(allMoves, board, currentColor, ply, cached?.move);

        let bestScore = -Infinity;
        let bestMove = null;

        for (let i = 0; i < sortedMoves.length; i++) {
            const move = sortedMoves[i];
            const isCapture = !!move.captured;

            let newBoard = CheckersLogic.executeMove(board, move, isCapture);
            if (isCapture) {
                newBoard = this.executeChainCaptures(newBoard, move.to.row, move.to.col, currentColor);
            }

            // Extensions
            let ext = 0;
            if (isCapture) ext = 1;
            else if (this.isPromotion(move, board)) ext = 1;

            // Late Move Reduction
            let reduction = 0;
            if (depth >= 3 && i >= 3 && !isCapture && !mustCapture && ext === 0) {
                reduction = 1 + Math.floor(i / 6);
                reduction = Math.min(reduction, depth - 2);
            }

            let score;
            const newDepth = depth - 1 + ext - reduction;

            if (i === 0) {
                score = -this.alphaBeta(newBoard, newDepth, -beta, -alpha, oppColor, botColor, ply + 1, startTime);
            } else {
                score = -this.alphaBeta(newBoard, newDepth, -alpha - 1, -alpha, oppColor, botColor, ply + 1, startTime);
                if (score > alpha && (reduction > 0 || score < beta)) {
                    score = -this.alphaBeta(newBoard, depth - 1 + ext, -beta, -alpha, oppColor, botColor, ply + 1, startTime);
                }
            }

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }

            alpha = Math.max(alpha, score);

            if (alpha >= beta) {
                // Killer moves
                if (!isCapture && this.killerMoves[ply]) {
                    this.killerMoves[ply].unshift(move);
                    if (this.killerMoves[ply].length > 2) this.killerMoves[ply].pop();
                }
                // History
                const key = this.getMoveKey(move);
                this.historyTable.set(key, (this.historyTable.get(key) || 0) + depth * depth);
                break;
            }
        }

        // Store in TT
        let flag = 'EXACT';
        if (bestScore <= alphaOrig) flag = 'UPPER';
        else if (bestScore >= beta) flag = 'LOWER';

        this.transpositionTable.set(hash, { depth, score: bestScore, flag, move: bestMove });

        return bestScore;
    }

    // ============================================
    // QUIESCENCE - Fast tactical search
    // ============================================
    static quiescence(board, alpha, beta, currentColor, botColor, depth) {
        this.nodesEvaluated++;

        const standPat = this.evaluate(board, currentColor, botColor);

        if (depth <= -8) return standPat;
        if (standPat >= beta) return beta;
        if (standPat > alpha) alpha = standPat;

        const { captures } = CheckersLogic.getAllValidMoves(board, currentColor);
        if (captures.length === 0) return standPat;

        const oppColor = currentColor === 'black' ? 'white' : 'black';

        // Sort by MVV-LVA
        const sorted = this.sortCaptures(captures, board);

        for (const cap of sorted) {
            let newBoard = CheckersLogic.executeMove(board, cap, true);
            newBoard = this.executeChainCaptures(newBoard, cap.to.row, cap.to.col, currentColor);

            const score = -this.quiescence(newBoard, -beta, -alpha, oppColor, botColor, depth - 1);

            if (score >= beta) return beta;
            if (score > alpha) alpha = score;
        }

        return alpha;
    }

    // ============================================
    // MOVE ORDERING - Critical for speed
    // ============================================
    static orderMoves(moves, board, color, ply, pvMove) {
        return moves.map(move => {
            let score = 0;

            // PV move
            if (pvMove && this.movesEqual(move, pvMove)) score += 1000000;

            // Captures
            if (move.captured) {
                const victim = board[move.captured.row][move.captured.col];
                const victimVal = (victim === PIECE.BLACK_KING || victim === PIECE.WHITE_KING) ? 500 : 100;
                score += 100000 + victimVal;

                // Chain bonus
                const temp = CheckersLogic.executeMove(board, move, true);
                const chains = CheckersLogic.getMultiCaptures(temp, move.to.row, move.to.col);
                score += chains.length * 50000;
            }

            // Promotion
            if (this.isPromotion(move, board)) score += 80000;

            // Killer moves
            if (this.killerMoves[ply]?.some(k => this.movesEqual(k, move))) score += 60000;

            // History
            score += Math.min(this.historyTable.get(this.getMoveKey(move)) || 0, 50000);

            // Positional
            score += this.getMoveBonus(move, board, color);

            return { move, score };
        }).sort((a, b) => b.score - a.score).map(x => x.move);
    }

    static sortCaptures(captures, board) {
        return captures.map(cap => {
            const victim = board[cap.captured.row][cap.captured.col];
            const score = (victim === PIECE.BLACK_KING || victim === PIECE.WHITE_KING) ? 500 : 100;
            return { move: cap, score };
        }).sort((a, b) => b.score - a.score).map(x => x.move);
    }

    static getMoveBonus(move, board, color) {
        let score = 0;

        // Center
        const centerDist = Math.abs(3.5 - move.to.row) + Math.abs(3.5 - move.to.col);
        score += (7 - centerDist) * 5;

        // Advancement
        if (color === 'black') score += move.to.row * 8;
        else score += (7 - move.to.row) * 8;

        // Avoid edges
        if (move.to.col === 0 || move.to.col === 7) score -= 10;

        return score;
    }

    // ============================================
    // EVALUATION - Optimized
    // ============================================
    static evaluate(board, currentColor, botColor) {
        let score = 0;
        let blackPieces = 0, whitePieces = 0;
        let blackKings = 0, whiteKings = 0;

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece === PIECE.EMPTY) continue;

                let value = 0;
                let isBlack = false;

                switch (piece) {
                    case PIECE.BLACK:
                        isBlack = true;
                        blackPieces++;
                        value = 100 + row * 10;
                        if (row >= 5) value += 30;
                        if (row === 0) value += 20;
                        break;
                    case PIECE.WHITE:
                        whitePieces++;
                        value = 100 + (7 - row) * 10;
                        if (row <= 2) value += 30;
                        if (row === 7) value += 20;
                        break;
                    case PIECE.BLACK_KING:
                        isBlack = true;
                        blackKings++;
                        value = 350 + this.getKingActivity(board, row, col) * 5;
                        break;
                    case PIECE.WHITE_KING:
                        whiteKings++;
                        value = 350 + this.getKingActivity(board, row, col) * 5;
                        break;
                }

                // Center bonus
                const centerDist = Math.abs(3.5 - row) + Math.abs(3.5 - col);
                value += Math.max(0, (7 - centerDist) * 3);

                // Edge penalty
                if (col === 0 || col === 7) value -= 8;

                score += isBlack ? value : -value;
            }
        }

        // Return from current player's perspective
        const baseScore = currentColor === 'black' ? score : -score;

        // Mobility bonus
        const myMoves = CheckersLogic.getAllValidMoves(board, currentColor);
        const oppMoves = CheckersLogic.getAllValidMoves(board, currentColor === 'black' ? 'white' : 'black');

        const mobilityScore = (myMoves.captures.length * 25 + myMoves.moves.length * 5) -
            (oppMoves.captures.length * 20 + oppMoves.moves.length * 4);

        return baseScore + mobilityScore;
    }

    static getKingActivity(board, row, col) {
        let activity = 0;
        const dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

        for (const [dr, dc] of dirs) {
            for (let d = 1; d < 8; d++) {
                const r = row + dr * d;
                const c = col + dc * d;
                if (r < 0 || r >= 8 || c < 0 || c >= 8) break;
                if (board[r][c] !== PIECE.EMPTY) break;
                activity++;
            }
        }

        return activity;
    }

    // ============================================
    // UTILITIES
    // ============================================
    static executeChainCaptures(board, row, col, color) {
        let b = board, r = row, c = col;

        while (true) {
            const caps = CheckersLogic.getMultiCaptures(b, r, c);
            if (caps.length === 0) break;

            // Pick best chain
            let best = caps[0], bestVal = -Infinity;
            for (const cap of caps) {
                const temp = CheckersLogic.executeMove(b, cap, true);
                const val = this.quickEval(temp, color);
                if (val > bestVal) {
                    bestVal = val;
                    best = cap;
                }
            }

            b = CheckersLogic.executeMove(b, best, true);
            r = best.to.row;
            c = best.to.col;
        }

        return b;
    }

    static quickEval(board, botColor) {
        let score = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const p = board[row][col];
                if (p === PIECE.EMPTY) continue;

                const isBlack = p === PIECE.BLACK || p === PIECE.BLACK_KING;
                const isKing = p === PIECE.BLACK_KING || p === PIECE.WHITE_KING;
                const val = isKing ? 350 : 100;

                score += (botColor === 'black') === isBlack ? val : -val;
            }
        }
        return score;
    }

    static countAllPieces(board) {
        let count = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (board[r][c] !== PIECE.EMPTY) count++;
            }
        }
        return count;
    }

    static isPromotion(move, board) {
        const p = board[move.from.row][move.from.col];
        return (p === PIECE.BLACK && move.to.row === 7) || (p === PIECE.WHITE && move.to.row === 0);
    }

    static movesEqual(a, b) {
        if (!a || !b) return false;
        return a.from.row === b.from.row && a.from.col === b.from.col &&
            a.to.row === b.to.row && a.to.col === b.to.col;
    }

    static getMoveKey(m) {
        return `${m.from.row}${m.from.col}${m.to.row}${m.to.col}`;
    }

    static hashBoard(board, color) {
        let h = color === 'black' ? 1 : 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = board[r][c];
                if (p !== PIECE.EMPTY && this.zobristTable) {
                    h ^= this.zobristTable[r * 8 + c][p];
                }
            }
        }
        return h;
    }
}

module.exports = BotService;