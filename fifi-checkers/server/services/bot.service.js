const CheckersLogic = require('../utils/checkers.logic');
const { PIECE, BOARD_SIZE } = require('../utils/constants');

class BotService {

    // ============================================
    // THE DESTROYER - ABSOLUTELY RUTHLESS
    // ============================================
    static SEARCH_DEPTH = 18;
    static ENDGAME_DEPTH = 24;
    static MAX_THINK_TIME = 10000;  // 10 seconds to CRUSH you
    static MIN_DEPTH = 14;

    static transpositionTable = new Map();
    static killerMoves = [];
    static historyTable = new Map();
    static nodesEvaluated = 0;

    // ============================================
    // MAIN - DESTROYER MODE
    // ============================================
    static getBestMove(board, botColor) {
        const startTime = Date.now();
        this.nodesEvaluated = 0;

        // Fresh search
        if (this.transpositionTable.size > 3000000) {
            this.transpositionTable.clear();
        }
        this.historyTable.clear();

        console.log('');
        console.log('💀 ==========================================');
        console.log('💀 THE DESTROYER ACTIVATED');
        console.log('💀 YOU WILL BE CRUSHED');
        console.log('💀 ==========================================');

        const { moves, captures, mustCapture } = CheckersLogic.getAllValidMoves(board, botColor);
        const allMoves = mustCapture ? captures : [...captures, ...moves];

        if (allMoves.length === 0) return null;
        if (allMoves.length === 1) {
            console.log('💀 Forced move');
            return allMoves[0];
        }

        const pieceCount = this.countPieces(board);
        const isEndgame = pieceCount.total <= 8;
        const targetDepth = isEndgame ? this.ENDGAME_DEPTH : this.SEARCH_DEPTH;

        console.log('💀 Pieces:', pieceCount.total, '| Bot:', pieceCount.bot, '| Human:', pieceCount.human);
        console.log('💀 Target depth:', targetDepth);
        console.log('💀 Moves to analyze:', allMoves.length);

        this.killerMoves = Array(targetDepth + 10).fill(null).map(() => []);

        let bestMove = allMoves[0];
        let bestScore = -Infinity;
        let completedDepth = 0;

        // AGGRESSIVE iterative deepening
        for (let depth = 4; depth <= targetDepth; depth += 2) {
            const elapsed = Date.now() - startTime;

            // MUST reach MIN_DEPTH no matter what
            if (depth > this.MIN_DEPTH && elapsed > this.MAX_THINK_TIME) {
                break;
            }

            const result = this.searchRoot(board, allMoves, depth, botColor, startTime);

            if (result.completed) {
                bestMove = result.move;
                bestScore = result.score;
                completedDepth = depth;

                console.log(`💀 Depth ${depth} | Score: ${bestScore} | (${bestMove.from.row},${bestMove.from.col})->(${bestMove.to.row},${bestMove.to.col})`);

                // Found forced win
                if (bestScore > 50000) {
                    console.log('💀 FORCED WIN - PREPARE TO LOSE!');
                    break;
                }
            }
        }

        const elapsed = Date.now() - startTime;
        console.log('💀 ==========================================');
        console.log('💀 DECISION: Depth', completedDepth, '| Score:', bestScore);
        console.log('💀 Nodes:', this.nodesEvaluated.toLocaleString());
        console.log('💀 Time:', elapsed, 'ms');
        console.log('💀 ==========================================');

        return bestMove;
    }

    // ============================================
    // ROOT SEARCH - AGGRESSIVE
    // ============================================
    static searchRoot(board, moves, depth, botColor, startTime) {
        const oppColor = botColor === 'black' ? 'white' : 'black';
        let bestMove = moves[0];
        let bestScore = -Infinity;
        let alpha = -Infinity;
        const beta = Infinity;

        // AGGRESSIVE move ordering - prioritize attacks
        const sortedMoves = this.orderMovesAggressive(moves, board, botColor, 0, null);

        for (let i = 0; i < sortedMoves.length; i++) {
            const move = sortedMoves[i];
            const isCapture = !!move.captured;

            let newBoard = CheckersLogic.executeMove(board, move, isCapture);
            if (isCapture) {
                newBoard = this.executeAllChains(newBoard, move.to.row, move.to.col, botColor);
            }

            let score;
            if (i === 0) {
                score = -this.negamax(newBoard, depth - 1, -beta, -alpha, oppColor, botColor, 1, startTime);
            } else {
                score = -this.negamax(newBoard, depth - 1, -alpha - 1, -alpha, oppColor, botColor, 1, startTime);
                if (score > alpha && score < beta) {
                    score = -this.negamax(newBoard, depth - 1, -beta, -alpha, oppColor, botColor, 1, startTime);
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
    // NEGAMAX - KILLER SEARCH
    // ============================================
    static negamax(board, depth, alpha, beta, currentColor, botColor, ply, startTime) {
        this.nodesEvaluated++;

        const alphaOrig = alpha;
        const oppColor = currentColor === 'black' ? 'white' : 'black';
        const isBotTurn = currentColor === botColor;

        // TT lookup
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

        // No moves = LOSS
        if (allMoves.length === 0) {
            return isBotTurn ? (-100000 + ply) : (100000 - ply);
        }

        // Leaf node
        if (depth <= 0) {
            return this.quiescence(board, alpha, beta, currentColor, botColor, 0);
        }

        // Null move pruning (only when we're winning)
        if (depth >= 4 && !mustCapture && ply > 0 && isBotTurn) {
            const nullScore = -this.negamax(board, depth - 3, -beta, -beta + 1, oppColor, botColor, ply + 1, startTime);
            if (nullScore >= beta) return beta;
        }

        // Sort moves AGGRESSIVELY
        const sortedMoves = this.orderMovesAggressive(allMoves, board, currentColor, ply, cached?.move);

        let bestScore = -Infinity;
        let bestMove = null;

        for (let i = 0; i < sortedMoves.length; i++) {
            const move = sortedMoves[i];
            const isCapture = !!move.captured;

            let newBoard = CheckersLogic.executeMove(board, move, isCapture);
            if (isCapture) {
                newBoard = this.executeAllChains(newBoard, move.to.row, move.to.col, currentColor);
            }

            // Extensions for KILLER moves
            let ext = 0;
            if (isCapture) ext = 1;
            if (this.isPromotion(move, board)) ext = 1;
            if (this.isKillerCapture(board, move, currentColor)) ext = 1;
            ext = Math.min(ext, 2);

            // LMR - but be careful not to miss tactics
            let reduction = 0;
            if (depth >= 3 && i >= 4 && !isCapture && !mustCapture && ext === 0) {
                reduction = 1 + Math.floor(i / 8);
                reduction = Math.min(reduction, depth - 2);
            }

            const newDepth = depth - 1 + ext - reduction;

            let score;
            if (i === 0) {
                score = -this.negamax(newBoard, newDepth, -beta, -alpha, oppColor, botColor, ply + 1, startTime);
            } else {
                score = -this.negamax(newBoard, newDepth, -alpha - 1, -alpha, oppColor, botColor, ply + 1, startTime);
                if (score > alpha && (reduction > 0 || score < beta)) {
                    score = -this.negamax(newBoard, depth - 1 + ext, -beta, -alpha, oppColor, botColor, ply + 1, startTime);
                }
            }

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }

            alpha = Math.max(alpha, score);

            if (alpha >= beta) {
                if (!isCapture && this.killerMoves[ply]) {
                    this.killerMoves[ply].unshift(move);
                    if (this.killerMoves[ply].length > 3) this.killerMoves[ply].pop();
                }
                const key = this.getMoveKey(move);
                this.historyTable.set(key, (this.historyTable.get(key) || 0) + depth * depth);
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
    // QUIESCENCE - DEEP TACTICS
    // ============================================
    static quiescence(board, alpha, beta, currentColor, botColor, depth) {
        this.nodesEvaluated++;

        const standPat = this.evaluateAggressive(board, currentColor, botColor);

        if (depth <= -12) return standPat;
        if (standPat >= beta) return beta;
        if (standPat > alpha) alpha = standPat;

        const { captures } = CheckersLogic.getAllValidMoves(board, currentColor);
        if (captures.length === 0) return standPat;

        const oppColor = currentColor === 'black' ? 'white' : 'black';
        const sortedCaptures = this.sortCapturesByValue(captures, board);

        for (const cap of sortedCaptures) {
            let newBoard = CheckersLogic.executeMove(board, cap, true);
            newBoard = this.executeAllChains(newBoard, cap.to.row, cap.to.col, currentColor);

            const score = -this.quiescence(newBoard, -beta, -alpha, oppColor, botColor, depth - 1);

            if (score >= beta) return beta;
            if (score > alpha) alpha = score;
        }

        return alpha;
    }

    // ============================================
    // AGGRESSIVE MOVE ORDERING
    // ============================================
    static orderMovesAggressive(moves, board, color, ply, pvMove) {
        const oppColor = color === 'black' ? 'white' : 'black';

        return moves.map(move => {
            let score = 0;

            // PV move
            if (pvMove && this.movesEqual(move, pvMove)) score += 10000000;

            // CAPTURES ARE KING
            if (move.captured) {
                const victim = board[move.captured.row][move.captured.col];
                const victimVal = (victim === PIECE.BLACK_KING || victim === PIECE.WHITE_KING) ? 800 : 200;
                score += 5000000 + victimVal;

                // CHAIN CAPTURES = DEVASTATING
                const temp = CheckersLogic.executeMove(board, move, true);
                const chains = CheckersLogic.getMultiCaptures(temp, move.to.row, move.to.col);
                score += chains.length * 1000000;

                // Does this capture lead to winning?
                const afterChains = this.executeAllChains(temp, move.to.row, move.to.col, color);
                const myPieces = this.countColorPieces(afterChains, color);
                const oppPieces = this.countColorPieces(afterChains, oppColor);
                if (oppPieces === 0) score += 50000000; // WINNING MOVE!
                score += (myPieces - oppPieces) * 100000;
            }

            // PROMOTION = POWER
            if (this.isPromotion(move, board)) score += 3000000;

            // THREATENING CAPTURES
            const temp = CheckersLogic.executeMove(board, move, false);
            const newCaptures = CheckersLogic.getAllValidMoves(temp, color).captures;
            score += newCaptures.length * 500000;

            // Killer moves
            if (this.killerMoves[ply]?.some(k => this.movesEqual(k, move))) score += 2000000;

            // History
            score += Math.min(this.historyTable.get(this.getMoveKey(move)) || 0, 1000000);

            // AGGRESSIVE positioning
            score += this.getAggressiveBonus(move, board, color);

            return { move, score };
        }).sort((a, b) => b.score - a.score).map(x => x.move);
    }

    static sortCapturesByValue(captures, board) {
        return captures.map(cap => {
            const victim = board[cap.captured.row][cap.captured.col];
            const score = (victim === PIECE.BLACK_KING || victim === PIECE.WHITE_KING) ? 800 : 200;
            return { move: cap, score };
        }).sort((a, b) => b.score - a.score).map(x => x.move);
    }

    static getAggressiveBonus(move, board, color) {
        let score = 0;

        // ATTACK! Move forward aggressively
        if (color === 'black') {
            score += move.to.row * 20; // Push forward
            if (move.to.row >= 5) score += 100; // Deep in enemy territory
            if (move.to.row === 7) score += 500; // KING ME!
        } else {
            score += (7 - move.to.row) * 20;
            if (move.to.row <= 2) score += 100;
            if (move.to.row === 0) score += 500;
        }

        // CENTER CONTROL = POWER
        const centerDist = Math.abs(3.5 - move.to.row) + Math.abs(3.5 - move.to.col);
        score += (7 - centerDist) * 15;

        // Avoid corners when attacking (they're traps)
        if ((move.to.row === 0 || move.to.row === 7) && (move.to.col === 0 || move.to.col === 7)) {
            score -= 50;
        }

        return score;
    }

    // ============================================
    // AGGRESSIVE EVALUATION - WIN AT ALL COSTS
    // ============================================
    static evaluateAggressive(board, currentColor, botColor) {
        const oppColor = currentColor === 'black' ? 'white' : 'black';
        const isBotTurn = currentColor === botColor;

        let botScore = 0;
        let humanScore = 0;
        let botPieces = 0, botKings = 0;
        let humanPieces = 0, humanKings = 0;

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
                    // King activity
                    value += this.getKingMobility(board, row, col) * 15;
                    // King center control
                    const centerDist = Math.abs(3.5 - row) + Math.abs(3.5 - col);
                    value += (7 - centerDist) * 10;

                    if (isBotPiece) botKings++;
                    else humanKings++;
                } else {
                    value = 150;

                    // AGGRESSIVE advancement
                    if (isBlack) {
                        value += row * 20;
                        if (row >= 5) value += 60;
                        if (row >= 6) value += 100;
                        if (row === 7) value += 200; // About to king
                    } else {
                        value += (7 - row) * 20;
                        if (row <= 2) value += 60;
                        if (row <= 1) value += 100;
                        if (row === 0) value += 200;
                    }

                    // Protected pieces are stronger
                    if (this.isProtected(board, row, col, isBlack ? 'black' : 'white')) {
                        value += 30;
                    }

                    // Pieces threatening captures
                    if (this.canCaptureFrom(board, row, col, isBlack ? 'black' : 'white')) {
                        value += 50;
                    }

                    if (isBotPiece) botPieces++;
                    else humanPieces++;
                }

                // Center control
                const centerDist = Math.abs(3.5 - row) + Math.abs(3.5 - col);
                value += (7 - centerDist) * 8;

                if (isBotPiece) {
                    botScore += value;
                } else {
                    humanScore += value;
                }
            }
        }

        // MATERIAL ADVANTAGE IS HUGE
        const botTotal = botPieces + botKings;
        const humanTotal = humanPieces + humanKings;

        // Winning conditions
        if (humanTotal === 0) return 100000; // BOT WINS
        if (botTotal === 0) return -100000;  // BOT LOSES

        // Material imbalance bonus (exponential)
        const materialDiff = botTotal - humanTotal;
        if (materialDiff > 0) {
            botScore += materialDiff * materialDiff * 100;
        } else if (materialDiff < 0) {
            humanScore += materialDiff * materialDiff * 100;
        }

        // King advantage
        const kingDiff = botKings - humanKings;
        botScore += kingDiff * 150;

        // MOBILITY = POWER
        const botMoves = CheckersLogic.getAllValidMoves(board, botColor);
        const humanMoves = CheckersLogic.getAllValidMoves(board, botColor === 'black' ? 'white' : 'black');

        // Capture threats
        botScore += botMoves.captures.length * 80;
        humanScore += humanMoves.captures.length * 60;

        // Movement freedom
        botScore += botMoves.moves.length * 15;
        humanScore += humanMoves.moves.length * 10;

        // No moves for opponent = WINNING
        if (humanMoves.moves.length === 0 && humanMoves.captures.length === 0) {
            return 90000;
        }

        const totalScore = botScore - humanScore;

        // Return from current player perspective
        return isBotTurn ? totalScore : -totalScore;
    }

    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    static getKingMobility(board, row, col) {
        let mobility = 0;
        const dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

        for (const [dr, dc] of dirs) {
            for (let d = 1; d < 8; d++) {
                const r = row + dr * d;
                const c = col + dc * d;
                if (r < 0 || r >= 8 || c < 0 || c >= 8) break;
                if (board[r][c] !== PIECE.EMPTY) break;
                mobility++;
            }
        }
        return mobility;
    }

    static isProtected(board, row, col, color) {
        const behindRow = color === 'black' ? row - 1 : row + 1;
        if (behindRow < 0 || behindRow >= 8) return false;

        for (const dc of [-1, 1]) {
            const c = col + dc;
            if (c >= 0 && c < 8) {
                const piece = board[behindRow][c];
                if (this.isPieceOfColor(piece, color)) return true;
            }
        }
        return false;
    }

    static canCaptureFrom(board, row, col, color) {
        const piece = board[row][col];
        const isKing = piece === PIECE.BLACK_KING || piece === PIECE.WHITE_KING;
        const dirs = isKing ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] :
            (color === 'black' ? [[1, -1], [1, 1]] : [[-1, -1], [-1, 1]]);

        for (const [dr, dc] of dirs) {
            const mr = row + dr, mc = col + dc;
            const jr = row + dr * 2, jc = col + dc * 2;

            if (jr >= 0 && jr < 8 && jc >= 0 && jc < 8) {
                if (mr >= 0 && mr < 8 && mc >= 0 && mc < 8) {
                    const mid = board[mr][mc];
                    const land = board[jr][jc];
                    if (land === PIECE.EMPTY && mid !== PIECE.EMPTY) {
                        const oppColor = color === 'black' ? 'white' : 'black';
                        if (this.isPieceOfColor(mid, oppColor)) return true;
                    }
                }
            }
        }
        return false;
    }

    static isKillerCapture(board, move, color) {
        if (!move.captured) return false;
        const temp = CheckersLogic.executeMove(board, move, true);
        const chains = CheckersLogic.getMultiCaptures(temp, move.to.row, move.to.col);
        return chains.length >= 2;
    }

    static executeAllChains(board, row, col, color) {
        let b = board, r = row, c = col;

        while (true) {
            const caps = CheckersLogic.getMultiCaptures(b, r, c);
            if (caps.length === 0) break;

            // Pick most devastating chain
            let best = caps[0], bestVal = -Infinity;
            for (const cap of caps) {
                const temp = CheckersLogic.executeMove(b, cap, true);
                const val = this.quickEval(temp, color);
                const furtherChains = CheckersLogic.getMultiCaptures(temp, cap.to.row, cap.to.col);
                if (val + furtherChains.length * 100 > bestVal) {
                    bestVal = val + furtherChains.length * 100;
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
                const val = isKing ? 500 : 150;

                score += (botColor === 'black') === isBlack ? val : -val;
            }
        }
        return score;
    }

    static countPieces(board) {
        let bot = 0, human = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = board[r][c];
                if (p === PIECE.BLACK || p === PIECE.BLACK_KING) bot++;
                else if (p === PIECE.WHITE || p === PIECE.WHITE_KING) human++;
            }
        }
        return { bot, human, total: bot + human };
    }

    static countColorPieces(board, color) {
        let count = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (this.isPieceOfColor(board[r][c], color)) count++;
            }
        }
        return count;
    }

    static isPieceOfColor(piece, color) {
        if (color === 'black') return piece === PIECE.BLACK || piece === PIECE.BLACK_KING;
        return piece === PIECE.WHITE || piece === PIECE.WHITE_KING;
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
        let h = color === 'black' ? 'B:' : 'W:';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                h += board[r][c];
            }
        }
        return h;
    }
}

module.exports = BotService;