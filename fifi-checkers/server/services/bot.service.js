const CheckersLogic = require('../utils/checkers.logic');
const { PIECE, BOARD_SIZE } = require('../utils/constants');

class BotService {

    // ============================================
    // CONFIGURATION - GRANDMASTER LEVEL
    // ============================================
    static SEARCH_DEPTH = 10;           // Deep search (10-12 for beast mode)
    static USE_ITERATIVE_DEEPENING = true;
    static MAX_THINK_TIME = 3000;       // Max 3 seconds thinking
    static USE_TRANSPOSITION_TABLE = true;
    static USE_KILLER_MOVES = true;

    // Transposition table for caching evaluated positions
    static transpositionTable = new Map();
    static killerMoves = [];
    static nodesEvaluated = 0;

    // ============================================
    // MAIN ENTRY POINT
    // ============================================
    static getBestMove(board, botColor) {
        const startTime = Date.now();
        this.nodesEvaluated = 0;
        this.transpositionTable.clear();
        this.killerMoves = Array(this.SEARCH_DEPTH + 1).fill(null).map(() => []);

        console.log('🤖 ========================================');
        console.log('🤖 GRANDMASTER BOT ANALYZING...');
        console.log('🤖 Depth:', this.SEARCH_DEPTH);
        console.log('🤖 ========================================');

        const { moves, captures, mustCapture } = CheckersLogic.getAllValidMoves(board, botColor);
        const allMoves = mustCapture ? captures : [...captures, ...moves];

        if (allMoves.length === 0) {
            console.log('🤖 No moves available - loss');
            return null;
        }

        if (allMoves.length === 1) {
            console.log('🤖 Only one move - instant play');
            return allMoves[0];
        }

        let bestMove = allMoves[0];
        let bestScore = -Infinity;

        if (this.USE_ITERATIVE_DEEPENING) {
            // Iterative deepening - search progressively deeper
            for (let depth = 2; depth <= this.SEARCH_DEPTH; depth += 2) {
                const result = this.searchRoot(board, allMoves, depth, botColor, startTime);

                if (result.move) {
                    bestMove = result.move;
                    bestScore = result.score;
                }

                // Time check
                if (Date.now() - startTime > this.MAX_THINK_TIME) {
                    console.log('🤖 Time limit reached at depth', depth);
                    break;
                }

                // If found a winning move, stop
                if (bestScore > 40000) {
                    console.log('🤖 Winning move found at depth', depth);
                    break;
                }
            }
        } else {
            const result = this.searchRoot(board, allMoves, this.SEARCH_DEPTH, botColor, startTime);
            bestMove = result.move || allMoves[0];
            bestScore = result.score;
        }

        const elapsed = Date.now() - startTime;
        console.log('🤖 ========================================');
        console.log('🤖 Best move:', JSON.stringify(bestMove));
        console.log('🤖 Score:', bestScore);
        console.log('🤖 Nodes evaluated:', this.nodesEvaluated.toLocaleString());
        console.log('🤖 Time:', elapsed, 'ms');
        console.log('🤖 Nodes/sec:', Math.round(this.nodesEvaluated / (elapsed / 1000)).toLocaleString());
        console.log('🤖 ========================================');

        return bestMove;
    }

    // ============================================
    // ROOT SEARCH
    // ============================================
    static searchRoot(board, moves, depth, botColor, startTime) {
        const oppColor = botColor === 'black' ? 'white' : 'black';
        let bestMove = moves[0];
        let bestScore = -Infinity;
        let alpha = -Infinity;
        const beta = Infinity;

        // Sort moves for better pruning
        const sortedMoves = this.orderMoves(moves, board, botColor, 0);

        for (const move of sortedMoves) {
            // Time check
            if (Date.now() - startTime > this.MAX_THINK_TIME) break;

            const isCapture = !!move.captured;
            let newBoard = CheckersLogic.executeMove(board, move, isCapture);

            // Execute chain captures
            if (isCapture) {
                newBoard = this.executeAllChainCaptures(newBoard, move.to.row, move.to.col, botColor);
            }

            // Search with negamax
            const score = -this.negamax(newBoard, depth - 1, -beta, -alpha, oppColor, botColor, 1, startTime);

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }

            alpha = Math.max(alpha, score);
        }

        return { move: bestMove, score: bestScore };
    }

    // ============================================
    // NEGAMAX WITH ALPHA-BETA PRUNING
    // ============================================
    static negamax(board, depth, alpha, beta, currentColor, botColor, ply, startTime) {
        this.nodesEvaluated++;

        // Time check every 10000 nodes
        if (this.nodesEvaluated % 10000 === 0) {
            if (Date.now() - startTime > this.MAX_THINK_TIME) {
                return this.evaluate(board, currentColor, botColor);
            }
        }

        const alphaOrig = alpha;

        // Transposition table lookup
        const boardHash = this.hashBoard(board, currentColor);
        if (this.USE_TRANSPOSITION_TABLE) {
            const cached = this.transpositionTable.get(boardHash);
            if (cached && cached.depth >= depth) {
                if (cached.flag === 'EXACT') return cached.score;
                if (cached.flag === 'LOWER') alpha = Math.max(alpha, cached.score);
                if (cached.flag === 'UPPER') beta = Math.min(beta, cached.score);
                if (alpha >= beta) return cached.score;
            }
        }

        // Terminal node check
        const { moves, captures, mustCapture } = CheckersLogic.getAllValidMoves(board, currentColor);
        const allMoves = mustCapture ? captures : [...captures, ...moves];

        if (allMoves.length === 0) {
            // Current player has no moves - they lose
            return -50000 - depth;
        }

        // Depth limit reached
        if (depth <= 0) {
            // Quiescence search for captures
            if (captures.length > 0 && depth > -4) {
                return this.quiescence(board, alpha, beta, currentColor, botColor, depth, startTime);
            }
            return this.evaluate(board, currentColor, botColor);
        }

        const oppColor = currentColor === 'black' ? 'white' : 'black';

        // Move ordering
        const sortedMoves = this.orderMoves(allMoves, board, currentColor, ply);

        let bestScore = -Infinity;
        let bestMove = null;

        for (let i = 0; i < sortedMoves.length; i++) {
            const move = sortedMoves[i];
            const isCapture = !!move.captured;

            let newBoard = CheckersLogic.executeMove(board, move, isCapture);

            // Execute chain captures
            if (isCapture) {
                newBoard = this.executeAllChainCaptures(newBoard, move.to.row, move.to.col, currentColor);
            }

            // Late move reduction
            let reduction = 0;
            if (depth > 3 && i > 3 && !isCapture && !mustCapture) {
                reduction = 1;
            }

            let score;
            if (reduction > 0) {
                // Reduced search
                score = -this.negamax(newBoard, depth - 1 - reduction, -beta, -alpha, oppColor, botColor, ply + 1, startTime);
                // Re-search if promising
                if (score > alpha) {
                    score = -this.negamax(newBoard, depth - 1, -beta, -alpha, oppColor, botColor, ply + 1, startTime);
                }
            } else {
                score = -this.negamax(newBoard, depth - 1, -beta, -alpha, oppColor, botColor, ply + 1, startTime);
            }

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }

            alpha = Math.max(alpha, score);

            // Beta cutoff
            if (alpha >= beta) {
                // Store killer move
                if (this.USE_KILLER_MOVES && !isCapture) {
                    this.killerMoves[ply].unshift(move);
                    if (this.killerMoves[ply].length > 2) {
                        this.killerMoves[ply].pop();
                    }
                }
                break;
            }
        }

        // Store in transposition table
        if (this.USE_TRANSPOSITION_TABLE) {
            let flag = 'EXACT';
            if (bestScore <= alphaOrig) flag = 'UPPER';
            else if (bestScore >= beta) flag = 'LOWER';

            this.transpositionTable.set(boardHash, {
                depth,
                score: bestScore,
                flag,
                move: bestMove
            });

            // Limit table size
            if (this.transpositionTable.size > 500000) {
                const keys = Array.from(this.transpositionTable.keys()).slice(0, 100000);
                keys.forEach(k => this.transpositionTable.delete(k));
            }
        }

        return bestScore;
    }

    // ============================================
    // QUIESCENCE SEARCH - Search captures to avoid horizon effect
    // ============================================
    static quiescence(board, alpha, beta, currentColor, botColor, depth, startTime) {
        this.nodesEvaluated++;

        const standPat = this.evaluate(board, currentColor, botColor);

        if (standPat >= beta) return beta;
        if (alpha < standPat) alpha = standPat;

        if (depth <= -6) return standPat; // Max quiescence depth

        const { captures } = CheckersLogic.getAllValidMoves(board, currentColor);

        if (captures.length === 0) return standPat;

        const oppColor = currentColor === 'black' ? 'white' : 'black';

        // Sort captures by MVV-LVA
        const sortedCaptures = this.orderCaptures(captures, board);

        for (const capture of sortedCaptures) {
            let newBoard = CheckersLogic.executeMove(board, capture, true);
            newBoard = this.executeAllChainCaptures(newBoard, capture.to.row, capture.to.col, currentColor);

            const score = -this.quiescence(newBoard, -beta, -alpha, oppColor, botColor, depth - 1, startTime);

            if (score >= beta) return beta;
            if (score > alpha) alpha = score;
        }

        return alpha;
    }

    // ============================================
    // MOVE ORDERING - Critical for alpha-beta efficiency
    // ============================================
    static orderMoves(moves, board, color, ply) {
        return moves.map(move => {
            let score = 0;

            // Captures first (MVV-LVA)
            if (move.captured) {
                const capturedPiece = board[move.captured.row][move.captured.col];
                const isKing = capturedPiece === PIECE.BLACK_KING || capturedPiece === PIECE.WHITE_KING;
                score += isKing ? 3000 : 1000;

                // Check for chain captures
                const tempBoard = CheckersLogic.executeMove(board, move, true);
                const chainCaptures = CheckersLogic.getMultiCaptures(tempBoard, move.to.row, move.to.col);
                score += chainCaptures.length * 500;
            }

            // Promotion moves
            const piece = board[move.from.row][move.from.col];
            const isBlack = piece === PIECE.BLACK;
            const isWhite = piece === PIECE.WHITE;
            if ((isBlack && move.to.row === 7) || (isWhite && move.to.row === 0)) {
                score += 800;
            }

            // Killer moves
            if (this.USE_KILLER_MOVES && this.killerMoves[ply]) {
                const isKiller = this.killerMoves[ply].some(km =>
                    km && km.from.row === move.from.row && km.from.col === move.from.col &&
                    km.to.row === move.to.row && km.to.col === move.to.col
                );
                if (isKiller) score += 400;
            }

            // Center control
            if (move.to.col >= 2 && move.to.col <= 5 && move.to.row >= 2 && move.to.row <= 5) {
                score += 50;
            }

            // Advancement
            if (color === 'black') {
                score += move.to.row * 10;
            } else {
                score += (7 - move.to.row) * 10;
            }

            return { move, score };
        }).sort((a, b) => b.score - a.score).map(x => x.move);
    }

    static orderCaptures(captures, board) {
        return captures.map(cap => {
            const captured = board[cap.captured.row][cap.captured.col];
            const isKing = captured === PIECE.BLACK_KING || captured === PIECE.WHITE_KING;
            return { move: cap, score: isKing ? 500 : 100 };
        }).sort((a, b) => b.score - a.score).map(x => x.move);
    }

    // ============================================
    // POSITION EVALUATION - The brain
    // ============================================
    static evaluate(board, currentColor, botColor) {
        const oppColor = currentColor === 'black' ? 'white' : 'black';
        let score = 0;

        // Piece counting and positional evaluation
        const analysis = this.analyzePosition(board);

        // Material advantage
        const materialScore = (analysis.blackPieces - analysis.whitePieces) * 100 +
            (analysis.blackKings - analysis.whiteKings) * 250;

        // Positional scores
        const blackPosScore = analysis.blackPositional;
        const whitePosScore = analysis.whitePositional;

        // Total from perspective of current color
        if (currentColor === 'black') {
            score = materialScore + blackPosScore - whitePosScore;
        } else {
            score = -materialScore + whitePosScore - blackPosScore;
        }

        // Mobility bonus
        const currentMoves = CheckersLogic.getAllValidMoves(board, currentColor);
        const oppMoves = CheckersLogic.getAllValidMoves(board, oppColor);

        score += currentMoves.captures.length * 30;
        score += currentMoves.moves.length * 5;
        score -= oppMoves.captures.length * 25;
        score -= oppMoves.moves.length * 4;

        // Threat detection
        if (oppMoves.captures.length > 0) {
            score -= 40; // We're under threat
        }

        // Endgame adjustments
        const totalPieces = analysis.blackPieces + analysis.whitePieces +
            analysis.blackKings + analysis.whiteKings;

        if (totalPieces <= 6) {
            // Endgame - kings are more valuable, center control matters more
            score += (currentColor === 'black' ? analysis.blackKings : analysis.whiteKings) * 50;
        }

        return score;
    }

    static analyzePosition(board) {
        let blackPieces = 0, whitePieces = 0;
        let blackKings = 0, whiteKings = 0;
        let blackPositional = 0, whitePositional = 0;

        // Positional weights - center is better
        const positionWeights = [
            [0, 4, 0, 4, 0, 4, 0, 4],
            [4, 0, 3, 0, 3, 0, 3, 0],
            [0, 3, 0, 2, 0, 2, 0, 4],
            [4, 0, 2, 0, 1, 0, 3, 0],
            [0, 3, 0, 1, 0, 2, 0, 4],
            [4, 0, 2, 0, 2, 0, 3, 0],
            [0, 3, 0, 3, 0, 3, 0, 4],
            [4, 0, 4, 0, 4, 0, 4, 0]
        ];

        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const piece = board[row][col];
                if (piece === PIECE.EMPTY) continue;

                const posWeight = positionWeights[row][col] * 5;

                switch (piece) {
                    case PIECE.BLACK:
                        blackPieces++;
                        blackPositional += posWeight;
                        blackPositional += row * 8; // Advancement bonus
                        if (row >= 5) blackPositional += 20; // Close to promotion
                        if (row === 0) blackPositional += 15; // Back row defense
                        break;

                    case PIECE.WHITE:
                        whitePieces++;
                        whitePositional += posWeight;
                        whitePositional += (7 - row) * 8;
                        if (row <= 2) whitePositional += 20;
                        if (row === 7) whitePositional += 15;
                        break;

                    case PIECE.BLACK_KING:
                        blackKings++;
                        blackPositional += posWeight * 2;
                        blackPositional += this.getKingMobility(board, row, col) * 5;
                        break;

                    case PIECE.WHITE_KING:
                        whiteKings++;
                        whitePositional += posWeight * 2;
                        whitePositional += this.getKingMobility(board, row, col) * 5;
                        break;
                }
            }
        }

        return {
            blackPieces, whitePieces,
            blackKings, whiteKings,
            blackPositional, whitePositional
        };
    }

    static getKingMobility(board, row, col) {
        let mobility = 0;
        const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

        for (const [dr, dc] of directions) {
            for (let dist = 1; dist < 8; dist++) {
                const nr = row + dr * dist;
                const nc = col + dc * dist;

                if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) break;
                if (board[nr][nc] !== PIECE.EMPTY) break;

                mobility++;
            }
        }

        return mobility;
    }

    // ============================================
    // CHAIN CAPTURE EXECUTION
    // ============================================
    static executeAllChainCaptures(board, row, col, color) {
        let currentBoard = board;
        let currentRow = row;
        let currentCol = col;

        while (true) {
            const captures = CheckersLogic.getMultiCaptures(currentBoard, currentRow, currentCol);
            if (captures.length === 0) break;

            // Pick the best chain capture
            let bestCapture = captures[0];
            let bestScore = -Infinity;

            for (const cap of captures) {
                const tempBoard = CheckersLogic.executeMove(currentBoard, cap, true);
                const score = this.quickEval(tempBoard, color);

                // Also consider further chains
                const furtherCaptures = CheckersLogic.getMultiCaptures(tempBoard, cap.to.row, cap.to.col);
                const chainBonus = furtherCaptures.length * 100;

                if (score + chainBonus > bestScore) {
                    bestScore = score + chainBonus;
                    bestCapture = cap;
                }
            }

            currentBoard = CheckersLogic.executeMove(currentBoard, bestCapture, true);
            currentRow = bestCapture.to.row;
            currentCol = bestCapture.to.col;
        }

        return currentBoard;
    }

    // ============================================
    // QUICK EVALUATION (for chain capture decisions)
    // ============================================
    static quickEval(board, botColor) {
        let score = 0;

        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const piece = board[row][col];
                if (piece === PIECE.EMPTY) continue;

                const isBlack = piece === PIECE.BLACK || piece === PIECE.BLACK_KING;
                const isKing = piece === PIECE.BLACK_KING || piece === PIECE.WHITE_KING;
                const isBotPiece = (botColor === 'black') === isBlack;

                const value = isKing ? 300 : 100;
                score += isBotPiece ? value : -value;
            }
        }

        return score;
    }

    // ============================================
    // BOARD HASHING (for transposition table)
    // ============================================
    static hashBoard(board, color) {
        let hash = color === 'black' ? 'B' : 'W';

        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                hash += board[row][col].toString();
            }
        }

        return hash;
    }
}

module.exports = BotService;