const CheckersLogic = require('../utils/checkers.logic');
const { PIECE, BOARD_SIZE } = require('../utils/constants');

class BotService {

    // ============================================
    // THE TERMINATOR - NO MERCY, NO BUGS
    // ============================================
    static SEARCH_DEPTH = 20;
    static ENDGAME_DEPTH = 26;
    static MAX_THINK_TIME = 12000;
    static MIN_DEPTH = 16;

    static transpositionTable = new Map();
    static killerMoves = [];
    static historyTable = new Map();
    static nodesEvaluated = 0;

    // ============================================
    // MAIN ENTRY
    // ============================================
    static getBestMove(board, botColor) {
        const startTime = Date.now();
        this.nodesEvaluated = 0;

        if (this.transpositionTable.size > 2000000) {
            this.transpositionTable.clear();
        }
        this.historyTable.clear();

        console.log('');
        console.log('🤖 ==========================================');
        console.log('🤖 THE TERMINATOR - I WILL BE BACK');
        console.log('🤖 ==========================================');

        const oppColor = botColor === 'black' ? 'white' : 'black';
        const { moves, captures, mustCapture } = CheckersLogic.getAllValidMoves(board, botColor);
        const allMoves = mustCapture ? captures : [...captures, ...moves];

        if (allMoves.length === 0) {
            console.log('🤖 No moves available');
            return null;
        }

        if (allMoves.length === 1) {
            console.log('🤖 Only one move');
            return allMoves[0];
        }

        // Count pieces
        const botPieces = this.countColor(board, botColor);
        const oppPieces = this.countColor(board, oppColor);
        const total = botPieces + oppPieces;

        const isEndgame = total <= 8;
        const targetDepth = isEndgame ? this.ENDGAME_DEPTH : this.SEARCH_DEPTH;

        console.log(`🤖 Bot: ${botPieces} | Human: ${oppPieces} | Total: ${total}`);
        console.log(`🤖 Target Depth: ${targetDepth}`);
        console.log(`🤖 Analyzing ${allMoves.length} moves...`);

        this.killerMoves = Array(targetDepth + 10).fill(null).map(() => []);

        let bestMove = allMoves[0];
        let bestScore = -Infinity;
        let completedDepth = 0;

        // Iterative deepening
        for (let depth = 4; depth <= targetDepth; depth += 2) {
            const elapsed = Date.now() - startTime;

            if (depth > this.MIN_DEPTH && elapsed > this.MAX_THINK_TIME) {
                console.log(`🤖 Time limit at depth ${completedDepth}`);
                break;
            }

            const result = this.rootSearch(board, allMoves, depth, botColor, startTime);

            bestMove = result.move;
            bestScore = result.score;
            completedDepth = depth;

            console.log(`🤖 Depth ${depth} | Score: ${bestScore} | (${bestMove.from.row},${bestMove.from.col})->(${bestMove.to.row},${bestMove.to.col})`);

            // Found guaranteed win
            if (bestScore > 50000) {
                console.log('🤖 GUARANTEED WIN DETECTED!');
                break;
            }
        }

        const elapsed = Date.now() - startTime;
        console.log('🤖 ==========================================');
        console.log(`🤖 FINAL: Depth ${completedDepth} | Score: ${bestScore}`);
        console.log(`🤖 Nodes: ${this.nodesEvaluated.toLocaleString()} | Time: ${elapsed}ms`);
        console.log('🤖 ==========================================');

        return bestMove;
    }

    // ============================================
    // ROOT SEARCH
    // ============================================
    static rootSearch(board, moves, depth, botColor, startTime) {
        const oppColor = botColor === 'black' ? 'white' : 'black';

        // Score each move
        const scoredMoves = [];

        for (const move of moves) {
            const isCapture = !!move.captured;
            let newBoard = CheckersLogic.executeMove(board, move, isCapture);

            if (isCapture) {
                newBoard = this.doAllChains(newBoard, move.to.row, move.to.col, botColor);
            }

            // Check if this move wins immediately
            const oppMoves = CheckersLogic.getAllValidMoves(newBoard, oppColor);
            if (oppMoves.moves.length === 0 && oppMoves.captures.length === 0) {
                // Opponent has no moves = WE WIN
                return { move, score: 100000 };
            }

            const oppPiecesLeft = this.countColor(newBoard, oppColor);
            if (oppPiecesLeft === 0) {
                // Opponent has no pieces = WE WIN
                return { move, score: 100000 };
            }

            // Search deeper
            const score = -this.alphaBeta(newBoard, depth - 1, -Infinity, Infinity, oppColor, botColor, 1, startTime);
            scoredMoves.push({ move, score });
        }

        // Sort by score and return best
        scoredMoves.sort((a, b) => b.score - a.score);
        return scoredMoves[0];
    }

    // ============================================
    // ALPHA-BETA SEARCH
    // ============================================
    static alphaBeta(board, depth, alpha, beta, currentColor, botColor, ply, startTime) {
        this.nodesEvaluated++;

        const oppColor = currentColor === 'black' ? 'white' : 'black';
        const isBotTurn = currentColor === botColor;

        // Check for terminal states
        const { moves, captures, mustCapture } = CheckersLogic.getAllValidMoves(board, currentColor);
        const allMoves = mustCapture ? captures : [...captures, ...moves];

        // No moves = current player LOSES
        if (allMoves.length === 0) {
            return isBotTurn ? (-100000 + ply) : (100000 - ply);
        }

        // No pieces = current player LOSES
        const myPieces = this.countColor(board, currentColor);
        if (myPieces === 0) {
            return isBotTurn ? (-100000 + ply) : (100000 - ply);
        }

        // Depth limit
        if (depth <= 0) {
            return this.evaluate(board, botColor);
        }

        // TT lookup
        const hash = this.hash(board, currentColor);
        const cached = this.transpositionTable.get(hash);
        if (cached && cached.depth >= depth) {
            if (cached.flag === 'EXACT') return cached.score;
            if (cached.flag === 'LOWER') alpha = Math.max(alpha, cached.score);
            if (cached.flag === 'UPPER') beta = Math.min(beta, cached.score);
            if (alpha >= beta) return cached.score;
        }

        const alphaOrig = alpha;

        // Sort moves
        const sortedMoves = this.sortMoves(allMoves, board, currentColor, ply, cached?.move);

        let bestScore = -Infinity;
        let bestMove = null;

        for (let i = 0; i < sortedMoves.length; i++) {
            const move = sortedMoves[i];
            const isCapture = !!move.captured;

            let newBoard = CheckersLogic.executeMove(board, move, isCapture);
            if (isCapture) {
                newBoard = this.doAllChains(newBoard, move.to.row, move.to.col, currentColor);
            }

            // Extensions
            let ext = 0;
            if (isCapture) ext = 1;
            if (this.isPromo(move, board)) ext = 1;
            ext = Math.min(ext, 2);

            // LMR
            let red = 0;
            if (depth >= 4 && i >= 4 && !isCapture && ext === 0) {
                red = 1 + Math.floor(i / 8);
                red = Math.min(red, depth - 2);
            }

            let score;
            const newDepth = depth - 1 + ext - red;

            if (i === 0) {
                score = -this.alphaBeta(newBoard, newDepth, -beta, -alpha, oppColor, botColor, ply + 1, startTime);
            } else {
                score = -this.alphaBeta(newBoard, newDepth, -alpha - 1, -alpha, oppColor, botColor, ply + 1, startTime);
                if (score > alpha && (red > 0 || score < beta)) {
                    score = -this.alphaBeta(newBoard, depth - 1 + ext, -beta, -alpha, oppColor, botColor, ply + 1, startTime);
                }
            }

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }

            alpha = Math.max(alpha, score);

            if (alpha >= beta) {
                // Killer move
                if (!isCapture && this.killerMoves[ply]) {
                    this.killerMoves[ply].unshift(move);
                    if (this.killerMoves[ply].length > 2) this.killerMoves[ply].pop();
                }
                break;
            }
        }

        // TT store
        let flag = 'EXACT';
        if (bestScore <= alphaOrig) flag = 'UPPER';
        else if (bestScore >= beta) flag = 'LOWER';
        this.transpositionTable.set(hash, { depth, score: bestScore, flag, move: bestMove });

        return bestScore;
    }

    // ============================================
    // EVALUATION - FROM BOT'S PERSPECTIVE ALWAYS
    // ============================================
    static evaluate(board, botColor) {
        const oppColor = botColor === 'black' ? 'white' : 'black';

        let botScore = 0;
        let oppScore = 0;
        let botPieces = 0, botKings = 0;
        let oppPieces = 0, oppKings = 0;

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece === PIECE.EMPTY) continue;

                const isBlack = piece === PIECE.BLACK || piece === PIECE.BLACK_KING;
                const isKing = piece === PIECE.BLACK_KING || piece === PIECE.WHITE_KING;
                const isBotPiece = (botColor === 'black') === isBlack;

                let value = 0;

                if (isKing) {
                    value = 500;
                    value += this.kingMobility(board, row, col) * 10;
                    // Center control for kings
                    const cd = Math.abs(3.5 - row) + Math.abs(3.5 - col);
                    value += (7 - cd) * 8;
                } else {
                    value = 100;

                    // Advancement bonus (pieces closer to becoming kings)
                    if (isBlack) {
                        value += row * 15;
                        if (row >= 5) value += 40;
                        if (row >= 6) value += 60;
                        if (row === 7) value += 100;
                    } else {
                        value += (7 - row) * 15;
                        if (row <= 2) value += 40;
                        if (row <= 1) value += 60;
                        if (row === 0) value += 100;
                    }

                    // Back row bonus (defense)
                    if ((isBlack && row === 0) || (!isBlack && row === 7)) {
                        value += 30;
                    }
                }

                // Center control
                const centerDist = Math.abs(3.5 - row) + Math.abs(3.5 - col);
                value += (7 - centerDist) * 5;

                // Edge penalty
                if (col === 0 || col === 7) value -= 10;

                if (isBotPiece) {
                    botScore += value;
                    if (isKing) botKings++; else botPieces++;
                } else {
                    oppScore += value;
                    if (isKing) oppKings++; else oppPieces++;
                }
            }
        }

        // Material count bonus (having more pieces is HUGE)
        const botTotal = botPieces + botKings;
        const oppTotal = oppPieces + oppKings;

        if (oppTotal === 0) return 100000;
        if (botTotal === 0) return -100000;

        const materialDiff = botTotal - oppTotal;
        botScore += materialDiff * 200;

        // King advantage
        botScore += (botKings - oppKings) * 150;

        // Mobility
        const botMoves = CheckersLogic.getAllValidMoves(board, botColor);
        const oppMoves = CheckersLogic.getAllValidMoves(board, oppColor);

        botScore += botMoves.captures.length * 50;
        botScore += botMoves.moves.length * 10;
        oppScore += oppMoves.captures.length * 40;
        oppScore += oppMoves.moves.length * 8;

        // Opponent has no moves = we win
        if (oppMoves.moves.length === 0 && oppMoves.captures.length === 0) {
            return 90000;
        }

        return botScore - oppScore;
    }

    // ============================================
    // MOVE SORTING
    // ============================================
    static sortMoves(moves, board, color, ply, pvMove) {
        return moves.map(move => {
            let score = 0;

            // PV move
            if (pvMove && this.eq(move, pvMove)) score += 10000000;

            // Captures
            if (move.captured) {
                const v = board[move.captured.row][move.captured.col];
                const victimVal = (v === PIECE.BLACK_KING || v === PIECE.WHITE_KING) ? 500 : 100;
                score += 5000000 + victimVal * 10;

                // Chain bonus
                const temp = CheckersLogic.executeMove(board, move, true);
                const chains = CheckersLogic.getMultiCaptures(temp, move.to.row, move.to.col);
                score += chains.length * 1000000;
            }

            // Promotion
            if (this.isPromo(move, board)) score += 3000000;

            // Killers
            if (this.killerMoves[ply]?.some(k => this.eq(k, move))) score += 2000000;

            // History
            const key = this.moveKey(move);
            score += Math.min(this.historyTable.get(key) || 0, 1000000);

            // Positional
            if (color === 'black') score += move.to.row * 50;
            else score += (7 - move.to.row) * 50;

            return { move, score };
        }).sort((a, b) => b.score - a.score).map(x => x.move);
    }

    // ============================================
    // UTILITIES
    // ============================================
    static doAllChains(board, row, col, color) {
        let b = board, r = row, c = col;
        let safety = 0;

        while (safety < 20) {
            const caps = CheckersLogic.getMultiCaptures(b, r, c);
            if (caps.length === 0) break;

            // Pick the capture that takes the most valuable piece
            let best = caps[0];
            let bestVal = 0;

            for (const cap of caps) {
                const victim = b[cap.captured.row][cap.captured.col];
                const val = (victim === PIECE.BLACK_KING || victim === PIECE.WHITE_KING) ? 500 : 100;
                if (val > bestVal) {
                    bestVal = val;
                    best = cap;
                }
            }

            b = CheckersLogic.executeMove(b, best, true);
            r = best.to.row;
            c = best.to.col;
            safety++;
        }

        return b;
    }

    static kingMobility(board, row, col) {
        let m = 0;
        for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
            for (let d = 1; d < 8; d++) {
                const r = row + dr * d, c = col + dc * d;
                if (r < 0 || r >= 8 || c < 0 || c >= 8) break;
                if (board[r][c] !== PIECE.EMPTY) break;
                m++;
            }
        }
        return m;
    }

    static countColor(board, color) {
        let count = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = board[r][c];
                if (p === PIECE.EMPTY) continue;
                const isBlack = p === PIECE.BLACK || p === PIECE.BLACK_KING;
                if ((color === 'black') === isBlack) count++;
            }
        }
        return count;
    }

    static isPromo(move, board) {
        const p = board[move.from.row][move.from.col];
        return (p === PIECE.BLACK && move.to.row === 7) || (p === PIECE.WHITE && move.to.row === 0);
    }

    static eq(a, b) {
        if (!a || !b) return false;
        return a.from.row === b.from.row && a.from.col === b.from.col &&
            a.to.row === b.to.row && a.to.col === b.to.col;
    }

    static moveKey(m) {
        return `${m.from.row}${m.from.col}${m.to.row}${m.to.col}`;
    }

    static hash(board, color) {
        let h = color;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                h += board[r][c];
            }
        }
        return h;
    }
}

module.exports = BotService;